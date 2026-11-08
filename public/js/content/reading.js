// Original reading passages. `words` are the highlighted difficult words.
export const READING = [
  {
    id: 'r1', level: 'beginner', category: 'Beginner short story', title: 'The Lost Umbrella', minutes: 3,
    text: `It was a rainy Monday morning. Selvi took her red umbrella and walked to the bus stop. The bus was crowded, so she stood near the door. When she got down at college, she suddenly realised that her umbrella was missing.

She felt upset because it was a gift from her grandmother. In the evening, she went back to the bus depot and asked the conductor. He smiled and opened a cupboard full of forgotten things. Her red umbrella was there! Selvi thanked him gratefully. From that day, she always checks her things before she gets off the bus.`,
    words: {
      crowded: { meaning: 'full of people', tamil: 'கூட்டம் நிறைந்த', example: 'The market is always crowded on Sundays.' },
      realised: { meaning: 'suddenly understood or noticed', tamil: 'உணர்ந்தாள்', example: 'I realised I had left my phone at home.' },
      upset: { meaning: 'unhappy and worried', tamil: 'வருத்தம்', example: 'He was upset after the match.' },
      depot: { meaning: 'a place where buses are kept', tamil: 'பணிமனை', example: 'The bus depot is near the old market.' },
      conductor: { meaning: 'the person who collects tickets on a bus', tamil: 'நடத்துனர்', example: 'The conductor gave me the ticket.' },
      gratefully: { meaning: 'in a thankful way', tamil: 'நன்றியுடன்', example: 'She accepted the help gratefully.' },
    },
    questions: [
      { q: 'Why did Selvi stand near the door?', options: ['She was getting down soon', 'The bus was crowded', 'She liked the breeze', 'The conductor asked her'], answer: 1, explain: '"The bus was crowded, so she stood near the door."' },
      { q: 'Why was the umbrella special?', options: ['It was expensive', 'It was new', 'It was a gift from her grandmother', 'It was her favourite colour'], answer: 2, explain: '"It was a gift from her grandmother."' },
      { q: 'What habit did Selvi start?', options: ['Taking a taxi', 'Checking her things before getting off', 'Buying two umbrellas', 'Sitting near the conductor'], answer: 1, explain: '"She always checks her things before she gets off the bus."' },
    ],
  },
  {
    id: 'r2', level: 'beginner', category: 'Daily English paragraph', title: 'My Morning Routine', minutes: 2,
    text: `I wake up at six o'clock every morning. First, I drink a glass of warm water and stretch for five minutes. Then I take a bath and get ready for college. My mother usually makes idli or dosa for breakfast. While I eat, I listen to an English podcast for ten minutes. It helps me improve my listening skills. I leave home at half past seven and catch the college bus. On the bus, I revise new words in my notebook. A good routine keeps me active and positive for the whole day.`,
    words: {
      stretch: { meaning: 'to move your body to make muscles long', tamil: 'உடலை நீட்டி இழுத்தல்', example: 'Athletes stretch before running.' },
      podcast: { meaning: 'an audio programme you can listen to online', tamil: 'இணைய ஒலி நிகழ்ச்சி', example: 'I listen to a podcast about technology.' },
      revise: { meaning: 'to study something again', tamil: 'மீண்டும் படித்தல்', example: 'I revise my notes before exams.' },
      routine: { meaning: 'the usual order in which you do things', tamil: 'அன்றாட வழக்கம்', example: 'Exercise is part of my daily routine.' },
      active: { meaning: 'full of energy', tamil: 'சுறுசுறுப்பான', example: 'My grandfather is still very active.' },
    },
    questions: [
      { q: 'What does the writer do first after waking up?', options: ['Takes a bath', 'Drinks warm water', 'Eats breakfast', 'Listens to a podcast'], answer: 1, explain: '"First, I drink a glass of warm water."' },
      { q: 'Why does the writer listen to a podcast?', options: ['To relax', 'To improve listening skills', 'To hear music', 'To learn cooking'], answer: 1, explain: '"It helps me improve my listening skills."' },
      { q: 'When does the writer leave home?', options: ['6:00', '7:00', '7:30', '8:30'], answer: 2, explain: '"I leave home at half past seven" = 7:30.' },
    ],
  },
  {
    id: 'r3', level: 'intermediate', category: 'Student topic', title: 'How to Beat Exam Stress', minutes: 4,
    text: `Almost every student feels nervous before exams. A little stress can actually be useful because it keeps us alert. However, too much stress affects our sleep, memory and confidence.

The first step is to plan early. Breaking the syllabus into small daily targets makes it feel manageable. Second, take short breaks. Studies suggest that a five-minute break after every forty-five minutes of study helps the brain to retain information. Third, avoid comparing yourself with others. Every student learns at a different pace.

Finally, do not underestimate the power of sleep. Staying awake all night before an exam may seem productive, but a tired brain cannot recall information properly. Remember, exams test your preparation, not your worth as a person.`,
    words: {
      alert: { meaning: 'quick to notice and act', tamil: 'விழிப்புடன்', example: 'Drivers must stay alert at night.' },
      syllabus: { meaning: 'the list of topics in a course', tamil: 'பாடத்திட்டம்', example: 'The syllabus has five units.' },
      manageable: { meaning: 'possible to deal with', tamil: 'சமாளிக்கக்கூடிய', example: 'Small tasks are more manageable.' },
      retain: { meaning: 'to keep or remember', tamil: 'நினைவில் வைத்தல்', example: 'Revision helps you retain facts.' },
      pace: { meaning: 'speed', tamil: 'வேகம்', example: 'Read at your own pace.' },
      underestimate: { meaning: 'to think something is less important than it is', tamil: 'குறைத்து மதிப்பிடுதல்', example: 'Never underestimate small savings.' },
      productive: { meaning: 'achieving a lot', tamil: 'பயனுள்ள', example: 'It was a productive meeting.' },
      recall: { meaning: 'to remember', tamil: 'நினைவுகூர்தல்', example: 'I cannot recall his name.' },
    },
    questions: [
      { q: 'According to the passage, a little stress…', options: ['is always harmful', 'keeps us alert', 'causes poor memory', 'should be ignored'], answer: 1, explain: '"A little stress can actually be useful because it keeps us alert."' },
      { q: 'What break is suggested?', options: ['15 minutes every hour', '5 minutes after every 45 minutes', '1 hour after lunch', 'No breaks'], answer: 1, explain: '"A five-minute break after every forty-five minutes of study."' },
      { q: 'Why should you not stay awake all night?', options: ['It is boring', 'A tired brain cannot recall information properly', 'Parents do not like it', 'Exams start early'], answer: 1, explain: '"A tired brain cannot recall information properly."' },
      { q: 'What is the main message of the last sentence?', options: ['Exams decide your value', 'Your worth is more than your exam result', 'Exams are easy', 'Do not prepare'], answer: 1, explain: '"Exams test your preparation, not your worth as a person."' },
    ],
  },
  {
    id: 'r4', level: 'intermediate', category: 'Interesting article', title: 'Why We Forget New Words', minutes: 4,
    text: `Have you ever learned a new English word, only to forget it two days later? You are not alone. In the nineteenth century, a German psychologist named Hermann Ebbinghaus studied memory and described what is now called the "forgetting curve". It shows that we forget a large part of new information within a few days unless we review it.

The good news is that each review makes the memory stronger and slows down forgetting. This is the idea behind spaced repetition: you review a word just before you are likely to forget it — after one day, then three days, then a week, and so on.

Using a word in your own sentences is even more powerful. When you say "I felt nervous before my presentation", the word "nervous" becomes connected to a real experience, and your brain treats it as important.`,
    words: {
      psychologist: { meaning: 'a scientist who studies the mind and behaviour', tamil: 'உளவியலாளர்', example: 'The psychologist studied how children learn.' },
      curve: { meaning: 'a line that bends', tamil: 'வளைவு', example: 'The graph shows a rising curve.' },
      review: { meaning: 'to look at something again', tamil: 'மறுபார்வை செய்தல்', example: 'Review your notes every week.' },
      repetition: { meaning: 'doing something again and again', tamil: 'திரும்பத் திரும்பச் செய்தல்', example: 'Repetition helps memory.' },
      nervous: { meaning: 'worried and a little afraid', tamil: 'பதட்டம்', example: 'I was nervous before the interview.' },
      connected: { meaning: 'joined or linked', tamil: 'இணைக்கப்பட்ட', example: 'These two ideas are connected.' },
    },
    questions: [
      { q: 'What did Ebbinghaus describe?', options: ['The learning ladder', 'The forgetting curve', 'The memory palace', 'The word wheel'], answer: 1, explain: 'He described "what is now called the forgetting curve".' },
      { q: 'What does each review do?', options: ['Makes memory weaker', 'Makes memory stronger', 'Has no effect', 'Confuses the brain'], answer: 1, explain: '"Each review makes the memory stronger and slows down forgetting."' },
      { q: 'Why is using a word in your own sentence powerful?', options: ['It is faster', 'It connects the word to real experience', 'It avoids grammar', 'Teachers like it'], answer: 1, explain: 'The word "becomes connected to a real experience".' },
    ],
  },
  {
    id: 'r5', level: 'intermediate', category: 'General knowledge', title: 'The Grand Anicut: An Ancient Dam', minutes: 3,
    text: `The Kallanai, also known as the Grand Anicut, is one of the oldest water-regulation structures in the world that is still in use. It was built across the Kaveri river by the Chola king Karikala Chola, and is generally believed to be nearly two thousand years old.

The dam was made of unshaped stones placed across the river, and it diverted water into canals for farming in the fertile delta region. In the nineteenth century, British engineers studied and renovated the structure, and they were impressed by the skill of its ancient builders.

Today, the Kallanai is both a working irrigation structure and a popular tourist spot near Thanjavur and Tiruchirappalli, reminding visitors of Tamil Nadu's long engineering history.`,
    words: {
      regulation: { meaning: 'control', tamil: 'கட்டுப்பாடு', example: 'Water regulation is important for farming.' },
      diverted: { meaning: 'changed the direction of', tamil: 'திசை திருப்பியது', example: 'Traffic was diverted because of the rally.' },
      canals: { meaning: 'man-made waterways', tamil: 'கால்வாய்கள்', example: 'Canals carry water to the fields.' },
      fertile: { meaning: 'good for growing crops', tamil: 'வளமான', example: 'The delta has fertile soil.' },
      renovated: { meaning: 'repaired and improved', tamil: 'புதுப்பிக்கப்பட்டது', example: 'The old temple was renovated.' },
      irrigation: { meaning: 'supplying water to fields', tamil: 'நீர்ப்பாசனம்', example: 'Irrigation helps farmers grow rice.' },
    },
    questions: [
      { q: 'Which river is the Kallanai built across?', options: ['Vaigai', 'Kaveri', 'Thamirabarani', 'Palar'], answer: 1, explain: '"It was built across the Kaveri river."' },
      { q: 'Who built it?', options: ['Raja Raja Chola', 'Karikala Chola', 'British engineers', 'A Pandya king'], answer: 1, explain: '"…by the Chola king Karikala Chola."' },
      { q: 'What was the main purpose of the dam?', options: ['Generating electricity', 'Diverting water for farming', 'Stopping enemies', 'Fishing'], answer: 1, explain: 'It "diverted water into canals for farming".' },
    ],
  },
  {
    id: 'r6', level: 'advanced', category: 'Advanced reading', title: 'The Myth of Multitasking', minutes: 5,
    text: `Many students proudly describe themselves as excellent multitaskers, comfortably switching between lecture videos, messaging apps and assignments. Cognitive research, however, paints a less flattering picture. What feels like doing several things at once is usually rapid task-switching, and every switch carries a hidden cost.

Each time attention shifts, the brain needs a moment to disengage from one set of rules and load another. These micro-delays accumulate, so a task interrupted repeatedly can take considerably longer than the same task completed with undivided attention. Accuracy also tends to suffer, particularly for complex work such as writing code or solving mathematical problems.

The practical implication is straightforward: protect blocks of focused time. Silencing notifications, closing unnecessary tabs and setting a specific goal for each session are modest habits, yet they can produce a substantial improvement in both the speed and quality of one's work.`,
    words: {
      cognitive: { meaning: 'related to thinking and understanding', tamil: 'அறிவாற்றல் சார்ந்த', example: 'Puzzles improve cognitive skills.' },
      flattering: { meaning: 'making someone look better than reality', tamil: 'புகழ்ச்சியான', example: 'The photo was not very flattering.' },
      disengage: { meaning: 'to separate or stop being involved', tamil: 'விலகுதல்', example: 'It is hard to disengage from social media.' },
      accumulate: { meaning: 'to slowly increase in amount', tamil: 'குவிதல்', example: 'Dust accumulates on old books.' },
      undivided: { meaning: 'complete; not shared', tamil: 'முழுமையான', example: 'Please give me your undivided attention.' },
      implication: { meaning: 'a possible result or meaning', tamil: 'உட்பொருள் / விளைவு', example: 'The implication is that we must act now.' },
      substantial: { meaning: 'large in amount or importance', tamil: 'கணிசமான', example: 'There was a substantial increase in sales.' },
      modest: { meaning: 'small or not extreme', tamil: 'சிறிய / மிதமான', example: 'He made a modest change to his diet.' },
    },
    questions: [
      { q: 'According to the passage, multitasking is usually…', options: ['true parallel work', 'rapid task-switching', 'impossible to learn', 'good for complex work'], answer: 1, explain: '"What feels like doing several things at once is usually rapid task-switching."' },
      { q: 'What happens when a task is interrupted repeatedly?', options: ['It becomes easier', 'It takes considerably longer', 'It becomes more accurate', 'Nothing changes'], answer: 1, explain: '"A task interrupted repeatedly can take considerably longer."' },
      { q: 'Which habit is NOT suggested?', options: ['Silencing notifications', 'Closing unnecessary tabs', 'Setting a goal for each session', 'Studying with music videos'], answer: 3, explain: 'The passage suggests the first three only.' },
      { q: '"Paints a less flattering picture" means research shows…', options: ['multitasking is better than we think', 'multitasking is worse than we think', 'art is useful', 'students are lazy'], answer: 1, explain: 'It means the reality is less positive than students believe.' },
    ],
  },
];
