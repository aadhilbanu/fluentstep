import { api, post, del, logActivity } from '../api.js';
import { $, $$, el, esc, startTimer, quizEl, toast, emptyState } from '../ui.js';
import { speak, stopSpeaking } from '../speech.js';
import { WORDS, PHRASAL_VERBS, PHRASES } from '../content/vocab.js';

const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const BOX_LABEL = ['New', 'Learning', 'Learning', 'Familiar', 'Strong', 'Mastered'];

export async function render(view, { params }) {
  const stopTimer = startTimer('vocabulary', 'vocabulary');
  let tab = params[0] || 'review';
  let data = await api('/vocab');

  const draw = () => {
    view.innerHTML = `
      <div class="topbar"><div><h1>🗂️ Vocabulary Builder</h1><p class="muted" style="margin:0">Save words from anywhere in FluentStep. Review them with spaced repetition so you never forget.</p></div>
        <div class="row"><span class="chip">${data.words.length} saved</span><span class="chip ${data.due.length ? 'amber' : 'green'}">${data.due.length} due today</span></div></div>
      <div class="tabs">${[['review', 'Daily revision'], ['mine', 'My words'], ['learn', 'Word list'], ['phrasal', 'Phrasal verbs & phrases'], ['quiz', 'Meaning quiz']].map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="pane"></div>`;
    $$('.tabs button', view).forEach((b) => (b.onclick = () => { tab = b.dataset.t; history.replaceState(null, '', `#/vocab/${tab}`); draw(); }));
    ({ review, mine, learn, phrasal, quiz })[tab]?.($('#pane', view));
  };

  const refresh = async () => { data = await api('/vocab'); };

  function review(pane) {
    const queue = shuffle(data.due);
    let i = 0, known = 0;
    if (!queue.length) {
      pane.innerHTML = `<div class="card">${emptyState('🎉', data.words.length ? 'No words due today. Come back tomorrow, or add new words from the Word list.' : 'You have not saved any words yet. Save words from the Word list, reading passages or coach feedback.')}
        <div class="row" style="justify-content:center"><button class="btn secondary" id="go-learn">Browse the word list</button></div></div>`;
      $('#go-learn').onclick = () => { tab = 'learn'; draw(); };
      return;
    }
    const card = () => {
      const w = queue[i];
      if (!w) {
        logActivity({ module: 'vocabulary', skill: 'vocabulary', minutes: 0, score: known, max_score: queue.length, detail: { review: true } });
        pane.innerHTML = `<div class="card" style="text-align:center"><h2>Revision complete! 🎉</h2><p>You remembered <b>${known} of ${queue.length}</b> words.</p><p class="muted">Words you knew will come back later; words you missed will come back tomorrow.</p></div>`;
        refresh();
        return;
      }
      pane.innerHTML = `<div style="max-width:520px;margin:0 auto">
        <div class="row between small muted" style="margin-bottom:8px"><span>Card ${i + 1} of ${queue.length}</span><span>${BOX_LABEL[w.box]}</span></div>
        <div class="flash" id="flash" tabindex="0" role="button" aria-label="Flip card"><div class="flash-inner">
          <div class="flash-face"><div class="big">${esc(w.word)}</div><p class="muted small">Do you remember the meaning? Tap to flip.</p></div>
          <div class="flash-face back"><div style="font-weight:800;font-size:1.3rem">${esc(w.word)}</div><p style="margin:6px 0">${esc(w.meaning || '')}</p>${w.tamil ? `<p class="ta" lang="ta" style="color:var(--violet-600);font-weight:600">${esc(w.tamil)}</p>` : ''}${w.example ? `<p class="small muted"><i>${esc(w.example)}</i></p>` : ''}</div>
        </div></div>
        <div class="row" style="justify-content:center;margin-top:14px"><button class="icon-btn" id="say" aria-label="Pronounce">🔊</button><button class="btn danger" id="no">✗ I forgot</button><button class="btn" id="yes">✓ I knew it</button></div></div>`;
      const flash = $('#flash');
      flash.onclick = () => flash.classList.toggle('flip');
      flash.onkeydown = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flash.click(); } };
      $('#say').onclick = () => speak(w.word, { rate: 0.85 });
      const answer = async (ok) => { await post(`/vocab/${w.id}/review`, { correct: ok }); if (ok) known++; i++; card(); };
      $('#yes').onclick = () => answer(true);
      $('#no').onclick = () => answer(false);
    };
    card();
  }

  function mine(pane) {
    pane.innerHTML = `<div class="card">
      <form class="row" id="add" style="align-items:flex-end;margin-bottom:14px">
        <div style="flex:1;min-width:140px"><label for="nw">Add a word</label><input class="input" id="nw" required maxlength="60"></div>
        <div style="flex:2;min-width:200px"><label for="nm">Meaning (English or Tamil)</label><input class="input" id="nm" maxlength="300"></div>
        <button class="btn">Add</button></form>
      ${data.words.length ? `<div class="scroll-x"><table class="simple"><thead><tr><th>Word</th><th>Meaning</th><th>Strength</th><th>Next review</th><th></th></tr></thead><tbody>
      ${data.words.map((w) => `<tr><td><b>${esc(w.word)}</b> <button class="btn sm ghost" data-say="${esc(w.word)}" aria-label="Pronounce">🔊</button></td><td>${esc(w.meaning || '')}${w.tamil ? `<div class="ta small muted">${esc(w.tamil)}</div>` : ''}</td><td><span class="chip ${w.box >= 4 ? 'green' : w.box >= 2 ? 'blue' : ''}">${BOX_LABEL[w.box]}</span></td><td class="small">${w.due_day}</td><td><button class="btn sm ghost" data-del="${w.id}" aria-label="Delete">🗑</button></td></tr>`).join('')}
      </tbody></table></div>` : emptyState('🗂️', 'No saved words yet.')}</div>`;
    $('#add').onsubmit = async (e) => { e.preventDefault(); await post('/vocab', { word: $('#nw').value, meaning: $('#nm').value, source: 'manual' }); await refresh(); toast('Word added'); draw(); };
    pane.onclick = async (e) => {
      const s = e.target.closest('[data-say]'); if (s) speak(s.dataset.say, { rate: 0.85 });
      const d = e.target.closest('[data-del]'); if (d) { await del(`/vocab/${d.dataset.del}`); await refresh(); draw(); }
    };
  }

  function learn(pane) {
    const savedSet = new Set(data.words.map((w) => w.word.toLowerCase()));
    pane.innerHTML = `<div class="auto-grid">${WORDS.map((w, i) => `<div class="card" style="margin:0">
      <div class="row between"><h3 style="margin:0">${esc(w.word)}</h3><button class="icon-btn" data-say="${i}" aria-label="Pronounce">🔊</button></div>
      <div class="small muted">${esc(w.pos)}</div><p style="margin:6px 0 2px">${esc(w.meaning)}</p><p class="ta small" lang="ta" style="color:var(--violet-600)">${esc(w.tamil)}</p>
      <p class="small"><i>${esc(w.example)}</i></p>
      ${w.syn.length ? `<p class="small muted">≈ ${w.syn.map(esc).join(', ')}${w.ant.length ? ` · ≠ ${w.ant.map(esc).join(', ')}` : ''}</p>` : ''}
      <button class="btn sm ${savedSet.has(w.word) ? 'ghost' : 'secondary'}" data-save="${i}" ${savedSet.has(w.word) ? 'disabled' : ''}>${savedSet.has(w.word) ? '✓ Saved' : '＋ Save for revision'}</button></div>`).join('')}</div>`;
    pane.onclick = async (e) => {
      const s = e.target.closest('[data-say]');
      if (s) { const w = WORDS[s.dataset.say]; await speak(w.word, { rate: 0.85 }); speak(w.example); }
      const b = e.target.closest('[data-save]');
      if (b) { const w = WORDS[b.dataset.save]; await post('/vocab', { word: w.word, meaning: w.meaning, tamil: w.tamil, example: w.example, source: 'word list' }); b.textContent = '✓ Saved'; b.disabled = true; b.className = 'btn sm ghost'; refresh(); }
    };
  }

  function phrasal(pane) {
    pane.innerHTML = `<div class="grid g2"><div class="card"><h2>Phrasal verbs</h2><div class="list">${PHRASAL_VERBS.map((p, i) => `<div class="list-item" style="display:block"><div class="row"><b style="flex:1">${esc(p.phrase)}</b><button class="icon-btn" data-pv="${i}" aria-label="Listen">🔊</button><button class="btn sm secondary" data-save-pv="${i}">＋</button></div><div class="small">${esc(p.meaning)} · <span class="ta">${esc(p.tamil)}</span></div><div class="small muted"><i>${esc(p.example)}</i></div></div>`).join('')}</div></div>
      <div class="card"><h2>Useful phrases for conversation</h2><div class="list">${PHRASES.map((p, i) => `<div class="list-item" style="display:block"><div class="row"><b style="flex:1">${esc(p.phrase)}</b><button class="icon-btn" data-ph="${i}" aria-label="Listen">🔊</button></div><div class="small muted">${esc(p.use)}</div><div class="small ta" lang="ta">${esc(p.tamil)}</div></div>`).join('')}</div></div></div>`;
    pane.onclick = async (e) => {
      const a = e.target.closest('[data-pv]'); if (a) speak(`${PHRASAL_VERBS[a.dataset.pv].phrase}. ${PHRASAL_VERBS[a.dataset.pv].example}`);
      const b = e.target.closest('[data-ph]'); if (b) speak(PHRASES[b.dataset.ph].phrase);
      const c = e.target.closest('[data-save-pv]');
      if (c) { const p = PHRASAL_VERBS[c.dataset.savePv]; await post('/vocab', { word: p.phrase, meaning: p.meaning, tamil: p.tamil, example: p.example, source: 'phrasal verbs' }); c.textContent = '✓'; c.disabled = true; toast('Saved'); refresh(); }
    };
  }

  function quiz(pane) {
    const items = shuffle(WORDS).slice(0, 6).map((w) => {
      const wrong = shuffle(WORDS.filter((x) => x !== w)).slice(0, 3).map((x) => x.meaning);
      const options = shuffle([w.meaning, ...wrong]);
      return { q: `What does "${w.word}" mean?`, options, answer: options.indexOf(w.meaning), explain: `${w.word}: ${w.meaning} (${w.tamil}). Example: ${w.example}` };
    });
    pane.innerHTML = '<div class="card"></div>';
    pane.firstChild.append(quizEl(items, { title: 'Choose the correct meaning', onDone: (s, m) => logActivity({ module: 'vocabulary', skill: 'vocabulary', minutes: 0, score: s, max_score: m, detail: { quiz: true } }) }));
    pane.firstChild.append(el('<button class="btn secondary" style="margin-top:12px">New quiz</button>'));
    pane.firstChild.lastChild.onclick = () => quiz(pane);
  }

  draw();
  return () => { stopTimer(); stopSpeaking(); };
}
