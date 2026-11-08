import { api, post } from './api.js';
import { state } from './state.js';
import { $, $$, el, esc, toast } from './ui.js';
import { stopSpeaking } from './speech.js';
import { renderAuth, renderOnboarding } from './pages/auth.js';

const NAV = [
  { group: null, items: [{ id: 'dashboard', label: 'Dashboard', icon: '🏠' }] },
  { group: 'Practice', items: [
    { id: 'speaking', label: 'Speaking Partner', icon: '🗣️' },
    { id: 'listening', label: 'Listening', icon: '🎧' },
    { id: 'shadowing', label: 'Shadowing', icon: '🔁' },
    { id: 'myday', label: 'My Day Journal', icon: '📔' },
    { id: 'reading', label: 'Reading', icon: '📖' },
    { id: 'translate', label: 'Translation', icon: '🔤' },
  ] },
  { group: 'Learn', items: [
    { id: 'grammar', label: 'Grammar', icon: '✍️' },
    { id: 'vocab', label: 'Vocabulary', icon: '🗂️' },
    { id: 'cartoon', label: 'Cartoon English', icon: '🐷' },
    { id: 'ted', label: 'TED Talks', icon: '🎤' },
  ] },
  { group: 'Career', items: [{ id: 'placement', label: 'Placement Prep', icon: '💼' }] },
  { group: 'My progress', items: [
    { id: 'progress', label: 'Progress Report', icon: '📈' },
    { id: 'notebook', label: 'Mistake Notebook', icon: '📝' },
    { id: 'planner', label: 'Daily Planner', icon: '🗓️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] },
];
const BOTTOM = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'speaking', label: 'Speak', icon: '🗣️' },
  { id: 'listening', label: 'Listen', icon: '🎧' },
  { id: 'progress', label: 'Progress', icon: '📈' },
];
const PAGES = {
  dashboard: () => import('./pages/dashboard.js'),
  speaking: () => import('./pages/speaking.js'),
  placement: () => import('./pages/speaking.js'),
  listening: () => import('./pages/listening.js'),
  shadowing: () => import('./pages/shadowing.js'),
  myday: () => import('./pages/myday.js'),
  reading: () => import('./pages/reading.js'),
  translate: () => import('./pages/translate.js'),
  grammar: () => import('./pages/grammar.js'),
  vocab: () => import('./pages/vocab.js'),
  cartoon: () => import('./pages/media.js'),
  ted: () => import('./pages/media.js'),
  progress: () => import('./pages/progress.js'),
  notebook: () => import('./pages/progress.js'),
  planner: () => import('./pages/settings.js'),
  settings: () => import('./pages/settings.js'),
};

let cleanup = null;

function shell() {
  const app = $('#app');
  app.innerHTML = `
  <div class="mobile-top"><button class="icon-btn" id="menu-btn" aria-label="Open menu">☰</button><div class="brand" style="padding:0"><div class="brand-logo">↗</div>FluentStep</div><span style="width:36px"></span></div>
  <div class="shell">
    <nav class="sidebar" id="sidebar" aria-label="Main navigation">
      <div class="brand"><div class="brand-logo">↗</div><div>FluentStep<small>Your Personal English Coach</small></div></div>
      ${NAV.map((g) => `${g.group ? `<div class="nav-group">${g.group}</div>` : ''}${g.items.map((i) => `<a class="nav-link" href="#/${i.id}" data-id="${i.id}"><span class="ico">${i.icon}</span>${i.label}</a>`).join('')}`).join('')}
      <div class="spacer"></div>
      <div class="card" style="padding:12px;margin-top:16px;box-shadow:none">
        <div class="small"><b>${esc(state.user.name)}</b></div>
        <div class="small muted" style="text-transform:capitalize">${esc(state.user.level)} level</div>
        <div class="small" style="margin-top:4px">${state.ai.enabled ? '<span class="chip green">AI coach on</span>' : '<span class="chip amber" title="Set ANTHROPIC_API_KEY on the server to enable AI feedback">Offline coach</span>'}</div>
        <button class="btn ghost sm" id="logout" style="margin-top:10px;width:100%">Log out</button>
      </div>
    </nav>
    <main class="main" id="view" tabindex="-1"></main>
  </div>
  <nav class="bottom-nav" aria-label="Quick navigation">
    ${BOTTOM.map((i) => `<a href="#/${i.id}" data-id="${i.id}"><span class="ico">${i.icon}</span>${i.label}</a>`).join('')}
    <a href="#" id="more-btn"><span class="ico">☰</span>More</a>
  </nav>`;
  const sidebar = $('#sidebar');
  const openMenu = (e) => {
    e?.preventDefault();
    sidebar.classList.add('open');
    const scrim = el('<div class="scrim"></div>');
    scrim.onclick = () => { sidebar.classList.remove('open'); scrim.remove(); };
    document.body.append(scrim);
  };
  $('#menu-btn').onclick = openMenu;
  $('#more-btn').onclick = openMenu;
  sidebar.addEventListener('click', (e) => { if (e.target.closest('a')) { sidebar.classList.remove('open'); $('.scrim')?.remove(); } });
  $('#logout').onclick = async () => { await post('/auth/logout'); location.hash = ''; boot(); };
}

async function route() {
  if (!state.user) return;
  if (!state.user.onboarded) { cleanup?.(); cleanup = null; return renderOnboarding(boot); }
  if (!$('#view')) shell();
  const [id, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  const page = PAGES[id] ? id : 'dashboard';
  $$('.nav-link, .bottom-nav a').forEach((a) => a.classList.toggle('active', a.dataset.id === page));
  stopSpeaking();
  try { cleanup?.(); } catch { /* ignore */ }
  cleanup = null;
  // A fresh element per page so listeners from the previous page never leak.
  const view = $('#view').cloneNode(false);
  $('#view').replaceWith(view);
  view.innerHTML = '<div class="muted">Loading…</div>';
  try {
    const mod = await PAGES[page]();
    view.innerHTML = '';
    cleanup = (await mod.render(view, { page, params: rest.map(decodeURIComponent) })) || null;
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="notice">Something went wrong while loading this page: ${esc(err.message)}</div>`;
  }
}

async function boot() {
  try {
    const me = await api('/me');
    state.user = me.user;
    state.ai = me.ai;
    $('#app').innerHTML = '';
    route();
    scheduleReminder();
  } catch {
    state.user = null;
    renderAuth(boot);
  }
}

// Browser reminder while the app is open (daily, at the user's chosen time).
let reminderTimer;
function scheduleReminder() {
  clearTimeout(reminderTimer);
  const t = state.user?.reminder_time;
  if (!t || !('Notification' in window) || Notification.permission !== 'granted') return;
  const [h, m] = t.split(':').map(Number);
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= new Date()) next.setDate(next.getDate() + 1);
  reminderTimer = setTimeout(() => {
    new Notification('FluentStep', { body: `Hi ${state.user.name}! Time for today's English practice. 🌟` });
    scheduleReminder();
  }, next - new Date());
}
export const refreshReminder = scheduleReminder;

window.addEventListener('hashchange', route);
window.addEventListener('fs:logout', () => { state.user = null; renderAuth(boot); });
window.addEventListener('fs:user', (e) => { state.user = e.detail; });
window.addEventListener('unhandledrejection', (e) => { if (e.reason?.message) toast(e.reason.message); });
boot();
