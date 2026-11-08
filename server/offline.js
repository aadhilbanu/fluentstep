// Rule-based fallback coach used when no ANTHROPIC_API_KEY is configured or the
// AI call fails. It is deliberately conservative: it only flags patterns it is
// confident about, so learners are never told a correct sentence is wrong.

const IRREGULAR_BASE = {
  went: 'go', came: 'come', saw: 'see', ate: 'eat', wrote: 'write', took: 'take', gave: 'give',
  got: 'get', made: 'make', did: 'do', said: 'say', told: 'tell', bought: 'buy', brought: 'bring',
  thought: 'think', knew: 'know', left: 'leave', met: 'meet', spoke: 'speak', slept: 'sleep',
  studied: 'study', played: 'play', watched: 'watch', finished: 'finish', completed: 'complete',
  attended: 'attend', learned: 'learn', learnt: 'learn', called: 'call', visited: 'visit',
};
const PAST_FORMS = Object.keys(IRREGULAR_BASE).join('|');
const keepCase = (src, repl) => (src[0] === src[0].toUpperCase() ? repl[0].toUpperCase() + repl.slice(1) : repl);

const RULES = [
  {
    re: /\b(did|didn't|did not|does|doesn't|does not|do|don't|do not)\s+(not\s+)?(PAST)\b/gi,
    // "I did went" -> "I went"; "I didn't went" -> "I didn't go"
    fix: (m, aux, not, verb) => (/^did$/i.test(aux) && !not ? verb : `${aux} ${not || ''}${IRREGULAR_BASE[verb.toLowerCase()]}`),
    type: 'Verb form after did/do/does',
    why: 'After "did", "do" or "does", always use the base form of the verb (go, come, eat) — not the past form.',
    ta: '"did / do / does" க்குப் பிறகு verb-இன் அடிப்படை வடிவம் (go, come, eat) வர வேண்டும். Past form (went, came) வரக்கூடாது.',
  },
  {
    re: /\b(he|she|it)\s+(have|do|go|don't|watch|play|study|like|want|need|know|live|work)\b/gi,
    fix: (m, subj, verb) => {
      const map = { have: 'has', do: 'does', go: 'goes', "don't": "doesn't", watch: 'watches', study: 'studies' };
      return `${subj} ${map[verb.toLowerCase()] || verb + 's'}`;
    },
    guard: (text, idx) => !/\b(does|did|doesn't|didn't|can|will|should|would|could|must|may|might|to|let|make|help)\s+$/i.test(text.slice(Math.max(0, idx - 12), idx)),
    type: 'Subject-verb agreement',
    why: 'With he / she / it in the present simple, add -s or -es to the verb (he goes, she has, it works).',
    ta: 'he / she / it உடன் present simple-இல் verb-க்கு -s / -es சேர்க்க வேண்டும் (he goes, she has).',
  },
  {
    re: /\bI am having\s+(?!(?:a\s+)?(?:fun|lunch|dinner|breakfast|tea|coffee|a\s+(?:good|great|nice|bad|hard|tough)))/gi,
    fix: () => 'I have ',
    type: 'Stative verb in continuous form',
    why: '"Have" meaning possession is not used in the -ing form. Say "I have experience", not "I am having experience".',
    ta: 'உடைமை (possession) என்ற பொருளில் "have"-ஐ -ing வடிவில் பயன்படுத்த வேண்டாம். "I have experience" என்று சொல்லுங்கள்.',
  },
  {
    re: /\b(I|we|you|they|he|she)\s+(am|is|are)\s+(knowing|understanding|liking|wanting|needing|believing|belonging)\b/gi,
    fix: (m, subj, be, v) => {
      const base = { knowing: 'know', understanding: 'understand', liking: 'like', wanting: 'want', needing: 'need', believing: 'believe', belonging: 'belong' }[v.toLowerCase()];
      const third = /^(he|she)$/i.test(subj);
      return `${subj} ${third ? base + 's' : base}`;
    },
    type: 'Stative verb in continuous form',
    why: 'Verbs like know, understand, like and want describe states, so we use the simple form: "I know", not "I am knowing".',
    ta: 'know, understand, like, want போன்ற verbs நிலையைக் குறிக்கின்றன; "I know" என்று simple form-இல் சொல்லுங்கள்.',
  },
  {
    re: /\b(I|you|we|they|he|she|it)\s+(is|am|are|was|were)\b/gi,
    fix: (m, subj, be) => {
      const s = subj.toLowerCase(), b = be.toLowerCase();
      const past = b === 'was' || b === 'were';
      const right = s === 'i' ? (past ? 'was' : 'am') : ['he', 'she', 'it'].includes(s) ? (past ? 'was' : 'is') : (past ? 'were' : 'are');
      return right === b ? m : `${subj} ${right}`;
    },
    type: 'Subject-verb agreement',
    why: 'Use "I am / I was", "he, she, it is / was" and "you, we, they are / were".',
    ta: 'I உடன் am / was; he, she, it உடன் is / was; you, we, they உடன் are / were பயன்படுத்துங்கள்.',
  },
  { re: /\bmore (better|easier|bigger|faster|smarter|happier|worse)\b/gi, fix: (m, a) => a, type: 'Double comparative', why: '"Better", "easier" are already comparative — do not add "more".', ta: '"better", "easier" ஏற்கனவே ஒப்பீட்டு வடிவம்; அதற்கு முன் "more" தேவையில்லை.' },
  { re: /\bdiscuss about\b/gi, fix: (m) => keepCase(m, 'discuss'), type: 'Extra preposition', why: '"Discuss" already means "talk about", so we say "discuss the topic", not "discuss about the topic".', ta: '"discuss" என்பதற்கே "பற்றி பேசு" என்று பொருள்; "about" தேவையில்லை.' },
  { re: /\breturn back\b/gi, fix: (m) => keepCase(m, 'return'), type: 'Redundant word', why: '"Return" already means "go back". Just say "return".', ta: '"return" என்றாலே திரும்பு; "back" தேவையில்லை.' },
  { re: /\brevert back\b/gi, fix: (m) => keepCase(m, 'reply'), type: 'Indian English usage', why: 'In international English "revert" means "go back to an earlier state". To mean "reply", say "reply" or "get back to you".', ta: '"revert" என்பது பதில் அளி என்ற பொருளில் உலக ஆங்கிலத்தில் பயன்படாது; "reply" என்று சொல்லுங்கள்.' },
  { re: /\bcope up with\b/gi, fix: (m) => keepCase(m, 'cope with'), type: 'Extra preposition', why: 'The phrase is "cope with" — no "up".', ta: 'சரியான சொற்றொடர் "cope with"; "up" வேண்டாம்.' },
  { re: /\btoday morning\b/gi, fix: (m) => keepCase(m, 'this morning'), type: 'Time expression', why: 'In English we say "this morning", "this evening" — not "today morning".', ta: '"today morning" என்று சொல்லாமல் "this morning" என்று சொல்லுங்கள்.' },
  { re: /\byesterday night\b/gi, fix: (m) => keepCase(m, 'last night'), type: 'Time expression', why: 'We say "last night", not "yesterday night".', ta: '"yesterday night" அல்ல, "last night" என்று சொல்லுங்கள்.' },
  { re: /\bcan able to\b/gi, fix: (m) => keepCase(m, 'can'), type: 'Double modal', why: '"Can" and "able to" mean the same thing. Use one: "I can speak" or "I am able to speak".', ta: '"can" மற்றும் "able to" இரண்டும் ஒரே பொருள்; ஒன்றை மட்டும் பயன்படுத்துங்கள்.' },
  { re: /\bone of my (friend|brother|sister|teacher|classmate|relative|cousin|subject|hobby)\b/gi, fix: (m, n) => `one of my ${n.toLowerCase() === 'hobby' ? 'hobbies' : n + 's'}`, type: 'Plural after "one of"', why: '"One of my…" is always followed by a plural noun: "one of my friends".', ta: '"one of my" க்குப் பிறகு பன்மை (plural) பெயர்ச்சொல் வர வேண்டும்: "one of my friends".' },
  { re: /\bsince (\d+|two|three|four|five|six|ten) (years|months|days|weeks|hours)\b/gi, fix: (m, n, u) => `for ${n} ${u}`, type: 'Since vs for', why: 'Use "for" with a length of time (for 2 years) and "since" with a starting point (since 2022).', ta: 'கால அளவுக்கு "for" (for 2 years), தொடக்க நேரத்துக்கு "since" (since 2022).' },
  { re: /^\s*myself\s+([A-Z][a-z]+|[a-z]+)/i, fix: (m, n) => `My name is ${n[0].toUpperCase() + n.slice(1)}`, type: 'Self-introduction', why: '"Myself Priya" is not standard English. Say "My name is Priya" or "I am Priya".', ta: '"Myself Priya" என்பது சரியான ஆங்கிலம் அல்ல; "My name is Priya" அல்லது "I am Priya" என்று சொல்லுங்கள்.' },
  {
    re: /\b(what|where|why|how|when)\s+(you|they|we)\s+(are|were)\s+(\w+ing)\b/gi,
    fix: (m, w, s, be, v) => `${w} ${be} ${s} ${v}`,
    type: 'Question formation',
    why: 'In questions, put the helping verb before the subject: "What are you doing?", not "What you are doing?".',
    ta: 'கேள்வியில் helping verb subject-க்கு முன் வர வேண்டும்: "What are you doing?"',
  },
  { re: /\ba ([aeio]\w+)/gi, fix: (m, w) => (/^(one|once|eu|uni|use|usu)/i.test(w) ? m : `${m[0] === 'A' ? 'An' : 'an'} ${w}`), type: 'Articles (a / an)', why: 'Use "an" before a vowel sound: an apple, an engineer, an idea.', ta: 'உயிர் ஒலிக்கு (vowel sound) முன் "an" பயன்படுத்துங்கள்: an apple, an engineer.' },
  { re: /\ban (university|uniform|European|useful|one)\b/gi, fix: (m, w) => `${m[0] === 'A' ? 'A' : 'a'} ${w}`, type: 'Articles (a / an)', why: 'Words like "university" and "useful" start with a "yoo" sound, so use "a".', ta: '"university", "useful" "யூ" ஒலியுடன் தொடங்குவதால் "a" பயன்படுத்துங்கள்.' },
  { re: /\bpassed out (of|from)\b/gi, fix: (m, p) => `graduated ${p}`, type: 'Indian English usage', why: 'Internationally, "passed out" means "fainted". Say "graduated from".', ta: 'உலக ஆங்கிலத்தில் "passed out" என்றால் மயக்கம் அடைதல்; "graduated from" என்று சொல்லுங்கள்.' },
  { re: /\b(\w+)\s+\1\b/gi, fix: (m, w) => w, guard: (t, i, m) => !/^(that|had|very|bye|so|no|ha|well)$/i.test(m.split(/\s+/)[0]), type: 'Repeated word', why: 'The same word appears twice in a row. Take a short pause instead of repeating.', ta: 'ஒரே வார்த்தை இரண்டு முறை வருகிறது. மீண்டும் சொல்வதற்குப் பதில் சிறிது இடைவெளி விடுங்கள்.' },
];
for (const r of RULES) r.re = new RegExp(r.re.source.replace('PAST', PAST_FORMS), r.re.flags);

export function offlineCheck(text, { spoken = false } = {}) {
  let corrected = text.trim();
  const mistakes = [];
  for (const rule of RULES) {
    corrected = corrected.replace(rule.re, (...args) => {
      const m = args[0];
      const idx = args[args.length - 2];
      const whole = args[args.length - 1];
      if (rule.guard && !rule.guard(whole, idx, m)) return m;
      const out = rule.fix(...args);
      if (out !== m) mistakes.push({ type: rule.type, wrong: m.trim(), right: out.trim(), why: rule.why, why_ta: rule.ta });
      return out;
    });
  }
  // Standalone lowercase "i"
  // Capitalisation comes from the speech recogniser for spoken answers, so only check typed text.
  if (!spoken && /(^|\s)i(\s|'|$)/.test(corrected)) {
    corrected = corrected.replace(/(^|\s)i(?=\s|'|$)/g, '$1I');
    mistakes.push({ type: 'Capital I', wrong: 'i', right: 'I', why: 'The pronoun "I" is always a capital letter.', why_ta: '"I" எப்போதும் பெரிய எழுத்தில் (capital) எழுதப்படும்.' });
  }
  // Sentence capitalisation and end punctuation (only notes, not "mistakes" for speech)
  corrected = corrected.replace(/(^|[.!?]\s+)([a-z])/g, (m, p, c) => p + c.toUpperCase());
  if (corrected && !/[.!?]$/.test(corrected)) corrected += /^(what|where|why|how|when|who|do|does|did|is|are|can|could|will|would|should)\b/i.test(corrected) ? '?' : '.';
  return { corrected, mistakes };
}

const FILLERS = ['um', 'uh', 'umm', 'hmm', 'er', 'ah', 'like', 'actually', 'basically', 'you know', 'i mean', 'so so'];
export function fillerCount(text) {
  const t = ` ${text.toLowerCase()} `;
  const found = {};
  for (const f of FILLERS) {
    const n = (t.match(new RegExp(`\\b${f}\\b`, 'g')) || []).length;
    if (n) found[f] = n;
  }
  return found;
}

export function offlineFeedback(text, opts = {}) {
  const { corrected, mistakes } = offlineCheck(text, opts);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const tips = [];
  if (words.length < 8) tips.push('Try to answer in 2–3 full sentences. Add a reason or an example with "because" or "for example".');
  const fillers = fillerCount(text);
  const fillerTotal = Object.values(fillers).reduce((a, b) => a + b, 0);
  if (fillerTotal >= 2) tips.push(`You used filler words (${Object.keys(fillers).join(', ')}) ${fillerTotal} times. Pause silently instead — pauses sound confident.`);
  if (!/\b(because|so|but|and|when|which|although|however)\b/i.test(text) && words.length >= 8) tips.push('Connect your ideas with linking words such as "because", "so", "but" and "however".');
  if (!tips.length) tips.push('Good effort! Keep speaking in full sentences and add one detail each time.');
  return {
    has_mistakes: mistakes.length > 0,
    original: text,
    corrected,
    natural: corrected,
    explanation: mistakes.length ? mistakes.map((m) => `${m.type}: ${m.why}`).join(' ') : 'No common mistakes detected by the offline checker.',
    explanation_ta: mistakes.length ? mistakes.map((m) => m.why_ta).join(' ') : 'பொதுவான தவறுகள் எதுவும் கண்டறியப்படவில்லை.',
    mistakes: mistakes.map(({ type, wrong, right, why }) => ({ type, wrong, right, why })),
    vocabulary: [],
    tips,
    sentence_rating: null,
    offline: true,
  };
}

export const QUESTION_BANK = {
  daily: ['What time do you usually wake up, and what is the first thing you do?', 'What did you eat for breakfast today?', 'How do you usually spend your evenings?', 'What is your favourite food, and why do you like it?', 'Tell me about a typical weekend for you.', 'Do you prefer mornings or nights? Why?'],
  college: ['Which college do you study at, and what is your course?', 'What is your favourite subject, and why?', 'Tell me about a teacher who inspired you.', 'How do you prepare for your exams?', 'What clubs or events do you take part in at college?', 'What do you like most about your college campus?'],
  friends: ['Tell me about your best friend.', 'How many people are there in your family?', 'What do you usually do with your friends on holidays?', 'Who in your family do you talk to the most? Why?', 'Describe a festival you celebrated with your family.', 'What is one thing you learned from your parents?'],
  shopping: ['Where do you usually go shopping?', 'Do you prefer online shopping or going to shops? Why?', 'Tell me about a trip you really enjoyed.', 'How would you ask for directions to the railway station?', 'Imagine you are buying a shirt that is too big. What would you say to the shopkeeper?', 'Which place in India would you like to visit next?'],
  intro: ['Please introduce yourself.', 'Where are you from? Tell me about your hometown.', 'What are your hobbies?', 'What are your strengths?', 'What are your goals for the next two years?', 'What makes you unique?'],
  general: ['What do you think about using mobile phones in class?', 'Is social media good or bad for students?', 'What is the best way to learn a new skill?', 'How can we protect the environment in our daily life?', 'Which is more important: money or happiness?', 'What technology changed your life the most?'],
  gd: ['Group discussion topic: "Online education vs classroom education". What is your opinion?', 'Topic: "Should mobile phones be banned in colleges?" Share your view with one reason.', 'Topic: "Artificial intelligence — a threat or an opportunity?" Start the discussion.', 'Topic: "Work from home is the future". Do you agree?', 'Topic: "Is a degree necessary for success?" Give an example to support your point.'],
  hr: ['Tell me about yourself.', 'What are your strengths and weaknesses?', 'Why should we hire you?', 'Where do you see yourself in five years?', 'Tell me about a challenge you faced and how you handled it.', 'Why do you want to join our company?', 'Are you comfortable working in a team? Give an example.', 'Do you have any questions for us?'],
  technical: ['Explain your final-year project in simple words.', 'What programming language are you most comfortable with, and why?', 'What is the difference between a class and an object?', 'Explain what a database is to a non-technical person.', 'Tell me about a technical problem you solved.', 'What new technology are you learning now?'],
};
QUESTION_BANK.placement = QUESTION_BANK.hr;
QUESTION_BANK.project = ['Please explain your project: what problem does it solve?', 'What technologies did you use in your project, and why?', 'What was your role in the team?', 'What was the biggest challenge in your project?', 'If you had more time, how would you improve your project?'];
QUESTION_BANK.strengths = ['What are your three greatest strengths?', 'Give an example that shows one of your strengths.', 'What is one weakness you are working on?', 'How are you improving that weakness?'];
QUESTION_BANK.goals = ['What are your short-term career goals?', 'Where do you see yourself in five years?', 'Why did you choose your field of study?', 'What kind of company culture do you prefer?'];
QUESTION_BANK.professional = ['How would you write an email to your manager asking for a day off? Say it aloud.', 'How would you politely disagree with a teammate in a meeting?', 'How would you explain a delay in your work to your team lead?', 'How do you introduce yourself in a client call?'];

const ACKS = ['Thank you for sharing that.', 'That is interesting!', 'Nice, I understand.', 'Great answer.', 'Thanks — that was clear.', 'I see.'];
export function offlineNextQuestion(category, asked = []) {
  const bank = QUESTION_BANK[category] || QUESTION_BANK.general;
  const left = bank.filter((q) => !asked.some((a) => a.includes(q)));
  const q = left.length ? left[0] : 'Can you tell me more about that, with one example?';
  return { ack: ACKS[asked.length % ACKS.length], question: q };
}

export const JOURNAL_FOLLOWUPS = [
  'What was the best part of your day?', 'Who did you talk to today, and what did you talk about?', 'What is one thing you want to do better tomorrow?', 'Did you learn any new English word today? Use it in a sentence.', 'How did you feel at the end of the day, and why?',
];

export function similarity(a, b) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\b(a|an|the)\b/g, ' ').split(/\s+/).filter(Boolean);
  const x = norm(a), y = norm(b);
  if (!x.length || !y.length) return 0;
  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const lcs = dp[x.length][y.length];
  return (2 * lcs) / (x.length + y.length);
}
