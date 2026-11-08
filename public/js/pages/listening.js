import { api, logActivity } from '../api.js';
import { state } from '../state.js';
import { $, $$, el, esc, quizEl, startTimer, pct, toast } from '../ui.js';
import { speakDialogue, speak, stopSpeaking, support } from '../speech.js';
import { LISTENING } from '../content/listening.js';

export async function render(view, { params }) {
  const stopTimer = startTimer('listening', 'listening');
  const item = LISTENING.find((l) => l.id === params[0]);
  if (item) await detail(view, item); else await list(view);
  return () => { stopTimer(); stopSpeaking(); };
}

async function list(view) {
  const { activities } = await api('/activities?module=listening');
  const best = {};
  for (const a of activities) if (a.detail?.id && a.max_score) best[a.detail.id] = Math.max(best[a.detail.id] || 0, pct(a.score, a.max_score));
  let level = state.user.level === 'advanced' ? 'advanced' : state.user.level;
  const draw = () => {
    view.innerHTML = `
      <div class="topbar"><div><h1>🎧 Listening Practice</h1><p class="muted" style="margin:0">Listen to conversations, stories and news. Change the speed, repeat, and answer questions.</p></div></div>
      ${support.tts ? '' : '<div class="notice" style="margin-bottom:16px">Your browser does not support text-to-speech audio. You can still read the transcript and answer the questions.</div>'}
      <div class="tabs">${['beginner', 'intermediate', 'advanced'].map((l) => `<button data-l="${l}" class="${l === level ? 'on' : ''}" style="text-transform:capitalize">${l}</button>`).join('')}</div>
      <div class="auto-grid">${LISTENING.filter((l) => l.level === level).map((l) => `<a class="tile" href="#/listening/${l.id}">
        <span class="chip blue" style="width:fit-content">${esc(l.kind)}</span><h3>${esc(l.title)}</h3>
        <p>${l.lines.length} lines · ${l.questions.length + l.blanks.length} questions</p>
        ${best[l.id] != null ? `<span class="chip green" style="width:fit-content">Best score ${best[l.id]}%</span>` : '<span class="small muted">Not attempted</span>'}</a>`).join('')}</div>`;
    $$('.tabs button', view).forEach((b) => (b.onclick = () => { level = b.dataset.l; draw(); }));
  };
  draw();
}

async function detail(view, item) {
  let rate = 1, playing = false, stop = false;
  view.innerHTML = `
    <div class="topbar"><div><a class="small" href="#/listening">← All listening</a><h1>${esc(item.title)}</h1><span class="chip blue">${esc(item.kind)}</span> <span class="chip" style="text-transform:capitalize">${item.level}</span></div></div>
    <div class="grid g2">
      <div class="card">
        <h3>1. Listen</h3>
        <p class="muted small">Listen first without reading. Then replay and check the transcript.</p>
        <div class="row" style="margin:12px 0">
          <button class="btn lg" id="play">▶ Play</button>
          <button class="btn secondary" id="repeat" title="Play again from the start">↺ Repeat</button>
          <div class="tabs" style="margin:0" id="speed">${[0.75, 1, 1.25].map((r) => `<button data-r="${r}" class="${r === 1 ? 'on' : ''}">${r}x</button>`).join('')}</div>
        </div>
        <button class="btn ghost sm" id="toggle-tx">👁 Show transcript</button>
        <div id="tx" class="hidden stack" style="margin-top:12px">${item.lines.map((l, i) => `<div class="list-item" data-line="${i}" style="cursor:pointer" title="Click to hear this line"><b style="min-width:70px">${esc(l.s)}</b><span>${esc(l.t)}</span></div>`).join('')}</div>
      </div>
      <div class="card" id="questions">
        <h3>2. Answer the questions</h3>
        <div id="mcq"></div>
        <h3 style="margin-top:20px">3. Fill in the missing word</h3>
        <div class="stack" id="blanks">${item.blanks.map((b, i) => `<div class="row" data-b="${i}"><span style="flex:1;min-width:200px">${esc(b.text).replace('___', `<input class="input" style="width:150px;display:inline-block;padding:6px 10px" aria-label="Missing word ${i + 1}">`)}</span><span class="res small"></span></div>`).join('')}
        <button class="btn secondary" id="check-blanks">Check answers</button></div>
        <div id="final" style="margin-top:16px"></div>
      </div>
    </div>`;

  const play = async () => {
    if (playing) { stop = true; stopSpeaking(); return; }
    playing = true; stop = false;
    $('#play').textContent = '⏸ Stop';
    await speakDialogue(item.lines, {
      rate,
      shouldStop: () => stop,
      onLine: (i) => $$('[data-line]', view).forEach((n) => n.classList.toggle('speaking-line', Number(n.dataset.line) === i)),
    });
    playing = false;
    if ($('#play')) $('#play').textContent = '▶ Play';
  };
  $('#play').onclick = play;
  $('#repeat').onclick = () => { stop = true; stopSpeaking(); setTimeout(() => { playing = false; play(); }, 150); };
  $$('#speed button').forEach((b) => (b.onclick = () => { rate = Number(b.dataset.r); $$('#speed button').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#toggle-tx').onclick = (e) => { const tx = $('#tx'); tx.classList.toggle('hidden'); e.target.textContent = tx.classList.contains('hidden') ? '👁 Show transcript' : '🙈 Hide transcript'; };
  $('#tx').onclick = (e) => { const n = e.target.closest('[data-line]'); if (n) speak(item.lines[n.dataset.line].t, { rate, voiceIndex: [...new Set(item.lines.map((l) => l.s))].indexOf(item.lines[n.dataset.line].s) }); };

  let mcq = null, blanks = null;
  const finish = () => {
    if (mcq == null || blanks == null) return;
    const score = mcq + blanks, max = item.questions.length + item.blanks.length;
    $('#final').innerHTML = `<div class="notice ${score / max >= 0.7 ? 'ok' : 'info'}"><b>Total score: ${score}/${max} (${pct(score, max)}%)</b><br>${score === max ? 'Perfect listening! Try the next level.' : 'Tip: replay at 0.75x with the transcript to catch the words you missed.'}</div>`;
    logActivity({ module: 'listening', skill: 'listening', minutes: 0, score, max_score: max, detail: { id: item.id, title: item.title } });
    toast('Result saved to your progress');
  };
  $('#mcq').append(quizEl(item.questions, { onDone: (c) => { mcq = c; finish(); } }));
  $('#check-blanks').onclick = () => {
    let c = 0;
    item.blanks.forEach((b, i) => {
      const row = $(`[data-b="${i}"]`, view);
      const v = $('input', row).value.trim().toLowerCase();
      const ok = [b.answer, ...(b.accept || [])].some((a) => a.toLowerCase() === v);
      if (ok) c++;
      $('.res', row).innerHTML = ok ? '✅' : `❌ <b>${esc(b.answer)}</b>`;
      $('input', row).disabled = true;
    });
    $('#check-blanks').disabled = true;
    blanks = c;
    finish();
  };
}
