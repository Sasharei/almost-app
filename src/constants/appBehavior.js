import { DAY_MS } from "./economyConfig";

export const COIN_VALUE_MODAL_STATUS = {
  PENDING: "pending",
  SHOWN: "shown",
};

export const RAIN_DROPS = 20;
export const CELEBRATION_OVERLAY_GAP_MS = 15000;
export const APP_RESUME_MODAL_GUARD_MS = 1500;
export const DAILY_SUMMARY_LIVE_ACTIVITY_ENABLED = false;

export const MAX_ACTIVE_CHALLENGES = 3;
export const MAX_ACTIVE_GOALS = 5;

// Crashlytics: keep community blur disabled on Android and use Expo blur path.
export const ANDROID_DIMEZIS_DISABLED = true;
export const ANDROID_BLUR_AUTO_UPDATE = false;
export const ANDROID_EXPO_BLUR_ENABLED = true;
export const ANDROID_EXPO_BLUR_REDUCTION_FACTOR = 1;
export const BLUR_VIEW_MANAGER_NAMES = ["ViewManagerAdapter_ExpoBlurView", "ExpoBlurView"];

export const IOS_TRACKING_BLOCKED_STATUSES = new Set(["denied", "restricted"]);

export const HARD_PAYWALL_DELAY_MS = 700;
export const PREMIUM_PAYWALL_REOPEN_GUARD_MS = 1200;
export const MODAL_HANDOFF_GUARD_MS = 450;

export const PENDING_COUNTDOWN_FAST_MS = 1000;
export const PENDING_BADGE_TICK_MS = 60000;
export const PERSIST_DEBOUNCE_MS = 400;
export const STORM_OVERLAY_DURATION_MS = 6000;

export const DEFAULT_TEMPTATION_EMOJI = "✨";
export const DEFAULT_GOAL_EMOJI = "🎯";
export const MAX_HISTORY_EVENTS = 200;
export const HISTORY_RETENTION_MS = DAY_MS * 31;
export const HERO_RECENT_HISTORY_WINDOW_MS = DAY_MS * 7;
export const PROFILE_HISTORY_PAGE_WINDOW_MS = DAY_MS * 14;
export const SPEND_LOGGING_REMINDER_DELAY_MS = DAY_MS * 1.5;
export const SPEND_LOGGING_REMINDER_COOLDOWN_MS = DAY_MS * 2;
export const HISTORY_VIEWPORT_ROWS = 5;
export const HISTORY_ITEM_HEIGHT = 60;
export const HISTORY_VIEWPORT_HEIGHT = HISTORY_VIEWPORT_ROWS * HISTORY_ITEM_HEIGHT;
export const HISTORY_SAVED_GAIN_EVENTS = new Set(["refuse_spend", "pending_to_decline", "income_savings"]);
export const HISTORY_PROGRESS_GAIN_EVENTS = new Set(["refuse_spend", "pending_to_decline"]);
export const HISTORY_SAVED_LOSS_EVENTS = new Set(["spend"]);
export const DAILY_GOAL_COIN_EVENTS = new Set(HISTORY_SAVED_GAIN_EVENTS);
export const DAILY_GOAL_WEEKDAY_BOOST = [0.95, 1.02, 1.0, 1.05, 1.08, 0.94, 0.9];
export const DAILY_GOAL_SHAKE_THRESHOLD = 1.2;
export const DAILY_GOAL_SHAKE_COOLDOWN_MS = 700;
export const DAILY_GOAL_GYRO_THRESHOLD = 0.6;
export const DAILY_GOAL_GYRO_COOLDOWN_MS = 350;
export const DAILY_GOAL_GYRO_ACCEL = 260;
export const DAILY_GOAL_GYRO_CLAMP = 2.2;
export const DAILY_GOAL_TILT_ACCEL = 1200;
export const DAILY_GOAL_TILT_FRICTION = 0.7;
export const DAILY_GOAL_TILT_DRAG = 0.0006;
export const DAILY_GOAL_TILT_BOUNCE = 0.35;
export const DAILY_GOAL_COIN_COLLISION_BOUNCE = 0.32;
export const DAILY_GOAL_COIN_COLLISION_SLOP = 0.6;
export const DAILY_GOAL_COIN_COLLISION_PERCENT = 0.48;
export const DAILY_GOAL_COIN_COLLISION_VELOCITY_EPS = 12;
export const DAILY_GOAL_COIN_COLLISION_ITERATIONS = 2;
export const DAILY_GOAL_COIN_COLLISION_RESTITUTION_MIN_SPEED = 60;
export const DAILY_GOAL_COIN_COLLISION_RESTITUTION_RANGE = 200;
export const DAILY_GOAL_COIN_COLLISION_REST_SPEED = 28;
export const DAILY_GOAL_COIN_COLLISION_REST_DAMPING = 0.96;
export const DAILY_GOAL_TILT_MAX_SPEED = 2600;
export const DAILY_GOAL_TILT_DEADZONE = 0.025;
export const DAILY_GOAL_TILT_STOP_SPEED = 5;
export const DAILY_GOAL_TILT_STOP_TILT = 0.02;
export const DAILY_GOAL_TILT_STOP_GYRO = 0.04;
export const DAILY_GOAL_GRAVITY = 240;
export const PIGGY_COIN_PADDING_X = 18;
export const PIGGY_COIN_PADDING_Y = 12;
export const HERO_CAROUSEL_ITEM_GUTTER = 16;
export const HERO_CAROUSEL_PREMIUM_ATTEMPT_TRIGGER_PX = 10;
export const HERO_CAROUSEL_PREMIUM_DRAG_LIMIT_PX = 30;
export const HERO_CAROUSEL_WIDGET_ANALYTICS_KEYS = ["H", "B", "P"];
export const REPORTS_WEEK_COUNT = 8;
export const REPORTS_MONTH_COUNT = 6;
export const REPORTS_MAX_INSIGHTS = 3;
export const REPORTS_MAX_STEPS = 3;
export const REPORTS_MIN_ACTIONS_WEEK = 3;
export const REPORTS_MIN_ACTIONS_MONTH = 6;

export const STORAGE_KEYS = {
  PURCHASES: "@almost_purchases",
  PROFILE: "@almost_profile",
  THEME: "@almost_theme",
  PRO_THEME_ACCENT: "@almost_pro_theme_accent",
  LANGUAGE: "@almost_language",
  ONBOARDING: "@almost_onboarded",
  TERMS_ACCEPTED: "@almost_terms_accepted",
  CATALOG: "@almost_catalog_overrides",
  PRICE_PRECISION_OVERRIDES: "@almost_price_precision_overrides",
  TITLE_OVERRIDES: "@almost_title_overrides",
  EMOJI_OVERRIDES: "@almost_emoji_overrides",
  WISHES: "@almost_wishes",
  SAVED_TOTAL: "@almost_saved_total",
  SAVED_TOTAL_PROGRESS: "@almost_saved_total_progress",
  LEVEL_PROGRESS_OFFSET: "@almost_level_progress_offset",
  DECLINES: "@almost_declines",
  PENDING: "@almost_pending",
  FREE_DAY: "@almost_free_day_stats",
  USAGE_STREAK: "@almost_usage_streak",
  STREAK_PLEDGE: "@almost_streak_pledge",
  DECISION_STATS: "@almost_decision_stats",
  HISTORY: "@almost_history",
  REFUSE_STATS: "@almost_refuse_stats",
  REWARDS_CELEBRATED: "@almost_rewards_celebrated",
  HEALTH: "@almost_health_points",
  CLAIMED_REWARDS: "@almost_claimed_rewards",
  REWARD_TOTAL: "@almost_reward_total",
  ANALYTICS_OPT_OUT: "@almost_analytics_opt_out",
  FIRST_SESSION_DURATION_BUCKET: "@almost_first_session_duration_bucket",
  ANDROID_APPSFLYER_ENABLED: "@almost_android_appsflyer_enabled",
  TEMPTATION_GOALS: "@almost_temptation_goals",
  TEMPTATION_INTERACTIONS: "@almost_temptation_interactions",
  CUSTOM_TEMPTATIONS: "@almost_custom_temptations",
  HIDDEN_TEMPTATIONS: "@almost_hidden_temptations",
  ARCHIVED_TEMPTATIONS: "@almost_archived_temptations",
  IMPULSE_TRACKER: "@almost_impulse_tracker",
  MOOD_STATE: "@almost_mood_state",
  CHALLENGES: "@almost_challenges",
  CHALLENGE_BADGES: "@almost_challenge_badges",
  CUSTOM_REMINDER: "@almost_custom_reminder",
  SMART_REMINDERS: "@almost_smart_reminders",
  DAILY_NUDGES: "@almost_daily_nudges",
  DAILY_NUDGE_SCHEDULE_SIGNATURE: "@almost_daily_nudge_schedule_signature",
  LANGUAGE_CURRENCY_NUDGE: "@almost_language_currency_nudge",
  TAMAGOTCHI: "@almost_tamagotchi_state",
  TAMAGOTCHI_GREETING_DAY: "@almost_tamagotchi_greeting_day",
  DAILY_SUMMARY: "@almost_daily_summary",
  DID_YOU_KNOW: "@almost_did_you_know",
  DAILY_SAVE_LIMIT: "@almost_daily_save_limit",
  POTENTIAL_PUSH_PROGRESS: "@almost_potential_push_progress",
  PUSH_NOTIFICATIONS_ENABLED_LOGGED: "@almost_push_notifications_enabled_logged",
  HOME_WIDGET_INSTALLED_LOGGED: "@almost_home_widget_installed_logged",
  PUSH_DAY_THREE_PROMPT: "@almost_push_day_three_prompt",
  SPEND_LOGGING_REMINDER: "@almost_spend_logging_reminder",
  TUTORIAL: "@almost_tutorial_state",
  TUTORIAL_CARD_SHOWN: "tutorial_card_shown",
  FEED_ADD_TUTORIAL_SHOWN: "@almost_feed_add_tutorial_shown",
  AMOUNT_SLIDER_CONFIRM_COACH: "@almost_amount_slider_confirm_coach",
  BUDGET_WIDGET_TUTORIAL: "@almost_budget_widget_tutorial",
  HERO_CAROUSEL_WIGGLE_SWIPE_AT: "@almost_hero_carousel_wiggle_swipe_at",
  HERO_CAROUSEL_WIGGLE_SEEN: "@almost_hero_carousel_wiggle_seen",
  TEMPTATION_TUTORIAL: "@almost_temptation_cards_tutorial",
  COIN_VALUE_MODAL: "@almost_coin_value_modal",
  DAILY_CHALLENGE: "@almost_daily_challenge_state",
  DAILY_CHALLENGE_COMPLETED_TOTAL: "@almost_daily_challenge_completed_total",
  DAILY_REWARD: "@almost_daily_reward",
  DAILY_REWARD_DAY_KEY: "@almost_daily_reward_day",
  FOCUS_TARGET: "@almost_focus_target",
  FOCUS_DIGEST: "@almost_focus_digest",
  FOCUS_VICTORY_TOTAL: "@almost_focus_victory_total",
  CATEGORY_OVERRIDES: "@almost_category_overrides",
  CUSTOM_CATEGORIES: "@almost_custom_categories",
  REMOVED_CATEGORIES: "@almost_removed_categories",
  SAVINGS_CATEGORY_OVERRIDE: "@almost_savings_category_override",
  CATEGORY_DEF_OVERRIDES: "@almost_category_def_overrides",
  DESCRIPTION_OVERRIDES: "@almost_description_overrides",
  FOCUS_DIGEST_PENDING: "@almost_focus_digest_pending",
  CUSTOM_TEMPTATIONS_CREATED: "@almost_custom_temptations_created",
  TAMAGOTCHI_SKIN: "@almost_tamagotchi_skin",
  TAMAGOTCHI_SKINS_UNLOCKED: "@almost_tamagotchi_skins_unlocked",
  TAMAGOTCHI_HUNGER_NOTIFICATIONS: "@almost_tamagotchi_hunger_notifications",
  TAMAGOTCHI_HUNGER_DAILY_COUNT: "@almost_tamagotchi_hunger_daily_count",
  TAMAGOTCHI_HUNGER_LAST_AT: "@almost_tamagotchi_hunger_last_at",
  TAMAGOTCHI_MISS_YOU_NOTIFICATION: "@almost_tamagotchi_miss_you_notification",
  TAMAGOTCHI_LAST_ACTIVE_AT: "@almost_tamagotchi_last_active_at",
  SAVED_TOTAL_PEAK: "@almost_saved_total_peak",
  SAVED_TOTAL_PROGRESS_PEAK: "@almost_saved_total_progress_peak",
  LAST_CELEBRATED_LEVEL: "@almost_last_celebrated_level",
  LEVEL_REACHED_LOGGED: "@almost_level_reached_logged",
  LEVEL_SHARE_REWARDED_LEVELS: "@almost_level_share_rewarded_levels",
  ACTIVE_GOAL: "@almost_active_goal",
  POTENTIAL_OPEN_SNAPSHOT: "@almost_potential_open_snapshot",
  COIN_SLIDER_MAX: "@almost_coin_slider_max",
  FAB_TUTORIAL: "@almost_fab_tutorial",
  NO_GOAL_SAVE_PROMPT_SHOWN: "@almost_no_goal_save_prompt_shown",
  RATING_PROMPT: "@almost_rating_prompt",
  NORTH_STAR_METRIC: "@almost_north_star_metric",
  DAY_TWO_ACTIVITY: "@almost_day_two_activity",
  DAY_THREE_ACTIVITY: "@almost_day_three_activity",
  DAY_TWO_INCOME_PROMPT_DISMISSED: "@almost_day_two_income_prompt_dismissed",
  RETENTION_ACTIVE_DAYS: "@almost_retention_active_days",
  RETENTION_MILESTONES: "@almost_retention_milestones",
  PRIMARY_TEMPTATION_PROMPT: "@almost_primary_temptation_prompt",
  LAST_NOTIFICATION_AT: "@almost_last_notification_at",
  SOUND_ENABLED: "@almost_sound_enabled",
  REPORTS_BADGE: "@almost_reports_badge",
  REPORTS_LAST_AUTO_WEEK: "@almost_reports_last_auto_week",
  REPORTS_WEEKLY_NOTIFICATION: "@almost_reports_weekly_notification",
  INCOME_ENTRIES: "@almost_income_entries",
  BUDGET_LIMITS: "@almost_budget_limits",
  INCOME_PROMPT: "@almost_income_prompt",
  BUDGET_OVERSPEND: "@almost_budget_overspend",
  DAILY_GOAL_COLLECTED: "@almost_daily_goal_collected",
  PREMIUM_INSTALL_ID: "@almost_premium_install_id",
  PREMIUM_INSTALL_SECRET: "@almost_premium_install_secret",
  INSTALL_DATE: "install_date",
  PREMIUM_SOFT_PAYWALL_SHOWN: "@almost_premium_soft_paywall_shown",
  PREMIUM_DAILY_SOFT_PAYWALL_SHOWN_DAY_KEY: "@almost_premium_daily_soft_paywall_shown_day_key",
  PREMIUM_GROUP_C_SOFT_PAYWALL_SHOWN_DAY_KEY: "@almost_premium_group_c_soft_paywall_shown_day_key",
  PREMIUM_HARD_PAYWALL_SHOWN: "@almost_premium_hard_paywall_shown",
  PREMIUM_TRANSACTION_ABANDONED_LAST_SHOWN_AT:
    "@almost_premium_transaction_abandoned_last_shown_at",
  PREMIUM_CHALLENGE_CLAIMS: "@almost_premium_challenge_claims",
  PREMIUM_STATE_CACHE: "@almost_premium_state_cache",
  MONETIZATION_EXPERIMENT_GROUP: "@almost_monetization_experiment_group",
  MONETIZATION_EXPERIMENT_ASSIGNED_AT: "@almost_monetization_experiment_assigned_at",
  MONETIZATION_EXPERIMENT_NEW_INSTALL: "@almost_monetization_experiment_new_install",
  MONETIZATION_EXPERIMENT_INSTALL_LEGACY: "@almost_monetization_experiment_install_legacy",
  MONETIZATION_TRIAL_LOCKED: "@almost_monetization_trial_locked",
  MONETIZATION_ONBOARDING_LOCKED: "@almost_monetization_onboarding_locked",
};
