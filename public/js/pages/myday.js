import { api, post } from '../api.js';
import { state } from '../state.js';
import { $, el, esc, feedbackEl, voiceInput, startTimer, prettyDate, lineChart, emptyState, toast } from '../ui.js';
import { speak, stopSpeaking } from '../speech.js';
import { JOURNAL_PROMPTS } from '../content/misc.js';

export async function render(view) {
  const stopTimer = startTimer('writing', 'myday');
  const data = await api('/journal');
  const today = data.entries.find((e) => e.day === data.today);
  const answered = today?.entries || [];
  const lastFollow = answered[answered.length - 1]?.follow_up || null;
  let question = lastFollow || JOURNAL_PROMPTS[answered.length % JOURNAL_PROMPTS.length];

  // Improvement over time: average mistakes per 10 words per day (from real entries).
  const trend = [...data.entries].reverse().map((d) => {
    const words = d.entries.reduce((a, e) => a + e.answer.split(/\s+/).length, 0);
    const mistakes = d.entries.reduce((a, e) => a + (e.feedback?.mistakes?.length || 0), 0);
    return { label: d.day.slice(5), v: words ? Math.round((mistakes / words) * 100 * 10) / 10 : 0, words };
  });

  view.innerHTML = `
    <div class="topbar"><div><h1>📔 My Day</h1><p class="muted" style="margin:0">Tell your coach about your day by speaking or typing. You will get gentle corrections and a follow-up question.</p></div></div>
    <div class="grid g2">
      <div class="card">
        <div class="msg ai" style="max-width:100%"><b>Coach:</b> <span id="q">${esc(question)}</span> <button class="btn sm secondary" id="say-q">🔊</button></div>
        <div class="row small" style="margin:10px 0"><span class="muted">Other questions:</span>${JOURNAL_PROMPTS.slice(0, 5).map((p) => `<button class="chip" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div>
        <div id="input"></div>
      </div>
      <div class="card" id="fb"><h3>Feedback</h3><p class="muted">Write at least 2–3 sentences. Your original sentence, the corrected version, a Tamil explanation and a more natural version will appear here.</p></div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title"><h2>Improvement over time</h2><span class="small muted">mistakes per 100 words (lower is better)</span></div>
      ${trend.length >= 2 ? lineChart(trend) : emptyState('📈', 'Write on two or more days to see your improvement chart.')}
    </div>
    <div class="card" style="margin-top:16px"><h2>Journal history</h2><div id="history"></div></div>`;

  const setQ = (q) => { question = q; $('#q', view).textContent = q; };
  $('#say-q', view).onclick = () => speak(question);
  view.addEventListener('click', (e) => { const p = e.target.closest('[data-p]'); if (p) setQ(p.dataset.p); });

  const input = voiceInput({
    rows: 4, submitLabel: 'Check', placeholder: 'Example: Today I went to college and attended a workshop on AI…',
    onSubmit: async (text, meta) => {
      const fbBox = $('#fb', view);
      fbBox.innerHTML = '<p class="typing">Your coach is reading your answer…</p>';
      const out = await post('/journal/answer', { question, text, input: meta.input });
      fbBox.innerHTML = '';
      fbBox.append(feedbackEl(out.feedback, { metrics: meta.input === 'voice' ? meta.metrics : null, source: 'my day', spoken: meta.input === 'voice', record: true }));
      if (out.notice) toast(out.notice);
      if (out.follow_up) { setQ(out.follow_up); speak(out.follow_up); }
      addHistory({ question, answer: text, feedback: out.feedback, at: new Date().toISOString() }, data.today, true);
    },
  });
  $('#input', view).append(input);

  const hist = $('#history', view);
  const addHistory = (entry, day, prepend) => {
    const node = el(`<details class="list-item" style="display:block"><summary style="cursor:pointer"><b>${prettyDate(day)}</b> — ${esc(entry.question)}</summary>
      <p style="margin-top:8px"><b>You wrote:</b> ${esc(entry.answer)}</p></details>`);
    // History shows saved feedback only, so opening the page does not send many checks at once.
    node.append(feedbackEl(entry.feedback, { source: 'my day', enhance: false }));
    prepend ? hist.prepend(node) : hist.append(node);
  };
  if (!data.entries.length) hist.innerHTML = emptyState('📔', 'Your journal entries will be saved here.');
  for (const d of data.entries) for (const e of [...d.entries].reverse()) addHistory(e, d.day);

  return () => { stopTimer(); stopSpeaking(); input.cleanup?.(); };
}
