export const ECONOMY_RULES = {
  saveRewardStepUSD: 5,
  minSaveReward: 1,
  maxSaveReward: 24,
  baseAchievementReward: 60,
  freeDayRescueCost: 60,
  tamagotchiFeedCost: 2,
  tamagotchiFeedBoost: 24,
  tamagotchiPartyCost: 300,
};

export const DEFAULT_REMOTE_IMAGE =
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80";

export const REMINDER_DAYS = 14;
export const DAY_MS = 1000 * 60 * 60 * 24;
export const HOUR_MS = 1000 * 60 * 60;
export const MINUTE_MS = 1000 * 60;

export const CHALLENGE_REPEAT_COOLDOWN_MS = DAY_MS * 7;
export const CHALLENGE_FAIL_COOLDOWN_MS = DAY_MS * 14;
export const REWARD_RESET_INTERVAL_MS = DAY_MS * 14;
export const REMINDER_MS = REMINDER_DAYS * DAY_MS;
export const PENDING_EXTENSION_DAYS = 7;
export const PENDING_EXTENSION_MS = PENDING_EXTENSION_DAYS * DAY_MS;
export const PENDING_REMINDER_LEAD_MS = HOUR_MS;
export const PENDING_REMINDER_GRACE_MS = 30 * MINUTE_MS;

export const SAVE_SPAM_WINDOW_MS = 1000 * 60 * 5;
export const SAVED_TOTAL_RESET_GRACE_MS = 1000 * 5;
export const SAVE_SPAM_ITEM_LIMIT = 5;
export const SAVE_SPAM_GLOBAL_LIMIT = 5;
export const DAILY_SAVE_HARD_LIMIT = 10;
export const NORTH_STAR_SAVE_THRESHOLD = 2;
export const NORTH_STAR_WINDOW_MS = DAY_MS;

export const SAVE_ACTION_COLOR = "#2EB873";
export const SPEND_ACTION_COLOR = "#D94862";
export const COIN_ENTRY_SAVE_BACKGROUND = SAVE_ACTION_COLOR;
export const COIN_ENTRY_SPEND_BACKGROUND = SPEND_ACTION_COLOR;
export const GOAL_HIGHLIGHT_COLOR = "#F6C16B";
export const GOAL_SWIPE_THRESHOLD = 80;
export const DELETE_SWIPE_THRESHOLD = 130;
export const CHALLENGE_SWIPE_ACTION_WIDTH = 120;

export const BASELINE_SAMPLE_USD = 120;
export const CUSTOM_SPEND_SAMPLE_USD = 7.5;
export const CUSTOM_SPEND_SAVINGS_RANGE = { low: 0.7, high: 1.3 };
export const CUSTOM_SPEND_MONTHLY_WEEKS = 4.33;

export const RATING_PROMPT_DELAY_DAYS = 2;
export const RATING_PROMPT_FOLLOWUP_DELAY_DAYS = 4;
export const RATING_PROMPT_ACTION_THRESHOLD = 7;
export const RATING_PROMPT_ACTION_TYPES = new Set(["save", "spend"]);

export const ANDROID_REVIEW_URL = "market://details?id=com.sasarei.almostclean";
export const ANDROID_REVIEW_WEB_URL = "https://play.google.com/store/apps/details?id=com.sasarei.almostclean";
export const IOS_REVIEW_URL = "itms-apps://itunes.apple.com/app/id6756276744?action=write-review";
export const IOS_REVIEW_WEB_URL = "https://apps.apple.com/app/id6756276744?action=write-review";
export const IOS_MANAGE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
export const ANDROID_MANAGE_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions?package=com.sasarei.almostclean";

export const RETENTION_MILESTONE_DAYS = new Set([2, 3, 7, 14, 30, 60, 90, 180, 365]);

// Keeps currency labels left-to-right even with RTL symbols.
export const LTR_MARK = "\u200E";
export const RTL_CURRENCIES = new Set(["SAR"]);

export const CURRENCY_RATES = {
  AED: 3.67,
  AUD: 1.5,
  BYN: 3.3,
  CAD: 1.35,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150,
  KZT: 450,
  KRW: 1350,
  MXN: 17,
  PLN: 4,
  RUB: 92,
  SAR: 3.75,
  USD: 1,
};

export const CURRENCY_REWARD_STEPS = {
  AED: 20,
  AUD: 5,
  BYN: 5,
  CAD: 5,
  EUR: 5,
  GBP: 5,
  JPY: 750,
  KZT: 2000,
  KRW: 7000,
  MXN: 100,
  PLN: 20,
  RUB: 500,
  SAR: 20,
  USD: 5,
};

export const DEFAULT_COIN_SLIDER_MAX_USD = 50;
export const MAX_TRANSACTION_AMOUNT_USD = 10_000_000;
export const MAX_SAVED_BALANCE_USD = 10_000_000;
export const COIN_SLIDER_VALUE_DEADBAND = 0.01;
export const COIN_SLIDER_STATE_MIN_INTERVAL = 16;
export const COIN_SLIDER_HAPTIC_COOLDOWN_MS = 80;
export const COIN_ENTRY_MANUAL_DOUBLE_TAP_MS = 320;
export const COIN_SLIDER_STEP_STICKINESS = 0.95;
export const COIN_SLIDER_GESTURE_DEADBAND = 0.03;
export const COIN_FILL_MIN_HEIGHT = 12;

export const CURRENCY_SIGNS = {
  AED: "AED ",
  AUD: "$",
  BYN: "Br",
  CAD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  KZT: "₸",
  KRW: "₩",
  MXN: "MX$",
  PLN: "zt",
  RUB: "₽",
  SAR: "﷼",
  USD: "$",
};

export const CURRENCY_FINE_STEPS = {
  AED: 0.5,
  AUD: 0.5,
  BYN: 0.5,
  CAD: 0.5,
  EUR: 0.5,
  GBP: 0.5,
  JPY: 10,
  KZT: 10,
  KRW: 100,
  MXN: 0.5,
  PLN: 0.5,
  RUB: 5,
  SAR: 0.5,
  USD: 0.5,
};

export const CURRENCY_DISPLAY_PRECISION = {
  AED: 0,
  AUD: 0,
  BYN: 0,
  CAD: 0,
  EUR: 0,
  GBP: 0,
  MXN: 0,
  PLN: 0,
  SAR: 0,
  USD: 0,
};
