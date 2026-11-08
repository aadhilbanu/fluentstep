// Cartoon English (#/cartoon) and TED Talks (#/ted). Videos are only embedded from
// official players (YouTube, TED, Vimeo) or linked — never downloaded.
import { api, post, del, logActivity } from '../api.js';
import { state } from '../state.js';
import { $, $$, el, esc, quizEl, startTimer, toast, feedbackEl, voiceInput, emptyState } from '../ui.js';
import { speak, speakDialogue, stopSpeaking, support, Recorder, compareWords } from '../speech.js';
import { STORIES, TED_TALKS } from '../content/misc.js';

export function embedUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (/youtube\.com$/.test(u.hostname)) {
      if (u.searchParams.get('v')) return `https://www.youtube-nocookie.com/embed/${u.searchParams.get('v')}`;
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/);
      if (m) return `https://www.youtube-nocookie.com/embed/${m[2]}`;
      const list = u.searchParams.get('list');
      if (list) return `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`;
      return null; // channel pages cannot be embedded
    }
    if (/ted\.com$/.test(u.hostname)) return null; // TED talks are linked, not embedded
    if (u.hostname === 'vimeo.com') { const m = u.pathname.match(/\/(\d+)/); return m ? `https://player.vimeo.com/video/${m[1]}` : null; }
  } catch { /* invalid */ }
  return null;
}
const frame = (src, title) => `<div class="video"><iframe src="${esc(src)}" title="${esc(title)}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;

export async function render(view, { page, params }) {
  const stopTimer = startTimer('listening', page);
  const cleanup = page === 'ted' ? await ted(view, params) : await cartoon(view, params);
  return () => { stopTimer(); stopSpeaking(); cleanup?.(); };
}

// ---------------- admin-approved videos ----------------
async function approvedVideos(section) {
  const { videos } = await api(`/videos?section=${section}`);
  const box = el(`<div class="card"><div class="card-title"><h2>${section === 'ted' ? 'More approved talks' : 'Approved cartoon videos'}</h2>${state.user.is_admin ? '<button class="btn sm secondary" id="add-video">＋ Add video URL</button>' : ''}</div>
    ${videos.length ? `<div class="grid g2">${videos.map((v) => {
      const src = embedUrl(v.url);
      return `<div>${src ? frame(src, v.title) : ''}<div class="row between" style="margin-top:8px"><div><b>${esc(v.title)}</b>${v.description ? `<div class="small muted">${esc(v.description)}</div>` : ''}<a class="small" href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">Open on official site ↗</a></div>
        ${state.user.is_admin ? `<button class="btn sm ghost" data-del-video="${v.id}" aria-label="Remove">🗑</button>` : ''}</div>
        <button class="btn sm secondary" data-retell="${esc(v.title)}" style="margin-top:6px">🗣️ Tell the coach what happened</button></div>`;
    }).join('')}</div>` : emptyState('🎬', state.user.is_admin ? 'No videos added yet. Add official YouTube, TED or Vimeo links that you are allowed to share.' : 'No extra videos have been added by the administrator yet.')}
    <div id="retell"></div></div>`);
  box.addEventListener('click', async (e) => {
    if (e.target.id === 'add-video') {
      const form = el(`<form class="stack" style="margin:12px 0"><div class="notice info small">Only add official links you are authorised to share (e.g. the official Peppa Pig YouTube channel videos or TED.com talks). Videos are embedded, never downloaded.</div>
        <input class="input" name="title" placeholder="Title" required maxlength="120"><input class="input" name="url" placeholder="https://www.youtube.com/watch?v=…" required><input class="input" name="description" placeholder="Short description (optional)">
        <div class="row"><button class="btn">Save</button></div><div class="error"></div></form>`);
      e.target.replaceWith(form);
      form.onsubmit = async (ev) => {
        ev.preventDefault();
        try {
          const f = form.elements;
          await post('/videos', { section, title: f.namedItem('title').value, url: f.namedItem('url').value, description: f.namedItem('description').value });
          toast('Video added');
          box.replaceWith(await approvedVideos(section));
        } catch (err) { $('.error', form).textContent = err.message; }
      };
    }
    const d = e.target.closest('[data-del-video]');
    if (d && confirm('Remove this video?')) { await del(`/videos/${d.dataset.delVideo}`); box.replaceWith(await approvedVideos(section)); }
    const r = e.target.closest('[data-retell]');
    if (r) {
      const area = $('#retell', box);
      area.innerHTML = `<h3 style="margin-top:16px">Retell: ${esc(r.dataset.retell)}</h3><p class="small muted">Say or write 3–5 sentences about what happened in the video.</p>`;
      const fbBox = el('<div style="margin-top:10px"></div>');
      area.append(voiceInput({ rows: 3, submitLabel: 'Check', onSubmit: async (text, meta) => {
        const out = await post('/ai/review', { kind: 'retelling a cartoon video in simple English', prompt: `Retell what happened in the video "${r.dataset.retell}".`, text, input: meta.input });
        fbBox.innerHTML = '';
        fbBox.append(feedbackEl(out.feedback, { metrics: meta.metrics, source: 'cartoon', spoken: meta.input === 'voice', record: true }));
        logActivity({ module: section === 'ted' ? 'ted' : 'cartoon', skill: 'speaking', minutes: 0, score: out.feedback?.sentence_rating ?? null, max_score: out.feedback?.sentence_rating ? 5 : null, detail: { retell: r.dataset.retell } });
      } }), fbBox);
      area.scrollIntoView({ behavior: 'smooth' });
    }
  });
  return box;
}

// ---------------- Cartoon English ----------------
async function cartoon(view, params) {
  const story = STORIES.find((s) => s.id === params[0]);
  if (!story) {
    view.innerHTML = `
      <div class="topbar"><div><h1>🐷 Cartoon English</h1><p class="muted" style="margin:0">Beginner-friendly cartoons and animated stories with vocabulary, explanations and repeat-after-me practice.</p></div></div>
      <div class="card"><div class="row between"><div style="max-width:620px"><h2>Peppa Pig — official channel</h2>
        <p class="muted">Peppa Pig uses short, clear sentences that are perfect for beginners. Watch episodes on the official channel (we link to it rather than copying any videos). Tip: watch once with English subtitles, then once without.</p></div>
        <a class="btn" href="https://www.youtube.com/@PeppaPigOfficial" target="_blank" rel="noopener noreferrer">Open official Peppa Pig channel ↗</a></div>
        <p class="small muted">After watching, use “Tell the coach what happened” below (on any approved video) or write a summary in My Day.</p></div>
      <h2 style="margin:22px 0 12px">Animated stories</h2>
      <div class="auto-grid">${STORIES.map((s) => `<a class="tile" href="#/cartoon/${s.id}"><span class="emoji">${Object.values(s.cast).join(' ')}</span><h3>${esc(s.title)}</h3><p>${s.scene.length} lines · ${s.vocab.length} new words · repeat-after-me</p></a>`).join('')}</div>
      <div id="approved" style="margin-top:20px"></div>`;
    $('#approved', view).append(await approvedVideos('cartoon'));
    return null;
  }

  let rate = 0.9, stop = false, rec = null;
  view.innerHTML = `
    <div class="topbar"><div><a class="small" href="#/cartoon">← Cartoon English</a><h1>${esc(story.title)}</h1></div></div>
    <div class="grid g2">
      <div class="card">
        <div class="stage" id="stage">${story.scene.map((l, i) => `<div class="actor" data-i="${i}"><span class="face">${story.cast[l.s]}</span><div class="bubble"><b class="small">${esc(l.s)}</b><div>${esc(l.t)}</div></div></div>`).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="btn" id="play">▶ Play story</button><div class="tabs" style="margin:0" id="speed">${[0.75, 0.9, 1.1].map((r) => `<button data-r="${r}" class="${r === 0.9 ? 'on' : ''}">${r === 0.9 ? 'Normal' : r === 0.75 ? 'Slow' : 'Fast'}</button>`).join('')}</div></div>
      </div>
      <div class="card"><h2>New words</h2><div class="list">${story.vocab.map((v, i) => `<div class="list-item"><div style="flex:1"><b>${esc(v.word)}</b><div class="small muted">${esc(v.meaning)} · <span class="ta">${esc(v.tamil)}</span></div></div><button class="icon-btn" data-sayv="${i}" aria-label="Listen">🔊</button><button class="btn sm secondary" data-savev="${i}">＋</button></div>`).join('')}</div>
        <h2 style="margin-top:18px">Sentence explanations</h2>${story.explain.map((x) => `<div class="list-item" style="display:block;margin-bottom:8px"><b>${esc(x.en)}</b><div class="small muted">${esc(x.note)}</div></div>`).join('')}</div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card" id="quiz"><h2>Questions</h2></div>
      <div class="card"><h2>Repeat after me</h2><p class="small muted">Listen to a line, then say it yourself.</p><div class="list" id="repeat">${story.scene.map((l, i) => `<div class="list-item" style="display:block"><div class="row"><span>${story.cast[l.s]}</span><span style="flex:1">${esc(l.t)}</span><button class="icon-btn" data-sayl="${i}" aria-label="Listen">🔊</button>${support.mic ? `<button class="icon-btn" data-rec="${i}" aria-label="Record">🎤</button>` : ''}</div><div class="res small"></div></div>`).join('')}</div></div>
    </div>`;

  const actors = $$('.actor', view);
  $('#play', view).onclick = async (e) => {
    stop = false; e.target.disabled = true;
    await speakDialogue(story.scene, { rate, shouldStop: () => stop, onLine: (i) => actors.forEach((a, k) => a.classList.toggle('on', k === i)) });
    if ($('#play', view)) $('#play', view).disabled = false;
  };
  $$('#speed button', view).forEach((b) => (b.onclick = () => { rate = Number(b.dataset.r); $$('#speed button', view).forEach((x) => x.classList.toggle('on', x === b)); }));
  const voiceOf = (s) => Object.keys(story.cast).indexOf(s);
  view.addEventListener('click', async (e) => {
    const sv = e.target.closest('[data-sayv]'); if (sv) speak(story.vocab[sv.dataset.sayv].word, { rate: 0.8 });
    const savev = e.target.closest('[data-savev]');
    if (savev) { const v = story.vocab[savev.dataset.savev]; await post('/vocab', { word: v.word, meaning: v.meaning, tamil: v.tamil, source: `cartoon: ${story.title}` }); savev.textContent = '✓'; savev.disabled = true; toast('Saved'); }
    const sl = e.target.closest('[data-sayl]'); if (sl) speak(story.scene[sl.dataset.sayl].t, { rate: 0.85, voiceIndex: voiceOf(story.scene[sl.dataset.sayl].s) });
    const r = e.target.closest('[data-rec]');
    if (r) {
      const line = story.scene[r.dataset.rec];
      const res = $('.res', r.closest('.list-item'));
      if (rec) {
        const out = await rec.stop(); rec = null;
        $$('[data-rec]', view).forEach((b) => { b.textContent = '🎤'; b.classList.remove('rec'); });
        if (!out.transcript) { res.innerHTML = support.stt ? 'I could not hear you — try again.' : `<audio controls src="${out.audioUrl}" style="height:32px"></audio> Compare with the original by ear.`; return; }
        const c = compareWords(line.t, out.transcript);
        res.innerHTML = `<span class="chip ${c.accuracy >= 85 ? 'green' : 'amber'}">${c.accuracy}% words matched</span> ${c.missing.length ? `Missing: <b>${c.missing.map(esc).join(', ')}</b>` : 'Great job! 🌟'}`;
        logActivity({ module: 'cartoon', skill: 'speaking', minutes: 0, score: c.accuracy, max_score: 100, detail: { story: story.id } });
        return;
      }
      stopSpeaking();
      rec = new Recorder();
      try { await rec.start(); r.textContent = '⏹'; res.textContent = 'Listening… tap ⏹ when done.'; } catch { rec = null; res.textContent = 'Microphone permission was denied.'; }
    }
  });
  $('#quiz', view).append(quizEl(story.questions, { onDone: (s, m) => logActivity({ module: 'cartoon', skill: 'listening', minutes: 0, score: s, max_score: m, detail: { story: story.id } }) }));
  return () => { stop = true; rec?.stop(); };
}

// ---------------- TED Talks ----------------
async function ted(view, params) {
  const { favorites } = await api('/favorites');
  const favs = new Set(favorites.filter((f) => f.kind === 'ted').map((f) => f.ref));
  const talk = TED_TALKS.find((t) => t.id === params[0]);
  if (!talk) {
    const sorted = [...TED_TALKS].sort((a, b) => favs.has(b.id) - favs.has(a.id));
    view.innerHTML = `
      <div class="topbar"><div><h1>🎤 TED Talks</h1><p class="muted" style="margin:0">Watch inspiring talks from TED.com, learn vocabulary and expressions, then summarise and speak about what you learned.</p></div></div>
      <div class="auto-grid">${sorted.map((t) => `<a class="tile" href="#/ted/${t.id}"><div class="row between"><span class="chip" style="text-transform:capitalize">${t.level}</span>${favs.has(t.id) ? '<span title="Favourite">⭐</span>' : ''}</div><h3>${esc(t.title)}</h3><p>${esc(t.speaker)} · about ${t.mins} min</p></a>`).join('')}</div>
      <div id="approved" style="margin-top:20px"></div>`;
    $('#approved', view).append(await approvedVideos('ted'));
    return null;
  }

  view.innerHTML = `
    <div class="topbar"><div><a class="small" href="#/ted">← All talks</a><h1>${esc(talk.title)}</h1><p class="muted" style="margin:0">${esc(talk.speaker)} · TED</p></div>
      <button class="btn ${favs.has(talk.id) ? '' : 'secondary'}" id="fav">${favs.has(talk.id) ? '⭐ Favourite' : '☆ Add to favourites'}</button></div>
    <div class="grid split">
      <div class="card">
        <div class="hero" style="padding:22px"><p style="margin:0 0 4px;font-weight:600">🎤 TED · about ${talk.mins} min</p><h2 style="color:#fff">${esc(talk.title)}</h2><p>${esc(talk.speaker)}</p>
          <a class="btn" href="https://www.ted.com/talks/${talk.slug}" target="_blank" rel="noopener noreferrer">▶ Watch on TED.com ↗</a></div>
        <div class="row" style="margin-top:10px"><a class="btn sm secondary" href="https://www.ted.com/talks/${talk.slug}/transcript" target="_blank" rel="noopener noreferrer">📄 Official transcript on TED.com ↗</a></div>
        <p class="small muted" style="margin-top:8px">The talk opens on TED.com in a new tab. Listen once without subtitles, then again with English subtitles, and come back here for the activities.</p></div>
      <div class="card"><h2>Important vocabulary</h2><div class="list">${talk.vocab.map((v, i) => `<div class="list-item"><div style="flex:1"><b>${esc(v.word)}</b><div class="small muted">${esc(v.meaning)}</div></div><button class="icon-btn" data-say="${esc(v.word)}" aria-label="Listen">🔊</button><button class="btn sm secondary" data-save="${i}">＋</button></div>`).join('')}</div>
        <h2 style="margin-top:16px">Useful expressions</h2><div class="row">${talk.expressions.map((x) => `<button class="chip" data-say="${esc(x)}">🔊 ${esc(x)}</button>`).join('')}</div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card" id="quiz"><h2>Listening comprehension</h2></div>
      <div class="card"><h2>Summary writing</h2><p class="small muted">After watching, write 4–6 sentences summarising the main idea of the talk.</p>
        <textarea class="input" id="summary" rows="5" placeholder="The speaker talks about…"></textarea><button class="btn" id="check-sum" style="margin-top:8px">Get feedback</button><div id="sum-fb" style="margin-top:10px"></div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>Speaking activity</h2><p><b>${esc(talk.speaking)}</b></p><p class="small muted">Also explain what you learned from the talk.</p><div id="speak"></div><div id="speak-fb" style="margin-top:10px"></div></div>
      <div class="card"><h2>Shadowing practice</h2><p class="muted">Copy one or two short sentences from the official transcript (for personal study) or use your own notes, and practise them in the Shadowing module.</p>
        <textarea class="input" id="excerpt" rows="3" placeholder="Paste a short excerpt (1–3 sentences)…"></textarea><button class="btn secondary" id="go-shadow" style="margin-top:8px">Practise in Shadowing →</button></div>
    </div>`;

  $('#fav', view).onclick = async (e) => {
    const { favorite } = await post('/favorites', { kind: 'ted', ref: talk.id });
    e.target.textContent = favorite ? '⭐ Favourite' : '☆ Add to favourites';
    e.target.className = `btn ${favorite ? '' : 'secondary'}`;
  };
  view.addEventListener('click', async (e) => {
    const s = e.target.closest('[data-say]'); if (s) speak(s.dataset.say, { rate: 0.9 });
    const sv = e.target.closest('[data-save]');
    if (sv) { const v = talk.vocab[sv.dataset.save]; await post('/vocab', { word: v.word, meaning: v.meaning, source: `TED: ${talk.speaker}` }); sv.textContent = '✓'; sv.disabled = true; toast('Saved'); }
  });
  $('#quiz', view).append(quizEl(talk.questions, { onDone: (sc, m) => logActivity({ module: 'ted', skill: 'listening', minutes: 0, score: sc, max_score: m, detail: { talk: talk.id } }) }));
  const ctx = `TED talk "${talk.title}" by ${talk.speaker}. Key ideas the learner should mention (for checking accuracy): ${talk.questions.map((q) => q.explain).join(' ')}`;
  $('#check-sum', view).onclick = async () => {
    const text = $('#summary', view).value.trim();
    if (text.split(/\s+/).length < 15) return toast('Please write at least 2–3 sentences (15+ words).');
    $('#check-sum', view).disabled = true;
    try {
      const out = await post('/ai/review', { kind: 'summary of a TED talk', prompt: ctx, text });
      const box = $('#sum-fb', view);
      box.innerHTML = '';
      if (out.content_comment) box.append(el(`<p class="notice info"><b>Content:</b> ${esc(out.content_comment)}</p>`));
      box.append(feedbackEl(out.feedback, { source: 'TED', record: true }));
      logActivity({ module: 'ted', skill: 'writing', minutes: 0, score: out.feedback?.sentence_rating ?? null, max_score: out.feedback?.sentence_rating ? 5 : null, detail: { talk: talk.id, summary: true } });
    } finally { $('#check-sum', view).disabled = false; }
  };
  const input = voiceInput({ rows: 3, submitLabel: 'Check', onSubmit: async (text, meta) => {
    const out = await post('/ai/review', { kind: 'speaking about what they learned from a TED talk', prompt: `${talk.speaking}\n${ctx}`, text, input: meta.input });
    const box = $('#speak-fb', view);
    box.innerHTML = '';
    if (out.content_comment) box.append(el(`<p class="notice info">${esc(out.content_comment)}</p>`));
    box.append(feedbackEl(out.feedback, { metrics: meta.metrics, source: 'TED', spoken: meta.input === 'voice', record: true }));
    logActivity({ module: 'ted', skill: 'speaking', minutes: 0, score: out.feedback?.sentence_rating ?? null, max_score: out.feedback?.sentence_rating ? 5 : null, detail: { talk: talk.id, speaking: true } });
  } });
  $('#speak', view).append(input);
  $('#go-shadow', view).onclick = () => {
    const lines = $('#excerpt', view).value.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 2).slice(0, 10);
    if (!lines.length) return toast('Please paste at least one sentence.');
    sessionStorage.setItem('fs_shadow_custom', JSON.stringify(lines));
    location.hash = '#/shadowing/custom';
  };
  return () => input.cleanup?.();
}
