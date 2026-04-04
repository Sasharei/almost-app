/**
 * Analytics helper responsible for routing events to multiple providers.
 * The module guards against missing dependencies and never emits events in dev.
 */
import { Platform } from "react-native";

let analytics = null;
try {
  // Optional dependency – only available in native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  analytics = require("@react-native-firebase/analytics")?.default || null;
} catch (error) {
  analytics = null;
}

let perf = null;
try {
  // Optional dependency – only available in native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  perf = require("@react-native-firebase/perf")?.default || null;
} catch (error) {
  perf = null;
}

let appsFlyer = null;
try {
  // Optional dependency – only available in native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  appsFlyer = require("react-native-appsflyer")?.default || null;
} catch (error) {
  appsFlyer = null;
}

let FacebookAppEvents = null;
try {
  // Optional dependency – only available on native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FacebookAppEvents = require("react-native-fbsdk-next").AppEventsLogger;
} catch (error) {
  FacebookAppEvents = null;
}

let TikTokBusiness = null;
try {
  // Optional dependency – only available on native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TikTokModule = require("react-native-tiktok-business-sdk");
  TikTokBusiness = TikTokModule?.TikTokBusiness || TikTokModule?.default || null;
} catch (error) {
  TikTokBusiness = null;
}

let amplitudeAnalytics = null;
try {
  // Optional dependency – only available on native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  amplitudeAnalytics = require("@amplitude/analytics-react-native");
} catch (error) {
  amplitudeAnalytics = null;
}

let AmplitudeSessionReplayPlugin = null;
try {
  // Optional dependency – only available on native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AmplitudeSessionReplayPlugin =
    require("@amplitude/plugin-session-replay-react-native")?.SessionReplayPlugin || null;
} catch (error) {
  AmplitudeSessionReplayPlugin = null;
}

const EVENT_DEFINITIONS = {
  temptation_want: ["item_id", "price_usd", "categories", "persona", "currency"],
  temptation_save: [
    "item_id",
    "price_usd",
    "categories",
    "persona",
    "currency",
    "total_saved_usd",
    "refuse_count_for_item",
  ],
  temptation_think_later: [
    "item_id",
    "price_usd",
    "categories",
    "persona",
    "currency",
    "reminder_days",
  ],
  temptation_spend: ["item_id", "price_usd", "categories", "persona", "currency", "total_saved_usd"],
  pending_added: ["item_id", "price_usd", "categories", "persona", "currency", "remind_at"],
  pending_decide_want: ["item_id", "price_usd", "days_waited", "persona", "currency"],
  pending_decide_decline: ["item_id", "price_usd", "days_waited", "persona", "currency"],
  pending_deleted: ["pending_id"],
  free_day_logged: ["total", "current_streak", "best_streak", "weekday", "persona", "goal"],
  free_day_milestone: ["milestone", "current_streak"],
  free_day_coin_reward: ["blue_coins", "health_points", "current_streak"],
  usage_streak_logged: [
    "current_streak",
    "previous_streak",
    "best_streak",
    "total",
    "action",
    "missed",
  ],
  usage_streak_weekly_reward: ["current_streak", "reward_blue", "reward_value", "week_index"],
  usage_streak_restored: ["missed_days", "cost_blue", "cost_value", "current_streak"],
  streak_goal_prompt_shown: ["streak_count"],
  streak_goal_prompt_dismissed: ["day_key"],
  streak_goal_selected: ["target_days", "start_count", "reward_blue", "reward_value"],
  streak_goal_completed: [
    "target_days",
    "reward_blue",
    "reward_value",
    "current_streak",
    "start_count",
  ],
  streak_goal_failed: ["target_days", "start_count", "current_streak"],
  streak_goal_reward_shown: ["target_days", "reward_blue", "reward_value"],
  onboarding_goal_chosen: ["goal_id", "target_usd"],
  onboarding_goal_skipped: ["method"],
  onboarding_goal_custom_created: ["title_hash", "target_usd", "currency"],
  session_started: [],
  layout_guard_metrics: [
    "platform",
    "android_version",
    "pixel_ratio",
    "font_scale",
    "window_width",
    "window_height",
    "screen_width",
    "screen_height",
  ],
  persona_coffee_selected: [],
  persona_smoking_selected: [],
  persona_beauty_selected: [],
  persona_gaming_selected: [],
  persona_delivery_selected: [],
  persona_shopping_selected: [],
  persona_home_selected: [],
  persona_anime_selected: [],
  persona_subscriptions_selected: [],
  persona_fashion_selected: [],
  persona_custom_selected: [],
  language_ru_selected: [],
  language_en_selected: [],
  language_es_selected: [],
  language_fr_selected: [],
  language_de_selected: [],
  language_ar_sa_selected: [],
  language_ar_ae_selected: [],
  language_zh_selected: [],
  currency_usd_selected: [],
  currency_aed_selected: [],
  currency_aud_selected: [],
  currency_byn_selected: [],
  currency_cad_selected: [],
  currency_eur_selected: [],
  currency_gbp_selected: [],
  currency_jpy_selected: [],
  currency_kzt_selected: [],
  currency_krw_selected: [],
  currency_mxn_selected: [],
  currency_pln_selected: [],
  currency_rub_selected: [],
  currency_sar_selected: [],
  gender_female_selected: [],
  gender_male_selected: [],
  gender_none_selected: [],
  onboarding_custom_spend: ["has_custom", "price_usd", "frequency_per_week"],
  onboarding_completed: ["persona_id", "goal_id", "has_goal", "start_balance", "skipped"],
  onboarding_terms_accepted: ["language"],
  onboarding_skipped: ["from_step"],
  consent_terms_accepted: ["language"],
  consent_analytics_enabled: ["enabled", "source"],
  theme_selected: ["theme", "is_pro", "pro_color_id", "pro_color_hex", "source"],
  home_opened: ["session_index"],
  fridge_door_opened: ["pending_count", "overdue_count"],
  rating_prompt_shown: [],
  rating_prompt_action: ["action"],
  store_review_prompt_requested: ["source", "platform"],
  store_review_redirect: ["source", "platform", "method"],
  rating_prompt_store_redirect: ["platform", "method"],
  fab_tutorial_shown: [],
  fab_tutorial_completed: ["source"],
  temptation_created: ["temptation_id", "is_custom", "category", "price", "frequency"],
  temptation_edited: [
    "temptation_id",
    "changed_price",
    "changed_category",
    "changed_description",
    "changed_frequency",
    "frequency",
  ],
  temptation_deleted: ["temptation_id", "is_custom", "price"],
  temptation_viewed: ["temptation_id", "category", "price"],
  temptation_decision: ["temptation_id", "decision", "price", "balance_before", "saving_target_id"],
  temptation_action: ["item_id", "price_usd", "categories", "persona", "currency", "action", "goal_id"],
  save_daily_limit_blocked: ["temptation_id", "day_key", "save_count_day", "save_limit_day"],
  save_guard_triggered: ["temptation_id", "save_count_5m", "save_window_ms"],
  save_guard_confirmed: ["temptation_id", "save_count_5m"],
  save_guard_cancelled: ["temptation_id", "save_count_5m"],
  saving_progress_updated: ["target_id", "amount_added", "new_progress"],
  goal_created: ["goal_id", "goal_type", "target_amount"],
  goal_manual_created: ["title_hash", "target_usd", "currency", "is_primary"],
  goal_completed: ["goal_id", "target_amount", "days_to_complete"],
  goal_abandoned: ["goal_id", "reason"],
  goal_renewal_start: ["had_existing_goal"],
  goal_renewal_later: ["goal_id"],
  reward_unlocked: ["reward_id", "type", "condition"],
  reward_claimed: ["reward_id"],
  challenge_joined: ["challenge_id", "type"],
  challenge_completed: ["challenge_id", "success"],
  challenge_started: ["challenge_id"],
  challenge_claimed: ["challenge_id"],
  challenge_cancelled: ["challenge_id"],
  daily_challenge_accepted: ["template_id"],
  daily_challenge_completed: ["template_id", "reward_bonus"],
  daily_challenge_failed: ["template_id"],
  stats_screen_viewed: ["tab"],
  menu_progress_opened: [],
  profile_terms_clicked: [],
  profile_instagram_clicked: [],
  profile_support_clicked: [],
  progress_analytics_opened: ["category_id"],
  reminder_shown: ["reminder_type"],
  reminder_clicked: ["reminder_type", "target_screen"],
  daily_reward_opened: ["coins", "day", "level"],
  daily_reward_claimed: ["coins", "level", "day"],
  daily_goal_piggy_collected: ["coins", "day"],
  daily_reward_collected_day_1: ["coins", "level"],
  daily_reward_collected_day_2: ["coins", "level"],
  daily_reward_collected_day_3: ["coins", "level"],
  daily_reward_collected_day_4: ["coins", "level"],
  daily_reward_collected_day_5: ["coins", "level"],
  daily_reward_collected_day_6: ["coins", "level"],
  daily_reward_collected_day_7: ["coins", "level"],
  push_notifications_enabled: [],
  push_notification_open: [],
  savings_updated: ["saved_usd_total", "tier_level", "next_tier_saves", "profile_goal"],
  savings_level_up: ["level", "saved_usd_total"],
  hero_level_unlocked: ["level", "saved_usd_total"],
  hero_show_more_toggled: ["expanded"],
  hero_widget_stopped: ["widget"],
  home_widget_installed: ["platform"],
  custom_category_created: ["count", "category_id"],
  budget_category_limit_updated: ["category_id", "limit_usd", "previous_limit_usd", "source"],
  budget_category_history_opened: ["category_id"],
  budget_widget_tutorial_shown: ["source"],
  budget_widget_tutorial_dismissed: ["source"],
  day_2: [],
  day_3: [],
  retention_day_active: ["lifetime_day", "active_days_total", "active_streak", "missed_days"],
  retention_day_milestone: ["day", "active_days_total", "active_streak"],
  north_star_two_saves: ["saves_in_window", "hours_since_join"],
  north_star2: ["decision_days", "decisions_total"],
  free_day_rescue: ["current_streak", "health_remaining"],
  profile_baseline_updated: ["previous_usd", "baseline_usd", "currency"],
  profile_custom_spend_updated: ["title_hash", "amount_usd", "frequency_per_week", "removed"],
  spend_impact_toggle: ["enabled"],
  sound_setting_enabled: [],
  sound_setting_disabled: [],
  focus_target_set: ["template_id", "source"],
  focus_digest_later: ["date_key"],
  focus_digest_focus: ["date_key"],
  focus_accepted: ["template_id", "source"],
  tamagotchi_skin_selected: ["skin_id", "is_pro"],
  tamagotchi_skin_unlock_feedback: ["method"],
  tamagotchi_feed: ["food_id", "food_cost", "hunger_before", "hunger_after", "coins_before", "coins_after"],
  tamagotchi_play: [
    "toy_id",
    "toy_cost",
    "coins_before",
    "coins_after",
    "wanted_toy",
    "mood_boost",
    "cleanliness_drop",
  ],
  tamagotchi_clean: ["tool_id", "soap_hits", "brush_hits"],
  tamagotchi_party_started: ["party_cost", "coins_before", "coins_after"],
  tamagotchi_opened: [],
  tamagotchi_pressed: [],
  goal_creator_opened: ["source", "make_primary"],
  goal_creator_cancelled: ["source", "make_primary"],
  coin_entry_opened: ["source", "preset_action"],
  coin_entry_closed: ["source", "result", "duration_ms"],
  coin_entry_submit: ["source", "direction", "amount_usd", "category"],
  income_entry_added: ["source", "month_key", "amount_usd", "currency", "entry_type"],
  income_entry_skipped: ["source", "month_key", "entry_type"],
  income_savings_confirmed: ["amount_usd", "percent"],
  income_savings_skipped: ["amount_usd", "percent", "reason"],
  level_share_opened: ["level"],
  level_share_sent: ["level"],
  level_share_reward_granted: ["level", "blue_coins", "health_points"],
  level_reached: ["level"],
  premium_paywall_shown: [
    "kind",
    "feature",
    "trigger",
    "view_index",
    "saved_total_usd",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_paywall_closed: [
    "kind",
    "feature",
    "close_action",
    "view_index",
    "duration_ms",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_paywall_scrolled: [
    "kind",
    "feature",
    "trigger",
    "view_index",
    "scroll_y",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_paywall_feature_highlighted: [
    "kind",
    "feature",
    "row_id",
    "view_index",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_paywall_plan_selected: [
    "kind",
    "feature",
    "plan",
    "view_index",
    "has_trial",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_paywall_primary_tapped: [
    "kind",
    "feature",
    "plan",
    "view_index",
    "price_local",
    "currency",
    "product_id",
    "has_trial",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_transaction_abandoned_offer_shown: [
    "kind",
    "feature",
    "view_index",
    "source",
    "offer_available",
    "offer_offering_id",
    "hours_since_last_offer",
    "cooldown_hours",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_purchase_started: [
    "kind",
    "feature",
    "plan",
    "view_index",
    "price_local",
    "currency",
    "product_id",
    "has_trial",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_purchase_result: [
    "kind",
    "feature",
    "plan",
    "view_index",
    "result",
    "reason",
    "error_code",
    "has_trial",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_purchase_success: [
    "plan",
    "kind",
    "feature",
    "view_index",
    "price_local",
    "currency",
    "product_id",
    "has_trial",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_purchase_revenue: [
    "plan",
    "kind",
    "feature",
    "view_index",
    "currency",
    "product_id",
    "revenue_local",
    "revenue_usd",
    "transaction_id",
    "has_trial",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_product_not_found: [
    "plan",
    "kind",
    "feature",
    "view_index",
    "product_id",
    "reason",
    "error_code",
    "has_trial",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_trial_started: [
    "plan",
    "product_id",
    "source",
    "kind",
    "feature",
    "view_index",
    "period_type",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_trial_cancelled: [
    "source",
    "product_id",
    "period_type",
    "entitlement",
    "will_renew",
    "has_unsubscribe_detected_at",
    "unsubscribe_detected_at",
    "expiration_date",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_trial_converted: [
    "source",
    "product_id",
    "plan",
    "previous_period_type",
    "current_period_type",
    "latest_purchase_date",
    "expiration_date",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_renewal: [
    "source",
    "product_id",
    "plan",
    "previous_purchase_date",
    "latest_purchase_date",
    "expiration_date",
    "will_renew",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_cancellation: [
    "source",
    "product_id",
    "plan",
    "period_type",
    "will_renew",
    "unsubscribe_detected_at",
    "expiration_date",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_non_subscription_purchase: [
    "source",
    "product_id",
    "plan",
    "transaction_id",
    "purchase_date",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_expiration: [
    "source",
    "product_id",
    "plan",
    "period_type",
    "expiration_date",
    "is_premium_after",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_billing_issue: [
    "source",
    "product_id",
    "plan",
    "billing_issue_detected_at",
    "expiration_date",
    "will_renew",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_product_change: [
    "source",
    "from_product_id",
    "to_product_id",
    "from_plan",
    "to_plan",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_restore_started: [
    "kind",
    "feature",
    "view_index",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_restore_result: [
    "kind",
    "feature",
    "view_index",
    "result",
    "reason",
    "error_code",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_conversion: [
    "plan",
    "product_id",
    "source",
    "kind",
    "feature",
    "view_index",
    "time_to_convert_sec",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_unlock_shown: [
    "source",
    "entitlement",
    "plan",
    "product_id",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_gate_blocked: [
    "feature",
    "kind",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_soft_paywall_shown: [
    "trigger",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_hard_paywall_shown: [
    "trigger",
    "saved_total_usd",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  monetization_experiment_assigned: [
    "experiment_id",
    "experiment_group",
    "assignment_source",
    "is_new_install",
    "enabled",
    "force_group",
    "allocation_a",
    "allocation_b",
    "allocation_c",
    "trial_save_limit",
  ],
  monetization_experiment_remote_config_loaded: [
    "experiment_id",
    "result",
    "source",
    "enabled",
    "force_group",
    "allocation_a",
    "allocation_b",
    "allocation_c",
    "trial_save_limit",
  ],
  monetization_experiment_lock_activated: [
    "experiment_id",
    "experiment_group",
    "lock_reason",
    "trial_save_limit",
    "save_count_total",
    "onboarding_step",
    "experiment_new_install",
  ],
  monetization_experiment_startup_blocked: [
    "experiment_id",
    "experiment_group",
    "lock_reason",
    "trial_save_limit",
    "save_count_total",
    "experiment_new_install",
  ],
  impulse_map_opened: [],
};

const FACEBOOK_EVENT_WHITELIST = new Set([
  "onboarding_completed",
  "north_star_two_saves",
  "north_star2",
  "temptation_action",
  "premium_paywall_shown",
  "premium_purchase_started",
  "premium_trial_started",
]);
const TIKTOK_EVENT_WHITELIST = new Set([
  "onboarding_completed",
  "north_star_two_saves",
  "north_star2",
  "temptation_action",
]);

const APPSFLYER_DEV_KEY = process.env.APPSFLYER_DEV_KEY || "hccSDBqWuZXfQCRbRQbqBR";
const APPSFLYER_APP_ID = process.env.APPSFLYER_APP_ID || "6756276744";
const TIKTOK_APP_ID_IOS =
  process.env.TIKTOK_APP_ID_IOS || process.env.TIKTOK_APP_ID || process.env.APPSFLYER_APP_ID || "";
const TIKTOK_APP_ID_ANDROID =
  process.env.TIKTOK_APP_ID_ANDROID || process.env.TIKTOK_APP_ID || "com.sasarei.almostclean";
const TIKTOK_TT_APP_ID = process.env.TIKTOK_TT_APP_ID || "";
const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN || "";
const TIKTOK_DEBUG = process.env.TIKTOK_DEBUG === "1" || process.env.TIKTOK_DEBUG === "true";
const AMPLITUDE_API_KEY =
  process.env.AMPLITUDE_API_KEY || "df42f60f7c184d85c3406cb63d49f066";

const baseEnabled = !__DEV__;
let analyticsOptedOut = false;
let analyticsConsentGranted = false;
let analyticsConsentKnown = false;
let performanceUnavailableLogged = false;
let appsFlyerInitialized = false;
let appsFlyerInitPromise = null;
let appsFlyerEnabled = true;
let facebookSdkReady = false;
let tiktokInitialized = false;
let tiktokInitPromise = null;
let amplitudeInitialized = false;
let amplitudeInitPromise = null;
let amplitudeSessionReplayAttached = false;
const MAX_FACEBOOK_EVENT_QUEUE = 25;
const pendingFacebookEvents = [];

const isAnalyticsEnabled = () => baseEnabled && analyticsConsentGranted && !analyticsOptedOut;
const isAppsFlyerConfigured = () => {
  if (!APPSFLYER_DEV_KEY) return false;
  if (Platform.OS === "ios") {
    return !!APPSFLYER_APP_ID;
  }
  return true;
};
const hasAppsFlyer = () => !!appsFlyer && typeof appsFlyer.initSdk === "function";
const shouldUseAppsFlyer = () =>
  baseEnabled && appsFlyerEnabled && isAppsFlyerConfigured() && hasAppsFlyer();
const getTikTokAppId = () => (Platform.OS === "ios" ? TIKTOK_APP_ID_IOS : TIKTOK_APP_ID_ANDROID);
const hasTikTok = () =>
  !!TikTokBusiness &&
  typeof TikTokBusiness.initializeSdk === "function" &&
  typeof TikTokBusiness.trackCustomEvent === "function";
const isTikTokConfigured = () => !!getTikTokAppId() && !!TIKTOK_TT_APP_ID && !!TIKTOK_ACCESS_TOKEN;
const shouldUseTikTok = () => baseEnabled && hasTikTok() && isTikTokConfigured();
const hasAmplitude = () =>
  !!amplitudeAnalytics &&
  typeof amplitudeAnalytics.init === "function" &&
  typeof amplitudeAnalytics.track === "function";
const shouldUseAmplitude = () => baseEnabled && !!AMPLITUDE_API_KEY && hasAmplitude();

const getAnalyticsClient = () => {
  if (!analytics || typeof analytics !== "function") return null;
  if (!isAnalyticsEnabled()) return null;
  try {
    return analytics();
  } catch (error) {
    console.warn("Analytics unavailable:", error?.message || error);
    return null;
  }
};

const getPerformanceClient = () => {
  if (!perf || typeof perf !== "function") return null;
  try {
    return perf();
  } catch (error) {
    if (!performanceUnavailableLogged) {
      performanceUnavailableLogged = true;
      console.warn("Performance unavailable:", error?.message || error);
    }
    return null;
  }
};

const syncAnalyticsCollection = async () => {
  if (!baseEnabled) return;
  if (!analytics || typeof analytics !== "function") return;
  try {
    await analytics().setAnalyticsCollectionEnabled(isAnalyticsEnabled());
  } catch (error) {
    console.warn("Analytics collection toggle failed:", error?.message || error);
  }
};

const syncPerformanceCollection = async () => {
  const perfClient = getPerformanceClient();
  if (!perfClient) return;
  try {
    await perfClient.setPerformanceCollectionEnabled(isAnalyticsEnabled());
  } catch (error) {
    console.warn("Performance toggle failed:", error?.message || error);
  }
};

const waitForAmplitudeResult = async (result) => {
  if (!result || typeof result !== "object") return;
  if (result.promise && typeof result.promise.then === "function") {
    await result.promise;
  }
};

const initAmplitudeSdk = async () => {
  if (!shouldUseAmplitude() || !isAnalyticsEnabled()) return false;
  if (amplitudeInitialized) return true;
  if (!amplitudeInitPromise) {
    amplitudeInitPromise = (async () => {
      try {
        await waitForAmplitudeResult(amplitudeAnalytics.init(AMPLITUDE_API_KEY));
        if (
          !amplitudeSessionReplayAttached &&
          AmplitudeSessionReplayPlugin &&
          typeof amplitudeAnalytics.add === "function"
        ) {
          await waitForAmplitudeResult(
            amplitudeAnalytics.add(new AmplitudeSessionReplayPlugin())
          );
          amplitudeSessionReplayAttached = true;
        }
        if (typeof amplitudeAnalytics.setOptOut === "function") {
          amplitudeAnalytics.setOptOut(false);
        }
        amplitudeInitialized = true;
        return true;
      } catch (error) {
        console.warn("Amplitude init failed:", error?.message || error);
        amplitudeInitPromise = null;
        return false;
      }
    })();
  }
  return amplitudeInitPromise;
};

const syncAmplitudeCollection = async () => {
  if (!shouldUseAmplitude()) return;
  if (typeof amplitudeAnalytics.setOptOut !== "function") return;
  if (!isAnalyticsEnabled()) {
    try {
      amplitudeAnalytics.setOptOut(true);
    } catch (error) {
      console.warn("Amplitude opt-out toggle failed:", error?.message || error);
    }
    return;
  }
  const initialized = await initAmplitudeSdk();
  if (!initialized) return;
  try {
    amplitudeAnalytics.setOptOut(false);
  } catch (error) {
    console.warn("Amplitude opt-in toggle failed:", error?.message || error);
  }
};

const initAppsFlyerSdk = async () => {
  if (!shouldUseAppsFlyer() || !isAnalyticsEnabled()) return false;
  if (!hasAppsFlyer()) return false;
  if (appsFlyerInitialized) return true;
  if (!appsFlyerInitPromise) {
    const options = {
      devKey: APPSFLYER_DEV_KEY,
      isDebug: __DEV__,
      onInstallConversionDataListener: false,
      onDeepLinkListener: false,
    };
    if (Platform.OS === "ios" && APPSFLYER_APP_ID) {
      options.appId = APPSFLYER_APP_ID;
    }
    appsFlyerInitPromise = new Promise((resolve) => {
      try {
        appsFlyer.initSdk(
          options,
          () => {
            appsFlyerInitialized = true;
            resolve(true);
          },
          (error) => {
            console.warn("AppsFlyer init failed:", error?.message || error);
            appsFlyerInitPromise = null;
            resolve(false);
          }
        );
      } catch (error) {
        console.warn("AppsFlyer init threw:", error?.message || error);
        appsFlyerInitPromise = null;
        resolve(false);
      }
    });
  }
  return appsFlyerInitPromise;
};

const syncAppsFlyerCollection = async () => {
  if (!hasAppsFlyer()) return;
  if (!shouldUseAppsFlyer() || !isAnalyticsEnabled()) {
    if (appsFlyerInitialized) {
      try {
        appsFlyer.stop(true);
      } catch (error) {
        console.warn("AppsFlyer stop failed:", error?.message || error);
      }
    }
    return;
  }
  const initialized = await initAppsFlyerSdk();
  if (!initialized) return;
  try {
    appsFlyer.stop(false);
  } catch (error) {
    console.warn("AppsFlyer resume failed:", error?.message || error);
  }
};

const parseAnalyticsBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return null;
};

const parsePositiveNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 0 ? parsed : 0;
};

const buildAppsFlyerRoasEvent = (eventName, params = {}) => {
  if (eventName !== "premium_purchase_revenue") return null;
  if (parseAnalyticsBoolean(params?.has_trial) === true) return null;
  const revenueLocal = parsePositiveNumber(params?.revenue_local);
  const revenueUSD = parsePositiveNumber(params?.revenue_usd);
  const afRevenue = revenueLocal > 0 ? revenueLocal : revenueUSD;
  if (!(afRevenue > 0)) return null;
  const currencyCode = String(params?.currency || "").trim().toUpperCase() || "USD";
  const productId = String(params?.product_id || "").trim();
  const transactionId = String(params?.transaction_id || "").trim();
  const afParams = {
    af_revenue: afRevenue,
    af_currency: currencyCode,
  };
  if (productId) {
    afParams.af_content_id = productId;
  }
  if (transactionId) {
    afParams.af_order_id = transactionId;
  }
  return {
    eventName: "af_purchase",
    params: afParams,
  };
};

const logAppsFlyerEventRaw = (eventName, params = {}) =>
  new Promise((resolve) => {
    try {
      appsFlyer.logEvent(
        eventName,
        params,
        () => resolve(true),
        (error) => {
          console.warn("AppsFlyer log failed:", eventName, error?.message || error);
          resolve(false);
        }
      );
    } catch (error) {
      console.warn("AppsFlyer event exception:", eventName, error?.message || error);
      resolve(false);
    }
  });

const logAppsFlyerEvent = async (eventName, params = {}) => {
  if (!shouldUseAppsFlyer() || !isAnalyticsEnabled()) return;
  if (!hasAppsFlyer() || typeof appsFlyer.logEvent !== "function") return;
  const initialized = await initAppsFlyerSdk();
  if (!initialized) return;
  const primaryLogged = await logAppsFlyerEventRaw(eventName, params);
  const roasEvent = buildAppsFlyerRoasEvent(eventName, params);
  if (!roasEvent) return primaryLogged;
  await logAppsFlyerEventRaw(roasEvent.eventName, roasEvent.params);
  return primaryLogged;
};

const initTikTokSdk = async () => {
  if (!shouldUseTikTok() || !isAnalyticsEnabled()) return false;
  if (!hasTikTok()) return false;
  if (tiktokInitialized) return true;
  if (!tiktokInitPromise) {
    const appId = getTikTokAppId();
    tiktokInitPromise = new Promise((resolve) => {
      try {
        Promise.resolve(
          TikTokBusiness.initializeSdk(appId, TIKTOK_TT_APP_ID, TIKTOK_ACCESS_TOKEN, TIKTOK_DEBUG)
        )
          .then(() => {
            tiktokInitialized = true;
            resolve(true);
          })
          .catch((error) => {
            console.warn("TikTok init failed:", error?.message || error);
            tiktokInitPromise = null;
            resolve(false);
          });
      } catch (error) {
        console.warn("TikTok init threw:", error?.message || error);
        tiktokInitPromise = null;
        resolve(false);
      }
    });
  }
  return tiktokInitPromise;
};

const sanitizeTikTokParams = (params = {}) =>
  Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      acc[key] = value;
      return acc;
    }
    acc[key] = JSON.stringify(value);
    return acc;
  }, {});

const logTikTokEvent = async (eventName, params = {}) => {
  if (!TIKTOK_EVENT_WHITELIST.has(eventName)) return;
  if (!shouldUseTikTok() || !isAnalyticsEnabled()) return;
  if (!hasTikTok() || typeof TikTokBusiness.trackCustomEvent !== "function") return;
  const initialized = await initTikTokSdk();
  if (!initialized) return;
  const normalizedParams = sanitizeTikTokParams(params);
  try {
    await TikTokBusiness.trackCustomEvent(eventName, normalizedParams);
  } catch (error) {
    console.warn("TikTok event exception:", eventName, error?.message || error);
  }
};

const logAmplitudeEvent = async (eventName, params = {}) => {
  if (!shouldUseAmplitude() || !isAnalyticsEnabled()) return;
  if (!hasAmplitude()) return;
  const initialized = await initAmplitudeSdk();
  if (!initialized) return;
  try {
    await waitForAmplitudeResult(amplitudeAnalytics.track(eventName, params));
  } catch (error) {
    console.warn("Amplitude track failed:", eventName, error?.message || error);
  }
};

const logAmplitudeScreenView = async (screenName) => {
  if (!screenName) return;
  await logAmplitudeEvent("screen_view", {
    screen_name: screenName,
    screen_class: screenName,
  });
};

const setAmplitudeUserProperties = async (properties = {}) => {
  if (!shouldUseAmplitude() || !isAnalyticsEnabled()) return;
  if (!hasAmplitude()) return;
  const initialized = await initAmplitudeSdk();
  if (!initialized) return;
  if (typeof amplitudeAnalytics.identify !== "function") return;
  if (typeof amplitudeAnalytics.Identify !== "function") return;
  const identify = new amplitudeAnalytics.Identify();
  let hasProperties = false;
  Object.entries(properties).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    hasProperties = true;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      identify.set(key, value);
      return;
    }
    identify.set(key, JSON.stringify(value));
  });
  if (!hasProperties) return;
  try {
    await waitForAmplitudeResult(amplitudeAnalytics.identify(identify));
  } catch (error) {
    console.warn("Amplitude identify failed:", error?.message || error);
  }
};

const enqueueFacebookEvent = (eventName, params) => {
  pendingFacebookEvents.push({ eventName, params });
  if (pendingFacebookEvents.length > MAX_FACEBOOK_EVENT_QUEUE) {
    pendingFacebookEvents.shift();
  }
};

const flushFacebookEventQueue = () => {
  if (!facebookSdkReady) return;
  if (!FacebookAppEvents || typeof FacebookAppEvents.logEvent !== "function") return;
  if (!isAnalyticsEnabled()) return;
  while (pendingFacebookEvents.length) {
    const { eventName, params } = pendingFacebookEvents.shift();
    try {
      FacebookAppEvents.logEvent(eventName, undefined, params);
    } catch (error) {
      console.warn("Failed to log Facebook event:", eventName, error?.message || error);
    }
  }
};

const filterParams = (eventName, params = {}) => {
  const allowedKeys = EVENT_DEFINITIONS[eventName] || [];
  return allowedKeys.reduce((acc, key) => {
    if (params[key] !== undefined && params[key] !== null) {
      acc[key] = params[key];
    }
    return acc;
  }, {});
};

export const registerLevelEvents = (maxLevel) => {
  const upper = Math.floor(Number(maxLevel));
  if (!Number.isFinite(upper) || upper < 1) return;
  for (let level = 1; level <= upper; level += 1) {
    const eventName = `level_reached_${level}`;
    if (!EVENT_DEFINITIONS[eventName]) {
      EVENT_DEFINITIONS[eventName] = ["level"];
    }
  }
};

export const initAnalytics = async () => {
  await syncAnalyticsCollection();
  await syncAmplitudeCollection();
  await syncAppsFlyerCollection();
  await initTikTokSdk();
};

export const initPerformanceMonitoring = async () => {
  if (!baseEnabled) return;
  await syncPerformanceCollection();
};

export const setAnalyticsOptOut = async (optOut) => {
  if (optOut === null || optOut === undefined) return;
  analyticsOptedOut = !!optOut;
  analyticsConsentGranted = !analyticsOptedOut || analyticsConsentGranted;
  analyticsConsentKnown = true;
  await syncAnalyticsCollection();
  await syncAmplitudeCollection();
  await syncPerformanceCollection();
  await syncAppsFlyerCollection();
  if (!analyticsOptedOut) {
    await initTikTokSdk();
  }
  if (analyticsOptedOut) {
    pendingFacebookEvents.length = 0;
  } else {
    flushFacebookEventQueue();
  }
};

export const setAppsFlyerEnabled = async (enabled = true) => {
  appsFlyerEnabled = enabled !== false;
  await syncAppsFlyerCollection();
};

export const logEvent = async (eventName, params = {}) => {
  if (!EVENT_DEFINITIONS[eventName]) return;
  const client = getAnalyticsClient();
  const filteredParams = filterParams(eventName, params);
  if (client) {
    try {
      await client.logEvent(eventName, filteredParams);
    } catch (error) {
      console.warn("Failed to log analytics event:", eventName, error?.message || error);
    }
  }
  await logAmplitudeEvent(eventName, filteredParams);
  await logAppsFlyerEvent(eventName, filteredParams);
  await logTikTokEvent(eventName, filteredParams);
  logFacebookEvent(eventName, filteredParams);
};

export const logScreenView = async (screenName) => {
  if (!screenName) return;
  const client = getAnalyticsClient();
  if (client) {
    try {
      await client.logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      });
    } catch (error) {
      console.warn("Failed to log screen view:", error?.message || error);
    }
  }
  await logAmplitudeScreenView(screenName);
};

const logFacebookEvent = (eventName, params = {}) => {
  if (!FACEBOOK_EVENT_WHITELIST.has(eventName)) return;
  if (!analyticsConsentKnown) {
    enqueueFacebookEvent(eventName, params);
    return;
  }
  if (!isAnalyticsEnabled()) return;
  if (!FacebookAppEvents || typeof FacebookAppEvents.logEvent !== "function") return;
  if (!facebookSdkReady) {
    enqueueFacebookEvent(eventName, params);
    return;
  }
  try {
    FacebookAppEvents.logEvent(eventName, undefined, params);
  } catch (error) {
    console.warn("Failed to log Facebook event:", eventName, error?.message || error);
  }
};

export const setFacebookSdkReady = (ready = true) => {
  facebookSdkReady = !!ready;
  if (facebookSdkReady) {
    flushFacebookEventQueue();
  }
};

export const setUserProperties = async (properties = {}) => {
  if (!properties || typeof properties !== "object") return;
  const client = getAnalyticsClient();
  if (client) {
    try {
      await client.setUserProperties(properties);
    } catch (error) {
      console.warn("Failed to set analytics user properties:", error?.message || error);
    }
  }
  await setAmplitudeUserProperties(properties);
};
