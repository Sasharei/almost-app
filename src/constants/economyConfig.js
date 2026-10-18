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

// Import-only USD rates from the existing exchange-rate feed (2026-10-16).
// Keep foreign Wallet purchases visible without expanding the currency picker.
// Refreshed and cached by the same runtime rate synchronization as app currencies.
export const WALLET_CURRENCY_RATES = {
  ...CURRENCY_RATES,
  AFN: 64.91871,
  ALL: 81.453385,
  AMD: 361.656002,
  ANG: 1.79,
  AOA: 925.436092,
  AWG: 1.79,
  AZN: 1.700222,
  BAM: 1.743925,
  BBD: 2,
  BDT: 123.135969,
  BGN: 1.743925,
  BHD: 0.376,
  BIF: 3000.791042,
  BMD: 1,
  BND: 1.282339,
  BOB: 11.716552,
  BSD: 1,
  BTN: 95.097802,
  BWP: 13.906808,
  BZD: 2,
  CDF: 2310.947126,
  CLF: 0.024933,
  CLP: 985.501337,
  CNH: 6.690099,
  COP: 3184.574607,
  CRC: 455.441359,
  CUP: 24,
  CVE: 98.3183,
  DJF: 177.721,
  DKK: 6.668969,
  DOP: 61.247577,
  DZD: 134.566196,
  EGP: 53.464508,
  ERN: 15,
  ETB: 161.55116,
  FJD: 2.26241,
  FKP: 0.754062,
  FOK: 6.668968,
  GEL: 2.597179,
  GGP: 0.754062,
  GHS: 11.664607,
  GIP: 0.754062,
  GMD: 74.573034,
  GNF: 8799.377821,
  GTQ: 7.640832,
  GYD: 209.215067,
  HNL: 26.885363,
  HRK: 6.718172,
  HTG: 130.944008,
  HUF: 324.418167,
  IDR: 17949.090321,
  IMP: 0.754062,
  IQD: 1517.537029,
  IRR: 1734042.872597,
  ISK: 121.592291,
  JEP: 0.754062,
  JMD: 158.710264,
  JOD: 0.709,
  KES: 129.751462,
  KHR: 4059.944641,
  KID: 1.44604,
  KMF: 438.665332,
  KWD: 0.310459,
  KYD: 0.833333,
  LAK: 22366.907678,
  LBP: 89500,
  LKR: 330.980189,
  LRD: 170.779859,
  LSL: 16.523466,
  LYD: 6.424267,
  MAD: 9.815476,
  MGA: 4520.164446,
  MKD: 55.076251,
  MMK: 2099.229,
  MNT: 3615.75998,
  MOP: 8.083045,
  MRU: 40.30986,
  MUR: 47.50426,
  MVR: 15.444582,
  MWK: 1740.577329,
  MYR: 4.08249,
  MZN: 63.736342,
  NAD: 16.523466,
  NIO: 36.816312,
  NOK: 9.482814,
  NPR: 152.156484,
  NZD: 1.780763,
  OMR: 0.384497,
  PAB: 1,
  PEN: 3.435254,
  PGK: 4.51089,
  PYG: 5704.213428,
  QAR: 3.64,
  RSD: 104.789121,
  RWF: 1477.902328,
  SBD: 8.016201,
  SDG: 511.842463,
  SGD: 1.282338,
  SHP: 0.754062,
  SLE: 24.357927,
  SLL: 24357.92723,
  SOS: 571.730921,
  SRD: 37.783837,
  SSP: 5982.35262,
  STN: 21.845539,
  SYP: 121.784259,
  SZL: 16.523466,
  THB: 33.52609,
  TJS: 9.227791,
  TMT: 3.500534,
  TND: 2.999753,
  TOP: 2.390346,
  TTD: 6.76963,
  TVD: 1.44604,
  TZS: 2632.819539,
  UGX: 3999.60497,
  UYU: 40.194172,
  VES: 880.1159,
  VND: 25856.487917,
  VUV: 119.378908,
  WST: 2.75109,
  XAF: 584.88711,
  XCD: 2.7,
  XCG: 1.79,
  XDR: 0.738316,
  XOF: 584.88711,
  XPF: 106.402933,
  YER: 236.123009,
  ZAR: 16.523523,
  ZMW: 20.045301,
  ZWG: 26.6094,
  ZWL: 26.6094,
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
