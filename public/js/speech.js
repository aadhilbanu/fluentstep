// Browser speech services: text-to-speech, speech-to-text and audio recording.
// Recordings stay in the browser (blob URLs) and are never uploaded.

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const support = {
  tts: 'speechSynthesis' in window,
  stt: Boolean(SR),
  mic: Boolean(navigator.mediaDevices?.getUserMedia) && 'MediaRecorder' in window,
};

// ---------- Text to speech ----------
let voices = [];
const loadVoices = () => { voices = support.tts ? speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang)) : []; };
if (support.tts) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

export const englishVoices = () => voices;
function pickVoice(index = 0) {
  if (!voices.length) loadVoices();
  if (!voices.length) return null;
  const preferred = localStorage.getItem('fs_voice');
  const pool = [...voices].sort((a, b) => score(b) - score(a));
  if (index === 0 && preferred) return voices.find((v) => v.name === preferred) || pool[0];
  return pool[index % pool.length];
}
const score = (v) => (/en-(US|GB|IN)/i.test(v.lang) ? 2 : 0) + (/natural|neural|online|google/i.test(v.name) ? 3 : 0);

export function stopSpeaking() { if (support.tts) speechSynthesis.cancel(); }

/** Speak text. Resolves when finished (or immediately if TTS is unavailable). */
export function speak(text, { rate = 1, voiceIndex = 0, onBoundary } = {}) {
  return new Promise((resolve) => {
    if (!support.tts || !text) return resolve(false);
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(voiceIndex);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
    u.rate = rate;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    if (onBoundary) u.onboundary = onBoundary;
    speechSynthesis.speak(u);
  });
}

/** Speak a list of {s, t} lines with a different voice per speaker. */
export async function speakDialogue(lines, { rate = 1, onLine, shouldStop = () => false } = {}) {
  stopSpeaking();
  const speakers = [...new Set(lines.map((l) => l.s))];
  for (let i = 0; i < lines.length; i++) {
    if (shouldStop()) break;
    onLine?.(i);
    await speak(lines[i].t, { rate, voiceIndex: speakers.indexOf(lines[i].s) });
  }
  onLine?.(-1);
}

// ---------- Recording + speech recognition ----------
/**
 * Records the microphone and transcribes it at the same time.
 * Pause detection uses the audio level: silence of 1s+ between speech counts as a pause.
 */
export class Recorder {
  constructor({ onInterim, onLevel } = {}) {
    this.onInterim = onInterim;
    this.onLevel = onLevel;
    this.finalText = '';
    this.active = false;
  }

  async start() {
    this.finalText = '';
    this.interim = '';
    this.chunks = [];
    this.pauses = [];
    this.startedAt = performance.now();
    this.firstSpeech = null;
    this.lastSpeech = null;
    this.silenceStart = null;
    this.active = true;

    if (support.mic) {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      this.media = new MediaRecorder(this.stream);
      this.media.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
      this.media.start();
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      const src = this.ctx.createMediaStreamSource(this.stream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      src.connect(this.analyser);
      const buf = new Float32Array(this.analyser.fftSize);
      const tick = () => {
        if (!this.active) return;
        this.analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const x of buf) sum += x * x;
        const rms = Math.sqrt(sum / buf.length);
        this.onLevel?.(Math.min(1, rms * 8));
        const now = performance.now();
        if (rms > 0.02) {
          if (this.silenceStart && this.firstSpeech && now - this.silenceStart > 1000) this.pauses.push((now - this.silenceStart) / 1000);
          this.silenceStart = null;
          this.firstSpeech ??= now;
          this.lastSpeech = now;
        } else if (!this.silenceStart) this.silenceStart = now;
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    }

    if (support.stt) {
      this.rec = new SR();
      this.rec.lang = localStorage.getItem('fs_stt_lang') || 'en-IN';
      this.rec.continuous = true;
      this.rec.interimResults = true;
      this.rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) this.finalText += `${e.results[i][0].transcript.trim()} `;
          else interim += e.results[i][0].transcript;
        }
        this.interim = interim;
        this.onInterim?.((this.finalText + interim).trim());
      };
      // Chrome stops recognition after silence; restart while still recording.
      this.rec.onend = () => { if (this.active) { try { this.rec.start(); } catch { /* already started */ } } };
      this.rec.onerror = (e) => { if (e.error === 'not-allowed') this.sttDenied = true; };
      try { this.rec.start(); } catch { /* ignore */ }
    }
  }

  async stop() {
    this.active = false;
    cancelAnimationFrame(this.raf);
    const ended = performance.now();
    if (this.rec) { this.rec.onend = null; try { this.rec.stop(); } catch { /* ignore */ } }
    // give recognition a moment to deliver final results
    await new Promise((r) => setTimeout(r, support.stt ? 700 : 0));
    let audioUrl = null;
    if (this.media && this.media.state !== 'inactive') {
      await new Promise((r) => { this.media.onstop = r; this.media.stop(); });
      audioUrl = URL.createObjectURL(new Blob(this.chunks, { type: this.media.mimeType || 'audio/webm' }));
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    const transcript = (this.finalText + (this.interim || '')).trim();
    const speechSecs = this.firstSpeech ? ((this.lastSpeech || ended) - this.firstSpeech) / 1000 : (ended - this.startedAt) / 1000;
    return { transcript, audioUrl, metrics: analyse(transcript, speechSecs, this.pauses), durationSec: (ended - this.startedAt) / 1000 };
  }
}

const FILLERS = ['um', 'uh', 'umm', 'hmm', 'er', 'ah', 'like', 'actually', 'basically', 'you know', 'i mean'];
export function analyse(text, seconds, pauses = []) {
  const words = text.toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean);
  const fillers = {};
  const joined = ` ${words.join(' ')} `;
  for (const f of FILLERS) {
    const n = (joined.match(new RegExp(` ${f} `, 'g')) || []).length;
    if (n) fillers[f] = n;
  }
  const repeated = [];
  for (let i = 1; i < words.length; i++) if (words[i] === words[i - 1] && words[i].length > 1) repeated.push(words[i]);
  const counts = {};
  for (const w of words) if (w.length > 3) counts[w] = (counts[w] || 0) + 1;
  const overused = Object.entries(counts).filter(([, n]) => n >= 3).map(([w, n]) => `${w} (${n}×)`);
  return {
    words: words.length,
    seconds: Math.round(seconds * 10) / 10,
    wpm: seconds > 2 ? Math.round(words.length / (seconds / 60)) : null,
    long_pauses: pauses.length,
    longest_pause_sec: pauses.length ? Math.round(Math.max(...pauses) * 10) / 10 : 0,
    filler_words: fillers,
    repeated_words: repeated,
    overused_words: overused,
  };
}

/** Word-level comparison of the target sentence with what was heard. */
export function compareWords(target, heard) {
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'\s-]/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
  const NUM = { 0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten' };
  const a = norm(target);
  const b = norm(heard).map((w) => NUM[w] || w);
  const eq = (x, y) => x === y || x.replace(/'/g, '') === y.replace(/'/g, '') || (x.length > 4 && levenshtein(x, y) <= 1);
  const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1));
  const ops = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1)) {
      ops.unshift(eq(a[i - 1], b[j - 1]) ? { t: 'ok', w: a[i - 1] } : { t: 'wrong', w: a[i - 1], heard: b[j - 1] });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.unshift({ t: 'miss', w: a[i - 1] }); i--; } else { ops.unshift({ t: 'extra', w: b[j - 1] }); j--; }
  }
  const ok = ops.filter((o) => o.t === 'ok').length;
  return { ops, accuracy: a.length ? Math.round((ok / a.length) * 100) : 0, missing: ops.filter((o) => o.t === 'miss').map((o) => o.w), wrong: ops.filter((o) => o.t === 'wrong'), extra: ops.filter((o) => o.t === 'extra').map((o) => o.w) };
}

function levenshtein(s, t) {
  const d = Array.from({ length: s.length + 1 }, (_, i) => [i, ...new Array(t.length).fill(0)]);
  for (let j = 1; j <= t.length; j++) d[0][j] = j;
  for (let i = 1; i <= s.length; i++) for (let j = 1; j <= t.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
  return d[s.length][t.length];
}
