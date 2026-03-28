import { SCREEN_WIDTH } from "./layoutConfig";
import { DAILY_CHALLENGE_POPULAR_IDS } from "./temptations";

export const SMART_REMINDER_DELAY_MS = 23 * 60 * 60 * 1000;
export const SMART_REMINDER_MIN_INTERVAL_MS = 60 * 60 * 1000;
export const SMART_REMINDER_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
export const SMART_REMINDER_LIMIT = 40;
export const RECENT_EVENT_NOTIFICATION_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export const DAILY_NUDGE_REMINDERS = [
  { id: "morning", hour: 9, minute: 0, titleKey: "dailyNudgeMorningTitle", bodyKey: "dailyNudgeMorningBody" },
  { id: "daytime", hour: 12, minute: 30, titleKey: "dailyNudgeDayTitle", bodyKey: "dailyNudgeDayBody" },
  {
    id: "afternoon",
    hour: 15,
    minute: 30,
    titleKey: "dailyNudgeAfternoonTitle",
    bodyKey: "dailyNudgeAfternoonBody",
  },
  { id: "evening", hour: 19, minute: 0, titleKey: "dailyNudgeEveningTitle", bodyKey: "dailyNudgeEveningBody" },
  { id: "streak_20", hour: 20, minute: 0, titleKey: "dailyNudgeStreak20Title", bodyKey: "dailyNudgeStreak20Body" },
  { id: "streak_21", hour: 21, minute: 0, titleKey: "dailyNudgeStreak21Title", bodyKey: "dailyNudgeStreak21Body" },
  { id: "streak_22", hour: 22, minute: 0, titleKey: "dailyNudgeStreak22Title", bodyKey: "dailyNudgeStreak22Body" },
  { id: "streak_23", hour: 23, minute: 0, titleKey: "dailyNudgeStreak23Title", bodyKey: "dailyNudgeStreak23Body" },
  { id: "streak_2330", hour: 23, minute: 30, titleKey: "dailyNudgeStreak2330Title", bodyKey: "dailyNudgeStreak2330Body" },
];

export const DAILY_NUDGE_TITLE_KEYS = [
  "dailyNudgeMorningTitle",
  "dailyNudgeDayTitle",
  "dailyNudgeAfternoonTitle",
  "dailyNudgeEveningTitle",
  "dailyNudgeStreak20Title",
  "dailyNudgeStreak21Title",
  "dailyNudgeStreak22Title",
  "dailyNudgeStreak23Title",
  "dailyNudgeStreak2330Title",
];

export const DAILY_NUDGE_BODY_KEYS = [
  "dailyNudgeMorningBody",
  "dailyNudgeDayBody",
  "dailyNudgeAfternoonBody",
  "dailyNudgeEveningBody",
  "dailyNudgeStreak20Body",
  "dailyNudgeStreak21Body",
  "dailyNudgeStreak22Body",
  "dailyNudgeStreak23Body",
  "dailyNudgeStreak2330Body",
];

export const DAILY_NUDGE_NOTIFICATION_TAG = "daily_nudge";
export const TAMAGOTCHI_MISS_YOU_NOTIFICATION_KIND = "tamagotchi_miss_you";
export const ANDROID_DAILY_NUDGE_CHANNEL_ID = "daily-nudges";
export const ANDROID_TAMAGOTCHI_CHANNEL_ID = "tamagotchi-hunger";
export const ANDROID_REPORTS_CHANNEL_ID = "weekly-reports";

export const DAILY_CHALLENGE_MIN_SPEND_EVENTS = 2;
export const DAILY_CHALLENGE_MIN_UNIQUE_TEMPLATES = 3;
export const DAILY_CHALLENGE_FIXED_REWARD = 2;
export const DAILY_CHALLENGE_REWARD_MULTIPLIER = 10;
export const DAILY_CHALLENGE_DRAW_COUNT = 3;
export const DAILY_CHALLENGE_DRAW_CARD_WIDTH = Math.min(
  122,
  Math.max(64, (SCREEN_WIDTH - 108) / DAILY_CHALLENGE_DRAW_COUNT)
);
export const DAILY_CHALLENGE_DRAW_CARD_HEIGHT = Math.round(DAILY_CHALLENGE_DRAW_CARD_WIDTH * 1.38);
export const DAILY_CHALLENGE_DRAW_CARD_TILT = [-8, 0, 8];
export const DAILY_CHALLENGE_LOOKBACK_MS = 24 * 60 * 60 * 1000;
export const DAILY_CHALLENGE_POSITIVE_COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;
export const DAILY_CHALLENGE_POPULAR_TEMPLATE_IDS = new Set(DAILY_CHALLENGE_POPULAR_IDS);
export const DAILY_CHALLENGE_POPULAR_CUSTOM_PRICE_CAP_USD = 120;
export const DAILY_CHALLENGE_STATUS = {
  IDLE: "idle",
  OFFER: "offer",
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
};

export const FOCUS_VICTORY_THRESHOLD = 3;
export const FOCUS_VICTORY_REWARD = 3;
export const FOCUS_LOSS_THRESHOLD = 3;
export const FOCUS_RECENT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
export const FOCUS_RECENT_MIN_SPEND_COUNT = 2;
export const FOCUS_MIN_UNIQUE_SPEND_TEMPLATES = 2;
export const CHALLENGE_REWARD_SCALE = 0.5;

export const PUSH_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;
export const PUSH_DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;
export const ACTIONABLE_NOTIFICATION_CATEGORY_ID = "impulse_action";
export const NOTIFICATION_ACTION_SAVE = "action_save";
export const NOTIFICATION_ACTION_SPEND = "action_spend";

export const WEEKLY_REPORT_WEEKDAY = 6;
export const WEEKLY_REPORT_HOUR = 18;
export const WEEKLY_REPORT_MINUTE = 0;
export const REPORTS_WEEKLY_NOTIFICATION_DEDUPE = "weekly_report_schedule";
export const DAILY_SUMMARY_RELEASE_HOUR = 21;
export const DAILY_SUMMARY_RELEASE_MINUTE = 0;
export const DAILY_SUMMARY_NOTIFICATION_DEDUPE = "daily_summary_daily";

export const FREE_DAY_EVENING_REMINDER_KIND = "free_day_evening_reminder";
export const FREE_DAY_EVENING_REMINDER_HOUR = 18;
export const FREE_DAY_EVENING_REMINDER_MINUTE = 0;
export const FREE_DAY_EVENING_REMINDER_DEDUPE_PREFIX = "free_day_evening";
export const DAILY_SUMMARY_DEEPLINK_ROUTE = "daily-summary";
