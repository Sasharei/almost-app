export const ECONOMY_RULES = {
  saveRewardStepUSD: 5,
  minSaveReward: 1,
  maxSaveReward: 24,
  baseAchievementReward: 20,
  achievementRewardScale: 0.3,
  freeDayLoginBaseBlueCoins: 1,
  freeDayLoginMaxBlueCoins: 3,
  freeDayRescueCost: 60,
  levelShareRewardBlueCoins: 3,
  streakRestoreBlueCoinsPerDay: 8,
  streakPledgeBlueCoinsPerDay: 0.35,
  usageStreakWeeklyBonusBlueCoins: 2,
  tamagotchiFeedCost: 2,
  tamagotchiFeedBoost: 24,
  tamagotchiPartyCost: 250,
};

export const DEFAULT_REMOTE_IMAGE =
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80";

export const REMINDER_DAYS = 14;
export const DAY_MS = 1000 * 60 * 60 * 24;
export const HOUR_MS = 1000 * 60 * 60;
export const MINUTE_MS = 1000 * 60;

export const CHALLENGE_REPEAT_COOLDOWN_MS = DAY_MS * 7;
export const CHALLENGE_FAIL_COOLDOWN_MS = DAY_MS * 14;
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

export const CUSTOM_TEMPTATION_SAMPLE_USD = 7.5;

export const RATING_PROMPT_ACTION_THRESHOLD = 2;
export const RATING_PROMPT_SERIES_THRESHOLD = 1;
export const RATING_PROMPT_STORE_THRESHOLD = 4;
export const RATING_PROMPT_FEEDBACK_MIN_LENGTH = 5;

export const ANDROID_REVIEW_URL = "market://details?id=com.sasarei.almostclean";
export const ANDROID_REVIEW_WEB_URL = "https://play.google.com/store/apps/details?id=com.sasarei.almostclean";
export const IOS_REVIEW_URL = "https://apps.apple.com/app/id6756276744?action=write-review";
export const IOS_REVIEW_WEB_URL = "https://apps.apple.com/app/id6756276744?action=write-review";
export const IOS_MANAGE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
export const ANDROID_MANAGE_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions?package=com.sasarei.almostclean";

export const RETENTION_MILESTONE_DAYS = new Set([2, 3, 7, 14, 30, 60, 90, 180, 365]);

// Keeps currency labels left-to-right even with RTL symbols.
export const LTR_MARK = "\u200E";
export const RTL_CURRENCIES = new Set(["SAR"]);

export const CURRENCY_RATES = {
  TWD: 31.859608,
  AED: 3.6725,
  ARS: 1438.8159,
  AUD: 1.414986,
  BRL: 5.064065,
  BYN: 2.91473,
  CAD: 1.383101,
  CNY: 6.788805,
  EUR: 0.853304,
  GBP: 0.743471,
  JPY: 159.248687,
  KZT: 478.496748,
  KRW: 1482.800503,
  MXN: 17.326169,
  PLN: 3.626431,
  RUB: 77.383563,
  SAR: 3.75,
  USD: 1,
  HKD: 7.847568,
  INR: 96.400634,
  CHF: 0.828414,
  PHP: 62.63269,
  SEK: 10.041831,
  CZK: 21.732999,
  KGS: 87.467727,
  MDL: 17.807125,
  NGN: 1331.279356,
  RON: 4.754438,
  UAH: 45.118199,
  ILS: 3.044838,
  PKR: 277.49233,
  TRY: 49.161928,
  SCR: 14.658669,
  UZS: 11835.851216,
};

export const CURRENCY_REWARD_STEPS = {
  TWD: 150,
  AED: 20,
  ARS: 7000,
  AUD: 5,
  BRL: 25,
  BYN: 5,
  CAD: 5,
  CNY: 35,
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
  HKD: 40,
  INR: 500,
  CHF: 5,
  PHP: 300,
  SEK: 50,
  CZK: 100,
  KGS: 500,
  MDL: 100,
  NGN: 7000,
  RON: 25,
  UAH: 250,
  ILS: 15,
  PKR: 1500,
  TRY: 250,
  SCR: 75,
  UZS: 60000,
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
  TWD: "NT$",
  AED: "AED ",
  ARS: "$",
  AUD: "$",
  BRL: "R$",
  BYN: "Br",
  CAD: "$",
  CNY: "¥",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  KZT: "₸",
  KRW: "₩",
  MXN: "$",
  PLN: "zł",
  RUB: "₽",
  SAR: "﷼",
  USD: "$",
  HKD: "HK$",
  INR: "₹",
  CHF: "CHF ",
  PHP: "₱",
  SEK: "kr",
  CZK: "Kč",
  KGS: "сом",
  MDL: "L",
  NGN: "₦",
  RON: "lei",
  UAH: "₴",
  ILS: "₪",
  PKR: "Rs",
  TRY: "₺",
  SCR: "SR",
  UZS: "soʻm",
};

export const CURRENCY_FINE_STEPS = {
  TWD: 5,
  AED: 0.5,
  ARS: 50,
  AUD: 0.5,
  BRL: 0.5,
  BYN: 0.5,
  CAD: 0.5,
  CNY: 0.5,
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
  HKD: 0.5,
  INR: 5,
  CHF: 0.5,
  PHP: 5,
  SEK: 0.5,
  CZK: 1,
  KGS: 5,
  MDL: 0.5,
  NGN: 50,
  RON: 0.5,
  UAH: 5,
  ILS: 0.5,
  PKR: 10,
  TRY: 5,
  SCR: 0.5,
  UZS: 500,
};

export const CURRENCY_DISPLAY_PRECISION = {
  TWD: 0,
  AED: 0,
  ARS: 0,
  AUD: 0,
  BRL: 0,
  BYN: 0,
  CAD: 0,
  CNY: 0,
  EUR: 0,
  GBP: 0,
  MXN: 0,
  PLN: 0,
  SAR: 0,
  USD: 0,
  HKD: 0,
  INR: 0,
  CHF: 0,
  PHP: 0,
  SEK: 0,
  CZK: 0,
  KGS: 0,
  MDL: 0,
  NGN: 0,
  RON: 0,
  UAH: 0,
  ILS: 0,
  PKR: 0,
  TRY: 0,
  SCR: 0,
  UZS: 0,
};

// Input/storage precision is independent of compact, whole-unit display rounding.
export const CURRENCY_MINOR_UNIT_PRECISION = {
  AED: 2,
  AUD: 2,
  BRL: 2,
  BYN: 2,
  CAD: 2,
  CNY: 2,
  EUR: 2,
  GBP: 2,
  MXN: 2,
  PLN: 2,
  SAR: 2,
  USD: 2,
  HKD: 2,
  INR: 2,
  CHF: 2,
  PHP: 2,
  SEK: 2,
  CZK: 2,
  KGS: 2,
  MDL: 2,
  NGN: 2,
  RON: 2,
  UAH: 2,
  ILS: 2,
  PKR: 2,
  TRY: 2,
  SCR: 2,
  UZS: 2,
};
