/**
 * Analytics helper responsible for routing events to Firebase Analytics.
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
  onboarding_language_chosen: ["language"],
  onboarding_currency_chosen: ["currency"],
  onboarding_gender_chosen: ["gender", "selected"],
  onboarding_step_reached: ["step", "index"],
  onboarding_goal_chosen: ["goal_id", "target_usd"],
  onboarding_goal_skipped: ["method"],
  onboarding_goal_custom_created: ["title", "target_usd", "currency"],
  onboarding_persona_chosen: ["persona_id", "habit_type"],
  onboarding_custom_spend: ["has_custom", "price_usd", "frequency_per_week"],
  onboarding_profile_fields: ["first_name_entered", "last_name_entered", "motto_entered"],
  onboarding_completed: ["persona_id", "goal_id", "has_goal", "start_balance"],
  onboarding_terms_accepted: ["language"],
  onboarding_skipped: ["from_step"],
  consent_terms_accepted: ["language"],
  consent_analytics_enabled: ["enabled", "source"],
  theme_changed: ["theme"],
  home_opened: ["session_index"],
  rating_prompt_shown: [],
  rating_prompt_action: ["action"],
  store_review_prompt_requested: ["source", "platform"],
  store_review_redirect: ["source", "platform", "method"],
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
  menu_progress_opened: [],
  progress_analytics_opened: ["category_id"],
  reminder_shown: ["reminder_type"],
  reminder_clicked: ["reminder_type", "target_screen"],
  daily_reward_opened: ["coins", "day", "level"],
  daily_reward_claimed: ["coins", "level", "day"],
  daily_reward_collected_day_1: ["coins", "level"],
  daily_reward_collected_day_2: ["coins", "level"],
  daily_reward_collected_day_3: ["coins", "level"],
  daily_reward_collected_day_4: ["coins", "level"],
  daily_reward_collected_day_5: ["coins", "level"],
  daily_reward_collected_day_6: ["coins", "level"],
  daily_reward_collected_day_7: ["coins", "level"],
  push_notifications_enabled: [],
  push_notification_open: [],
  savings_updated: ["saved_usd_total", "tier_level", "next_tier_usd", "profile_goal"],
  savings_level_up: ["level", "saved_usd_total"],
  hero_level_unlocked: ["level", "saved_usd_total"],
  hero_show_more_toggled: ["expanded"],
  custom_category_created: ["count", "category_id"],
  day_2: [],
  day_3: [],
  north_star_two_saves: ["saves_in_window", "hours_since_join"],
  free_day_rescue: ["current_streak", "health_remaining"],
  profile_baseline_updated: ["previous_usd", "baseline_usd", "currency"],
  profile_custom_spend_updated: ["title", "amount_usd", "frequency_per_week", "removed"],
  spend_impact_toggle: ["enabled"],
  sound_toggle: ["enabled"],
  focus_target_set: ["template_id", "source"],
  focus_digest_later: ["date_key"],
  focus_digest_focus: ["date_key"],
  focus_accepted: ["template_id", "source"],
  tamagotchi_skin_selected: ["skin_id"],
  tamagotchi_skin_unlock_feedback: ["method"],
  tamagotchi_feed: ["food_id", "food_cost", "hunger_before", "hunger_after", "coins_before", "coins_after"],
  tamagotchi_opened: [],
  tamagotchi_pressed: [],
  goal_creator_opened: ["source", "make_primary"],
  goal_creator_cancelled: ["source", "make_primary"],
  coin_entry_opened: ["source"],
  coin_entry_closed: ["source", "result", "duration_ms"],
  coin_entry_submit: ["source", "direction", "amount_usd", "category"],
  level_share_opened: ["level"],
  level_share_sent: ["level"],
  level_reached: ["level"],
  impulse_map_opened: [],
};

const FACEBOOK_EVENT_WHITELIST = new Set([
  "onboarding_completed",
  "north_star_two_saves",
  "temptation_action",
]);

const APPSFLYER_DEV_KEY = process.env.APPSFLYER_DEV_KEY || "hccSDBqWuZXfQCRbRQbqBR";
const APPSFLYER_APP_ID = process.env.APPSFLYER_APP_ID || "6756276744";

const baseEnabled = !__DEV__;
let analyticsOptedOut = false;
let analyticsConsentGranted = false;
let performanceUnavailableLogged = false;
let appsFlyerInitialized = false;
let appsFlyerInitPromise = null;

const isAnalyticsEnabled = () => baseEnabled && analyticsConsentGranted && !analyticsOptedOut;
const isAppsFlyerConfigured = () => {
  if (!APPSFLYER_DEV_KEY) return false;
  if (Platform.OS === "ios") {
    return !!APPSFLYER_APP_ID;
  }
  return true;
};
const hasAppsFlyer = () => !!appsFlyer && typeof appsFlyer.initSdk === "function";
const shouldUseAppsFlyer = () => baseEnabled && isAppsFlyerConfigured() && hasAppsFlyer();

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
  if (!shouldUseAppsFlyer()) return;
  if (!hasAppsFlyer()) return;
  if (!isAnalyticsEnabled()) {
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

const logAppsFlyerEvent = async (eventName, params = {}) => {
  if (!shouldUseAppsFlyer() || !isAnalyticsEnabled()) return;
  if (!hasAppsFlyer() || typeof appsFlyer.logEvent !== "function") return;
  const initialized = await initAppsFlyerSdk();
  if (!initialized) return;
  return new Promise((resolve) => {
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
  await syncAppsFlyerCollection();
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
  await logAppsFlyerEvent(eventName, filteredParams);
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
