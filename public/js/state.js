export const state = { user: null, ai: { enabled: false, model: null } };

export const DEFAULT_PLAN = [
  { skill: 'speaking', minutes: 10 },
  { skill: 'listening', minutes: 5 },
  { skill: 'shadowing', minutes: 5 },
  { skill: 'reading', minutes: 5 },
  { skill: 'grammar', minutes: 5 },
];

// Which modules count towards each daily-plan item.
export const PLAN_ITEMS = {
  speaking: { label: 'Speaking', icon: '🗣️', route: 'speaking', modules: ['speaking', 'placement'] },
  listening: { label: 'Listening', icon: '🎧', route: 'listening', modules: ['listening', 'cartoon', 'ted'] },
  shadowing: { label: 'Shadowing', icon: '🔁', route: 'shadowing', modules: ['shadowing'] },
  reading: { label: 'Reading', icon: '📖', route: 'reading', modules: ['reading'] },
  grammar: { label: 'Grammar & vocabulary', icon: '✍️', route: 'grammar', modules: ['grammar', 'vocabulary'] },
  writing: { label: 'My Day journal', icon: '📔', route: 'myday', modules: ['myday', 'translation'] },
};
