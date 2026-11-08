import express from 'express';
import crypto from 'node:crypto';
import { q, json, initDb, deleteUserData } from './db.js';
import * as coach from './coach.js';

const app = express();
const SESSION_DAYS = 30;
const PRODUCTION = process.env.NODE_ENV === 'production';

// Prepares the database. A failure is not remembered, so the next request tries again.
let initPromise;
async function connectWithRetry(attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await initDb();
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 300 * i));
    }
  }
}
export const ready = () => (initPromise ??= connectWithRetry().catch((err) => { initPromise = null; throw err; }));

// Express 4 does not catch errors from async handlers; pass them to the error middleware.
for (const method of ['get', 'post', 'put', 'delete', 'use']) {
  const original = app[method].bind(app);
  app[method] = (...args) => (method === 'get' && args.length === 1
    ? original(...args)
    : original(...args.map((h) => (typeof h === 'function' && h.length < 4 ? (req, res, next) => Promise.resolve(h(req, res, next)).catch(next) : h))));
}

app.disable('x-powered-by');
// Netlify may pass the function's own path; routes expect the public path.
app.use((req, res, next) => { req.url = req.url.replace(/^\/\.netlify\/functions\/api/, '') || '/'; next(); });
if (PRODUCTION) app.set('trust proxy', 1); // behind the host's HTTPS proxy, for req.ip and secure cookies
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.use('/api', async (req, res, next) => {
  try {
    await ready();
  } catch (err) {
    console.error('[db] could not connect:', err.message);
    return res.status(503).json({ error: 'FluentStep is having trouble connecting. Please try again in a moment.' });
  }
  next();
});
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https://i.ytimg.com https://img.youtube.com; media-src 'self' blob:; connect-src 'self' https://api.languagetool.org; " +
      "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com; object-src 'none'; base-uri 'self'",
  );
  next();
});

// ---------- helpers ----------
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) =>
  `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
const verifyPassword = (password, stored) => {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
};
const parseCookies = (header = '') => Object.fromEntries(header.split(';').map((c) => c.trim().split('=').map(decodeURIComponent)).filter((p) => p[0]));

/** The learner's local calendar day, from the browser's timezone offset header. */
const localDay = (req, date = new Date()) => {
  const offset = Number(req.get('X-TZ-Offset')) || 0;
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};
const addDays = (day, n) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const publicUser = (u) => ({
  id: u.id, email: u.email, name: u.name, is_admin: !!u.is_admin, level: u.level, tamil_help: !!u.tamil_help,
  daily_goal_min: u.daily_goal_min, goal_text: u.goal_text, plan: json(u.plan, null), reminder_time: u.reminder_time,
  onboarded: !!u.onboarded, assessment: json(u.assessment, null), created_at: u.created_at,
});

async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  (await q.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', token, userId, expires.toISOString()));
  res.setHeader('Set-Cookie', `fs_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${PRODUCTION ? '; Secure' : ''}`);
}

async function auth(req, res, next) {
  const token = parseCookies(req.headers.cookie).fs_session;
  if (!token) return res.status(401).json({ error: 'Please log in.' });
  const row = (await q.get('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?', token, new Date().toISOString()));
  if (!row) return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  req.user = row;
  req.token = token;
  next();
}
const adminOnly = (req, res, next) => (req.user.is_admin ? next() : res.status(403).json({ error: 'Administrators only.' }));

// Small in-memory throttle for auth endpoints.
const attempts = new Map();
function throttle(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < 15 * 60000);
  if (list.length >= 20) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
  list.push(now);
  attempts.set(key, list);
  next();
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');

async function recordMistakes(userId, mistakes = []) {
  const sql = `INSERT INTO mistakes (user_id, type, wrong, right, why) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, type) DO UPDATE SET count = count + 1, wrong = excluded.wrong, right = excluded.right, why = excluded.why, last_seen = datetime('now')`;
  for (const m of mistakes.slice(0, 6)) {
    if (!m?.type) continue;
    const type = m.type.trim().replace(/\s+/g, ' ').slice(0, 60);
    await q.run(sql, userId, type[0].toUpperCase() + type.slice(1), str(m.wrong, 300), str(m.right, 300), str(m.why, 600));
  }
}

async function logActivity(req, { module, skill, minutes = 0, score = null, max_score = null, detail = null }) {
  (await q.run('INSERT INTO activities (user_id, module, skill, minutes, score, max_score, detail, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', req.user.id, module, skill, Math.max(0, Math.min(180, Number(minutes) || 0)), score, max_score, detail ? JSON.stringify(detail) : null, localDay(req)));
}

// ---------- auth ----------
app.post('/api/auth/register', throttle, async (req, res) => {
  const name = str(req.body.name, 60).trim();
  const email = str(req.body.email, 120).trim().toLowerCase();
  const password = str(req.body.password, 200);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Please enter your name and a valid email.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if ((await q.get('SELECT 1 FROM users WHERE email = ?', email))) return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
  const userCount = (await q.get('SELECT COUNT(*) AS n FROM users')).n;
  const isAdmin = process.env.ADMIN_EMAIL ? email === process.env.ADMIN_EMAIL.toLowerCase() : userCount === 0;
  const info = (await q.run('INSERT INTO users (email, name, pass_hash, is_admin) VALUES (?, ?, ?, ?)', email, name, hashPassword(password), isAdmin ? 1 : 0));
  await createSession(res, Number(info.lastInsertRowid));
  res.json({ user: publicUser((await q.get('SELECT * FROM users WHERE id = ?', info.lastInsertRowid))) });
});

app.post('/api/auth/login', throttle, async (req, res) => {
  const email = str(req.body.email, 120).trim().toLowerCase();
  const user = (await q.get('SELECT * FROM users WHERE email = ?', email));
  if (!user || !verifyPassword(str(req.body.password, 200), user.pass_hash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  await createSession(res, user.id);
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', auth, async (req, res) => {
  (await q.run('DELETE FROM sessions WHERE token = ?', req.token));
  res.setHeader('Set-Cookie', 'fs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

app.get('/api/me', auth, async (req, res) => res.json({ user: publicUser(req.user), ai: { enabled: coach.aiEnabled(), model: coach.modelName() } }));

app.put('/api/me', auth, async (req, res) => {
  const u = req.user;
  const b = req.body;
  const plan = Array.isArray(b.plan) ? b.plan.filter((p) => p && p.skill).map((p) => ({ skill: str(p.skill, 30), minutes: Math.max(0, Math.min(120, Number(p.minutes) || 0)) })) : json(u.plan);
  const level = ['beginner', 'intermediate', 'advanced'].includes(b.level) ? b.level : u.level;
  (await q.run('UPDATE users SET name = ?, tamil_help = ?, daily_goal_min = ?, goal_text = ?, plan = ?, reminder_time = ?, level = ? WHERE id = ?', 
    str(b.name, 60).trim() || u.name,
    b.tamil_help === undefined ? u.tamil_help : b.tamil_help ? 1 : 0,
    b.daily_goal_min ? Math.max(5, Math.min(240, Number(b.daily_goal_min))) : u.daily_goal_min,
    b.goal_text === undefined ? u.goal_text : str(b.goal_text, 200),
    JSON.stringify(plan),
    b.reminder_time === undefined ? u.reminder_time : /^\d{2}:\d{2}$/.test(b.reminder_time) ? b.reminder_time : null,
    level,
    u.id,
  ));
  res.json({ user: publicUser((await q.get('SELECT * FROM users WHERE id = ?', u.id))) });
});

app.post('/api/onboarding', auth, async (req, res) => {
  const b = req.body;
  const level = ['beginner', 'intermediate', 'advanced'].includes(b.level) ? b.level : 'beginner';
  const plan = Array.isArray(b.plan) ? b.plan.map((p) => ({ skill: str(p.skill, 30), minutes: Math.max(0, Math.min(120, Number(p.minutes) || 0)) })) : null;
  (await q.run('UPDATE users SET level = ?, assessment = ?, goal_text = ?, daily_goal_min = ?, plan = ?, tamil_help = ?, onboarded = 1 WHERE id = ?', 
    level, JSON.stringify(b.assessment || null), str(b.goal_text, 200), Math.max(5, Math.min(240, Number(b.daily_goal_min) || 30)), JSON.stringify(plan), b.tamil_help ? 1 : 0, req.user.id,
  ));
  if (b.assessment?.score != null) await logActivity(req, { module: 'assessment', skill: 'grammar', minutes: Number(b.assessment.minutes) || 5, score: b.assessment.score, max_score: b.assessment.max, detail: { level } });
  res.json({ user: publicUser((await q.get('SELECT * FROM users WHERE id = ?', req.user.id))) });
});

app.delete('/api/me', auth, async (req, res) => {
  await deleteUserData(req.user.id);
  res.setHeader('Set-Cookie', 'fs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// ---------- activities & stats ----------
const SKILLS = ['speaking', 'listening', 'reading', 'grammar', 'vocabulary', 'writing'];

app.post('/api/activity', auth, async (req, res) => {
  const b = req.body;
  if (!SKILLS.includes(b.skill)) return res.status(400).json({ error: 'Unknown skill.' });
  const score = b.score == null ? null : Number(b.score);
  const max = b.max_score == null ? null : Number(b.max_score);
  await logActivity(req, { module: str(b.module, 40), skill: b.skill, minutes: b.minutes, score: Number.isFinite(score) ? score : null, max_score: Number.isFinite(max) ? max : null, detail: b.detail && typeof b.detail === 'object' ? b.detail : null });
  res.json({ ok: true });
});

app.get('/api/activities', auth, async (req, res) => {
  const module = str(req.query.module, 40);
  const rows = (await q.all(`SELECT id, module, skill, minutes, score, max_score, detail, day, created_at FROM activities WHERE user_id = ? ${module ? 'AND module = ?' : ''} ORDER BY id DESC LIMIT 200`, ...(module ? [req.user.id, module] : [req.user.id])));
  res.json({ activities: rows.map((r) => ({ ...r, detail: json(r.detail) })) });
});

app.get('/api/stats', auth, async (req, res) => {
  const uid = req.user.id;
  const today = localDay(req);
  const days = (n) => Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));

  const byDay = (await q.all('SELECT day, skill, SUM(minutes) AS minutes, SUM(CASE WHEN json_extract(detail,\'$.time\') = 1 THEN 0 ELSE 1 END) AS n FROM activities WHERE user_id = ? AND day >= ? GROUP BY day, skill', uid, addDays(today, -89)));
  const dayMap = {};
  for (const r of byDay) {
    dayMap[r.day] ??= { total: 0, count: 0 };
    dayMap[r.day][r.skill] = (dayMap[r.day][r.skill] || 0) + r.minutes;
    dayMap[r.day].total += r.minutes;
    dayMap[r.day].count += r.n;
  }
  const activeDays = new Set((await q.all('SELECT DISTINCT day FROM activities WHERE user_id = ?', uid)).map((r) => r.day));
  let streak = 0;
  for (let d = activeDays.has(today) ? today : addDays(today, -1); activeDays.has(d); d = addDays(d, -1)) streak++;
  let best = 0, run = 0, prev = null;
  for (const d of [...activeDays].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  const totals = (await q.get('SELECT COALESCE(SUM(minutes),0) AS minutes, SUM(CASE WHEN json_extract(detail,\'$.time\') = 1 THEN 0 ELSE 1 END) AS n FROM activities WHERE user_id = ?', uid));
  const perSkill = (await q.all(`SELECT skill, SUM(CASE WHEN json_extract(detail,'$.time') = 1 THEN 0 ELSE 1 END) AS n, SUM(minutes) AS minutes, SUM(score) AS score, SUM(max_score) AS max_score
    FROM activities WHERE user_id = ? GROUP BY skill`, uid));
  const perModule = (await q.all('SELECT module, SUM(CASE WHEN json_extract(detail,\'$.time\') = 1 THEN 0 ELSE 1 END) AS n, SUM(minutes) AS minutes, SUM(score) AS score, SUM(max_score) AS max_score FROM activities WHERE user_id = ? GROUP BY module', uid));

  const weekly = async (offsetWeeks) => {
    const end = addDays(today, -7 * offsetWeeks);
    const start = addDays(end, -6);
    return (await q.get('SELECT COALESCE(SUM(minutes),0) AS minutes, SUM(CASE WHEN json_extract(detail,\'$.time\') = 1 THEN 0 ELSE 1 END) AS n, SUM(score) AS score, SUM(max_score) AS max_score FROM activities WHERE user_id = ? AND day BETWEEN ? AND ?', uid, start, end));
  };
  const monthly = (await q.all(`SELECT substr(day,1,7) AS month, SUM(minutes) AS minutes, SUM(CASE WHEN json_extract(detail,'$.time') = 1 THEN 0 ELSE 1 END) AS n, SUM(score) AS score, SUM(max_score) AS max_score
    FROM activities WHERE user_id = ? GROUP BY month ORDER BY month DESC LIMIT 6`, uid)).reverse();

  res.json({
    today,
    todayBySkill: dayMap[today] || { total: 0, count: 0 },
    todayByModule: Object.fromEntries((await q.all('SELECT module, SUM(minutes) AS minutes FROM activities WHERE user_id = ? AND day = ? GROUP BY module', uid, today)).map((r) => [r.module, r.minutes])),
    streak, bestStreak: best,
    totalMinutes: totals.minutes, totalActivities: totals.n,
    calendar: days(35).map((d) => ({ day: d, minutes: dayMap[d]?.total || 0 })),
    week: days(7).map((d) => ({ day: d, ...(dayMap[d] || { total: 0 }) })),
    last30: days(30).map((d) => ({ day: d, minutes: dayMap[d]?.total || 0, count: dayMap[d]?.count || 0 })),
    perSkill, perModule,
    thisWeek: await weekly(0), lastWeek: await weekly(1), monthly,
    vocabCount: (await q.get('SELECT COUNT(*) AS n FROM vocab WHERE user_id = ?', uid)).n,
    vocabMastered: (await q.get('SELECT COUNT(*) AS n FROM vocab WHERE user_id = ? AND box >= 4', uid)).n,
    vocabDue: (await q.get('SELECT COUNT(*) AS n FROM vocab WHERE user_id = ? AND due_day <= ?', uid, today)).n,
    mistakes: (await q.all('SELECT type, count, wrong, right FROM mistakes WHERE user_id = ? ORDER BY count DESC, last_seen DESC LIMIT 5', uid)),
    journalDays: (await q.get('SELECT COUNT(*) AS n FROM journal WHERE user_id = ?', uid)).n,
    conversations: (await q.all('SELECT mode, COUNT(*) AS n FROM conversations WHERE user_id = ? GROUP BY mode', uid)),
  });
});

// ---------- conversations (speaking partner & placement interviewer) ----------
const MODES = ['speaking', 'placement'];
app.get('/api/conversations', auth, async (req, res) => {
  const mode = MODES.includes(req.query.mode) ? req.query.mode : 'speaking';
  const rows = (await q.all('SELECT id, mode, category, title, created_at, updated_at, json_array_length(messages) AS turns FROM conversations WHERE user_id = ? AND mode = ? ORDER BY updated_at DESC LIMIT 50', req.user.id, mode));
  res.json({ conversations: rows });
});
app.get('/api/conversations/:id', auth, async (req, res) => {
  const c = (await q.get('SELECT * FROM conversations WHERE id = ? AND user_id = ?', req.params.id, req.user.id));
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  res.json({ conversation: { ...c, messages: json(c.messages, []) } });
});
app.post('/api/conversations', auth, wrap(async (req, res) => {
  const mode = MODES.includes(req.body.mode) ? req.body.mode : 'speaking';
  const category = str(req.body.category, 30) || 'general';
  const title = str(req.body.title, 80) || category;
  const opening = await coach.openingLine({ user: req.user, mode, category });
  const messages = [{ role: 'assistant', text: opening.reply, at: new Date().toISOString() }];
  const info = (await q.run('INSERT INTO conversations (user_id, mode, category, title, messages) VALUES (?, ?, ?, ?, ?)', req.user.id, mode, category, title, JSON.stringify(messages)));
  res.json({ conversation: { id: Number(info.lastInsertRowid), mode, category, title, messages }, mode_used: opening.mode });
}));
app.post('/api/conversations/:id/message', auth, wrap(async (req, res) => {
  const c = (await q.get('SELECT * FROM conversations WHERE id = ? AND user_id = ?', req.params.id, req.user.id));
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  const text = str(req.body.text, 3000).trim();
  if (!text) return res.status(400).json({ error: 'Please say or type something first.' });
  const messages = json(c.messages, []);
  const metrics = req.body.metrics && typeof req.body.metrics === 'object' ? req.body.metrics : null;
  const out = await coach.converse({ user: req.user, mode: c.mode, category: c.category, history: messages.slice(-20), userText: text, metrics });
  const now = new Date().toISOString();
  messages.push({ role: 'user', text, at: now, feedback: out.feedback, metrics, input: req.body.input === 'voice' ? 'voice' : 'text' });
  messages.push({ role: 'assistant', text: out.reply, at: now });
  (await q.run("UPDATE conversations SET messages = ?, updated_at = datetime('now') WHERE id = ?", JSON.stringify(messages), c.id));
  await recordMistakes(req.user.id, out.feedback?.mistakes);
  await logActivity(req, {
    module: c.mode === 'placement' ? 'placement' : 'speaking', skill: 'speaking', minutes: 0,
    score: out.feedback?.sentence_rating ?? null, max_score: out.feedback?.sentence_rating != null ? 5 : null, detail: { category: c.category, conversation: c.id },
  });
  res.json({ reply: out.reply, feedback: out.feedback, mode: out.mode, notice: out.notice });
}));
app.delete('/api/conversations/:id', auth, async (req, res) => {
  (await q.run('DELETE FROM conversations WHERE id = ? AND user_id = ?', req.params.id, req.user.id));
  res.json({ ok: true });
});

// ---------- generic AI helpers ----------
app.post('/api/ai/review', auth, wrap(async (req, res) => {
  const text = str(req.body.text, 4000).trim();
  if (!text) return res.status(400).json({ error: 'Please write or say something first.' });
  const out = await coach.review({ user: req.user, kind: str(req.body.kind, 80) || 'writing practice', prompt: str(req.body.prompt, 4000), text, wantFollowUp: !!req.body.followUp, spoken: req.body.input === 'voice' });
  await recordMistakes(req.user.id, out.feedback?.mistakes);
  res.json(out);
}));
app.post('/api/ai/translate', auth, wrap(async (req, res) => {
  const b = req.body;
  const answer = str(b.answer, 1000).trim();
  if (!answer) return res.status(400).json({ error: 'Please type your translation first.' });
  const out = await coach.checkTranslation({
    user: req.user, direction: b.direction === 'en-ta' ? 'en-ta' : 'ta-en', source: str(b.source, 1000), reference: str(b.reference, 1000),
    alternatives: Array.isArray(b.alternatives) ? b.alternatives.map((a) => str(a, 500)).slice(0, 6) : [], answer,
  });
  await recordMistakes(req.user.id, out.mistakes);
  res.json(out);
}));
app.post('/api/ai/tamil', auth, wrap(async (req, res) => {
  const text = str(req.body.text, 3000).trim();
  if (!text) return res.status(400).json({ error: 'Nothing to explain.' });
  res.json(await coach.explainInTamil({ user: req.user, text }));
}));

// ---------- My Day journal ----------
app.get('/api/journal', auth, async (req, res) => {
  const rows = (await q.all('SELECT id, day, entries, created_at FROM journal WHERE user_id = ? ORDER BY day DESC LIMIT 60', req.user.id));
  res.json({ today: localDay(req), entries: rows.map((r) => ({ ...r, entries: json(r.entries, []) })) });
});
app.post('/api/journal/answer', auth, wrap(async (req, res) => {
  const question = str(req.body.question, 500);
  const text = str(req.body.text, 3000).trim();
  if (!text) return res.status(400).json({ error: 'Please answer by speaking or typing.' });
  const day = localDay(req);
  const out = await coach.review({ user: req.user, kind: 'My Day daily English journal', prompt: question, text, wantFollowUp: true, spoken: req.body.input === 'voice' });
  (await q.run("INSERT INTO journal (user_id, day) VALUES (?, ?) ON CONFLICT(user_id, day) DO NOTHING", req.user.id, day));
  const row = (await q.get('SELECT * FROM journal WHERE user_id = ? AND day = ?', req.user.id, day));
  const entries = json(row.entries, []);
  entries.push({ question, answer: text, feedback: out.feedback, follow_up: out.follow_up, input: req.body.input === 'voice' ? 'voice' : 'text', at: new Date().toISOString() });
  (await q.run('UPDATE journal SET entries = ? WHERE id = ?', JSON.stringify(entries), row.id));
  await recordMistakes(req.user.id, out.feedback?.mistakes);
  await logActivity(req, { module: 'myday', skill: 'writing', minutes: 0, score: out.feedback?.sentence_rating ?? null, max_score: out.feedback?.sentence_rating != null ? 5 : null, detail: { words: text.split(/\s+/).length, mistakes: out.feedback?.mistakes?.length || 0 } });
  res.json({ ...out, day });
}));

// ---------- vocabulary with spaced repetition (Leitner boxes) ----------
const INTERVALS = [1, 2, 4, 7, 15, 30];
app.get('/api/vocab', auth, async (req, res) => {
  const today = localDay(req);
  const words = (await q.all('SELECT * FROM vocab WHERE user_id = ? ORDER BY created_at DESC', req.user.id));
  res.json({ today, words, due: words.filter((w) => w.due_day <= today) });
});
app.post('/api/vocab', auth, async (req, res) => {
  const word = str(req.body.word, 60).trim();
  if (!word) return res.status(400).json({ error: 'Word is required.' });
  (await q.run(`INSERT INTO vocab (user_id, word, meaning, tamil, example, source, due_day) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, word) DO UPDATE SET meaning = COALESCE(excluded.meaning, meaning), tamil = COALESCE(excluded.tamil, tamil), example = COALESCE(excluded.example, example)`, req.user.id, word, str(req.body.meaning, 300) || null, str(req.body.tamil, 300) || null, str(req.body.example, 400) || null, str(req.body.source, 60) || null, localDay(req)));
  res.json({ ok: true });
});
app.post('/api/vocab/:id/review', auth, async (req, res) => {
  const w = (await q.get('SELECT * FROM vocab WHERE id = ? AND user_id = ?', req.params.id, req.user.id));
  if (!w) return res.status(404).json({ error: 'Word not found.' });
  const correct = !!req.body.correct;
  const box = correct ? Math.min(w.box + 1, INTERVALS.length - 1) : 0;
  (await q.run('UPDATE vocab SET box = ?, due_day = ?, reviews = reviews + 1, correct = correct + ? WHERE id = ?', box, addDays(localDay(req), INTERVALS[box]), correct ? 1 : 0, w.id));
  res.json({ ok: true, box, next: addDays(localDay(req), INTERVALS[box]) });
});
app.delete('/api/vocab/:id', auth, async (req, res) => {
  (await q.run('DELETE FROM vocab WHERE id = ? AND user_id = ?', req.params.id, req.user.id));
  res.json({ ok: true });
});

// ---------- mistake notebook, favourites ----------
app.get('/api/mistakes', auth, async (req, res) => res.json({ mistakes: (await q.all('SELECT * FROM mistakes WHERE user_id = ? ORDER BY count DESC, last_seen DESC', req.user.id)) }));
// Mistakes found in the browser by the free grammar checker (LanguageTool).
app.post('/api/mistakes', auth, async (req, res) => {
  if (!Array.isArray(req.body.mistakes)) return res.status(400).json({ error: 'mistakes must be a list.' });
  await recordMistakes(req.user.id, req.body.mistakes.filter((m) => m && typeof m.type === 'string'));
  res.json({ ok: true });
});
app.delete('/api/mistakes/:id', auth, async (req, res) => {
  (await q.run('DELETE FROM mistakes WHERE id = ? AND user_id = ?', req.params.id, req.user.id));
  res.json({ ok: true });
});
app.get('/api/favorites', auth, async (req, res) => res.json({ favorites: (await q.all('SELECT kind, ref FROM favorites WHERE user_id = ?', req.user.id)) }));
app.post('/api/favorites', auth, async (req, res) => {
  const kind = str(req.body.kind, 30), ref = str(req.body.ref, 100);
  if (!kind || !ref) return res.status(400).json({ error: 'Missing favourite.' });
  const exists = (await q.get('SELECT 1 FROM favorites WHERE user_id = ? AND kind = ? AND ref = ?', req.user.id, kind, ref));
  if (exists) (await q.run('DELETE FROM favorites WHERE user_id = ? AND kind = ? AND ref = ?', req.user.id, kind, ref));
  else (await q.run('INSERT INTO favorites (user_id, kind, ref) VALUES (?, ?, ?)', req.user.id, kind, ref));
  res.json({ favorite: !exists });
});

// ---------- admin-approved videos ----------
const ALLOWED_VIDEO_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.ted.com', 'ted.com', 'vimeo.com', 'www.youtube-nocookie.com'];
app.get('/api/videos', auth, async (req, res) => {
  const section = str(req.query.section, 20);
  res.json({ videos: (await q.all('SELECT id, section, title, url, description, created_at FROM videos WHERE section = ? ORDER BY id DESC', section)) });
});
app.post('/api/videos', auth, adminOnly, async (req, res) => {
  const section = ['cartoon', 'ted'].includes(req.body.section) ? req.body.section : null;
  const title = str(req.body.title, 120).trim();
  let url;
  try { url = new URL(str(req.body.url, 500)); } catch { return res.status(400).json({ error: 'Please enter a valid URL.' }); }
  if (!section || !title) return res.status(400).json({ error: 'Section and title are required.' });
  if (url.protocol !== 'https:' || !ALLOWED_VIDEO_HOSTS.includes(url.hostname)) return res.status(400).json({ error: 'Only https links from YouTube, TED or Vimeo are allowed.' });
  (await q.run('INSERT INTO videos (section, title, url, description, added_by) VALUES (?, ?, ?, ?, ?)', section, title, url.toString(), str(req.body.description, 400), req.user.id));
  res.json({ ok: true });
});
app.delete('/api/videos/:id', auth, adminOnly, async (req, res) => {
  (await q.run('DELETE FROM videos WHERE id = ?', req.params.id));
  res.json({ ok: true });
});

// ---------- public info and error handling ----------
app.get('/api/public-info', (req, res) => res.json({ contact: process.env.CONTACT_EMAIL || null }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

export default app;
