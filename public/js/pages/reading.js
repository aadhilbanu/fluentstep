import { api, post, logActivity } from '../api.js';
import { state } from '../state.js';
import { $, $$, el, esc, quizEl, startTimer, pct, toast, modal, metricsHtml } from '../ui.js';
import { speak, stopSpeaking, support, Recorder, compareWords } from '../speech.js';
import { READING } from '../content/reading.js';

export async function render(view, { params }) {
  const stopTimer = startTimer('reading', 'reading');
  const { activities } = await api('/activities?module=reading');
  const done = {};
  for (const a of activities) if (a.detail?.id) done[a.detail.id] = Math.max(done[a.detail.id] ?? 0, pct(a.score, a.max_score));
  const p = READING.find((r) => r.id === params[0]);
  let cleanupRec = null;
  if (!p) {
    view.innerHTML = `
      <div class="topbar"><div><h1>📖 Reading Practice</h1><p class="muted" style="margin:0">Read, tap highlighted words for meanings, listen, read aloud and answer questions.</p></div>
      <span class="chip green">${Object.keys(done).length} of ${READING.length} completed</span></div>
      <div class="auto-grid">${READING.map((r) => `<a class="tile" href="#/reading/${r.id}">
        <span class="chip" style="width:fit-content">${esc(r.category)}</span><h3>${esc(r.title)}</h3>
        <p style="text-transform:capitalize">${r.level} · ${r.minutes} min read</p>
        ${done[r.id] != null ? `<span class="chip green" style="width:fit-content">✓ Completed · ${done[r.id]}%</span>` : '<span class="small muted">Not completed</span>'}</a>`).join('')}</div>`;
    return stopTimer;
  }

  const wordRe = new RegExp(`\\b(${Object.keys(p.words).join('|')})\\b`, 'gi');
  const paragraphs = p.text.split(/\n\s*\n/);
  view.innerHTML = `
    <div class="topbar"><div><a class="small" href="#/reading">← All passages</a><h1>${esc(p.title)}</h1><span class="chip">${esc(p.category)}</span> <span class="chip" style="text-transform:capitalize">${p.level}</span></div>
      <div class="row"><button class="btn secondary" id="tts">🔊 Listen</button><select id="rate" style="width:auto;padding:8px">${[0.75, 1, 1.25].map((r) => `<option ${r === 1 ? 'selected' : ''} value="${r}">${r}x</option>`).join('')}</select></div></div>
    <div class="grid split">
      <div class="card"><div class="passage">${paragraphs.map((para, i) => `<p data-para="${i}">${esc(para).replace(wordRe, (w) => `<span class="hw" data-word="${esc(w.toLowerCase())}" tabindex="0" role="button">${w}</span>`)}</p>`).join('')}</div>
        <p class="small muted">Tip: tap a <span class="hw">highlighted word</span> to see its meaning and save it.</p></div>
      <div>
        <div class="card"><h3>🎙️ Read aloud</h3><p class="small muted">Choose a paragraph, read it aloud, and see which words were clear.</p>
          <select id="para">${paragraphs.map((_, i) => `<option value="${i}">Paragraph ${i + 1}</option>`).join('')}</select>
          ${support.mic ? `<div class="mic-wrap"><button class="mic" id="mic" aria-label="Record reading">🎤</button><div class="live small" id="live">${support.stt ? 'Tap and start reading' : 'Speech-to-text needs Chrome or Edge; you can still record and listen back.'}</div></div>` : '<p class="notice">Microphone not supported in this browser.</p>'}
          <div id="aloud"></div></div>
        <div class="card"><h3>Difficult words</h3><div class="row">${Object.keys(p.words).map((w) => `<button class="chip" data-word="${esc(w)}">${esc(w)}</button>`).join('')}</div></div>
      </div>
    </div>
    <div class="card" style="margin-top:16px" id="quiz"><h2>Comprehension questions</h2></div>`;

  let reading = false;
  $('#tts', view).onclick = async () => {
    if (reading) { reading = false; stopSpeaking(); $('#tts', view).textContent = '🔊 Listen'; return; }
    reading = true; $('#tts', view).textContent = '⏸ Stop';
    for (let i = 0; i < paragraphs.length && reading; i++) {
      $$('[data-para]', view).forEach((n) => n.classList.toggle('speaking-line', Number(n.dataset.para) === i));
      await speak(paragraphs[i], { rate: Number($('#rate', view).value) });
    }
    $$('[data-para]', view).forEach((n) => n.classList.remove('speaking-line'));
    reading = false; if ($('#tts', view)) $('#tts', view).textContent = '🔊 Listen';
  };

  view.addEventListener('click', (e) => {
    const w = e.target.closest('[data-word]');
    if (!w) return;
    const key = w.dataset.word;
    const info = p.words[key] || p.words[Object.keys(p.words).find((k) => k.toLowerCase() === key)];
    if (!info) return;
    modal(`<div class="row between"><h2 style="margin:0">${esc(key)}</h2><button class="icon-btn" id="say" aria-label="Pronounce">🔊</button></div>
      <p style="margin-top:10px">${esc(info.meaning)}</p><p class="ta" lang="ta" style="color:var(--violet-600);font-weight:600">${esc(info.tamil)}</p>
      <p class="muted"><i>"${esc(info.example)}"</i></p>
      <div class="row"><button class="btn" id="save">＋ Save to my vocabulary</button><button class="btn ghost" data-close>Close</button></div>`, {
      onMount: (m, close) => {
        $('#say', m).onclick = () => speak(`${key}. ${info.example}`, { rate: 0.9 });
        $('#save', m).onclick = async () => { await post('/vocab', { word: key, ...info, source: `reading: ${p.title}` }); toast('Saved to your vocabulary'); close(); };
      },
    });
  });
  view.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.hw')) e.target.click(); });

  let rec = null;
  $('#mic', view)?.addEventListener('click', async () => {
    const mic = $('#mic', view), live = $('#live', view);
    if (rec) {
      mic.classList.remove('rec'); mic.textContent = '🎤'; live.textContent = 'Checking…';
      const out = await rec.stop();
      rec = null;
      live.textContent = 'Tap to read again';
      const target = paragraphs[$('#para', view).value];
      const box = $('#aloud', view);
      box.innerHTML = out.audioUrl ? `<audio controls src="${out.audioUrl}" style="height:36px;width:100%"></audio>` : '';
      if (!out.transcript) { box.innerHTML += `<p class="notice">${support.stt ? 'I could not hear the words clearly. Try again a little louder.' : 'Listen to your recording and compare it with the text.'}</p>`; return; }
      const cmp = compareWords(target, out.transcript);
      box.innerHTML += `<p><span class="chip ${cmp.accuracy >= 85 ? 'green' : cmp.accuracy >= 65 ? 'amber' : 'red'}">Words read clearly: ${cmp.accuracy}%</span></p>
        <p class="word-diff small">${cmp.ops.filter((o) => o.t !== 'extra').map((o) => `<span class="${o.t === 'ok' ? 'w-ok' : o.t === 'miss' ? 'w-miss' : 'w-wrong'}">${esc(o.w)}</span>`).join('')}</p>
        ${metricsHtml(out.metrics)}`;
      logActivity({ module: 'reading', skill: 'speaking', minutes: 0, score: cmp.accuracy, max_score: 100, detail: { readAloud: p.id } });
      return;
    }
    stopSpeaking();
    rec = new Recorder({ onInterim: (t) => { live.textContent = t.split(' ').slice(-8).join(' ') || 'Listening…'; } });
    try { await rec.start(); mic.classList.add('rec'); mic.textContent = '⏹'; live.textContent = 'Reading… tap again when done.'; } catch { rec = null; live.textContent = 'Microphone permission was denied.'; }
  });
  cleanupRec = () => rec?.stop();

  $('#quiz', view).append(quizEl(p.questions, {
    onDone: (score, max) => {
      logActivity({ module: 'reading', skill: 'reading', minutes: 0, score, max_score: max, detail: { id: p.id, title: p.title } });
      toast('Reading marked as completed');
    },
  }));
  return () => { stopTimer(); stopSpeaking(); cleanupRec?.(); };
}
