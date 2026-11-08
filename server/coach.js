// The central AI English Coach. Uses Claude via the official Anthropic SDK when
// ANTHROPIC_API_KEY is set; otherwise (or on any API failure) falls back to the
// rule-based offline coach so every feature keeps working.
import Anthropic from '@anthropic-ai/sdk';
import { offlineFeedback, offlineNextQuestion, JOURNAL_FOLLOWUPS, similarity, QUESTION_BANK } from './offline.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const aiEnabled = () => Boolean(client);
export const modelName = () => (client ? MODEL : null);

const FEEDBACK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['has_mistakes', 'original', 'corrected', 'natural', 'explanation', 'explanation_ta', 'mistakes', 'vocabulary', 'tips', 'sentence_rating'],
  properties: {
    has_mistakes: { type: 'boolean' },
    original: { type: 'string' },
    corrected: { type: 'string', description: 'Minimal grammatical correction of the learner text.' },
    natural: { type: 'string', description: 'A more natural, fluent way a confident speaker would say it.' },
    explanation: { type: 'string', description: 'Simple English explanation of the main mistakes.' },
    explanation_ta: { type: 'string', description: 'The same explanation in simple Tamil (Tamil script), English grammar terms may stay in English.' },
    mistakes: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['type', 'wrong', 'right', 'why'],
        properties: { type: { type: 'string', description: 'Short category label such as "Articles", "Tense", "Subject-verb agreement", "Preposition", "Word order", "Word choice".' }, wrong: { type: 'string' }, right: { type: 'string' }, why: { type: 'string' } },
      },
    },
    vocabulary: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['word', 'meaning'], properties: { word: { type: 'string' }, meaning: { type: 'string' } } },
    },
    tips: { type: 'array', items: { type: 'string' } },
    sentence_rating: { type: 'integer', description: '1-5 rating of sentence formation (5 = natural and correct).' },
  },
};

const SYSTEM_BASE = `You are FluentStep, a warm, encouraging personal English coach for college students in Tamil Nadu, India, who are beginner to intermediate English learners preparing for campus placements.
Coaching rules:
- Be encouraging and beginner-friendly. Praise what was done well before correcting.
- Indian English accents and Indian names/places are completely fine; never ask for a "native" accent.
- Correct real grammar errors only. A sentence that is grammatically different from what you would say but still correct is NOT a mistake.
- Keep explanations short and simple (CEFR A2-B1 words). Tamil explanations must be in simple Tamil script; keep grammar terms in English where helpful.
- Spoken input comes from speech recognition, so ignore missing punctuation/capitalisation and obvious transcription glitches; do not count them as mistakes.
- If the learner's message has no mistakes, set has_mistakes to false, keep corrected equal to the original, and still offer a more natural alternative if one exists.`;

async function callJSON(system, messages, schema, maxTokens = 4000) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    system,
    messages,
  });
  if (response.stop_reason === 'refusal') throw new Error('The AI declined this request.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

async function withFallback(aiFn, offlineFn) {
  if (!client) return { ...(await offlineFn()), mode: 'offline' };
  try {
    return { ...(await aiFn()), mode: 'ai' };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.error('[coach] Invalid ANTHROPIC_API_KEY — using offline coach.');
    else if (err instanceof Anthropic.RateLimitError) console.error('[coach] Rate limited — using offline coach for this request.');
    else if (err instanceof Anthropic.APIError) console.error(`[coach] API error ${err.status}: ${err.message}`);
    else console.error('[coach] AI call failed:', err.message);
    return { ...(await offlineFn()), mode: 'offline', notice: 'The AI coach is unavailable right now, so this feedback comes from the offline checker.' };
  }
}

const CATEGORY_LABEL = {
  daily: 'daily life', college: 'college life', friends: 'friends and family', shopping: 'shopping and travelling', intro: 'self-introduction',
  general: 'general topics', gd: 'group discussion practice (you play another participant, then invite the learner to respond)', hr: 'an HR interview (you are the interviewer)',
  technical: 'a technical / placement interview for a fresher (you are the interviewer, keep questions answerable by a final-year student)',
  placement: 'a full campus placement HR interview', project: 'explaining their academic project to an interviewer', strengths: 'strengths and weaknesses interview questions',
  goals: 'career goals interview questions', professional: 'professional workplace communication role-plays',
};

const learnerContext = (u) => `Learner: ${u.name}. Level: ${u.level}. ${u.tamil_help ? 'They like Tamil explanations.' : ''}`;

/** Conversation partner / interviewer turn. history = [{role:'assistant'|'user', text}] */
export async function converse({ user, mode, category, history, userText, metrics }) {
  const isInterview = mode === 'placement' || ['hr', 'technical'].includes(category);
  const schema = {
    type: 'object', additionalProperties: false, required: ['reply', 'feedback'],
    properties: { reply: { type: 'string', description: 'Your next conversational turn: a short natural response (1-3 sentences) followed by ONE relevant follow-up question.' }, feedback: FEEDBACK_SCHEMA },
  };
  const ai = async () => {
    const system = `${SYSTEM_BASE}
${learnerContext(user)}
Situation: a spoken conversation about ${CATEGORY_LABEL[category] || category}.
${isInterview ? 'Act as a professional but friendly interviewer. Ask exactly ONE question at a time. In feedback.tips, give detailed, practical suggestions to improve the answer (structure such as STAR, missing details, confidence, professional vocabulary).' : 'Act as a friendly conversation partner. Respond naturally to what they said, then ask ONE follow-up question. Do not lecture inside the reply; all corrections go in feedback.'}
The reply must never contain corrections; corrections go only in feedback, which analyses the learner's LAST message.
Speech metrics measured in the browser (may be empty for typed input): ${JSON.stringify(metrics || {})}. If filler words, repeated words or long pauses are listed, mention them kindly in tips.`;
    const messages = history.map((m) => ({ role: m.role, content: m.text }));
    messages.push({ role: 'user', content: userText });
    if (messages[0]?.role === 'assistant') messages.unshift({ role: 'user', content: `(Start of practice session: ${category})` });
    return callJSON(system, messages, schema);
  };
  const offline = () => {
    const asked = history.filter((m) => m.role === 'assistant').map((m) => m.text);
    const { ack, question } = offlineNextQuestion(category, asked);
    return { reply: `${ack} ${question}`, feedback: offlineFeedback(userText, { spoken: Boolean(metrics) }) };
  };
  return withFallback(ai, offline);
}

export async function openingLine({ user, mode, category }) {
  const first = (QUESTION_BANK[category] || QUESTION_BANK.general)[0];
  const isInterview = mode === 'placement' || ['hr', 'technical'].includes(category);
  if (!client) return { reply: isInterview ? `Hello ${user.name}, welcome to your mock interview. Let's begin. ${first}` : `Hi ${user.name}! Let's practise talking about ${CATEGORY_LABEL[category] || category}. ${first}`, mode: 'offline' };
  try {
    const out = await callJSON(
      `${SYSTEM_BASE}\n${learnerContext(user)}`,
      [{ role: 'user', content: `Start a ${isInterview ? 'mock interview' : 'friendly spoken conversation'} about ${CATEGORY_LABEL[category] || category}. Greet the learner by name in one short sentence and ask ONE easy opening question suited to a ${user.level} learner.` }],
      { type: 'object', additionalProperties: false, required: ['reply'], properties: { reply: { type: 'string' } } },
      1500,
    );
    return { ...out, mode: 'ai' };
  } catch (err) {
    console.error('[coach] opening line failed:', err.message);
    return { reply: `Hi ${user.name}! ${first}`, mode: 'offline' };
  }
}

/** One-off writing/speaking review (journal, summaries, read-aloud answers). */
export async function review({ user, kind, prompt, text, wantFollowUp, spoken = false }) {
  const schema = {
    type: 'object', additionalProperties: false, required: ['feedback', 'follow_up', 'content_comment'],
    properties: {
      feedback: FEEDBACK_SCHEMA,
      follow_up: { type: 'string', description: 'A friendly follow-up question to continue the conversation (empty string if not needed).' },
      content_comment: { type: 'string', description: 'One or two sentences on the content/ideas (e.g., is the summary accurate and complete, does the answer address the question).' },
    },
  };
  const ai = () => callJSON(
    `${SYSTEM_BASE}\n${learnerContext(user)}\nActivity: ${kind}. The answer was ${spoken ? 'spoken (speech-to-text transcript)' : 'typed'}.`,
    [{ role: 'user', content: `Prompt/question given to the learner:\n${prompt}\n\nLearner's answer:\n${text}\n\n${wantFollowUp ? 'Also ask one warm follow-up question about their day/answer.' : 'follow_up can be an empty string.'}` }],
    schema,
  );
  const offline = () => ({
    feedback: offlineFeedback(text, { spoken }),
    follow_up: wantFollowUp ? JOURNAL_FOLLOWUPS[Math.floor(Math.random() * JOURNAL_FOLLOWUPS.length)] : '',
    content_comment: '',
  });
  return withFallback(ai, offline);
}

/** Translation evaluation: meaning first, grammar second. */
export async function checkTranslation({ user, direction, source, reference, alternatives = [], answer }) {
  const schema = {
    type: 'object', additionalProperties: false,
    required: ['verdict', 'meaning_ok', 'grammar_ok', 'score', 'model_answer', 'explanation', 'explanation_ta', 'alternatives', 'mistakes'],
    properties: {
      verdict: { type: 'string', enum: ['correct', 'almost', 'incorrect'] },
      meaning_ok: { type: 'boolean' },
      grammar_ok: { type: 'boolean' },
      score: { type: 'integer', description: '0-100' },
      model_answer: { type: 'string' },
      explanation: { type: 'string' },
      explanation_ta: { type: 'string' },
      alternatives: { type: 'array', items: { type: 'string' } },
      mistakes: FEEDBACK_SCHEMA.properties.mistakes,
    },
  };
  const ai = () => callJSON(
    `${SYSTEM_BASE}\n${learnerContext(user)}\nYou are checking a ${direction === 'ta-en' ? 'Tamil → English' : 'English → Tamil'} translation exercise. Judge MEANING first, then grammar. Any translation that conveys the same meaning with correct grammar is "correct", even if it differs from the reference wording. Minor slips that keep the meaning are "almost". Explain grammar mistakes in simple Tamil in explanation_ta.`,
    [{ role: 'user', content: `Source sentence: ${source}\nReference translation: ${reference}\nOther acceptable translations: ${alternatives.join(' | ') || 'none listed'}\nLearner's translation: ${answer}` }],
    schema,
  );
  const offline = () => {
    const best = Math.max(...[reference, ...alternatives].map((r) => similarity(answer, r)));
    const fb = direction === 'ta-en' ? offlineFeedback(answer) : { mistakes: [] };
    const verdict = best >= 0.85 ? 'correct' : best >= 0.6 ? 'almost' : 'incorrect';
    return {
      verdict, meaning_ok: best >= 0.6, grammar_ok: !fb.mistakes.length, score: Math.round(best * 100),
      model_answer: reference, alternatives,
      explanation: `Offline check: your answer matches the model answers about ${Math.round(best * 100)}% by words. Different wording can still be correct — compare the meaning with the answers below.`,
      explanation_ta: 'இது ஆஃப்லைன் சோதனை மட்டுமே. உங்கள் வாக்கியம் வேறு சொற்களில் இருந்தாலும் பொருள் சரியாக இருந்தால் அது சரியானதே.',
      mistakes: fb.mistakes,
    };
  };
  return withFallback(ai, offline);
}

/** Tamil explanation on demand for any English text or feedback. */
export async function explainInTamil({ user, text }) {
  const schema = { type: 'object', additionalProperties: false, required: ['tamil'], properties: { tamil: { type: 'string' } } };
  const ai = () => callJSON(
    `${SYSTEM_BASE}\n${learnerContext(user)}`,
    [{ role: 'user', content: `Explain the meaning of this English text in simple Tamil so a beginner understands it. Keep key English words in brackets.\n\n${text}` }],
    schema, 2000,
  );
  const offline = () => ({ tamil: 'தமிழ் விளக்கம் பெற AI coach தேவை. நிர்வாகி (administrator) ANTHROPIC_API_KEY-ஐ அமைத்தால் இந்த வசதி செயல்படும்.' });
  return withFallback(ai, offline);
}
