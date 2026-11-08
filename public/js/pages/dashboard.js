import { api, post } from '../api.js';
import { state, PLAN_ITEMS, DEFAULT_PLAN } from '../state.js';
import { esc, fmtMin, pct, shortDay, stackedBars, SKILL_COLORS, ring, toast } from '../ui.js';
import { speak } from '../speech.js';
import { WORDS, DAILY_SENTENCES } from '../content/vocab.js';

const dayIndex = () => Math.floor(Date.now() / 864e5 - new Date().getTimezoneOffset() / 1440);

export async function render(view) {
  const s = await api('/stats');
  const u = state.user;
  const plan = u.plan?.length ? u.plan : DEFAULT_PLAN;
  const planDone = plan.map((p) => {
    const item = PLAN_ITEMS[p.skill] || PLAN_ITEMS.speaking;
    const done = item.modules.reduce((a, m) => a + (s.todayByModule[m] || 0), 0);
    return { ...p, item, done };
  });
  const goal = u.daily_goal_min || plan.reduce((a, p) => a + p.minutes, 0);
  const todayMin = s.todayBySkill.total || 0;
  const word = WORDS[dayIndex() % WORDS.length];
  const sentence = DAILY_SENTENCES[dayIndex() % DAILY_SENTENCES.length];
  const next = planDone.find((p) => p.done < p.minutes) || planDone[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const skillRow = (key, label, icon) => {
    const r = s.perSkill.find((x) => x.skill === key);
    const acc = r?.max_score ? pct(r.score, r.max_score) : null;
    return `<div>
      <div class="row between small"><span>${icon} <b>${label}</b></span><span class="muted">${r?.n ? `${r.n} activit${r.n === 1 ? "y" : "ies"}${acc != null ? ` · ${acc}% accuracy` : ''}` : 'Not started'}</span></div>
      <div class="progress" style="margin-top:6px"><span style="width:${acc ?? 0}%;background:${SKILL_COLORS[key]}"></span></div>
    </div>`;
  };

  view.innerHTML = `
  <section class="hero">
    <div class="row between" style="align-items:flex-start;position:relative;z-index:1">
      <div style="max-width:560px">
        <p style="margin:0 0 4px;font-weight:600">${greet} 👋</p>
        <h1>Welcome back, ${esc(u.name)}!</h1>
        <p>${esc(u.goal_text || 'Improve my spoken English')} · Today's goal: <b>${goal} minutes</b></p>
        <div class="row"><a class="btn" href="#/${next.item.route}">▶ Continue learning: ${esc(next.item.label)}</a><a class="btn ghost" href="#/myday">📔 Write My Day</a></div>
      </div>
      <div style="text-align:center">${ring(pct(Math.min(todayMin, goal), goal), { size: 110, label: 'of daily goal' }).replace('fill="#1e1838"', 'fill="#fff"').replace('stroke="#efeafe"', 'stroke="rgba(255,255,255,.25)"')}<div class="small">${fmtMin(todayMin)} of ${goal}m today</div></div>
    </div>
  </section>

  <div class="grid g4" style="margin-top:16px">
    <div class="card stat"><div class="stat-ico">🔥</div><span class="num">${s.streak}</span><span class="lbl">day streak (best ${s.bestStreak})</span></div>
    <div class="card stat"><div class="stat-ico">⏱️</div><span class="num">${fmtMin(s.totalMinutes)}</span><span class="lbl">total practice time</span></div>
    <div class="card stat"><div class="stat-ico">✅</div><span class="num">${s.totalActivities}</span><span class="lbl">activities completed</span></div>
    <div class="card stat"><div class="stat-ico">🗂️</div><span class="num">${s.vocabCount}</span><span class="lbl">words saved · ${s.vocabDue} due today</span></div>
  </div>

  <div class="grid g2" style="margin-top:16px">
    <div class="card">
      <div class="card-title"><h2>Today's learning plan</h2><a class="small" href="#/planner">Customise</a></div>
      <div class="list">${planDone.map((p) => `<a class="list-item ${p.done >= p.minutes ? 'done' : ''}" href="#/${p.item.route}" style="color:inherit;text-decoration:none">
        <span class="check">${p.done >= p.minutes ? '✓' : ''}</span><span>${p.item.icon} <b>${p.minutes} min</b> – ${esc(p.item.label)}</span><span class="spacer"></span><span class="small muted">${Math.round(p.done * 10) / 10}/${p.minutes}m</span></a>`).join('')}</div>
    </div>
    <div class="card">
      <div class="card-title"><h2>Practice calendar</h2><span class="small muted">last 5 weeks</span></div>
      <div class="cal">${s.calendar.map((c) => `<div class="${c.minutes >= 20 ? 'l3' : c.minutes >= 8 ? 'l2' : c.minutes > 0 ? 'l1' : ''} ${c.day === s.today ? 'today' : ''}" title="${c.day}: ${Math.round(c.minutes)} min">${Number(c.day.slice(8))}</div>`).join('')}</div>
      <div class="row small muted" style="margin-top:10px;gap:6px">Less <span class="chip" style="padding:2px 8px">0</span><span class="chip" style="padding:2px 8px;background:#d9cffd">1–7m</span><span class="chip" style="padding:2px 8px;background:#a993f5;color:#fff">8–19m</span><span class="chip" style="padding:2px 8px;background:var(--violet);color:#fff">20m+</span> More</div>
    </div>
  </div>

  <div class="grid g2" style="margin-top:16px">
    <div class="card">
      <div class="card-title"><h2>Word of the day</h2><button class="btn sm secondary" id="save-word">＋ Save</button></div>
      <div class="row"><h1 style="margin:0">${esc(word.word)}</h1><button class="icon-btn" id="say-word" aria-label="Pronounce">🔊</button><span class="chip">${esc(word.pos)}</span></div>
      <p style="margin:6px 0 2px">${esc(word.meaning)}</p>
      <p class="ta" lang="ta" style="color:var(--violet-600);font-weight:600">${esc(word.tamil)}</p>
      <p class="muted"><i>"${esc(word.example)}"</i></p>
      ${word.syn.length ? `<p class="small"><b>Synonyms:</b> ${word.syn.map(esc).join(', ')}${word.ant.length ? ` · <b>Opposites:</b> ${word.ant.map(esc).join(', ')}` : ''}</p>` : ''}
      <hr style="border:0;border-top:1px solid var(--line);margin:14px 0">
      <div class="small muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.05em">Sentence of the day</div>
      <p style="font-size:1.08rem;font-weight:600;margin:6px 0 2px">"${esc(sentence.en)}" <button class="icon-btn" id="say-sent" aria-label="Listen">🔊</button></p>
      <p class="ta muted" lang="ta">${esc(sentence.ta)}</p>
    </div>
    <div class="card">
      <div class="card-title"><h2>Skill progress</h2><a class="small" href="#/progress">Full report</a></div>
      <div class="stack">
        ${skillRow('speaking', 'Speaking', '🗣️')}${skillRow('listening', 'Listening', '🎧')}${skillRow('reading', 'Reading', '📖')}${skillRow('grammar', 'Grammar', '✍️')}${skillRow('vocabulary', 'Vocabulary', '🗂️')}
      </div>
      <p class="small muted" style="margin-top:10px">Accuracy comes only from your real quiz, listening, reading and speaking results.</p>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="card-title"><h2>Weekly performance</h2><span class="small muted">${fmtMin(s.thisWeek.minutes)} this week · ${fmtMin(s.lastWeek.minutes)} last week</span></div>
    ${stackedBars(s.week.map((d) => ({ ...d, label: shortDay(d.day) })), Object.keys(SKILL_COLORS))}
    <div class="legend">${Object.entries(SKILL_COLORS).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}</div>
  </div>

  <h2 style="margin:24px 0 12px">Jump into practice</h2>
  <div class="auto-grid">
    ${[['speaking', '🗣️', 'Speaking partner', 'Talk with your AI coach'], ['placement', '💼', 'Mock interview', 'HR & technical practice'], ['shadowing', '🔁', 'Shadowing', 'Listen & repeat sentences'], ['listening', '🎧', 'Listening', 'Dialogues, stories, news'], ['translate', '🔤', 'Tamil ⇄ English', 'Translation practice'], ['grammar', '✍️', 'Grammar', '11 practical topics']]
      .map(([r, e, t, d]) => `<a class="tile" href="#/${r}"><span class="emoji">${e}</span><h3>${t}</h3><p>${d}</p></a>`).join('')}
  </div>`;

  view.querySelector('#say-word').onclick = () => speak(`${word.word}. ${word.example}`, { rate: 0.9 });
  view.querySelector('#say-sent').onclick = () => speak(sentence.en, { rate: 0.9 });
  view.querySelector('#save-word').onclick = async () => {
    await post('/vocab', { word: word.word, meaning: word.meaning, tamil: word.tamil, example: word.example, source: 'word of the day' });
    toast('Saved to your vocabulary');
  };
}
