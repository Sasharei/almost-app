/**
 * Analytics helper responsible for routing events to Firebase Analytics.
 * The module guards against missing dependencies and never emits events in dev.
 */
import analytics from "@react-native-firebase/analytics";
import perf from "@react-native-firebase/perf";

let FacebookAppEvents = null;
try {
  // Optional dependency – only available on native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FacebookAppEvents = require("react-native-fbsdk-next").AppEventsLogger;
} catch (error) {
  FacebookAppEvents = null;
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
  free_day_logged: ["total", "current_streak", "best_streak", "weekday", "persona", "goal"],
  free_day_milestone: ["milestone", "current_streak"],
  onboarding_language_chosen: ["language"],
  onboarding_currency_chosen: ["currency"],
  onboarding_goal_chosen: ["goal_id", "target_usd"],
  onboarding_goal_custom_created: ["title", "target_usd", "currency"],
  onboarding_persona_chosen: ["persona_id", "habit_type"],
  onboarding_custom_spend: ["has_custom", "price_usd", "frequency_per_week"],
  onboarding_completed: ["persona_id", "goal_id", "has_goal", "start_balance"],
  onboarding_terms_accepted: ["language"],
  consent_terms_accepted: ["language"],
  consent_analytics_enabled: ["enabled", "source"],
  home_opened: ["session_index"],
  rating_prompt_shown: [],
  rating_prompt_action: ["action"],
  fab_tutorial_shown: [],
  fab_tutorial_completed: ["source"],
  temptation_created: ["temptation_id", "is_custom", "category", "price"],
  temptation_edited: ["temptation_id", "changed_price", "changed_category"],
  temptation_deleted: ["temptation_id", "is_custom", "price"],
  temptation_viewed: ["temptation_id", "category", "price"],
  temptation_decision: ["temptation_id", "decision", "price", "balance_before", "saving_target_id"],
  temptation_action: ["item_id", "price_usd", "categories", "persona", "currency", "action", "goal_id"],
  saving_progress_updated: ["target_id", "amount_added", "new_progress"],
  goal_created: ["goal_id", "goal_type", "target_amount"],
  goal_manual_created: ["title", "target_usd", "currency", "is_primary"],
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
  reminder_shown: ["reminder_type"],
  reminder_clicked: ["reminder_type", "target_screen"],
  savings_updated: ["saved_usd_total", "tier_level", "next_tier_usd", "profile_goal"],
  savings_level_up: ["level", "saved_usd_total"],
  north_star_two_saves: ["saves_in_window", "hours_since_join"],
  free_day_rescue: ["current_streak", "health_remaining"],
  profile_baseline_updated: ["previous_usd", "baseline_usd", "currency"],
  profile_custom_spend_updated: ["title", "amount_usd", "frequency_per_week", "removed"],
  focus_target_set: ["template_id", "source"],
  focus_digest_later: ["date_key"],
  focus_digest_focus: ["date_key"],
  tamagotchi_skin_selected: ["skin_id"],
  tamagotchi_skin_unlock_feedback: ["method"],
  tamagotchi_feed: ["food_id", "food_cost", "hunger_before", "hunger_after", "coins_before", "coins_after"],
  goal_creator_opened: ["source", "make_primary"],
  goal_creator_cancelled: ["source", "make_primary"],
  coin_entry_opened: ["source"],
  coin_entry_closed: ["source", "result", "duration_ms"],
  coin_entry_submit: ["source", "direction", "amount_usd", "category"],
  level_share_opened: ["level"],
  level_share_sent: ["level"],
};

const FACEBOOK_EVENT_WHITELIST = new Set(["onboarding_completed", "north_star_two_saves"]);

const baseEnabled = !__DEV__;
let analyticsOptedOut = false;
let analyticsConsentGranted = false;
let performanceUnavailableLogged = false;

const isAnalyticsEnabled = () => baseEnabled && analyticsConsentGranted && !analyticsOptedOut;

const getAnalyticsClient = () => {
  if (!isAnalyticsEnabled()) return null;
  try {
    return analytics();
  } catch (error) {
    console.warn("Analytics unavailable:", error?.message || error);
    return null;
  }
};

const getPerformanceClient = () => {
  if (typeof perf !== "function") return null;
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

const filterParams = (eventName, params = {}) => {
  const allowedKeys = EVENT_DEFINITIONS[eventName] || [];
  return allowedKeys.reduce((acc, key) => {
    if (params[key] !== undefined && params[key] !== null) {
      acc[key] = params[key];
    }
    return acc;
  }, {});
};

export const initAnalytics = async () => {
  await syncAnalyticsCollection();
};

export const initPerformanceMonitoring = async () => {
  if (!baseEnabled) return;
  await syncPerformanceCollection();
};

export const setAnalyticsOptOut = async (optOut) => {
  if (optOut === null || optOut === undefined) return;
  analyticsOptedOut = !!optOut;
  analyticsConsentGranted = !analyticsOptedOut || analyticsConsentGranted;
  await syncAnalyticsCollection();
  await syncPerformanceCollection();
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
  logFacebookEvent(eventName, filteredParams);
};

export const logScreenView = async (screenName) => {
  if (!screenName) return;
  const client = getAnalyticsClient();
  if (!client) return;
  try {
    await client.logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (error) {
    console.warn("Failed to log screen view:", error?.message || error);
  }
};

const logFacebookEvent = (eventName, params = {}) => {
  if (!FACEBOOK_EVENT_WHITELIST.has(eventName)) return;
  if (!isAnalyticsEnabled()) return;
  if (!FacebookAppEvents || typeof FacebookAppEvents.logEvent !== "function") return;
  try {
    FacebookAppEvents.logEvent(eventName, undefined, params);
  } catch (error) {
    console.warn("Failed to log Facebook event:", eventName, error?.message || error);
  }
};

export const setUserProperties = async (properties = {}) => {
  if (!properties || typeof properties !== "object") return;
  const client = getAnalyticsClient();
  if (!client) return;
  try {
    await client.setUserProperties(properties);
  } catch (error) {
    console.warn("Failed to set analytics user properties:", error?.message || error);
  }
};
