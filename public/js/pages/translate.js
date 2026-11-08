import { post, logActivity } from '../api.js';
import { $, $$, esc, startTimer, toast } from '../ui.js';
import { speak } from '../speech.js';
import { checkGrammar, LT_CREDIT } from '../grammarcheck.js';
import { TRANSLATIONS, TRANSLATION_CATEGORIES } from '../content/translation.js';

export async function render(view) {
  const stopTimer = startTimer('writing', 'translation');
  const saved = JSON.parse(localStorage.getItem('fs_tr') || '{}');
  let dir = saved.dir || 'ta-en', cat = saved.cat || 'all', level = saved.level || 1, streak = 0, misses = 0;
  let current = null, seen = new Set();
  const persist = () => localStorage.setItem('fs_tr', JSON.stringify({ dir, cat, level }));

  view.innerHTML = `
    <div class="topbar"><div><h1>🔤 Translation Practice</h1><p class="muted" style="margin:0">Translate and get feedback on meaning and grammar. Different but correct wording is accepted.</p></div></div>
    <div class="card">
      <div class="row between">
        <div class="tabs" style="margin:0" id="dir"><button data-d="ta-en">தமிழ் → English</button><button data-d="en-ta">English → தமிழ்</button></div>
        <div class="row"><select id="cat" style="width:auto"><option value="all">All categories</option>${TRANSLATION_CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('')}</select>
        <span class="chip" id="lvl"></span></div>
      </div>
      <div id="task" style="margin-top:18px"></div>
    </div>
    <div id="result" style="margin-top:16px"></div>`;
  $('#cat').value = cat;

  const pick = () => {
    const pool = TRANSLATIONS.filter((t) => (cat === 'all' || t.cat === cat));
    const byLevel = pool.filter((t) => t.level === level && !seen.has(t));
    const choices = byLevel.length ? byLevel : pool.filter((t) => !seen.has(t));
    if (!choices.length) { seen = new Set(); return pick(); }
    current = choices[Math.floor(Math.random() * choices.length)];
    seen.add(current);
    draw();
  };
  const draw = () => {
    $$('#dir button').forEach((b) => b.classList.toggle('on', b.dataset.d === dir));
    $('#lvl').textContent = `Difficulty ${'●'.repeat(level)}${'○'.repeat(3 - level)}`;
    const src = dir === 'ta-en' ? current.ta : current.en;
    $('#task').innerHTML = `
      <div class="small muted" style="font-weight:700">${dir === 'ta-en' ? 'Translate into English' : 'தமிழில் மொழிபெயர்க்கவும் (Translate into Tamil)'} · ${TRANSLATION_CATEGORIES.find((c) => c.id === current.cat).label}</div>
      <p class="${dir === 'ta-en' ? 'ta' : ''}" lang="${dir === 'ta-en' ? 'ta' : 'en'}" style="font-size:1.35rem;font-weight:700;margin:8px 0 14px">${esc(src)} ${dir === 'en-ta' ? '<button class="icon-btn" id="say">🔊</button>' : ''}</p>
      <textarea class="input ${dir === 'en-ta' ? 'ta' : ''}" id="answer" rows="2" placeholder="${dir === 'ta-en' ? 'Type your English translation…' : 'உங்கள் தமிழ் மொழிபெயர்ப்பை இங்கே எழுதுங்கள்…'}"></textarea>
      <div class="row" style="margin-top:10px"><button class="btn" id="check">Check</button><button class="btn ghost" id="skip">Skip</button><button class="btn ghost" id="show">Show answer</button></div>`;
    $('#result').innerHTML = '';
    $('#say')?.addEventListener('click', () => speak(current.en));
    $('#check').onclick = check;
    $('#skip').onclick = pick;
    $('#show').onclick = () => {
      $('#result').innerHTML = `<div class="card"><h3>Model answer</h3><p style="font-size:1.1rem">${esc(dir === 'ta-en' ? current.en : current.ta)}</p>${dir === 'ta-en' && current.alt.length ? `<p class="small muted">Also correct: ${current.alt.map(esc).join(' · ')}</p>` : ''}<button class="btn" id="nx">Next sentence →</button></div>`;
      $('#nx').onclick = pick;
    };
    $('#answer').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(); } });
    $('#answer').focus();
  };

  async function check() {
    const answer = $('#answer').value.trim();
    if (!answer) return toast('Please type your translation first.');
    $('#check').disabled = true;
    $('#result').innerHTML = '<div class="card typing">Checking your translation…</div>';
    try {
      const r = await post('/ai/translate', dir === 'ta-en'
        ? { direction: dir, source: current.ta, reference: current.en, alternatives: current.alt, answer }
        : { direction: dir, source: current.en, reference: current.ta, alternatives: [], answer });
      // The offline checker only compares words, so it never marks an answer wrong by itself:
      // the learner compares meaning with the model answers and decides.
      const unsure = r.mode === 'offline' && r.verdict !== 'correct';
      const good = r.verdict === 'correct', almost = r.verdict === 'almost' && !unsure;
      if (good) { streak++; misses = 0; } else if (!almost && !unsure) { misses++; streak = 0; }
      let levelMsg = '';
      if (streak >= 3 && level < 3) { level++; streak = 0; levelMsg = '🎉 Great work! Moving up to harder sentences.'; }
      if (misses >= 2 && level > 1) { level--; misses = 0; levelMsg = 'Let\'s practise a few easier sentences first.'; }
      persist();
      const detail = { dir, cat: current.cat, level: current.level };
      if (!unsure) logActivity({ module: 'translation', skill: 'writing', minutes: 0, score: good ? 1 : almost ? 0.5 : 0, max_score: 1, detail });
      $('#result').innerHTML = `<div class="card">
        <div class="row"><span class="chip ${good ? 'green' : almost || unsure ? 'amber' : 'red'}" style="font-size:1rem">${good ? '✅ Correct' : unsure ? '🔎 Compare with the model answer' : almost ? '🟡 Almost there' : '❌ Needs work'}</span>
          ${unsure ? '' : `<span class="chip ${r.meaning_ok ? 'green' : 'red'}">Meaning ${r.meaning_ok ? '✓' : '✗'}</span><span class="chip ${r.grammar_ok ? 'green' : 'red'}">Grammar ${r.grammar_ok ? '✓' : '✗'}</span>`}
          ${r.mode === 'offline' ? '<span class="chip amber">Offline check</span>' : ''}</div>
        ${unsure ? '<div class="row" style="margin-top:10px"><span class="small muted">Does your answer mean the same?</span><button class="btn sm secondary" data-self="1">✓ Yes, same meaning</button><button class="btn sm ghost" data-self="0">✗ No, mine was different</button></div>' : ''}
        ${levelMsg ? `<p class="notice info" style="margin-top:10px">${levelMsg}</p>` : ''}
        <h4 style="margin:14px 0 4px">Your answer</h4><p>${esc(answer)}</p>
        <h4 style="margin:10px 0 4px">Suggested answer</h4><p style="font-size:1.1rem;font-weight:600" class="${dir === 'en-ta' ? 'ta' : ''}">${esc(r.model_answer)} ${dir === 'ta-en' ? `<button class="icon-btn" id="say-ans">🔊</button>` : ''}</p>
        <h4 style="margin:10px 0 4px">Why</h4><p>${esc(r.explanation)}</p>
        ${r.explanation_ta ? `<details open><summary style="cursor:pointer;font-weight:700;color:var(--violet)">தமிழில் விளக்கம்</summary><p class="ta" lang="ta">${esc(r.explanation_ta)}</p></details>` : ''}
        ${r.mistakes?.length ? `<h4 style="margin:10px 0 4px">Grammar points</h4><ul>${r.mistakes.map((m) => `<li><b>${esc(m.type)}:</b> "${esc(m.wrong)}" → "${esc(m.right)}". ${esc(m.why)}</li>`).join('')}</ul>` : ''}
        ${r.alternatives?.length ? `<h4 style="margin:10px 0 4px">Other natural ways to say it</h4><ul>${r.alternatives.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
        <button class="btn" id="nx" style="margin-top:10px">Next sentence →</button></div>`;
      $('#say-ans')?.addEventListener('click', () => speak(r.model_answer));
      if (r.mode === 'offline' && dir === 'ta-en') {
        const gc = await checkGrammar(answer);
        if (gc?.mistakes.length && $('#nx')) {
          $('#nx').insertAdjacentHTML('beforebegin', `<h4 style="margin:10px 0 4px">Grammar in your answer</h4><ul>${gc.mistakes.map((m) => `<li><b>${esc(m.type)}:</b> "${esc(m.wrong)}" → "${esc(m.right)}". ${esc(m.why)}</li>`).join('')}</ul><p class="small muted">Grammar check powered by ${LT_CREDIT}</p>`);
          post('/mistakes', { mistakes: gc.mistakes }).catch(() => {});
        }
      }
      $$('[data-self]').forEach((b) => (b.onclick = () => {
        const ok = b.dataset.self === '1';
        logActivity({ module: 'translation', skill: 'writing', minutes: 0, score: ok ? 1 : 0, max_score: 1, detail: { ...detail, selfMarked: true } });
        if (ok) { streak++; misses = 0; } else { misses++; streak = 0; }
        b.parentElement.innerHTML = `<span class="chip ${ok ? 'green' : 'amber'}">${ok ? 'Marked as correct' : 'Noted — study the model answer'}</span>`;
      }));
      $('#nx').onclick = pick;
      if (r.notice) toast(r.notice);
    } finally { if ($('#check')) $('#check').disabled = false; }
  }

  $$('#dir button').forEach((b) => (b.onclick = () => { dir = b.dataset.d; persist(); draw(); }));
  $('#cat').onchange = (e) => { cat = e.target.value; seen = new Set(); persist(); pick(); };
  pick();
  return stopTimer;
}
