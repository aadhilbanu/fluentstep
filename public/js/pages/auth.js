import { post } from '../api.js';
import { state, DEFAULT_PLAN } from '../state.js';
import { $, $$, esc } from '../ui.js';
import { speak, support } from '../speech.js';
import { ASSESSMENT } from '../content/misc.js';

export function renderAuth(onDone) {
  let mode = 'login';
  const app = $('#app');
  const draw = () => {
    app.innerHTML = `<div class="auth">
      <section class="auth-art">
        <div class="brand" style="color:#fff;padding:0"><div class="brand-logo" style="background:rgba(255,255,255,.2)">↗</div><div>FluentStep<small style="color:rgba(255,255,255,.8)">Your Personal English Coach</small></div></div>
        <h1>Speak English with confidence — one step every day.</h1>
        <p>Your teacher, speaking partner, listening trainer, grammar tutor and placement coach in one place.</p>
        <ul>
          <li>🗣️ AI conversation partner with gentle corrections</li>
          <li>🎧 Listening, shadowing and reading practice with audio</li>
          <li>📔 Daily "My Day" journal with Tamil explanations</li>
          <li>💼 Mock HR and technical interviews for placements</li>
        </ul>
      </section>
      <section class="auth-form"><div class="card">
        <div class="tabs"><button data-m="login" class="${mode === 'login' ? 'on' : ''}">Log in</button><button data-m="register" class="${mode === 'register' ? 'on' : ''}">Create account</button></div>
        <form id="auth-form" class="stack" novalidate>
          ${mode === 'register' ? '<div class="field"><label for="name">Your name</label><input class="input" id="name" autocomplete="name" required maxlength="60"></div>' : ''}
          <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="password">Password</label><input class="input" id="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" minlength="8" required>${mode === 'register' ? '<div class="small muted" style="margin-top:4px">At least 8 characters.</div>' : ''}</div>
          <div class="error" id="err"></div>
          <button class="btn lg" style="width:100%">${mode === 'login' ? 'Log in' : 'Create my account'}</button>
          <p class="small muted" style="text-align:center">Your recordings stay on your device. Your practice history is stored privately in your account.${mode === 'register' ? ' By creating an account you agree to the <a href="/terms.html" target="_blank">Terms</a> and <a href="/privacy.html" target="_blank">Privacy Policy</a>.' : ''}</p>
        </form>
      </div></section></div>`;
    $$('.tabs button', app).forEach((b) => (b.onclick = () => { mode = b.dataset.m; draw(); }));
    $('#auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const body = { email: $('#email').value, password: $('#password').value, name: $('#name')?.value };
      try {
        await post(`/auth/${mode}`, body);
        onDone();
      } catch (err) { $('#err').textContent = err.message; }
    };
  };
  draw();
}

export function renderOnboarding(onDone) {
  const app = $('#app');
  const answers = [];
  let step = 0;
  const startedAt = Date.now();
  const data = { goal_text: '', daily_goal_min: 30, tamil_help: true };

  const wrap = (inner) => `<div style="max-width:680px;margin:0 auto;padding:32px 16px"><div class="brand"><div class="brand-logo">↗</div><div>FluentStep<small>Let's personalise your learning</small></div></div><div class="card">${inner}</div></div>`;

  function welcome() {
    app.innerHTML = wrap(`
      <h1>Welcome, ${esc(state.user.name)}! 👋</h1>
      <p>I am your FluentStep English coach. Let's set your goal and take a short placement check (about 4 minutes) so I can choose the right level for you.</p>
      <div class="field"><label for="goal">What is your main goal?</label>
        <select id="goal"><option>Crack campus placement interviews</option><option>Speak confidently in daily life</option><option>Improve grammar and writing</option><option>Prepare for higher studies abroad</option><option>Improve communication at work</option></select></div>
      <div class="field"><label for="mins">How many minutes can you practise each day?</label>
        <select id="mins"><option value="15">15 minutes</option><option value="30" selected>30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></div>
      <div class="field"><label class="row" style="font-weight:600"><input type="checkbox" id="tamil" checked style="width:18px;height:18px"> Show Tamil explanations (தமிழ் விளக்கம்) for difficult points</label></div>
      <div class="row" style="margin-top:16px"><button class="btn lg" id="next">Start placement check →</button><button class="btn ghost" id="skip">Skip — I'm a beginner</button></div>`);
    const collect = () => { data.goal_text = $('#goal').value; data.daily_goal_min = Number($('#mins').value); data.tamil_help = $('#tamil').checked; };
    $('#next').onclick = () => { collect(); question(); };
    $('#skip').onclick = () => { collect(); finish(null); };
  }

  function question() {
    const q = ASSESSMENT[step];
    app.innerHTML = wrap(`
      <div class="row between"><span class="chip">Question ${step + 1} of ${ASSESSMENT.length}</span><span class="chip blue" style="text-transform:capitalize">${q.skill}</span></div>
      <div class="progress" style="margin:14px 0"><span style="width:${(step / ASSESSMENT.length) * 100}%"></span></div>
      ${q.passage ? `<p class="notice info">${esc(q.passage)}</p>` : ''}
      ${q.audio ? `<p><button class="btn secondary" id="play">🔊 Play audio</button> ${support.tts ? '' : '<span class="small muted">Audio not supported here — read the text:</span>'}</p>${support.tts ? '' : `<p class="notice info">${esc(q.audio)}</p>`}` : ''}
      <h2 style="margin-top:8px">${esc(q.q)}</h2>
      ${q.options.map((o, j) => `<button class="option" data-j="${j}">${esc(o)}</button>`).join('')}`);
    $('#play')?.addEventListener('click', () => speak(q.audio, { rate: 0.95 }));
    $$('.option').forEach((b) => (b.onclick = () => {
      answers.push({ skill: q.skill, correct: Number(b.dataset.j) === q.answer });
      step++;
      step < ASSESSMENT.length ? question() : finish(answers);
    }));
  }

  async function finish(result) {
    const score = result ? result.filter((a) => a.correct).length : 0;
    const level = !result ? 'beginner' : score >= 10 ? 'advanced' : score >= 6 ? 'intermediate' : 'beginner';
    const bySkill = {};
    for (const a of result || []) { bySkill[a.skill] ??= { c: 0, n: 0 }; bySkill[a.skill].n++; if (a.correct) bySkill[a.skill].c++; }
    const scale = data.daily_goal_min / 30;
    const plan = DEFAULT_PLAN.map((p) => ({ ...p, minutes: Math.max(3, Math.round(p.minutes * scale)) }));
    app.innerHTML = wrap(`
      <h1>${result ? `Your level: <span style="text-transform:capitalize;color:var(--violet)">${level}</span>` : 'Starting at Beginner level'}</h1>
      ${result ? `<p>You answered <b>${score} of ${ASSESSMENT.length}</b> correctly.</p>
      <div class="grid g2">${Object.entries(bySkill).map(([k, v]) => `<div class="list-item"><b style="text-transform:capitalize">${k}</b><span class="spacer"></span>${v.c}/${v.n}</div>`).join('')}</div>` : '<p>You can retake the level check any time from Settings.</p>'}
      <h3 style="margin-top:18px">Your daily plan (${data.daily_goal_min} min)</h3>
      <div class="list">${plan.map((p) => `<div class="list-item"><span style="text-transform:capitalize">${p.skill}</span><span class="spacer"></span><b>${p.minutes} min</b></div>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">You can change this plan any time in the Daily Planner.</p>
      <button class="btn lg" id="go" style="margin-top:12px">Go to my dashboard →</button>`);
    $('#go').onclick = async () => {
      const res = await post('/onboarding', { ...data, level, plan, assessment: result ? { score, max: ASSESSMENT.length, bySkill, minutes: Math.max(1, Math.round((Date.now() - startedAt) / 60000)) } : null });
      state.user = res.user;
      location.hash = '#/dashboard';
      onDone();
    };
  }

  welcome();
}
