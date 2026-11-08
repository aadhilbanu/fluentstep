import { logActivity } from '../api.js';
import { state } from '../state.js';
import { $, $$, esc, startTimer, metricsHtml, toast } from '../ui.js';
import { speak, stopSpeaking, support, Recorder, compareWords } from '../speech.js';
import { SHADOWING } from '../content/listening.js';

export async function render(view, { params }) {
  const stopTimer = startTimer('speaking', 'shadowing');
  let level = ['beginner', 'intermediate', 'advanced'].includes(params[0]) ? params[0] : state.user.level;
  let custom = null;
  if (params[0] === 'custom') {
    try { custom = JSON.parse(sessionStorage.getItem('fs_shadow_custom') || 'null'); } catch { custom = null; }
    level = 'custom';
  }
  let idx = 0, rec = null;
  const sentences = () => (level === 'custom' ? custom || [] : SHADOWING[level]);

  const draw = () => {
    const list = sentences();
    const sentence = list[idx];
    let listens = 0, rate = 1;
    view.innerHTML = `
      <div class="topbar"><div><h1>🔁 Shadowing Practice</h1><p class="muted" style="margin:0">Listen → repeat → compare. Your accent is welcome — we only check clarity, words and pace, never "native-ness".</p></div></div>
      <div class="tabs">${['beginner', 'intermediate', 'advanced'].map((l) => `<button data-l="${l}" class="${l === level ? 'on' : ''}" style="text-transform:capitalize">${l}</button>`).join('')}<button data-l="custom" class="${level === 'custom' ? 'on' : ''}">My sentences</button></div>
      ${level === 'custom' && !list.length ? customForm() : `
      <div class="grid g2">
        <div class="card">
          <div class="row between"><span class="chip">Sentence ${idx + 1} of ${list.length}</span><div class="row"><button class="btn sm ghost" id="prev" ${idx === 0 ? 'disabled' : ''}>←</button><button class="btn sm ghost" id="next" ${idx >= list.length - 1 ? 'disabled' : ''}>→</button></div></div>
          <h3 style="margin-top:16px">Step 1 · Listen (as many times as you like)</h3>
          <div class="row"><button class="btn lg" id="listen">🔊 Listen</button>
            <div class="tabs" style="margin:0" id="speed">${[0.75, 1, 1.25].map((r) => `<button data-r="${r}" class="${r === 1 ? 'on' : ''}">${r}x</button>`).join('')}</div>
            <span class="small muted" id="count">Played 0 times</span></div>
          <h3 style="margin-top:18px">Step 2 · Read the sentence</h3>
          <p id="sentence" class="passage" style="font-size:1.25rem;font-weight:600">${esc(sentence)}</p>
          <button class="btn sm ghost" id="slow">🐢 Play slowly, word by word</button>
          <h3 style="margin-top:18px">Step 3 · Record yourself</h3>
          ${support.mic ? `<div class="mic-wrap"><button class="mic" id="mic" aria-label="Record">🎤</button><div class="level-meter"><span id="meter"></span></div><div class="live small" id="live">${support.stt ? 'Tap and repeat the sentence' : 'Speech-to-text is not available in this browser (use Chrome/Edge). You can still record and compare by ear.'}</div></div>` : '<div class="notice">Microphone recording is not supported in this browser. Practise by listening and repeating aloud.</div>'}
        </div>
        <div class="card" id="result"><h3>Your feedback</h3><p class="muted">Record yourself to see word accuracy, missing words, pace and pauses.</p></div>
      </div>`}
      ${level !== 'custom' || list.length ? `<p class="small muted" style="margin-top:12px">Want to shadow your own material (for example, a short TED excerpt you are allowed to use)? Choose <b>My sentences</b>.</p>` : ''}`;

    $$('.tabs [data-l]', view).forEach((b) => (b.onclick = () => { level = b.dataset.l; idx = 0; if (level === 'custom') { try { custom = JSON.parse(sessionStorage.getItem('fs_shadow_custom') || 'null'); } catch { custom = null; } } draw(); }));
    if (level === 'custom' && !list.length) {
      $('#save-custom').onclick = () => {
        const lines = $('#custom-text').value.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 2).slice(0, 30);
        if (!lines.length) return toast('Please paste at least one sentence.');
        custom = lines;
        sessionStorage.setItem('fs_shadow_custom', JSON.stringify(lines));
        draw();
      };
      return;
    }
    $('#prev').onclick = () => { idx--; draw(); };
    $('#next').onclick = () => { idx++; draw(); };
    $$('#speed button').forEach((b) => (b.onclick = () => { rate = Number(b.dataset.r); $$('#speed button').forEach((x) => x.classList.toggle('on', x === b)); }));
    $('#listen').onclick = async () => { listens++; $('#count').textContent = `Played ${listens} time${listens > 1 ? 's' : ''}`; await speak(sentence, { rate }); };
    $('#slow').onclick = async () => { for (const w of sentence.split(/\s+/)) { await speak(w.replace(/[^\w']/g, ''), { rate: 0.8 }); } };

    $('#mic')?.addEventListener('click', async () => {
      const mic = $('#mic'), live = $('#live');
      if (rec) {
        mic.classList.remove('rec'); mic.textContent = '🎤';
        live.textContent = 'Checking…';
        const out = await rec.stop();
        rec = null;
        $('#meter').style.width = '0';
        live.textContent = 'Tap to try again';
        showResult(sentence, out);
        return;
      }
      stopSpeaking();
      rec = new Recorder({ onInterim: (t) => { live.textContent = t || 'Listening…'; }, onLevel: (l) => { $('#meter').style.width = `${l * 100}%`; } });
      try { await rec.start(); mic.classList.add('rec'); mic.textContent = '⏹'; live.textContent = 'Speak now… tap again when done.'; } catch { rec = null; live.textContent = 'Microphone permission was denied.'; }
    });
  };

  const showResult = (sentence, out) => {
    const box = $('#result');
    const audio = out.audioUrl ? `<div class="row" style="margin:8px 0"><audio controls src="${out.audioUrl}" style="height:36px"></audio><button class="btn sm secondary" id="orig">🔊 Original</button></div>` : '';
    if (!out.transcript) {
      box.innerHTML = `<h3>Your feedback</h3>${audio}<p class="notice">${support.stt ? 'I could not hear any words. Please speak a little louder and closer to the microphone.' : 'Speech-to-text is not available here, so I can\'t compare words. Listen to your recording and the original, and compare them yourself.'}</p>`;
      $('#orig', box)?.addEventListener('click', () => speak(sentence));
      return;
    }
    const cmp = compareWords(sentence, out.transcript);
    const m = out.metrics;
    const targetWords = sentence.split(/\s+/).length;
    const clarity = cmp.accuracy >= 90 ? ['Very clear', 'green'] : cmp.accuracy >= 70 ? ['Mostly clear', 'amber'] : ['Needs more practice', 'red'];
    const tips = [];
    if (cmp.missing.length) tips.push(`You skipped ${cmp.missing.length} word${cmp.missing.length > 1 ? 's' : ''}. Small words like "the", "a", "to" matter — say every word.`);
    if (cmp.wrong.length) tips.push('Practise the highlighted words slowly at 0.75x, then at normal speed. Stress the main syllable clearly.');
    if (m.wpm && m.wpm < 90) tips.push('Your pace is a little slow. Try to say the sentence in one smooth breath.');
    if (m.wpm && m.wpm > 175) tips.push('You are speaking quite fast. Slow down slightly so every word is clear.');
    if (m.long_pauses > 0 && targetWords < 15) tips.push(`There ${m.long_pauses > 1 ? `were ${m.long_pauses} long pauses` : 'was 1 long pause'}. Listen again and try to keep the words flowing.`);
    if (!tips.length) tips.push('Excellent! Try the next sentence, or practise at 1.25x speed for a challenge.');
    const practise = [...new Set([...cmp.missing, ...cmp.wrong.map((w) => w.w)])];
    box.innerHTML = `<h3>Your feedback</h3>
      <div class="row"><span class="chip ${cmp.accuracy >= 90 ? 'green' : cmp.accuracy >= 70 ? 'amber' : 'red'}" style="font-size:1rem">Word accuracy ${cmp.accuracy}%</span><span class="chip ${clarity[1]}">Clarity: ${clarity[0]}</span></div>
      ${audio}
      <h4 style="margin:12px 0 4px">What I heard</h4><p class="notice info">"${esc(out.transcript)}"</p>
      <h4 style="margin:12px 0 4px">Word by word</h4>
      <p class="word-diff">${cmp.ops.map((o) => o.t === 'ok' ? `<span class="w-ok">${esc(o.w)}</span>` : o.t === 'miss' ? `<span class="w-miss" title="Missing">${esc(o.w)}</span>` : o.t === 'wrong' ? `<span class="w-wrong" title="Heard: ${esc(o.heard)}">${esc(o.w)} → ${esc(o.heard)}</span>` : `<span class="w-extra" title="Extra word">+${esc(o.w)}</span>`).join('')}</p>
      <p class="small muted"><span class="w-ok" style="padding:1px 4px">correct</span> <span class="w-miss" style="padding:1px 4px">missing</span> <span class="w-wrong" style="padding:1px 4px">different</span> <span class="w-extra" style="padding:1px 4px">extra</span></p>
      ${practise.length ? `<h4 style="margin:12px 0 4px">Practise these words</h4><div class="row">${practise.map((w) => `<button class="chip" data-w="${esc(w)}">🔊 ${esc(w)}</button>`).join('')}</div>` : ''}
      <h4 style="margin:12px 0 4px">Pace and pauses</h4>${metricsHtml(m)}
      <h4 style="margin:12px 0 4px">Suggestions</h4><ul>${tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="small muted">Speech recognition can mishear names or unusual words — if a word was marked different but you said it clearly, that is okay!</p>
      <div class="row"><button class="btn secondary" id="again">↺ Try again</button>${idx < sentences().length - 1 ? '<button class="btn" id="go-next">Next sentence →</button>' : ''}</div>`;
    $('#orig', box)?.addEventListener('click', () => speak(sentence));
    $$('[data-w]', box).forEach((b) => (b.onclick = async () => { await speak(b.dataset.w, { rate: 0.7 }); await speak(b.dataset.w, { rate: 1 }); }));
    $('#again', box).onclick = () => $('#mic')?.click();
    $('#go-next', box)?.addEventListener('click', () => { idx++; draw(); });
    logActivity({ module: 'shadowing', skill: 'speaking', minutes: 0, score: cmp.accuracy, max_score: 100, detail: { sentence, level, wpm: m.wpm } });
  };

  draw();
  return () => { stopTimer(); stopSpeaking(); rec?.stop(); };
}

function customForm() {
  return `<div class="card"><h3>Shadow your own sentences</h3>
    <p class="muted">Paste a short passage you are allowed to use — for example a few lines from a talk's official transcript, your own presentation, or textbook sentences. It stays in this browser tab only.</p>
    <textarea class="input" id="custom-text" rows="6" placeholder="Paste 1–10 sentences here…"></textarea>
    <button class="btn" id="save-custom" style="margin-top:10px">Start shadowing</button></div>`;
}
