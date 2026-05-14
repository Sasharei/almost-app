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

export const getTycoonCooldownMsForIncrease = (previousUSD = 0, nextUSD = 0, cycleMs = 0) => {
  const previous = Math.max(0, Number(previousUSD) || 0);
  const next = Math.max(0, Number(nextUSD) || 0);
  const normalizedCycle = Math.max(0, Number(cycleMs) || 0);
  if (next <= previous) return 0;
  const growth = previous > 0 ? (next - previous) / previous : 1;
  if (growth <= 0.1) return Math.max(normalizedCycle, 1);
  if (growth <= 0.25) return Math.max(normalizedCycle + 24 * 60 * 60 * 1000, normalizedCycle);
  if (growth <= 0.5) return Math.max(normalizedCycle * 2, normalizedCycle);
  if (growth <= 1) return Math.max(normalizedCycle * 3, normalizedCycle);
  return Math.max(7 * 24 * 60 * 60 * 1000, normalizedCycle * 4, normalizedCycle);
};
