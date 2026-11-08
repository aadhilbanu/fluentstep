export const SPEAKING_CATEGORIES = [
  { id: 'daily', label: 'Daily life', icon: '☀️', desc: 'Routines, food, weekends' },
  { id: 'college', label: 'College', icon: '🎓', desc: 'Classes, exams, campus life' },
  { id: 'friends', label: 'Friends & family', icon: '👨‍👩‍👧', desc: 'People you love, festivals' },
  { id: 'shopping', label: 'Shopping & travel', icon: '🛍️', desc: 'Shops, directions, trips' },
  { id: 'intro', label: 'Self-introduction', icon: '🙋', desc: 'Introduce yourself confidently' },
  { id: 'general', label: 'General topics', icon: '💡', desc: 'Opinions on everyday issues' },
  { id: 'gd', label: 'Group discussion', icon: '👥', desc: 'Share views and respond' },
  { id: 'hr', label: 'HR interview', icon: '🤝', desc: 'Common HR questions' },
  { id: 'technical', label: 'Technical interview', icon: '💻', desc: 'Explain technical ideas simply' },
];

export const PLACEMENT_TOPICS = [
  { id: 'intro', label: 'Tell me about yourself', icon: '🙋', tip: 'Use Present–Past–Future: who you are now, what you have done (education, projects, internships), and what you want to do next. Keep it to 60–90 seconds.', frame: 'Good morning. My name is ___. I am a final-year ___ student at ___. During my studies, I worked on ___, where I ___. I also ___. I am now looking for an opportunity to ___.' },
  { id: 'strengths', label: 'Strengths & weaknesses', icon: '💪', tip: 'Give a strength with a real example. For a weakness, choose a real but non-critical one and explain what you are doing to improve it.', frame: 'One of my key strengths is ___. For example, ___. A weakness I am working on is ___, so I have started ___.' },
  { id: 'hr', label: 'HR interview (mixed)', icon: '🤝', tip: 'Answer in 3 parts: direct answer → example → link to the job. Smile and keep a steady pace.', frame: 'I believe ___ because ___. For instance, ___. That is why I think I can ___ in this role.' },
  { id: 'placement', label: 'Why should we hire you?', icon: '⭐', tip: 'Match your skills to the company\'s needs. Mention one skill, one attitude and one proof.', frame: 'You should hire me because I have ___ skills, which I used in ___. I am also ___ and eager to ___.' },
  { id: 'project', label: 'Explain your project', icon: '🛠️', tip: 'Problem → Solution → Technology → Your role → Result/learning. Avoid too much jargon.', frame: 'My project is called ___. It solves the problem of ___. We used ___ to ___. My role was ___. As a result, ___.' },
  { id: 'goals', label: 'Career goals', icon: '🎯', tip: 'Short-term: learn and contribute. Long-term: grow into a responsible role. Connect your goals to the company.', frame: 'In the short term, I want to ___. In the long term, I see myself ___. I believe this company ___.' },
  { id: 'gd', label: 'Group discussion', icon: '👥', tip: 'Start with a clear stand, give one reason with an example, listen and build on others\' points politely, and summarise at the end.', frame: 'I would like to begin by saying ___. One reason is ___. For example, ___. To sum up, ___.' },
  { id: 'technical', label: 'Technical explanation', icon: '💻', tip: 'Define it in one simple sentence, give a real-life analogy, then a small technical example.', frame: '___ is ___. In simple words, it is like ___. For example, in ___ we use it to ___.' },
  { id: 'professional', label: 'Professional communication', icon: '📧', tip: 'Be polite, clear and brief: greeting → purpose → details → request → thanks.', frame: 'Hi ___, I hope you are doing well. I am writing to ___. Could you please ___? Thank you.' },
];

export const JOURNAL_PROMPTS = [
  'How was your day?',
  'What did you learn today?',
  'What happened at college today?',
  'What are your plans for tomorrow?',
  'What made you happy today?',
  'Who did you meet today, and what did you talk about?',
  'What was difficult today, and how did you handle it?',
  'Describe something interesting you saw today.',
];

export const ASSESSMENT = [
  { skill: 'grammar', q: 'She ___ to college by bus every day.', options: ['go', 'goes', 'going', 'gone'], answer: 1 },
  { skill: 'grammar', q: 'I ___ my project last week.', options: ['complete', 'have completed', 'completed', 'am completing'], answer: 2 },
  { skill: 'grammar', q: 'Choose the correct question.', options: ['Where you are going?', 'Where are you going?', 'Where you going are?', 'Where going you are?'], answer: 1 },
  { skill: 'grammar', q: 'He is ___ honest man.', options: ['a', 'an', 'the', 'no article'], answer: 1 },
  { skill: 'grammar', q: 'Although it was late, ___', options: ['but we continued.', 'we continued.', 'so we continued.', 'and we continued.'], answer: 1 },
  { skill: 'grammar', q: 'If I ___ more time, I would learn French.', options: ['have', 'had', 'will have', 'has'], answer: 1 },
  { skill: 'vocabulary', q: '"Punctual" means…', options: ['always on time', 'very clever', 'very quiet', 'always busy'], answer: 0 },
  { skill: 'vocabulary', q: 'Opposite of "confident":', options: ['brave', 'nervous', 'happy', 'strong'], answer: 1 },
  { skill: 'vocabulary', q: '"I look forward to ___ you."', options: ['meet', 'meeting', 'met', 'meets'], answer: 1 },
  { skill: 'vocabulary', q: 'Which word means "to postpone"?', options: ['put off', 'put on', 'give up', 'take off'], answer: 0 },
  { skill: 'reading', passage: 'Ravi wanted to improve his English. Every evening he watched a short English video and wrote three new words in a notebook. After two months, he could speak more confidently in class.', q: 'What helped Ravi speak more confidently?', options: ['Going to tuition', 'Daily videos and new words', 'Talking to tourists', 'Reading newspapers'], answer: 1 },
  { skill: 'listening', audio: 'The library will be closed on Saturday because of maintenance work, but it will open as usual on Monday morning.', q: 'Why will the library be closed on Saturday?', options: ['It is a holiday', 'Maintenance work', 'An exam', 'Heavy rain'], answer: 1 },
];

// TED talks: linked/embedded only from official ted.com sources. Vocabulary,
// expressions and questions below are original FluentStep study material.
export const TED_TALKS = [
  {
    id: 'sinek', slug: 'simon_sinek_how_great_leaders_inspire_action', speaker: 'Simon Sinek', title: 'How great leaders inspire action', level: 'intermediate', mins: 18,
    vocab: [{ word: 'inspire', meaning: 'to make someone want to do something' }, { word: 'loyalty', meaning: 'strong support for someone or something' }, { word: 'manipulate', meaning: 'to control someone in a clever, unfair way' }, { word: 'pattern', meaning: 'a regular way in which something happens' }],
    expressions: ['to start with why', 'to think, act and communicate', 'people who believe what you believe', 'the inside out'],
    questions: [
      { q: 'What are the three parts of Sinek\'s "golden circle"?', options: ['Who, When, Where', 'Why, How, What', 'Plan, Do, Check', 'Think, Speak, Act'], answer: 1, explain: 'The golden circle has Why at the centre, then How, then What.' },
      { q: 'According to the talk, inspiring leaders communicate…', options: ['from What to Why', 'from Why to What (inside out)', 'only with numbers', 'only about products'], answer: 1, explain: 'He argues that inspiring leaders start with Why and move outwards.' },
      { q: 'Which company does he use as a main example?', options: ['Apple', 'Google', 'Tata', 'Infosys'], answer: 0, explain: 'Apple is his main business example.' },
    ],
    speaking: 'What is your "why"? Explain why you chose your field of study in 4–5 sentences.',
  },
  {
    id: 'duckworth', slug: 'angela_lee_duckworth_grit_the_power_of_passion_and_perseverance', speaker: 'Angela Lee Duckworth', title: 'Grit: The power of passion and perseverance', level: 'beginner', mins: 6,
    vocab: [{ word: 'grit', meaning: 'passion and perseverance for long-term goals' }, { word: 'perseverance', meaning: 'continuing to try despite difficulty' }, { word: 'stamina', meaning: 'the energy to keep going for a long time' }, { word: 'predictor', meaning: 'something that shows what will happen' }],
    expressions: ['to stick with your future', 'day in, day out', 'not just for the week, not just for the month', 'growth mindset'],
    questions: [
      { q: 'What was Duckworth\'s job before becoming a psychologist?', options: ['Doctor', 'Math teacher', 'Journalist', 'Engineer'], answer: 1, explain: 'She taught math to seventh-grade students.' },
      { q: 'How does she describe grit?', options: ['Natural talent', 'Passion and perseverance for very long-term goals', 'High IQ', 'Good luck'], answer: 1, explain: 'Grit is passion and perseverance for very long-term goals.' },
      { q: 'Which idea does she mention as a way to build grit?', options: ['Growth mindset', 'Memorising', 'Competition', 'Strict rules'], answer: 0, explain: 'She mentions "growth mindset" — the belief that the ability to learn can change with effort.' },
    ],
    speaking: 'Describe a time you did not give up on something difficult. What kept you going?',
  },
  {
    id: 'cutts', slug: 'matt_cutts_try_something_new_for_30_days', speaker: 'Matt Cutts', title: 'Try something new for 30 days', level: 'beginner', mins: 3,
    vocab: [{ word: 'challenge', meaning: 'a difficult task you set for yourself' }, { word: 'sustainable', meaning: 'able to continue for a long time' }, { word: 'memorable', meaning: 'easy to remember; special' }, { word: 'confidence', meaning: 'belief in yourself' }],
    expressions: ['to be stuck in a rut', 'to give it a shot', 'small, sustainable changes', 'time will pass anyway, so use it well'],
    questions: [
      { q: 'How long is each challenge in the talk?', options: ['7 days', '30 days', '100 days', 'One year'], answer: 1, explain: 'He tried new things for 30 days each.' },
      { q: 'What did he write during one of his challenges?', options: ['A song', 'A novel', 'A blog', 'A textbook'], answer: 1, explain: 'He wrote a 50,000-word novel in a month.' },
      { q: 'What did he learn about small changes?', options: ['They never work', 'Small, sustainable changes are more likely to stick', 'Only big changes matter', 'They are boring'], answer: 1, explain: 'He found that small, sustainable changes were more likely to continue.' },
    ],
    speaking: 'What 30-day challenge will you try to improve your English? Explain your plan.',
  },
  {
    id: 'treasure', slug: 'julian_treasure_how_to_speak_so_that_people_want_to_listen', speaker: 'Julian Treasure', title: 'How to speak so that people want to listen', level: 'intermediate', mins: 10,
    vocab: [{ word: 'gossip', meaning: 'talking about people who are not present' }, { word: 'dogmatism', meaning: 'treating your opinions as facts' }, { word: 'authenticity', meaning: 'being true to yourself' }, { word: 'prosody', meaning: 'the rhythm and melody of speech' }],
    expressions: ['deadly sins of speaking', 'to wish someone well', 'to speak with intention', 'to warm up your voice'],
    questions: [
      { q: 'What does HAIL stand for?', options: ['Help, Ask, Inform, Listen', 'Honesty, Authenticity, Integrity, Love', 'Hope, Action, Idea, Logic', 'Hard work, Attitude, Interest, Learning'], answer: 1, explain: 'HAIL = Honesty, Authenticity, Integrity, Love.' },
      { q: 'Which is one of the "deadly sins" of speaking?', options: ['Smiling', 'Complaining', 'Pausing', 'Asking questions'], answer: 1, explain: 'Complaining is one of the habits he warns against.' },
      { q: 'Which is a vocal tool he mentions?', options: ['Pace', 'Grammar', 'Spelling', 'Handwriting'], answer: 0, explain: 'He lists register, timbre, prosody, pace, pitch and volume.' },
    ],
    speaking: 'Which speaking habit do you want to change, and how will you change it?',
  },
  {
    id: 'cuddy', slug: 'amy_cuddy_your_body_language_may_shape_who_you_are', speaker: 'Amy Cuddy', title: 'Your body language may shape who you are', level: 'advanced', mins: 21,
    vocab: [{ word: 'nonverbal', meaning: 'without words' }, { word: 'posture', meaning: 'the way you hold your body' }, { word: 'impostor', meaning: 'someone pretending to be someone else' }, { word: 'presence', meaning: 'a confident, calm way of being' }],
    expressions: ['to fake it till you become it', 'power posing', 'to feel like an impostor', 'to share an idea'],
    questions: [
      { q: 'What is the main idea of the talk?', options: ['Clothes decide success', 'Body language can affect how we feel and act', 'Talent is everything', 'Interviews are unfair'], answer: 1, explain: 'She argues our body language may shape how we think and feel about ourselves.' },
      { q: 'How long does she suggest practising a power pose?', options: ['Two minutes', 'Two hours', 'Ten seconds', 'A whole day'], answer: 0, explain: 'She suggests about two minutes before a stressful situation.' },
      { q: 'What personal story does she share?', options: ['Losing a job', 'Recovering from a serious car accident and feeling like an impostor', 'Moving to India', 'Winning a race'], answer: 1, explain: 'After a car accident she struggled and felt she did not belong.' },
    ],
    speaking: 'How will you use body language in your next interview? Give two examples.',
  },
];

// Original beginner-friendly stories and animated scenes (Cartoon English).
export const STORIES = [
  {
    id: 's1', title: 'Milo the Cat Goes Shopping', cast: { Milo: '🐱', Shopkeeper: '🐻' },
    scene: [
      { s: 'Milo', t: 'Good morning! Do you have any fresh fish today?' },
      { s: 'Shopkeeper', t: 'Good morning, Milo! Yes, we have some very fresh fish.' },
      { s: 'Milo', t: 'How much is one fish?' },
      { s: 'Shopkeeper', t: 'It is twenty rupees.' },
      { s: 'Milo', t: 'I would like two fish, please.' },
      { s: 'Shopkeeper', t: 'Here you are. That is forty rupees.' },
      { s: 'Milo', t: 'Thank you! Have a nice day!' },
    ],
    vocab: [{ word: 'fresh', meaning: 'new and good to eat', tamil: 'புதிய' }, { word: 'How much', meaning: 'asking the price', tamil: 'எவ்வளவு விலை' }, { word: 'Here you are', meaning: 'said when giving something', tamil: 'இதோ எடுத்துக்கொள்ளுங்கள்' }],
    explain: [{ en: 'I would like two fish, please.', note: '"I would like" is a polite way to say "I want".' }, { en: 'Here you are.', note: 'We say this when we give something to someone.' }],
    questions: [
      { q: 'What does Milo want to buy?', options: ['Milk', 'Fish', 'Bread', 'Fruit'], answer: 1, explain: 'Milo asks for fresh fish.' },
      { q: 'How much does Milo pay?', options: ['₹20', '₹30', '₹40', '₹50'], answer: 2, explain: 'Two fish × ₹20 = ₹40.' },
    ],
  },
  {
    id: 's2', title: 'Pinky the Elephant\'s First Day at School', cast: { Pinky: '🐘', Teacher: '🦉', Raju: '🐒' },
    scene: [
      { s: 'Teacher', t: 'Welcome to class, Pinky! Please introduce yourself.' },
      { s: 'Pinky', t: 'Hello, everyone. My name is Pinky. I love painting and swimming.' },
      { s: 'Raju', t: 'Hi Pinky! I love painting too. Can we sit together?' },
      { s: 'Pinky', t: 'Yes, of course! Thank you, Raju.' },
      { s: 'Teacher', t: 'Wonderful. Now, let us open our books to page five.' },
    ],
    vocab: [{ word: 'introduce yourself', meaning: 'tell people who you are', tamil: 'உங்களை அறிமுகப்படுத்துங்கள்' }, { word: 'together', meaning: 'with each other', tamil: 'சேர்ந்து' }, { word: 'of course', meaning: 'certainly; yes', tamil: 'நிச்சயமாக' }],
    explain: [{ en: 'My name is Pinky. I love painting and swimming.', note: 'A simple self-introduction: name + hobbies.' }, { en: 'Can we sit together?', note: '"Can we…?" is a friendly request.' }],
    questions: [
      { q: 'What are Pinky\'s hobbies?', options: ['Singing and dancing', 'Painting and swimming', 'Reading and running', 'Cooking'], answer: 1, explain: 'Pinky says, "I love painting and swimming."' },
      { q: 'Who wants to sit with Pinky?', options: ['The teacher', 'Raju', 'Nobody', 'Pinky\'s mother'], answer: 1, explain: 'Raju asks, "Can we sit together?"' },
    ],
  },
  {
    id: 's3', title: 'The Rainy Day Picnic', cast: { Leo: '🦁', Daisy: '🐰' },
    scene: [
      { s: 'Leo', t: 'Oh no! It is raining. We cannot go to the park today.' },
      { s: 'Daisy', t: 'Don\'t be sad, Leo. We can have a picnic inside the house!' },
      { s: 'Leo', t: 'Inside? What a fun idea!' },
      { s: 'Daisy', t: 'Let\'s put a blanket on the floor and bring some sandwiches.' },
      { s: 'Leo', t: 'And we can listen to the rain while we eat. This is the best picnic ever!' },
    ],
    vocab: [{ word: 'picnic', meaning: 'a meal eaten outside or for fun', tamil: 'சுற்றுலா உணவு' }, { word: 'blanket', meaning: 'a thick cloth', tamil: 'போர்வை' }, { word: 'idea', meaning: 'a thought or plan', tamil: 'யோசனை' }],
    explain: [{ en: 'What a fun idea!', note: '"What a + adjective + noun!" shows excitement.' }, { en: 'Let\'s put a blanket on the floor.', note: '"Let\'s" (let us) makes a suggestion.' }],
    questions: [
      { q: 'Why can\'t they go to the park?', options: ['It is too hot', 'It is raining', 'The park is closed', 'They are tired'], answer: 1, explain: '"It is raining."' },
      { q: 'Where do they have the picnic?', options: ['In the park', 'At school', 'Inside the house', 'At the beach'], answer: 2, explain: 'Daisy suggests a picnic inside the house.' },
    ],
  },
];
