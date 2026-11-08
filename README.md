# FluentStep – Your Personal English Coach

A full-stack, AI-powered English learning platform for students and beginner-to-intermediate learners in Tamil Nadu. It combines speaking, listening, shadowing, reading, journaling, translation, grammar, vocabulary, cartoon and TED listening, and placement-interview practice in one dashboard, with Tamil explanations where they help.

## Quick start

Requirements: **Node.js 22.9 or newer**. Data is stored with libSQL: a local SQLite file in `data/` during development, or a free hosted [Turso](https://turso.tech) database in production.

**To put FluentStep online for free, follow [DEPLOY.md](DEPLOY.md).**

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env` and set `ANTHROPIC_API_KEY` (see below), then:

```bash
npm start
```

Open http://localhost:3000, create an account and take the 12-question level check.

The first account you register becomes the **administrator**, unless you set `ADMIN_EMAIL` in `.env`. The administrator can add approved video links in Cartoon English and TED Talks.

## Configuring the AI coach

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Turns on the AI English Coach (Claude). It handles conversation, corrections, Tamil explanations, translation checking and interview feedback. Get a key at https://console.anthropic.com. |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-opus-5-5`. |
| `PORT` | Optional. Defaults to `3000`. |
| `ADMIN_EMAIL` | Optional. This email becomes the administrator when it signs up. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Production database (see DEPLOY.md). Leave empty to use a local file. |
| `NODE_ENV` | Set to `production` on the server (secure cookies, proxy support). |
| `CONTACT_EMAIL` | Shown on the Terms page. |

- The key is read only on the server, in `server/coach.js`. It never reaches the browser.
- Requests turn on server-side refusal fallback (`fallbacks: "default"`). If the model declines a request, the API retries it on a fallback model.
- **Without a key, the app runs in free mode.** Every feature still works, at no cost. Feedback combines a built-in rule-based checker for common Indian-English mistakes ("Myself Priya", "discuss about", "I am having experience", "he go", "did went") with the free public [LanguageTool](https://languagetool.org) grammar check. LanguageTool is called from each learner's browser, once per submitted answer, so each learner uses their own small quota (about 20 checks per minute per IP). Its terms require the visible "Grammar check powered by LanguageTool" link that feedback cards show. They also ask that the public API not be used for automated bulk requests. For a large user base, run your own LanguageTool server (it is free, open-source software) or buy their API plan. The conversation partner asks scripted follow-up questions in free mode. The offline checker never marks a translation wrong on its own. It asks you to compare your answer with the model answers instead.
- If an AI call fails (invalid key, rate limit, network), that request falls back to the offline checker automatically.

## Speech features and browser support

| Feature | How it works | Support |
|---|---|---|
| Text-to-speech (listening audio, word pronunciation, coach voice) | Browser `speechSynthesis`, with a different voice for each speaker and 0.75x / 1x / 1.25x speed | All modern browsers |
| Speech-to-text | Browser Web Speech API, default accent **English (India)**, which you can change in Settings | Chrome and Edge (desktop and Android) |
| Recording, playback, pause detection | `MediaRecorder` plus the Web Audio level meter | All modern browsers |

If speech-to-text or the microphone isn't available, the page says so and you can type instead. Text practice gets the same feedback.

**Privacy:** recordings stay in the browser as temporary blob URLs and are never uploaded or stored. Only the text of your answers, the feedback and your progress are saved. In free mode, the text of each submitted answer is also sent to LanguageTool for checking ([privacy policy](https://languagetool.org/legal/privacy)). Passwords are hashed with scrypt. Sessions use HttpOnly, SameSite=Strict cookies. A strict Content-Security-Policy limits which sites can be embedded. You can delete your account and all its data from Settings.

## Modules

| Route | Module |
|---|---|
| `#/dashboard` | Welcome, daily goal ring, today's plan, streak, practice calendar, word and sentence of the day, skill progress, weekly chart |
| `#/speaking` | AI conversation partner in 9 categories (daily life through technical interviews). Voice or text input, replies read aloud, corrections given after each answer, Tamil on request, fluency metrics (words per minute, long pauses, filler and repeated words), saved history |
| `#/listening` | 9 original dialogues, stories and news reports at 3 levels. Speed control, repeat, line-by-line replay, show/hide transcript, multiple-choice and fill-in-the-blank questions with scores and explanations |
| `#/shadowing` | Listen, read, record, then a word-by-word comparison (missing, different and extra words), word accuracy, pace, pauses and words to practise. Accent-neutral. You can also shadow your own sentences |
| `#/myday` | Daily journal. The coach asks a question, you speak or type an answer, and you get your original sentence, the correction, a Tamil explanation, a natural version, vocabulary and a follow-up question. Includes an improvement chart over time |
| `#/reading` | 6 passages from beginner to advanced. Tap highlighted words for meanings in English and Tamil, listen with text-to-speech, read aloud and get scored, answer questions, save words |
| `#/translate` | Tamil to English and English to Tamil, in 6 categories. Meaning-first checking, adaptive difficulty, alternative answers and Tamil grammar explanations |
| `#/grammar` | 11 practical topics, each with an explanation, a Tamil explanation, examples with audio, a "write your own sentence" check and a 5-question quiz |
| `#/vocab` | Daily revision with flashcards and spaced repetition (Leitner boxes), my words, a 32-word list, phrasal verbs and phrases, and a meaning quiz |
| `#/cartoon` | Link to the official Peppa Pig channel, 3 original animated stories with vocabulary, explanations, questions and repeat-after-me, and admin-approved embeds with a "retell" speaking task |
| `#/ted` | 5 TED talks linked to TED.com (not embedded), with links to the official transcripts, vocabulary, expressions, comprehension questions, summary writing, a speaking task, shadowing excerpts and favourites |
| `#/placement` | Mock interviewer for 9 topics (tell me about yourself, strengths and weaknesses, why hire you, your project, career goals, HR, group discussion, technical, professional communication). Includes answer frameworks and detailed tips |
| `#/progress` | Practice time, speaking, listening, reading, grammar and vocabulary stats, weekly and monthly improvement, and frequent mistakes. All figures come from real activity |
| `#/notebook` | Personal mistake notebook. Repeated error types are counted, with links to the matching grammar topic |
| `#/planner` | Customise minutes per skill and set a daily browser reminder |
| `#/settings` | Profile, level, Tamil preference, coach voice, recognition accent, AI status, privacy and account deletion |

## Content and copyright

All lessons, dialogues, stories, passages, quizzes and Tamil explanations were written for FluentStep. Peppa Pig and TED content is never downloaded or redistributed. TED talks are only linked to TED.com, because TED's licence (CC BY-NC-ND) does not allow commercial use. Admin-approved YouTube and Vimeo videos use the official players (`youtube-nocookie.com`, `player.vimeo.com`); TED links added by an admin are shown as links. Administrators can add only `https` links from YouTube, TED or Vimeo, and should add only material they are authorised to share.

## Project structure

```
server.js              Local development server
server/app.js          Express API: auth, activities, stats, conversations, journal, vocab, mistakes, videos
netlify/functions/api.js  Runs the same API on Netlify
server/db.js           libSQL database: local file or Turso, schema, queries
server/coach.js        AI English Coach (Claude) with structured JSON feedback
server/offline.js      Rule-based fallback coach
public/index.html      Single-page app shell
public/css/styles.css  Violet and lavender design system, responsive layout
public/js/app.js       Router, sidebar and bottom navigation, reminders
public/js/speech.js    Text-to-speech, speech-to-text, recorder, pause and fluency analysis, word comparison
public/js/ui.js        Feedback cards, quizzes, voice input, SVG charts
public/js/pages/*.js   One module per section
public/js/content/*.js Learning content
```
