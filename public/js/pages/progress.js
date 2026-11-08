import { api, del } from '../api.js';
import { esc, fmtMin, pct, lineChart, emptyState, SKILL_COLORS, prettyDate, toast } from '../ui.js';
import { GRAMMAR } from '../content/grammar.js';

export async function render(view, { page }) {
  return page === 'notebook' ? notebook(view) : report(view);
}

const acc = (r) => (r && r.max_score ? pct(r.score, r.max_score) : null);

async function report(view) {
  const [s, { activities: gram }] = await Promise.all([api('/stats'), api('/activities?module=grammar')]);
  const mod = (m) => s.perModule.find((x) => x.module === m) || { n: 0, minutes: 0 };
  const skill = (k) => s.perSkill.find((x) => x.skill === k) || { n: 0, minutes: 0 };
  const speakingCount = ['speaking', 'placement', 'shadowing'].reduce((a, m) => a + mod(m).n, 0);
  const listenAcc = acc(skill('listening'));
  const grammarAcc = acc(mod('grammar'));
  const weekAcc = [acc(s.thisWeek), acc(s.lastWeek)];
  const diff = s.thisWeek.minutes - s.lastWeek.minutes;
  const topicScores = {};
  for (const a of gram) if (a.detail?.topic && a.max_score) (topicScores[a.detail.topic] ??= []).push(pct(a.score, a.max_score));

  view.innerHTML = `
    <div class="topbar"><div><h1>📈 Progress Report</h1><p class="muted" style="margin:0">Every number here comes from activities you actually completed.</p></div></div>
    ${s.totalActivities === 0 && s.totalMinutes === 0 ? '<div class="notice info" style="margin-bottom:16px">No practice recorded yet. Complete any activity and your report will start filling in.</div>' : ''}
    <div class="grid g4">
      <div class="card stat"><div class="stat-ico">⏱️</div><span class="num">${fmtMin(s.totalMinutes)}</span><span class="lbl">total practice time</span></div>
      <div class="card stat"><div class="stat-ico">🗣️</div><span class="num">${speakingCount}</span><span class="lbl">speaking activities</span></div>
      <div class="card stat"><div class="stat-ico">🎧</div><span class="num">${listenAcc ?? '—'}${listenAcc != null ? '%' : ''}</span><span class="lbl">listening accuracy</span></div>
      <div class="card stat"><div class="stat-ico">📖</div><span class="num">${mod('reading').n}</span><span class="lbl">reading activities</span></div>
      <div class="card stat"><div class="stat-ico">✍️</div><span class="num">${grammarAcc ?? '—'}${grammarAcc != null ? '%' : ''}</span><span class="lbl">grammar quiz average</span></div>
      <div class="card stat"><div class="stat-ico">🗂️</div><span class="num">${s.vocabCount}</span><span class="lbl">words saved · ${s.vocabMastered} strong</span></div>
      <div class="card stat"><div class="stat-ico">🔥</div><span class="num">${s.streak}</span><span class="lbl">current streak · best ${s.bestStreak}</span></div>
      <div class="card stat"><div class="stat-ico">📔</div><span class="num">${s.journalDays}</span><span class="lbl">journal days</span></div>
    </div>

    <div class="card" style="margin-top:16px"><div class="card-title"><h2>Daily practice time</h2><span class="small muted">last 30 days (minutes)</span></div>
      ${lineChart(s.last30.map((d) => ({ label: d.day.slice(5), v: Math.round(d.minutes) })), { suffix: ' min' })}</div>

    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>Weekly improvement</h2>
        <table class="simple"><thead><tr><th></th><th>This week</th><th>Last week</th></tr></thead><tbody>
          <tr><td>Practice time</td><td><b>${fmtMin(s.thisWeek.minutes)}</b></td><td>${fmtMin(s.lastWeek.minutes)}</td></tr>
          <tr><td>Activities</td><td><b>${s.thisWeek.n || 0}</b></td><td>${s.lastWeek.n || 0}</td></tr>
          <tr><td>Average score</td><td><b>${weekAcc[0] ?? '—'}${weekAcc[0] != null ? '%' : ''}</b></td><td>${weekAcc[1] ?? '—'}${weekAcc[1] != null ? '%' : ''}</td></tr>
        </tbody></table>
        <p class="small" style="margin-top:10px">${s.lastWeek.minutes === 0 && s.thisWeek.minutes === 0 ? 'Start practising to see your weekly trend.' : diff >= 0 ? `📈 You practised <b>${fmtMin(diff)}</b> more than last week. Keep it up!` : `You practised ${fmtMin(-diff)} less than last week. A short session today will help you catch up.`}</p></div>
      <div class="card"><h2>Monthly improvement</h2>
        ${s.monthly.length ? `<table class="simple"><thead><tr><th>Month</th><th>Time</th><th>Activities</th><th>Avg score</th></tr></thead><tbody>${s.monthly.map((m) => `<tr><td>${new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td><td>${fmtMin(m.minutes)}</td><td>${m.n || 0}</td><td>${acc(m) ?? '—'}${acc(m) != null ? '%' : ''}</td></tr>`).join('')}</tbody></table>` : emptyState('🗓️', 'No monthly data yet.')}</div>
    </div>

    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>Skills breakdown</h2>
        <table class="simple"><thead><tr><th>Skill</th><th>Activities</th><th>Time</th><th>Accuracy</th></tr></thead><tbody>
        ${Object.keys(SKILL_COLORS).map((k) => { const r = skill(k); return `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${SKILL_COLORS[k]};margin-right:6px"></span><span style="text-transform:capitalize">${k}</span></td><td>${r.n}</td><td>${fmtMin(r.minutes || 0)}</td><td>${acc(r) ?? '—'}${acc(r) != null ? '%' : ''}</td></tr>`; }).join('')}
        </tbody></table>
        <p class="small muted" style="margin-top:8px">Speaking accuracy uses shadowing word accuracy and the coach's sentence-formation rating (an AI estimate).</p></div>
      <div class="card"><h2>Grammar quiz scores</h2>
        ${Object.keys(topicScores).length ? `<div class="list">${Object.entries(topicScores).map(([id, sc]) => { const t = GRAMMAR.find((g) => g.id === id); return `<a class="list-item" href="#/grammar/${id}" style="color:inherit"><span>${t?.icon || ''} ${esc(t?.title || id)}</span><span class="spacer"></span><span class="small muted">${sc.length} attempt${sc.length > 1 ? 's' : ''}</span><b>${Math.max(...sc)}%</b></a>`; }).join('')}</div>` : emptyState('✍️', 'Take a grammar mini-quiz to see your scores here.')}</div>
    </div>

    <div class="card" style="margin-top:16px"><div class="card-title"><h2>Frequently repeated mistakes</h2><a class="small" href="#/notebook">Open mistake notebook</a></div>
      ${s.mistakes.length ? `<div class="list">${s.mistakes.map((m) => `<div class="list-item"><span class="chip red">${m.count}×</span><b>${esc(m.type)}</b><span class="spacer"></span><span class="small muted">"${esc(m.wrong)}" → "${esc(m.right)}"</span></div>`).join('')}</div>` : emptyState('🌟', 'No repeated mistakes recorded yet.')}
    </div>`;
}

const TOPIC_HINTS = [
  [/article/i, 'articles'], [/preposition/i, 'prepositions'], [/agreement|subject/i, 'sva'], [/tense|verb form|past|present|future|did/i, 'tenses'],
  [/question/i, 'questions'], [/passive|active|voice/i, 'voice'], [/speech|reported/i, 'speech'], [/order|structure|sentence/i, 'structures'],
  [/conjunction|linker|although/i, 'conjunctions'], [/indian|redundant|extra|since|stative|comparative|introduction|time expression|modal/i, 'common-mistakes'],
];

async function notebook(view) {
  const { mistakes } = await api('/mistakes');
  view.innerHTML = `
    <div class="topbar"><div><h1>📝 Mistake Notebook</h1><p class="muted" style="margin:0">Your coach collects the mistakes you repeat most, from speaking, journal, translation and writing activities.</p></div></div>
    ${mistakes.length ? `<div class="grid g2">${mistakes.map((m) => {
      const topic = TOPIC_HINTS.find(([re]) => re.test(m.type))?.[1];
      const g = GRAMMAR.find((x) => x.id === topic);
      return `<div class="card" style="margin:0"><div class="row between"><h3 style="margin:0">${esc(m.type)}</h3><span class="chip ${m.count >= 3 ? 'red' : 'amber'}">${m.count}× · last ${prettyDate(m.last_seen)}</span></div>
        <p style="margin:10px 0 4px"><del style="color:var(--red)">${esc(m.wrong)}</del> → <b style="color:var(--green)">${esc(m.right)}</b></p>
        <p class="small muted">${esc(m.why || '')}</p>
        <div class="row">${g ? `<a class="btn sm secondary" href="#/grammar/${g.id}">Practise: ${esc(g.title)}</a>` : ''}<button class="btn sm ghost" data-fixed="${m.id}">✓ I've fixed this</button></div></div>`;
    }).join('')}</div>` : `<div class="card">${emptyState('🌟', 'No mistakes recorded yet. Talk with your coach or write in My Day — repeated errors will appear here so you can focus on them.')}</div>`}`;
  view.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fixed]');
    if (b) { await del(`/mistakes/${b.dataset.fixed}`); b.closest('.card').remove(); toast('Great progress! Removed from your notebook.'); }
  });
}
