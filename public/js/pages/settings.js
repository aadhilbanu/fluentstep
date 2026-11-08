import { put, del } from '../api.js';
import { state, PLAN_ITEMS, DEFAULT_PLAN } from '../state.js';
import { $, $$, esc, toast } from '../ui.js';
import { englishVoices, speak, support } from '../speech.js';
import { refreshReminder } from '../app.js';

export async function render(view, { page }) {
  return page === 'planner' ? planner(view) : settings(view);
}

const save = async (body) => {
  const { user } = await put('/me', body);
  state.user = user;
  return user;
};

function planner(view) {
  const u = state.user;
  let plan = (u.plan?.length ? u.plan : DEFAULT_PLAN).map((p) => ({ ...p }));
  for (const k of Object.keys(PLAN_ITEMS)) if (!plan.find((p) => p.skill === k)) plan.push({ skill: k, minutes: 0 });
  const total = () => plan.reduce((a, p) => a + (Number(p.minutes) || 0), 0);
  view.innerHTML = `
    <div class="topbar"><div><h1>🗓️ Daily Learning Planner</h1><p class="muted" style="margin:0">Choose how many minutes you want for each skill every day. Set an item to 0 to skip it.</p></div></div>
    <div class="grid g2">
      <div class="card"><h2>My daily plan</h2>
        <div class="list">${plan.map((p, i) => `<div class="list-item"><span style="font-size:1.3rem">${PLAN_ITEMS[p.skill].icon}</span><b style="flex:1">${PLAN_ITEMS[p.skill].label}</b>
          <input class="input" type="number" min="0" max="120" step="1" value="${p.minutes}" data-i="${i}" style="width:84px" aria-label="${PLAN_ITEMS[p.skill].label} minutes"> <span class="small muted">min</span></div>`).join('')}</div>
        <p style="margin-top:12px">Total: <b id="total">${total()}</b> minutes per day</p>
        <div class="row"><button class="btn" id="save">Save plan</button><button class="btn ghost" id="reset">Reset to recommended</button></div></div>
      <div class="card"><h2>Daily reminder</h2>
        <p class="muted">FluentStep can show a browser notification at your practice time while the app is open in a tab.</p>
        <label for="rem">Reminder time</label><input class="input" type="time" id="rem" value="${esc(u.reminder_time || '')}" style="max-width:180px">
        <div class="row" style="margin-top:10px"><button class="btn secondary" id="save-rem">Save reminder</button><button class="btn ghost" id="clear-rem">Turn off</button></div>
        <p class="small muted" id="perm" style="margin-top:8px"></p>
        <h2 style="margin-top:20px">Daily goal</h2>
        <label for="goal">Goal text</label><input class="input" id="goal" value="${esc(u.goal_text || '')}" maxlength="200">
      </div>
    </div>`;
  const perm = $('#perm');
  perm.textContent = !('Notification' in window) ? 'Notifications are not supported in this browser.' : Notification.permission === 'denied' ? 'Notifications are blocked for this site in your browser settings.' : '';
  $$('input[data-i]', view).forEach((inp) => (inp.oninput = () => { plan[inp.dataset.i].minutes = Math.max(0, Math.min(120, Number(inp.value) || 0)); $('#total').textContent = total(); }));
  $('#save').onclick = async () => {
    const kept = plan.filter((p) => p.minutes > 0);
    if (!kept.length) return toast('Please keep at least one activity in your plan.');
    await save({ plan: kept, daily_goal_min: total(), goal_text: $('#goal').value });
    toast('Plan saved');
  };
  $('#reset').onclick = () => { plan = DEFAULT_PLAN.map((p) => ({ ...p })); state.user.plan = plan; planner(view); };
  $('#save-rem').onclick = async () => {
    const t = $('#rem').value;
    if (!t) return toast('Please choose a time.');
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    await save({ reminder_time: t });
    refreshReminder();
    toast(Notification?.permission === 'granted' ? `Reminder set for ${t}` : 'Reminder saved, but notifications are not allowed in this browser.');
  };
  $('#clear-rem').onclick = async () => { await save({ reminder_time: '' }); $('#rem').value = ''; refreshReminder(); toast('Reminder turned off'); };
}

function settings(view) {
  const u = state.user;
  const voices = englishVoices();
  view.innerHTML = `
    <div class="topbar"><div><h1>⚙️ Settings</h1></div></div>
    <div class="grid g2">
      <div class="card"><h2>Profile & learning</h2>
        <div class="field"><label for="name">Name</label><input class="input" id="name" value="${esc(u.name)}" maxlength="60"></div>
        <div class="field"><label for="level">Learning level</label><select id="level">${['beginner', 'intermediate', 'advanced'].map((l) => `<option value="${l}" ${l === u.level ? 'selected' : ''} style="text-transform:capitalize">${l[0].toUpperCase() + l.slice(1)}</option>`).join('')}</select></div>
        <div class="field"><label class="row"><input type="checkbox" id="tamil" ${u.tamil_help ? 'checked' : ''}> Open Tamil explanations automatically</label></div>
        <button class="btn" id="save">Save</button>
        <button class="btn ghost" id="retake" style="margin-left:6px">Retake level check</button>
      </div>
      <div class="card"><h2>Voice & speech</h2>
        <div class="field"><label for="voice">Coach voice (English voices on this device)</label>
          <select id="voice"><option value="">Automatic</option>${voices.map((v) => `<option ${localStorage.getItem('fs_voice') === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
        <button class="btn sm secondary" id="test-voice">🔊 Test voice</button>
        <div class="field"><label for="stt">Speech recognition accent</label>
          <select id="stt">${[['en-IN', 'English (India) — recommended'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)']].map(([v, l]) => `<option value="${v}" ${(localStorage.getItem('fs_stt_lang') || 'en-IN') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <p class="small muted">Browser support: text-to-speech ${support.tts ? '✅' : '❌'} · speech-to-text ${support.stt ? '✅' : '❌ (use Chrome or Edge)'} · recording ${support.mic ? '✅' : '❌'}</p>
      </div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>AI coach</h2>
        ${state.ai.enabled ? `<p class="notice ok">The AI coach is enabled (${esc(state.ai.model)}).</p>` : `<p class="notice">The AI coach is off, so FluentStep uses its free checkers: built-in rules for common Indian-English mistakes plus the free <a href="https://languagetool.org" target="_blank" rel="noopener">LanguageTool</a> grammar check. To turn on full AI conversation and feedback, the administrator adds an <code>ANTHROPIC_API_KEY</code> with credits to the server's <code>.env</code> file and restarts the server.</p>`}
      </div>
      <div class="card"><h2>Privacy & data</h2>
        <p class="small">Voice recordings are processed in your browser and are <b>not uploaded or stored</b>. Only the text of your answers, your feedback and progress are saved to your account. Speech-to-text in Chrome/Edge may use the browser vendor's speech service. When the AI coach is off, the text of each answer you submit is sent to <a href="https://languagetool.org/legal/privacy" target="_blank" rel="noopener">LanguageTool</a> for a grammar check.</p>
        <p class="small"><a href="/privacy.html" target="_blank">Privacy Policy</a> · <a href="/terms.html" target="_blank">Terms of Use</a></p>
        <button class="btn danger" id="delete">Delete my account and all data</button></div>
    </div>`;

  $('#save').onclick = async () => {
    await save({ name: $('#name').value, level: $('#level').value, tamil_help: $('#tamil').checked });
    toast('Settings saved');
  };
  $('#retake').onclick = () => {
    // Show the onboarding flow again; it saves the new level when finished.
    state.user.onboarded = false;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  $('#voice').onchange = (e) => (e.target.value ? localStorage.setItem('fs_voice', e.target.value) : localStorage.removeItem('fs_voice'));
  $('#test-voice').onclick = () => speak('Hello! I am your FluentStep English coach. Let us practise together.');
  $('#stt').onchange = (e) => localStorage.setItem('fs_stt_lang', e.target.value);
  $('#delete').onclick = async () => {
    if (!confirm('This permanently deletes your account, conversations, journal, vocabulary and progress. Continue?')) return;
    await del('/me');
    location.hash = '';
    location.reload();
  };
}
