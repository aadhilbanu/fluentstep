import { post, logActivity } from './api.js';
import { Recorder, support, speak, stopSpeaking } from './speech.js';
import { state } from './state.js';
import { checkGrammar, LT_CREDIT } from './grammarcheck.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

export function modal(html, { onMount } = {}) {
  const bg = el(`<div class="modal-bg" role="dialog" aria-modal="true"><div class="modal">${html}</div></div>`);
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(bg);
  onMount?.(bg.firstElementChild, close);
  return close;
}

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`);
export const shortDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
export const prettyDate = (d) => new Date(d.length === 10 ? `${d}T00:00:00` : d.replace(' ', 'T') + (d.includes('Z') || d.length === 10 ? '' : 'Z')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Time spent on a page is logged when leaving it (minimum 20 seconds of visible time). */
export function startTimer(skill, module) {
  let visibleMs = 0;
  let since = document.hidden ? null : Date.now();
  const onVis = () => {
    if (document.hidden && since) { visibleMs += Date.now() - since; since = null; } else if (!document.hidden) since = Date.now();
  };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    document.removeEventListener('visibilitychange', onVis);
    if (since) visibleMs += Date.now() - since;
    if (visibleMs >= 20000) logActivity({ module, skill, minutes: Math.round((visibleMs / 60000) * 10) / 10, detail: { time: true } });
  };
}

// ---------- word diff for corrections ----------
export function diffHtml(a, b) {
  const x = a.split(/\s+/).filter(Boolean), y = b.split(/\s+/).filter(Boolean);
  const n = x.length, m = y.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const k = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = k(x[i]) === k(y[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0;
  const out = [];
  while (i < n && j < m) {
    if (k(x[i]) === k(y[j])) { out.push(esc(y[j])); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(`<del>${esc(x[i])}</del>`); i++; } else { out.push(`<ins>${esc(y[j])}</ins>`); j++; }
  }
  while (i < n) out.push(`<del>${esc(x[i++])}</del>`);
  while (j < m) out.push(`<ins>${esc(y[j++])}</ins>`);
  return out.join(' ');
}

// ---------- metrics ----------
export function metricsHtml(m) {
  if (!m) return '';
  const fillers = Object.entries(m.filler_words || {});
  const pace = m.wpm == null ? '—' : m.wpm;
  const paceNote = m.wpm == null ? '' : m.wpm < 90 ? 'a little slow' : m.wpm > 170 ? 'a little fast' : 'comfortable';
  return `<div class="metrics">
    <div class="metric"><b>${m.words}</b><span>words</span></div>
    <div class="metric"><b>${pace}</b><span>words/min ${paceNote ? `· ${paceNote}` : ''}</span></div>
    <div class="metric"><b>${m.long_pauses}</b><span>long pauses${m.longest_pause_sec ? ` (max ${m.longest_pause_sec}s)` : ''}</span></div>
    <div class="metric"><b>${fillers.reduce((a, [, n]) => a + n, 0)}</b><span>filler words</span></div>
  </div>
  ${fillers.length ? `<p class="small muted" style="margin-top:6px">Fillers: ${fillers.map(([w, n]) => `<b>${esc(w)}</b> ×${n}`).join(', ')}</p>` : ''}
  ${m.repeated_words?.length ? `<p class="small muted">Repeated words: ${m.repeated_words.map(esc).join(', ')}</p>` : ''}
  ${m.overused_words?.length ? `<p class="small muted">Used often: ${m.overused_words.map(esc).join(', ')} — try a synonym.</p>` : ''}`;
}

// ---------- AI feedback card ----------
function feedbackHtml(fb, { metrics, title = 'Coach feedback' }, lt) {
  const tamilFirst = state.user?.tamil_help;
  const rating = fb.sentence_rating ? `<span class="chip ${fb.sentence_rating >= 4 ? 'green' : fb.sentence_rating >= 3 ? 'amber' : 'red'}" title="AI estimate of sentence formation">Sentence formation ${fb.sentence_rating}/5</span>` : '';
  return `<div class="row between" style="margin-bottom:8px"><b>${esc(title)}</b><div class="row">${rating}${fb.offline ? `<span class="chip amber" title="The AI coach is not configured">${lt === 'done' ? 'Free grammar checker' : 'Offline checker'}</span>` : ''}</div></div>
    ${fb.has_mistakes ? `
      <h4>Your sentence</h4><div class="orig">${esc(fb.original)}</div>
      <h4>Corrected</h4><div class="corr">${diffHtml(fb.original, fb.corrected)}</div>` : lt === 'checking' ? '<div class="notice info">🔎 Checking your grammar…</div>' : fb.offline && lt !== 'done' ? '<div class="notice ok">✅ No common mistakes found by the offline checker.</div>' : '<div class="notice ok">✅ Well done — no grammar mistakes found.</div>'}
    ${fb.natural && fb.natural.trim() !== (fb.corrected || '').trim() ? `<h4>More natural English</h4><div class="nat">${esc(fb.natural)} <button class="btn sm ghost" data-say="${esc(fb.natural)}" aria-label="Listen">🔊</button></div>` : ''}
    ${fb.mistakes?.length ? `<h4>Grammar explanation</h4><ul>${fb.mistakes.map((m) => `<li><b>${esc(m.type)}:</b> "${esc(m.wrong)}" → "<b>${esc(m.right)}</b>". ${esc(m.why)}</li>`).join('')}</ul>` : fb.has_mistakes && fb.explanation ? `<h4>Grammar explanation</h4><p>${esc(fb.explanation)}</p>` : ''}
    ${fb.explanation_ta && fb.has_mistakes ? `<details ${tamilFirst ? 'open' : ''}><summary class="small" style="cursor:pointer;font-weight:700;color:var(--violet)">தமிழில் விளக்கம் (Tamil explanation)</summary><p class="ta" lang="ta" style="margin-top:6px">${esc(fb.explanation_ta)}</p></details>` : ''}
    ${fb.vocabulary?.length ? `<h4>Useful vocabulary</h4><div class="row">${fb.vocabulary.map((v) => `<button class="chip" data-save-word="${esc(v.word)}" data-meaning="${esc(v.meaning)}" title="${esc(v.meaning)} — click to save">＋ ${esc(v.word)}</button>`).join('')}</div>` : ''}
    ${fb.tips?.length ? `<h4>Improvement tips</h4><ul>${fb.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${metrics ? `<h4>Fluency (measured from your recording)</h4>${metricsHtml(metrics)}` : ''}
    ${lt === 'done' || lt === 'checking' ? `<p class="small muted" style="margin:10px 0 0">Grammar check powered by ${LT_CREDIT}</p>` : ''}
`;
}

/**
 * Feedback card. Without the AI coach (fb.offline), the answer is also checked with the
 * free LanguageTool service. Pass `spoken` for speech transcripts (skips punctuation and
 * capitalisation) and `record` for a fresh answer, so new mistakes go to the notebook.
 */
export function feedbackEl(fb, opts = {}) {
  const node = el('<div class="fb"></div>');
  if (!fb) return node;
  let current = fb, lt = null;
  const draw = () => { node.innerHTML = feedbackHtml(current, opts, lt); };
  draw();
  node.addEventListener('click', async (e) => {
    const say = e.target.closest('[data-say]');
    if (say) speak(say.dataset.say);
    const sw = e.target.closest('[data-save-word]');
    if (sw) {
      await post('/vocab', { word: sw.dataset.saveWord, meaning: sw.dataset.meaning, source: opts.source || 'feedback' });
      sw.classList.add('green');
      sw.textContent = `✓ ${sw.dataset.saveWord}`;
      toast('Saved to your vocabulary');
    }
  });
  if (fb.offline && opts.enhance !== false) {
    lt = 'checking';
    draw();
    checkGrammar(fb.corrected || fb.original, { spoken: opts.spoken }).then((r) => {
      lt = r ? 'done' : null;
      const seen = new Set((fb.mistakes || []).map((m) => m.wrong.toLowerCase()));
      const extra = (r?.mistakes || []).filter((m) => !seen.has(m.wrong.toLowerCase()));
      if (extra.length) {
        current = { ...fb, has_mistakes: true, corrected: r.corrected, natural: r.corrected, mistakes: [...(fb.mistakes || []), ...extra], explanation_ta: fb.has_mistakes ? fb.explanation_ta : '' };
        if (opts.record) post('/mistakes', { mistakes: extra }).catch(() => {});
      }
      draw();
    });
  }
  return node;
}

// ---------- quiz ----------
export function quizEl(questions, { onDone, title } = {}) {
  let answered = 0, correct = 0;
  const node = el(`<div class="stack">${title ? `<h3>${esc(title)}</h3>` : ''}${questions.map((q, i) => `
    <div class="quiz-q" data-i="${i}">
      ${q.passage ? `<p class="small muted">${esc(q.passage)}</p>` : ''}
      <b>${i + 1}. ${esc(q.q)}</b>
      ${q.options.map((o, j) => `<button class="option" data-j="${j}">${esc(o)}</button>`).join('')}
      <div class="explain hidden"></div>
    </div>`).join('')}<div class="quiz-result"></div></div>`);
  node.addEventListener('click', (e) => {
    const btn = e.target.closest('.option');
    if (!btn) return;
    const box = btn.closest('.quiz-q');
    if (box.dataset.done) return;
    const q = questions[box.dataset.i];
    const j = Number(btn.dataset.j);
    box.dataset.done = '1';
    $$('.option', box).forEach((b, k) => { b.disabled = true; if (k === q.answer) b.classList.add('right'); });
    if (j === q.answer) correct++; else btn.classList.add('wrong');
    answered++;
    const ex = $('.explain', box);
    ex.innerHTML = `${j === q.answer ? '✅ Correct! ' : '❌ Not quite. '}${esc(q.explain || '')}`;
    ex.classList.remove('hidden');
    if (answered === questions.length) {
      $('.quiz-result', node).innerHTML = `<div class="notice ${correct / questions.length >= 0.7 ? 'ok' : 'info'}"><b>Score: ${correct} / ${questions.length}</b> (${pct(correct, questions.length)}%) ${correct === questions.length ? '— excellent!' : correct / questions.length >= 0.7 ? '— good job!' : '— review the explanations and try again later.'}</div>`;
      onDone?.(correct, questions.length);
    }
  });
  return node;
}

// ---------- voice + text input ----------
/**
 * A microphone button with live transcript, plus a text box fallback.
 * onSubmit(text, {input:'voice'|'text', metrics, audioUrl}) may return a promise.
 */
export function voiceInput({ onSubmit, placeholder = 'Type your answer here…', submitLabel = 'Send', autoSubmit = false, rows = 2 }) {
  const node = el(`<div class="stack">
    <div class="mic-wrap">
      ${support.stt || support.mic ? `<button class="mic" type="button" aria-label="Start recording">🎤</button>
      <div class="level-meter"><span></span></div>
      <div class="live small">${support.stt ? 'Tap the mic and speak in English' : 'Recording works, but speech-to-text is not supported in this browser — please type below. (Use Chrome or Edge for voice input.)'}</div>` : `<div class="notice">🎤 Microphone recording is not available in this browser. You can practise by typing. For voice practice, use Chrome or Edge on desktop or Android.</div>`}
      <div class="playback"></div>
    </div>
    <div class="composer"><textarea class="input" rows="${rows}" placeholder="${esc(placeholder)}" aria-label="Your answer"></textarea><button class="btn send" type="button">${esc(submitLabel)}</button></div>
  </div>`);
  const mic = $('.mic', node), live = $('.live', node), ta = $('textarea', node), send = $('.send', node), meter = $('.level-meter span', node);
  let rec = null, voiceMeta = null, busy = false;

  async function submit() {
    const text = ta.value.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true; if (mic) mic.disabled = true;
    try {
      await onSubmit(text, voiceMeta && voiceMeta.transcript === text ? { input: 'voice', ...voiceMeta } : { input: voiceMeta ? 'voice' : 'text', metrics: voiceMeta?.metrics, audioUrl: voiceMeta?.audioUrl });
      ta.value = '';
      voiceMeta = null;
    } catch (err) { toast(err.message); } finally { busy = false; send.disabled = false; if (mic) mic.disabled = false; }
  }
  send.addEventListener('click', submit);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
  mic?.addEventListener('click', async () => {
    if (rec) {
      mic.classList.remove('rec'); mic.textContent = '🎤'; mic.setAttribute('aria-label', 'Start recording');
      live.textContent = 'Processing…';
      const out = await rec.stop();
      rec = null; meter.style.width = '0';
      voiceMeta = out;
      $('.playback', node).innerHTML = out.audioUrl ? `<audio controls src="${out.audioUrl}" style="height:36px"></audio><div class="small muted">Your recording (kept only on this device)</div>` : '';
      if (out.transcript) {
        ta.value = out.transcript;
        live.textContent = 'Check the transcript, then send.';
        if (autoSubmit) submit();
      } else live.textContent = support.stt ? 'I could not hear any words. Please try again, closer to the mic — or type your answer.' : 'Recording saved. Please type what you said below.';
      return;
    }
    stopSpeaking();
    rec = new Recorder({ onInterim: (t) => { live.textContent = t || 'Listening…'; }, onLevel: (l) => { meter.style.width = `${l * 100}%`; } });
    try {
      await rec.start();
      mic.classList.add('rec'); mic.textContent = '⏹'; mic.setAttribute('aria-label', 'Stop recording');
      live.textContent = 'Listening… tap again when you finish.';
    } catch (err) {
      rec = null;
      live.textContent = 'Microphone permission was denied or no microphone was found. You can type your answer instead.';
    }
  });
  node.cleanup = () => { if (rec) rec.stop(); };
  return node;
}

// ---------- charts (SVG, no dependencies) ----------
export const SKILL_COLORS = { speaking: '#6d4fe0', listening: '#4f8df7', reading: '#1aa673', grammar: '#e59a1a', vocabulary: '#d9579b', writing: '#7c6fb0' };

export function stackedBars(days, keys, { height = 200 } = {}) {
  const W = 640, H = height, pad = 28, bw = (W - pad * 2) / days.length;
  const max = Math.max(10, ...days.map((d) => keys.reduce((a, k) => a + (d[k] || 0), 0)));
  const bars = days.map((d, i) => {
    let y = H - pad;
    const x = pad + i * bw + bw * 0.2;
    const segs = keys.map((k) => {
      const h = ((d[k] || 0) / max) * (H - pad * 2);
      y -= h;
      return h > 0 ? `<rect x="${x}" y="${y}" width="${bw * 0.6}" height="${h}" rx="3" fill="${SKILL_COLORS[k] || '#999'}"><title>${k}: ${Math.round(d[k])} min</title></rect>` : '';
    }).join('');
    return `${segs}<text x="${x + bw * 0.3}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#7d7799">${esc(d.label)}</text>`;
  }).join('');
  const grid = [0, 0.5, 1].map((f) => { const y = H - pad - f * (H - pad * 2); return `<line x1="${pad}" x2="${W - pad}" y1="${y}" y2="${y}" stroke="#eee9fb"/><text x="2" y="${y + 4}" font-size="10" fill="#9b95b5">${Math.round(max * f)}</text>`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutes practised per day">${grid}${bars}</svg>`;
}

export function lineChart(points, { height = 180, suffix = '', max: fixedMax } = {}) {
  const W = 640, H = height, pad = 30;
  if (!points.length) return '<div class="empty">No data yet</div>';
  const max = fixedMax || Math.max(10, ...points.map((p) => p.v));
  const step = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
  const xy = points.map((p, i) => [pad + i * step, H - pad - (p.v / max) * (H - pad * 2)]);
  const path = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const area = `${path} L${xy[xy.length - 1][0]},${H - pad} L${xy[0][0]},${H - pad} Z`;
  const labelEvery = Math.ceil(points.length / 8);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6d4fe0" stop-opacity=".25"/><stop offset="1" stop-color="#6d4fe0" stop-opacity="0"/></linearGradient></defs>
    <line x1="${pad}" x2="${W - pad}" y1="${H - pad}" y2="${H - pad}" stroke="#eee9fb"/>
    <path d="${area}" fill="url(#lg)"/><path d="${path}" fill="none" stroke="#6d4fe0" stroke-width="2.5" stroke-linejoin="round"/>
    ${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#fff" stroke="#6d4fe0" stroke-width="2"><title>${esc(points[i].label)}: ${points[i].v}${suffix}</title></circle>${i % labelEvery === 0 ? `<text x="${x}" y="${H - 10}" font-size="10" text-anchor="middle" fill="#7d7799">${esc(points[i].label)}</text>` : ''}`).join('')}
    <text x="2" y="${pad}" font-size="10" fill="#9b95b5">${Math.round(max)}${suffix}</text>
  </svg>`;
}

export function ring(value, { size = 92, label = '' } = {}) {
  const r = 38, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="${v}% ${esc(label)}">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="#efeafe" stroke-width="10"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(v / 100) * c} ${c}" transform="rotate(-90 50 50)"/>
    <defs><linearGradient id="rg"><stop offset="0" stop-color="#6d4fe0"/><stop offset="1" stop-color="#4f8df7"/></linearGradient></defs>
    <text x="50" y="55" text-anchor="middle" font-size="20" font-weight="800" fill="#1e1838">${Math.round(v)}%</text></svg>`;
}

export function emptyState(emoji, text) { return `<div class="empty"><span class="emoji">${emoji}</span>${esc(text)}</div>`; }
