import { api, post, logActivity } from '../api.js';
import { state } from '../state.js';
import { $, esc, quizEl, startTimer, pct, feedbackEl, toast } from '../ui.js';
import { speak, stopSpeaking } from '../speech.js';
import { GRAMMAR } from '../content/grammar.js';

export async function render(view, { params }) {
  const stopTimer = startTimer('grammar', 'grammar');
  const { activities } = await api('/activities?module=grammar');
  const best = {};
  for (const a of activities) if (a.detail?.topic && a.max_score) best[a.detail.topic] = Math.max(best[a.detail.topic] ?? 0, pct(a.score, a.max_score));
  const t = GRAMMAR.find((g) => g.id === params[0]);

  if (!t) {
    view.innerHTML = `
      <div class="topbar"><div><h1>✍️ Grammar for Speaking</h1><p class="muted" style="margin:0">Practical grammar with simple explanations, Tamil support, examples and quick quizzes.</p></div>
      <span class="chip green">${Object.keys(best).length}/${GRAMMAR.length} topics practised</span></div>
      <div class="auto-grid">${GRAMMAR.map((g) => `<a class="tile" href="#/grammar/${g.id}"><span class="emoji">${g.icon}</span><h3>${esc(g.title)}</h3><p>${esc(g.summary)}</p>
        ${best[g.id] != null ? `<div class="progress"><span style="width:${best[g.id]}%"></span></div><span class="small muted">Best quiz score ${best[g.id]}%</span>` : '<span class="small muted">Not practised yet</span>'}</a>`).join('')}</div>`;
    return stopTimer;
  }

  const i = GRAMMAR.indexOf(t);
  view.innerHTML = `
    <div class="topbar"><div><a class="small" href="#/grammar">← All topics</a><h1>${t.icon} ${esc(t.title)}</h1><p class="muted" style="margin:0">${esc(t.summary)}</p></div>
      ${GRAMMAR[i + 1] ? `<a class="btn ghost" href="#/grammar/${GRAMMAR[i + 1].id}">Next: ${esc(GRAMMAR[i + 1].title)} →</a>` : ''}</div>
    <div class="grid g2">
      <div class="card"><h2>Simple explanation</h2><ul style="padding-left:20px;line-height:1.8">${t.points.map((p) => `<li>${p}</li>`).join('')}</ul>
        <details ${state.user.tamil_help ? 'open' : ''} style="margin-top:10px"><summary style="cursor:pointer;font-weight:700;color:var(--violet)">தமிழில் விளக்கம் (Tamil explanation)</summary><p class="ta" lang="ta" style="margin-top:8px;line-height:1.9">${esc(t.tamil)}</p></details>
      </div>
      <div>
        <div class="card"><h2>Examples</h2><div class="list">${t.examples.map((e, k) => `<div class="list-item" style="display:block"><div class="row"><b style="flex:1">${esc(e.en)}</b><button class="icon-btn" data-ex="${k}" aria-label="Listen">🔊</button></div><div class="small muted">${esc(e.note)}</div></div>`).join('')}</div></div>
        <div class="card"><h2>Speak or write your own</h2><p class="small muted">Make one sentence about your life using this grammar point. Your coach will check it.</p>
          <textarea class="input" id="own" rows="2" placeholder="Write your sentence here…"></textarea><button class="btn" id="check-own" style="margin-top:8px">Check my sentence</button><div id="own-fb" style="margin-top:10px"></div></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px" id="quiz"><h2>Mini quiz</h2><p class="small muted">Answer each question to see instant feedback.</p></div>`;

  view.addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) speak(t.examples[b.dataset.ex].en, { rate: 0.95 }); });
  $('#check-own', view).onclick = async () => {
    const text = $('#own', view).value.trim();
    if (!text) return toast('Please write a sentence first.');
    $('#check-own', view).disabled = true;
    try {
      const out = await post('/ai/review', { kind: `grammar practice on "${t.title}"`, prompt: `Make a sentence using: ${t.title}`, text });
      $('#own-fb', view).innerHTML = '';
      if (out.content_comment) $('#own-fb', view).append(Object.assign(document.createElement('p'), { className: 'notice info', textContent: out.content_comment }));
      $('#own-fb', view).append(feedbackEl(out.feedback, { source: 'grammar', record: true }));
    } finally { $('#check-own', view).disabled = false; }
  };
  $('#quiz', view).append(quizEl(t.quiz, {
    onDone: (score, max) => logActivity({ module: 'grammar', skill: 'grammar', minutes: 0, score, max_score: max, detail: { topic: t.id } }),
  }));
  return () => { stopTimer(); stopSpeaking(); };
}
