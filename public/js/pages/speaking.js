// Speaking Partner (mode "speaking") and Placement Preparation (mode "placement").
import { api, post, del } from '../api.js';
import { state } from '../state.js';
import { $, $$, el, esc, feedbackEl, voiceInput, toast, startTimer, prettyDate, emptyState, modal } from '../ui.js';
import { speak, stopSpeaking, support } from '../speech.js';
import { SPEAKING_CATEGORIES, PLACEMENT_TOPICS } from '../content/misc.js';

export async function render(view, { page, params }) {
  const mode = page === 'placement' ? 'placement' : 'speaking';
  const stopTimer = startTimer('speaking', mode);
  let inner = null;
  if (params[0]) inner = await openConversation(view, mode, Number(params[0]));
  else await home(view, mode);
  return () => { stopTimer(); inner?.(); stopSpeaking(); };
}

async function home(view, mode) {
  const { conversations } = await api(`/conversations?mode=${mode}`);
  const topics = mode === 'placement' ? PLACEMENT_TOPICS : SPEAKING_CATEGORIES;
  view.innerHTML = `
    <div class="topbar"><div><h1>${mode === 'placement' ? '💼 Placement Preparation' : '🗣️ AI Speaking Partner'}</h1>
      <p class="muted" style="margin:0">${mode === 'placement' ? 'Your AI interviewer asks one question at a time, listens to your answer and gives detailed suggestions.' : 'Talk by voice or text. Your coach replies naturally and gives corrections after each answer — never in the middle.'}</p></div></div>
    ${support.stt ? '' : '<div class="notice" style="margin-bottom:16px">🎤 Voice input needs Chrome or Edge. You can still practise by typing — the coach gives the same feedback.</div>'}
    <div class="auto-grid">${topics.map((t) => `<button class="tile" data-cat="${t.id}" data-label="${esc(t.label)}"><span class="emoji">${t.icon}</span><h3>${esc(t.label)}</h3><p>${esc(t.desc || t.tip.split('.')[0] + '.')}</p></button>`).join('')}</div>
    <div class="card" style="margin-top:20px">
      <div class="card-title"><h2>Conversation history</h2><span class="small muted">${conversations.length} saved</span></div>
      ${conversations.length ? `<div class="list">${conversations.map((c) => `<div class="list-item"><a href="#/${mode}/${c.id}" style="flex:1;color:inherit"><b>${esc(c.title)}</b><div class="small muted">${prettyDate(c.updated_at)} · ${Math.floor(c.turns / 2)} answers</div></a><button class="btn sm ghost" data-del="${c.id}" aria-label="Delete conversation">🗑</button></div>`).join('')}</div>` : emptyState('💬', 'No conversations yet. Choose a topic above to start.')}
    </div>`;

  view.addEventListener('click', async (e) => {
    const tile = e.target.closest('[data-cat]');
    if (tile) {
      const topic = topics.find((t) => t.id === tile.dataset.cat);
      if (mode === 'placement') return showTip(topic, () => start(topic));
      return start(topic);
    }
    const d = e.target.closest('[data-del]');
    if (d && confirm('Delete this conversation?')) { await del(`/conversations/${d.dataset.del}`); d.closest('.list-item').remove(); }
  });

  async function start(topic) {
    $$('.tile', view).forEach((t) => (t.disabled = true));
    toast('Starting your session…');
    try {
      const { conversation } = await post('/conversations', { mode, category: topic.id, title: topic.label });
      location.hash = `#/${mode}/${conversation.id}`;
    } finally { $$('.tile', view).forEach((t) => (t.disabled = false)); }
  }
}

function showTip(topic, onStart) {
  modal(`<h2>${topic.icon} ${esc(topic.label)}</h2>
    <h4 style="margin:12px 0 4px">How to answer</h4><p>${esc(topic.tip)}</p>
    <h4 style="margin:12px 0 4px">Answer framework</h4><p class="notice info">${esc(topic.frame)}</p>
    <div class="row" style="margin-top:14px"><button class="btn" id="go">Start mock interview</button><button class="btn ghost" data-close>Cancel</button></div>`, {
    onMount: (m, close) => { $('#go', m).onclick = () => { close(); onStart(); }; },
  });
}

async function openConversation(view, mode, id) {
  const { conversation: c } = await api(`/conversations/${id}`);
  const label = (mode === 'placement' ? PLACEMENT_TOPICS : SPEAKING_CATEGORIES).find((t) => t.id === c.category)?.label || c.title;
  let autoSpeak = localStorage.getItem('fs_autospeak') !== '0';
  let rate = Number(localStorage.getItem('fs_rate') || 1);
  view.innerHTML = `
    <div class="topbar"><div><a href="#/${mode}" class="small">← All topics</a><h1>${esc(label)}</h1></div>
      <div class="row"><label class="row small" style="margin:0"><input type="checkbox" id="auto" ${autoSpeak ? 'checked' : ''}> Read replies aloud</label>
      <select id="rate" style="width:auto;padding:6px 10px" aria-label="Voice speed">${[0.75, 1, 1.25].map((r) => `<option value="${r}" ${r === rate ? 'selected' : ''}>${r}x</option>`).join('')}</select>
      <button class="btn sm ghost" id="restart">New session</button></div></div>
    <div class="grid split">
      <div class="card"><div class="chat" id="chat"></div><div id="input-area" style="border-top:1px solid var(--line);margin-top:10px;padding-top:6px"></div></div>
      <div><div class="card" id="fb-panel"><h3>Feedback</h3><p class="muted">Answer the question. Your corrections, natural alternatives, vocabulary and fluency analysis will appear here after each answer.</p></div></div>
    </div>`;
  const chat = $('#chat', view), panel = $('#fb-panel', view);

  const addMsg = (m) => {
    const node = el(`<div class="msg ${m.role === 'assistant' ? 'ai' : 'me'}"><div>${esc(m.text)}</div><div class="tools"></div></div>`);
    const tools = $('.tools', node);
    if (m.role === 'assistant') {
      tools.append(el('<button class="btn sm secondary" aria-label="Listen">🔊 Listen</button>'));
      tools.lastChild.onclick = () => speak(m.text, { rate });
      tools.append(el('<button class="btn sm secondary">தமிழ்</button>'));
      tools.lastChild.onclick = async (e) => {
        e.target.disabled = true;
        const { tamil } = await post('/ai/tamil', { text: m.text });
        node.append(el(`<p class="ta small" lang="ta" style="margin:8px 0 0">${esc(tamil)}</p>`));
      };
    } else if (m.feedback) {
      const badge = m.feedback.has_mistakes ? `✏️ ${m.feedback.mistakes?.length || 1} correction${(m.feedback.mistakes?.length || 1) > 1 ? 's' : ''}` : '✅ Correct';
      tools.append(el(`<button class="btn sm">${badge}${m.input === 'voice' ? ' · 🎤' : ''}</button>`));
      tools.lastChild.onclick = () => showFeedback(m.feedback, m.metrics, { spoken: m.input === 'voice' });
    }
    chat.append(node);
    chat.scrollTop = chat.scrollHeight;
    return node;
  };
  const showFeedback = (fb, metrics, extra = {}) => {
    panel.innerHTML = '';
    panel.append(feedbackEl(fb, { metrics, title: mode === 'placement' ? 'Interview feedback' : 'Coach feedback', source: mode, ...extra }));
    if (window.innerWidth < 900) panel.scrollIntoView({ behavior: 'smooth' });
  };

  c.messages.forEach(addMsg);
  const lastUser = [...c.messages].reverse().find((m) => m.role === 'user' && m.feedback);
  if (lastUser) showFeedback(lastUser.feedback, lastUser.metrics, { spoken: lastUser.input === 'voice' });
  const last = c.messages[c.messages.length - 1];
  if (autoSpeak && last?.role === 'assistant' && c.messages.length === 1) speak(last.text, { rate });

  const input = voiceInput({
    placeholder: mode === 'placement' ? 'Type your answer, or use the mic…' : 'Type your reply, or use the mic…',
    submitLabel: 'Send',
    autoSubmit: true,
    onSubmit: async (text, meta) => {
      stopSpeaking();
      addMsg({ role: 'user', text });
      const typing = el(`<div class="msg ai typing">${mode === 'placement' ? 'Interviewer is thinking…' : 'Coach is typing…'}</div>`);
      chat.append(typing);
      chat.scrollTop = chat.scrollHeight;
      try {
        const out = await post(`/conversations/${id}/message`, { text, metrics: meta.metrics, input: meta.input });
        typing.remove();
        chat.lastChild?.remove(); // replace optimistic user message with one that has feedback
        addMsg({ role: 'user', text, feedback: out.feedback, metrics: meta.metrics, input: meta.input });
        addMsg({ role: 'assistant', text: out.reply });
        showFeedback(out.feedback, meta.metrics, { spoken: meta.input === 'voice', record: true });
        if (out.notice) toast(out.notice);
        if (autoSpeak) speak(out.reply, { rate });
      } catch (err) {
        typing.remove();
        throw err;
      }
    },
  });
  $('#input-area', view).append(input);

  $('#auto', view).onchange = (e) => { autoSpeak = e.target.checked; localStorage.setItem('fs_autospeak', autoSpeak ? '1' : '0'); if (!autoSpeak) stopSpeaking(); };
  $('#rate', view).onchange = (e) => { rate = Number(e.target.value); localStorage.setItem('fs_rate', String(rate)); };
  $('#restart', view).onclick = async () => {
    const { conversation } = await post('/conversations', { mode, category: c.category, title: c.title });
    location.hash = `#/${mode}/${conversation.id}`;
  };
  return () => input.cleanup?.();
}
