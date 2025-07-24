export const TEAM_OPTIONS = [
  "개발 1본부",
  "개발 2본부",
] as const;

export type TeamName = typeof TEAM_OPTIONS[number];

export const TEAM_EMOJIS: Record<TeamName, string> = {
  "개발 1본부": "🤹🏻",
  "개발 2본부": "⛹🏻‍♀️",
};

export const FOOD_EMOJIS = [
  "🍣", "🍕", "🍜", "🍖", "🍝", "🥘", "🍲", "🌭", "🥪", "🌮", "🌯", "🥙", "🥡", "🍛", "🍱", "🥟", "🥗", "🐷", "🐓", "🐟",
] as const;