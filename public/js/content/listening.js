// Original listening material (written for FluentStep). Audio is generated with the
// browser's text-to-speech, using different voices for each speaker.
export const LISTENING = [
  {
    id: 'l-b1', level: 'beginner', kind: 'Daily-life dialogue', title: 'At the Bus Stop',
    lines: [
      { s: 'Arun', t: 'Excuse me, does this bus go to the railway station?' },
      { s: 'Meena', t: 'No, it does not. You need bus number twenty-one.' },
      { s: 'Arun', t: 'Oh, thank you. How often does it come?' },
      { s: 'Meena', t: 'Every fifteen minutes. The next one should be here at ten thirty.' },
      { s: 'Arun', t: 'Great. Is the station far from here?' },
      { s: 'Meena', t: 'Not really. It takes about twenty minutes by bus.' },
    ],
    questions: [
      { q: 'Where does Arun want to go?', options: ['The hospital', 'The railway station', 'The college', 'The market'], answer: 1, explain: 'Arun asks, "Does this bus go to the railway station?"' },
      { q: 'Which bus number should he take?', options: ['Twelve', 'Twenty', 'Twenty-one', 'Thirty'], answer: 2, explain: 'Meena says, "You need bus number twenty-one."' },
      { q: 'How often does the bus come?', options: ['Every 10 minutes', 'Every 15 minutes', 'Every 20 minutes', 'Every hour'], answer: 1, explain: '"Every fifteen minutes."' },
      { q: 'How long is the journey to the station?', options: ['About 5 minutes', 'About 10 minutes', 'About 20 minutes', 'About 30 minutes'], answer: 2, explain: '"It takes about twenty minutes by bus."' },
    ],
    blanks: [
      { text: 'You need bus number ___.', answer: 'twenty-one', accept: ['21', 'twenty one'] },
      { text: 'The next one should be here at ten ___.', answer: 'thirty', accept: ['30'] },
    ],
  },
  {
    id: 'l-b2', level: 'beginner', kind: 'Short story', title: "Kavya's New Bicycle",
    lines: [
      { s: 'Narrator', t: 'Kavya is twelve years old. She lives in a small town near Salem.' },
      { s: 'Narrator', t: 'Every day, she walks two kilometres to school.' },
      { s: 'Narrator', t: 'On her birthday, her father gave her a blue bicycle.' },
      { s: 'Narrator', t: 'At first, she fell down many times. But she did not give up.' },
      { s: 'Narrator', t: 'After one week, she could ride very well. Now she reaches school in ten minutes, and she is never late.' },
    ],
    questions: [
      { q: 'How old is Kavya?', options: ['Ten', 'Eleven', 'Twelve', 'Fifteen'], answer: 2, explain: '"Kavya is twelve years old."' },
      { q: 'What colour is the bicycle?', options: ['Red', 'Blue', 'Green', 'Black'], answer: 1, explain: '"Her father gave her a blue bicycle."' },
      { q: 'What happened at first?', options: ['She fell down many times', 'She lost the bicycle', 'She gave the bicycle away', 'She rode perfectly'], answer: 0, explain: '"At first, she fell down many times."' },
      { q: 'What is the lesson of the story?', options: ['Bicycles are expensive', 'Do not give up', 'Walking is better', 'Birthdays are fun'], answer: 1, explain: 'She kept trying and learned to ride — "she did not give up."' },
    ],
    blanks: [
      { text: 'Every day, she walks two ___ to school.', answer: 'kilometres', accept: ['kilometers', 'km'] },
      { text: 'But she did not give ___.', answer: 'up' },
    ],
  },
  {
    id: 'l-b3', level: 'beginner', kind: 'Daily-life dialogue', title: 'Ordering Food at a Canteen',
    lines: [
      { s: 'Staff', t: 'Good afternoon. What would you like to have?' },
      { s: 'Divya', t: 'Can I have one plate of veg fried rice, please?' },
      { s: 'Staff', t: 'Sure. Would you like anything to drink?' },
      { s: 'Divya', t: 'Yes, a lemon juice without sugar, please.' },
      { s: 'Staff', t: 'That will be ninety rupees.' },
      { s: 'Divya', t: 'Here you are. Can I pay by UPI?' },
      { s: 'Staff', t: 'Of course. Please scan the code on the counter.' },
    ],
    questions: [
      { q: 'What food does Divya order?', options: ['Chicken biryani', 'Veg fried rice', 'Dosa', 'Noodles'], answer: 1, explain: '"One plate of veg fried rice."' },
      { q: 'How does she want her lemon juice?', options: ['With extra sugar', 'With ice', 'Without sugar', 'With salt'], answer: 2, explain: '"A lemon juice without sugar."' },
      { q: 'How much does she pay?', options: ['₹19', '₹60', '₹90', '₹99'], answer: 2, explain: '"That will be ninety rupees."' },
    ],
    blanks: [
      { text: 'Can I ___ by UPI?', answer: 'pay' },
      { text: 'Please scan the code on the ___.', answer: 'counter' },
    ],
  },
  {
    id: 'l-i1', level: 'intermediate', kind: 'College conversation', title: 'Planning a Group Project',
    lines: [
      { s: 'Rahul', t: 'Our project presentation is next Friday. I think we should divide the work today.' },
      { s: 'Sneha', t: 'Good idea. I can prepare the slides, but I need the data by Tuesday.' },
      { s: 'Rahul', t: 'I will collect the survey results by Monday evening, so you will have enough time.' },
      { s: 'Sneha', t: 'Perfect. Who will write the report?' },
      { s: 'Rahul', t: 'Karthik offered to write it, but he is busy with his internship this week.' },
      { s: 'Sneha', t: 'In that case, let us write the introduction together, and Karthik can complete the conclusion on the weekend.' },
      { s: 'Rahul', t: 'That sounds fair. Let us meet in the library on Wednesday to check our progress.' },
    ],
    questions: [
      { q: 'When is the project presentation?', options: ['Next Monday', 'Next Wednesday', 'Next Friday', 'This weekend'], answer: 2, explain: '"Our project presentation is next Friday."' },
      { q: 'When will Rahul collect the survey results?', options: ['By Monday evening', 'By Tuesday', 'On Wednesday', 'On the weekend'], answer: 0, explain: '"I will collect the survey results by Monday evening."' },
      { q: 'Why can\'t Karthik write the whole report?', options: ['He is sick', 'He is busy with his internship', 'He is travelling', 'He does not like writing'], answer: 1, explain: '"He is busy with his internship this week."' },
      { q: 'Where will they meet on Wednesday?', options: ['In the canteen', 'In the classroom', 'In the library', 'Online'], answer: 2, explain: '"Let us meet in the library on Wednesday."' },
    ],
    blanks: [
      { text: 'I think we should ___ the work today.', answer: 'divide' },
      { text: 'Let us meet in the library on Wednesday to check our ___.', answer: 'progress' },
    ],
  },
  {
    id: 'l-i2', level: 'intermediate', kind: 'News-style report', title: 'City Launches Free Coding Classes',
    lines: [
      { s: 'Reporter', t: 'Good evening. The city corporation has announced free weekend coding classes for college students.' },
      { s: 'Reporter', t: 'The classes will start on the first of next month and will be held in twelve public libraries.' },
      { s: 'Reporter', t: 'Students can learn Python, web development and basic data analysis.' },
      { s: 'Reporter', t: 'According to officials, around three thousand students have already registered online.' },
      { s: 'Reporter', t: 'Each course will last eight weeks, and students who complete the course will receive a certificate.' },
      { s: 'Reporter', t: 'The organisers say the goal is to improve job opportunities for students from small towns.' },
    ],
    questions: [
      { q: 'Who are the classes for?', options: ['School children', 'College students', 'Working professionals', 'Teachers'], answer: 1, explain: '"Free weekend coding classes for college students."' },
      { q: 'Where will the classes be held?', options: ['In colleges', 'In twelve public libraries', 'Online only', 'In company offices'], answer: 1, explain: '"Held in twelve public libraries."' },
      { q: 'How long is each course?', options: ['Four weeks', 'Six weeks', 'Eight weeks', 'Twelve weeks'], answer: 2, explain: '"Each course will last eight weeks."' },
      { q: 'What is the main goal of the programme?', options: ['To sell computers', 'To improve job opportunities', 'To build new libraries', 'To train teachers'], answer: 1, explain: '"The goal is to improve job opportunities for students from small towns."' },
    ],
    blanks: [
      { text: 'Around three thousand students have already ___ online.', answer: 'registered' },
      { text: 'Students who complete the course will receive a ___.', answer: 'certificate' },
    ],
  },
  {
    id: 'l-i3', level: 'intermediate', kind: 'Phone conversation', title: 'Rescheduling an Interview',
    lines: [
      { s: 'HR', t: 'Hello, this is Priya from Brightway Technologies. Am I speaking with Mr. Vignesh?' },
      { s: 'Vignesh', t: 'Yes, speaking. Good morning, ma\'am.' },
      { s: 'HR', t: 'Your technical interview was scheduled for Thursday at eleven, but our panel is not available. Could we move it to Friday at two in the afternoon?' },
      { s: 'Vignesh', t: 'Friday at two works for me. Will it still be an online interview?' },
      { s: 'HR', t: 'Yes, it will be on video. I will email you the new meeting link today.' },
      { s: 'Vignesh', t: 'Thank you for informing me. I will look out for the email.' },
    ],
    questions: [
      { q: 'Why is the interview being moved?', options: ['Vignesh is busy', 'The panel is not available', 'The office is closed', 'There is a holiday'], answer: 1, explain: '"Our panel is not available."' },
      { q: 'When is the new interview?', options: ['Thursday at 11', 'Thursday at 2', 'Friday at 11', 'Friday at 2'], answer: 3, explain: '"Could we move it to Friday at two in the afternoon?"' },
      { q: 'How will the interview happen?', options: ['In person', 'By phone', 'On video', 'By email'], answer: 2, explain: '"It will be on video."' },
    ],
    blanks: [
      { text: 'Could we ___ it to Friday at two in the afternoon?', answer: 'move' },
      { text: 'I will email you the new meeting ___ today.', answer: 'link' },
    ],
  },
  {
    id: 'l-a1', level: 'advanced', kind: 'News-style report', title: 'The Rise of Electric Two-Wheelers',
    lines: [
      { s: 'Reporter', t: 'Electric scooters, once considered a niche product, are rapidly becoming a common sight on Indian roads.' },
      { s: 'Reporter', t: 'Industry analysts attribute this growth to three factors: rising fuel prices, government subsidies, and improved battery technology.' },
      { s: 'Reporter', t: 'However, buyers in smaller towns still express concerns about the limited number of charging stations.' },
      { s: 'Reporter', t: 'Manufacturers are responding by introducing swappable batteries, which allow riders to exchange an empty battery for a charged one within minutes.' },
      { s: 'Reporter', t: 'Experts believe that if charging infrastructure keeps pace with demand, electric vehicles could account for a significant share of two-wheeler sales by the end of the decade.' },
    ],
    questions: [
      { q: 'Which is NOT mentioned as a reason for growth?', options: ['Rising fuel prices', 'Government subsidies', 'Better battery technology', 'Cheaper insurance'], answer: 3, explain: 'The three factors are fuel prices, subsidies and battery technology. Insurance is not mentioned.' },
      { q: 'What worries buyers in smaller towns?', options: ['The colour options', 'Too few charging stations', 'The speed of scooters', 'Noise'], answer: 1, explain: '"Concerns about the limited number of charging stations."' },
      { q: 'What do swappable batteries allow?', options: ['Faster top speed', 'Exchanging an empty battery for a charged one', 'Free charging', 'Lighter scooters'], answer: 1, explain: 'Riders can "exchange an empty battery for a charged one within minutes".' },
      { q: 'What does "keeps pace with" mean here?', options: ['Slows down', 'Grows at the same speed as', 'Becomes cheaper than', 'Stops completely'], answer: 1, explain: '"Keep pace with" means to grow or move at the same speed as something else.' },
    ],
    blanks: [
      { text: 'Industry analysts ___ this growth to three factors.', answer: 'attribute' },
      { text: 'If charging ___ keeps pace with demand…', answer: 'infrastructure' },
    ],
  },
  {
    id: 'l-a2', level: 'advanced', kind: 'Discussion', title: 'Should Internships Be Compulsory?',
    lines: [
      { s: 'Host', t: 'Today we are discussing whether internships should be compulsory for all engineering students. Anitha, what is your view?' },
      { s: 'Anitha', t: 'I strongly believe they should be. Internships expose students to real deadlines and teamwork, which no classroom can fully replicate.' },
      { s: 'Host', t: 'Suresh, do you agree?' },
      { s: 'Suresh', t: 'Partly. The idea is excellent, but making them compulsory could disadvantage students from rural colleges who have fewer industry contacts.' },
      { s: 'Anitha', t: 'That is a fair point. Perhaps colleges should partner with local businesses so that every student has access to an opportunity.' },
      { s: 'Suresh', t: 'Exactly. If access is guaranteed, I would fully support the proposal.' },
    ],
    questions: [
      { q: 'What is Anitha\'s main argument?', options: ['Internships are expensive', 'Internships give real work experience', 'Classrooms are better', 'Students are too busy'], answer: 1, explain: 'She says internships expose students to real deadlines and teamwork.' },
      { q: 'What is Suresh\'s concern?', options: ['Internships are boring', 'Rural students may have fewer opportunities', 'Companies do not want interns', 'Internships are too short'], answer: 1, explain: 'He worries about "students from rural colleges who have fewer industry contacts".' },
      { q: 'How do they finally agree?', options: ['Internships should be cancelled', 'Colleges should partner with local businesses', 'Only top students should intern', 'Online courses are enough'], answer: 1, explain: 'Anitha suggests partnerships, and Suresh supports the proposal if access is guaranteed.' },
      { q: 'Which phrase is used to politely accept a point?', options: ['"That is a fair point."', '"I strongly believe…"', '"Exactly."', '"Today we are discussing…"'], answer: 0, explain: '"That is a fair point" is a polite way to accept someone\'s argument in a group discussion.' },
    ],
    blanks: [
      { text: 'No classroom can fully ___.', answer: 'replicate' },
      { text: 'Making them compulsory could ___ students from rural colleges.', answer: 'disadvantage' },
    ],
  },
  {
    id: 'l-a3', level: 'advanced', kind: 'Short story', title: 'The Interview That Went Wrong',
    lines: [
      { s: 'Narrator', t: 'Harish had prepared for weeks, yet when the interviewer asked him to describe a failure, his mind went completely blank.' },
      { s: 'Narrator', t: 'Instead of panicking, he took a slow breath and admitted honestly that he needed a moment to think.' },
      { s: 'Narrator', t: 'He then spoke about a college project that had collapsed because he had underestimated the time required for testing.' },
      { s: 'Narrator', t: 'More importantly, he explained how he now breaks large tasks into smaller milestones and reviews them every week.' },
      { s: 'Narrator', t: 'A week later, he received an offer letter. The interviewer later told him that his honesty and self-awareness had impressed the panel more than any perfect answer could have.' },
    ],
    questions: [
      { q: 'What question made Harish\'s mind go blank?', options: ['Tell me about yourself', 'Describe a failure', 'Why should we hire you?', 'What is your salary expectation?'], answer: 1, explain: 'The interviewer asked him "to describe a failure".' },
      { q: 'Why did his college project fail?', options: ['The team fought', 'He underestimated the testing time', 'The computer broke', 'He forgot the deadline'], answer: 1, explain: 'He had "underestimated the time required for testing".' },
      { q: 'What impressed the panel most?', options: ['His marks', 'His perfect answers', 'His honesty and self-awareness', 'His technical knowledge'], answer: 2, explain: '"His honesty and self-awareness had impressed the panel."' },
    ],
    blanks: [
      { text: 'He now breaks large tasks into smaller ___.', answer: 'milestones' },
      { text: 'His honesty and self-___ had impressed the panel.', answer: 'awareness' },
    ],
  },
];

export const SHADOWING = {
  beginner: [
    'Good morning. How are you today?',
    'My name is Priya and I am from Coimbatore.',
    'I study computer science in my second year.',
    'Could you please repeat that?',
    'I usually go to college by bus.',
    'What time does the class start?',
    'I am sorry, I am a little late today.',
    'Thank you very much for your help.',
    'Can you tell me the way to the library?',
    'I like reading books in my free time.',
  ],
  intermediate: [
    'I would like to talk about my final-year project.',
    'In my opinion, practice is more important than talent.',
    'Could you give me a few more minutes to finish this?',
    'I have been learning English seriously for the past six months.',
    'One of my strengths is that I learn new things quickly.',
    'If I get this opportunity, I will work hard to prove myself.',
    'Let me explain the problem step by step.',
    'I completely agree with your point, but I have one concern.',
    'We managed to finish the project before the deadline.',
    'I am looking forward to hearing from you.',
  ],
  advanced: [
    'Although the task was challenging, our team delivered the results on time.',
    'I believe continuous learning is essential in a rapidly changing industry.',
    'Could you elaborate a little more on the responsibilities of this role?',
    'The main advantage of this approach is that it reduces unnecessary costs.',
    'Looking back, I realise that communication was the key to our success.',
    'Let me summarise the main points before we move on.',
    'I would appreciate it if you could share your feedback on my presentation.',
    'Despite limited resources, we found a creative solution to the problem.',
    'From my perspective, the benefits clearly outweigh the risks.',
    'Thank you for your time; it was a pleasure speaking with you.',
  ],
};
