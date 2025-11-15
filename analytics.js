/**
 * Analytics helper responsible for routing events to Firebase Analytics.
 * The module guards against missing dependencies and never emits events in dev.
 */
import analytics from "@react-native-firebase/analytics";

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
  onboarding_persona_chosen: ["persona_id", "habit_type"],
  onboarding_custom_spend: ["has_custom", "price_usd"],
  onboarding_completed: ["persona_id", "goal_id"],
  savings_updated: ["saved_usd_total", "tier_level", "next_tier_usd", "profile_goal"],
  savings_level_up: ["level", "saved_usd_total"],
};

const baseEnabled = !__DEV__;
let analyticsOptedOut = false;

const isAnalyticsEnabled = () => baseEnabled && !analyticsOptedOut;

const getAnalyticsClient = () => {
  if (!isAnalyticsEnabled()) return null;
  try {
    return analytics();
  } catch (error) {
    console.warn("Analytics unavailable:", error?.message || error);
    return null;
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
  if (!isAnalyticsEnabled()) return;
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
  } catch (error) {
    console.warn("Analytics init failed:", error?.message || error);
  }
};

export const setAnalyticsOptOut = async (optOut) => {
  analyticsOptedOut = !!optOut;
  if (__DEV__) return;
  try {
    await analytics().setAnalyticsCollectionEnabled(!analyticsOptedOut);
  } catch (error) {
    console.warn("Analytics opt-out failed:", error?.message || error);
  }
};

export const logEvent = async (eventName, params = {}) => {
  if (!EVENT_DEFINITIONS[eventName]) return;
  const client = getAnalyticsClient();
  if (!client) return;
  try {
    await client.logEvent(eventName, filterParams(eventName, params));
  } catch (error) {
    console.warn("Failed to log analytics event:", eventName, error?.message || error);
  }
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
