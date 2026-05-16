export const TYCOON_MODE_DEFAULT_ENABLED = true;

export const TYCOON_MAX_AUTOSAVE_EVENTS_PER_CARD = 8;
export const TYCOON_MAX_AUTOSAVE_EVENTS_TOTAL = 40;
export const TYCOON_CONFIRM_ALL_REVIEW_STREAK = 2;

export const TYCOON_LEVEL_RULES = [
  { level: 1, capPercent: 0.2, defaultMonthlyCapUSD: 150 },
  { level: 2, capPercent: 0.22, defaultMonthlyCapUSD: 175 },
  { level: 3, capPercent: 0.25, defaultMonthlyCapUSD: 200 },
  { level: 5, capPercent: 0.3, defaultMonthlyCapUSD: 250 },
  { level: 7, capPercent: 0.35, defaultMonthlyCapUSD: 300 },
  { level: 10, capPercent: 0.45, defaultMonthlyCapUSD: 400 },
  { level: 15, capPercent: 0.6, defaultMonthlyCapUSD: 600 },
  { level: 20, capPercent: 0.75, defaultMonthlyCapUSD: 750 },
  { level: 30, capPercent: 1, defaultMonthlyCapUSD: 1000 },
];

export const resolveTycoonLevelRule = (level = 1) => {
  const normalized = Math.max(1, Math.floor(Number(level) || 1));
  return TYCOON_LEVEL_RULES.reduce((match, rule) => {
    if (normalized >= rule.level) return rule;
    return match;
  }, TYCOON_LEVEL_RULES[0]);
};
