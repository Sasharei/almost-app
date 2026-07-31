/**
 * Analytics helper responsible for routing events to multiple providers.
 * The module guards against missing dependencies and never emits events in dev.
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  syncPurchasesAttributionSafe,
} from "./src/monetization/purchasesClient";

// These CommonJS policy modules are shared with the Node-based release checks.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  ANALYTICS_SCHEMA_VERSION,
  DESTINATIONS,
  assertDefaultDenyRouting,
  buildEventContract,
  filterContractParams,
  filterDestinationParams,
  validateEventAgainstContract,
} = require("./src/analytics/contractPolicy");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  getElapsedBucket,
  hasCampaignFields,
  mergeWriteOnceAttribution,
  normalizeAppsFlyerInstallAttribution,
  normalizeAttributionValue,
} = require("./src/analytics/attributionPolicy");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  ALMOST_RELEASE_SCOPE,
  assertAlmostReleaseScope,
} = require("./src/analytics/releaseScope");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_CONFIG = require("./app.json");

let analytics = null;
try {
  // Optional dependency – only available in native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  analytics = require("@react-native-firebase/analytics")?.default || null;
} catch (_error) {
  analytics = null;
}

let perf = null;
try {
  // Optional dependency – only available in native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  perf = require("@react-native-firebase/perf")?.default || null;
} catch (_error) {
  perf = null;
}

let appsFlyer = null;
try {
  // Optional dependency – only available in native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  appsFlyer = require("react-native-appsflyer")?.default || null;
} catch (_error) {
  appsFlyer = null;
}

let amplitudeAnalytics = null;
try {
  // Optional dependency – only available on native builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  amplitudeAnalytics = require("@amplitude/analytics-react-native");
} catch (_error) {
  amplitudeAnalytics = null;
}

export const ANALYTICS_VALUE_UNKNOWN = "unknown";
export const ANALYTICS_EVENTS = Object.freeze({
  TRIAL_AVAILABLE: "trial_available",
  TRIAL_SWITCH_ON: "trial_switch_on",
});
export const ANALYTICS_SOURCES = Object.freeze({
  FREE_TRIAL_TOGGLE: "free_trial_toggle",
});

const EVENT_DEFINITIONS = {
  analytics_contract_error: ["error_type", "count_bucket"],
  attribution_sync_result: [
    "provider",
    "result",
    "elapsed_bucket",
    "has_provider_id",
    "has_campaign_fields",
    "attempt",
    "app_version",
  ],
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
  persona_selected: ["persona_id"],
  language_selected: ["language"],
  currency_selected: ["currency"],
  gender_selected: ["gender"],
  onboarding_completed: [
    "persona_id",
    "goal_id",
    "has_goal",
    "start_balance",
    "skipped",
  ],
  onboarding_terms_accepted: ["language"],
  consent_terms_accepted: ["language"],
  consent_analytics_enabled: ["enabled", "source"],
  theme_selected: ["theme", "is_pro", "pro_color_id", "pro_color_hex", "source"],
  home_opened: ["session_index"],
  fridge_door_opened: ["pending_count", "overdue_count"],
  fridge_intro_shown: [],
  fridge_intro_closed: ["source"],
  fridge_extend_modal_opened: ["pending_id"],
  fridge_extend_modal_closed: ["source"],
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
  daily_challenge_deferred: ["template_id", "defer_days", "source"],
  daily_challenge_dismissed: ["template_id", "source"],
  daily_challenge_completed: ["template_id", "reward_bonus"],
  daily_challenge_failed: ["template_id"],
  stats_screen_viewed: ["tab"],
  menu_progress_opened: ["section"],
  menu_budget_opened: [],
  profile_terms_clicked: [],
  profile_instagram_clicked: [],
  profile_support_clicked: [],
  progress_analytics_opened: ["category_id"],
  reminder_shown: ["reminder_type"],
  reminder_clicked: ["reminder_type", "target_screen"],
  daily_reward_opened: ["coins", "day", "level"],
  daily_reward_claimed: ["coins", "level", "day"],
  push_notifications_enabled: [],
  savings_updated: ["saved_usd_total", "tier_level", "next_tier_saves", "profile_goal"],
  savings_level_up: ["level", "saved_usd_total"],
  hero_level_unlocked: ["level", "saved_usd_total"],
  hero_show_more_toggled: ["expanded"],
  hero_widget_stopped: ["widget"],
  hero_savings_trend_opened: ["net_delta_usd", "avg_daily_delta_usd"],
  home_widget_installed: ["platform"],
  custom_category_created: ["count", "category_id"],
  saving_rating_chip_tapped: ["score", "peer_rank_percent"],
  saving_rating_modal_scrolled: ["score", "peer_rank_percent", "offset_y"],
  feature_metrics_snapshot: [
    "source",
    "saving_score",
    "saving_rank_percent",
    "rewards_unlocked_count",
    "rewards_claimed_count",
    "rewards_claimable_count",
    "daily_challenge_status",
    "daily_challenge_active",
    "daily_challenge_accepted_total",
    "daily_challenge_completed_total",
    "active_challenges_count",
    "completed_challenges_count",
    "claimed_challenges_count",
    "saved_total_usd",
    "lifetime_saved_usd",
    "free_day_current_streak",
    "usage_streak_current",
    "goals_count",
    "pending_count",
    "spend_count",
    "temptation_cards_count",
    "custom_temptation_count",
    "tycoon_enabled",
    "tycoon_pending_count",
    "level",
  ],
  budget_category_limit_updated: ["category_id", "limit_usd", "previous_limit_usd", "source"],
  budget_category_history_opened: ["category_id"],
  budget_remaining_balance_updated: ["month_key", "amount_usd"],
  budget_transfer_confirmed: ["type", "amount_usd", "has_proof"],
  budget_debt_plan_saved: ["debt_usd", "apr_percent", "min_payment_usd"],
  budget_proof_ocr_failed: ["reason"],
  budget_proof_amount_mismatch: ["candidate_count", "expected_local_amount", "currency"],
  budget_proof_amount_matched: ["expected_local_amount", "matched_local_amount", "currency"],
  budget_widget_tutorial_shown: ["source"],
  budget_widget_tutorial_dismissed: ["source"],
  subscription_watch_opened: ["source", "entry_count", "monthly_total_usd", "has_next_payment"],
  subscription_watch_add_tapped: ["entry_count", "monthly_total_usd"],
  subscription_auto_prompt_shown: ["candidate_count"],
  subscription_auto_prompt_action: ["action", "candidate_count"],
  subscription_auto_import_opened: ["source", "candidate_count"],
  subscription_auto_import_completed: ["candidate_count", "imported_count"],
  reports_opened: ["source", "tab", "has_data"],
  reports_tab_selected: ["tab", "has_data"],
  reports_closed: ["tab", "has_data"],
  daily_summary_open_requested: ["source"],
  did_you_know_seen: ["tip_id", "muted"],
  feed_first_tutorial_step: ["step"],
  feed_first_tutorial_completed: ["source"],
  pending_extended: ["pending_id", "reminder_ms", "reminder_option", "source"],
  premium_backend_validation_result: ["source", "product_id", "result", "reason", "status"],
  screen_intro_shown: ["screen"],
  screen_intro_closed: ["screen", "source"],
  help_guide_fab_clicked: ["screen"],
  help_guide_scrolled: ["screen", "offset_y"],
  bug_report_fab_clicked: ["screen"],
  bug_report_form_filled: ["screen"],
  bug_report_form_submitted: ["screen", "has_steps", "description_length"],
  bug_report_mail_opened: ["screen"],
  retention_day_active: ["lifetime_day", "active_days_total", "active_streak", "missed_days"],
  retention_day_milestone: ["day", "active_days_total", "active_streak"],
  retention_3_sessions_7_days: ["sessions_in_7_days", "lifetime_day", "active_days_total"],
  north_star_two_saves: ["saves_in_window", "hours_since_join"],
  north_star2: ["decision_days", "decisions_total"],
  free_day_rescue: ["current_streak", "health_remaining"],
  spend_impact_toggle: ["enabled"],
  tycoon_mode_toggle: ["enabled"],
  tycoon_autosave_pending_created: ["count", "amount_usd"],
  tycoon_autosave_dismissed: ["pending_count"],
  tycoon_autosave_review_prompted: ["pending_count", "confirm_all_streak"],
  tycoon_autosave_confirmed: [
    "saved_count",
    "spent_count",
    "saved_amount_usd",
    "spent_amount_usd",
    "reward",
  ],
  tycoon_rewards_collect_all: ["count", "reward"],
  tycoon_rewards_open_chests: ["count", "reward"],
  setting_changed: ["setting", "enabled", "source"],
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
  tamagotchi_clean_tool_bought: ["tool_id", "tool_cost", "coins_before", "coins_after"],
  tamagotchi_clean: ["tool_id", "soap_hits", "brush_hits"],
  tamagotchi_hourly_reward_claimed: ["coins", "hours", "blocked_after_claim"],
  tamagotchi_hourly_reward_push_scheduled: ["coins", "hours"],
  tamagotchi_hourly_reward_push_sent: ["coins", "hours"],
  tamagotchi_party_started: ["party_cost", "coins_before", "coins_after"],
  tamagotchi_skin_assets_download_failed: ["skin_id", "reason", "source"],
  tamagotchi_opened: ["source"],
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
  trial_available: [
    "kind",
    "feature",
    "trigger",
    "plan",
    "view_index",
    "product_id",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  trial_switch_on: [
    "kind",
    "feature",
    "trigger",
    "plan",
    "view_index",
    "product_id",
    "trial_days",
    "source",
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
  premium_transaction_abandoned_wheel_action: [
    "action",
    "kind",
    "feature",
    "view_index",
    "plan",
    "discount_percent",
    "source",
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
    "period_type",
    "offering_id",
    "error_category",
    "is_restore",
    "reason",
    "error_code",
    "has_trial",
    "trial_days",
    "experiment_id",
    "experiment_group",
    "experiment_new_install",
  ],
  premium_entitlement_activated: [
    "billing_state",
    "period_type",
    "offering_id",
    "is_restore",
    "plan",
    "kind",
    "feature",
    "view_index",
    "product_id",
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
  trial_qualifier_3: [
    "source",
    "product_id",
    "plan",
    "period_type",
    "trial_start_at",
    "hours_since_trial_start",
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
  app_screen_viewed: ["screen_id", "source"],
  modal_screen_shown: ["modal_id", "source", "context"],
  modal_action_tapped: ["modal_id", "action", "value", "source"],
};

const APPSFLYER_DEV_KEY = process.env.APPSFLYER_DEV_KEY || "hccSDBqWuZXfQCRbRQbqBR";
const APPSFLYER_APP_ID =
  process.env.APPSFLYER_APP_ID || ALMOST_RELEASE_SCOPE.iosAppStoreId;
const AMPLITUDE_API_KEY =
  process.env.AMPLITUDE_API_KEY || "df42f60f7c184d85c3406cb63d49f066";
const GA4_PURCHASE_DEDUP_STORAGE_KEY = "@almost/analytics/ga4-purchase-transaction-ids-v1";
const GA4_PURCHASE_DEDUP_MAX_IDS = 200;
const APPSFLYER_FIRST_TOUCH_STORAGE_KEY =
  "@almost/analytics/appsflyer-first-touch-v1";
const APPSFLYER_REVENUECAT_CONFIRMED_STORAGE_KEY =
  "@almost/analytics/appsflyer-revenuecat-confirmed-v1";
const ATTRIBUTION_SYNC_START_MS = Date.now();
const IOS_ATT_WAIT_SECONDS = 60;
const EVENT_CONTRACT = buildEventContract(EVENT_DEFINITIONS);

assertDefaultDenyRouting(EVENT_CONTRACT);
assertAlmostReleaseScope({
  iosBundleId: APP_CONFIG?.expo?.ios?.bundleIdentifier,
  iosAppStoreId: APPSFLYER_APP_ID,
  androidPackage: APP_CONFIG?.expo?.android?.package,
  tiktokAndroidAppId:
    process.env.TIKTOK_APP_ID_ANDROID || ALMOST_RELEASE_SCOPE.tiktokAndroidAppId,
  tiktokIosAppId:
    process.env.TIKTOK_APP_ID_IOS || ALMOST_RELEASE_SCOPE.tiktokIosAppId,
});

const baseEnabled = !__DEV__;
let analyticsOptedOut = false;
let analyticsConsentGranted = false;
let performanceUnavailableLogged = false;
let appsFlyerInitialized = false;
let appsFlyerInitPromise = null;
let appsFlyerCustomerUserId = null;
let appsFlyerAttWaitSeconds = 0;
let appsFlyerPartnerSharingAllowed = true;
let appsFlyerAdvertisingIdEnabled = null;
let appsFlyerInstallAttribution = {};
let appsFlyerConversionDataListener = null;
let appsFlyerConversionDataPromise = null;
let resolveAppsFlyerConversionData = null;
let amplitudeInitialized = false;
let amplitudeInitPromise = null;
let ga4PurchaseLogQueue = Promise.resolve();
let analyticsInstallIdentity = null;
let revenueCatAppsFlyerIdConfirmed = false;
let revenueCatAttributionSyncAttempt = 0;
const analyticsContractErrorCounts = new Map();

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
  baseEnabled && isAppsFlyerConfigured() && hasAppsFlyer();
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

const syncProductAnalyticsInstallIdentity = async () => {
  if (!analyticsInstallIdentity || !isAnalyticsEnabled()) return;
  const client = getAnalyticsClient();
  if (client && typeof client.setUserId === "function") {
    try {
      await client.setUserId(analyticsInstallIdentity);
    } catch (error) {
      console.warn("GA4 anonymous identity sync failed:", error?.message || error);
    }
  }
  if (
    amplitudeInitialized &&
    amplitudeAnalytics &&
    typeof amplitudeAnalytics.setUserId === "function"
  ) {
    try {
      await waitForAmplitudeResult(
        amplitudeAnalytics.setUserId(analyticsInstallIdentity)
      );
    } catch (error) {
      console.warn("Amplitude anonymous identity sync failed:", error?.message || error);
    }
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
        if (typeof amplitudeAnalytics.setOptOut === "function") {
          amplitudeAnalytics.setOptOut(false);
        }
        amplitudeInitialized = true;
        await syncProductAnalyticsInstallIdentity();
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

const readStoredAppsFlyerFirstTouch = async () => {
  try {
    const raw = await AsyncStorage.getItem(APPSFLYER_FIRST_TOUCH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("AppsFlyer first-touch read failed:", error?.message || error);
    return {};
  }
};

const persistAppsFlyerFirstTouch = async (incoming = {}) => {
  const existing = await readStoredAppsFlyerFirstTouch();
  const merged = mergeWriteOnceAttribution(existing, incoming);
  appsFlyerInstallAttribution = merged;
  if (JSON.stringify(existing) === JSON.stringify(merged)) return merged;
  try {
    await AsyncStorage.setItem(
      APPSFLYER_FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify(merged)
    );
  } catch (error) {
    console.warn("AppsFlyer first-touch write failed:", error?.message || error);
  }
  return merged;
};

const ensureAppsFlyerConversionDataListener = () => {
  if (appsFlyerConversionDataListener) return;
  if (!hasAppsFlyer() || typeof appsFlyer.onInstallConversionData !== "function") return;
  if (!appsFlyerConversionDataPromise) {
    appsFlyerConversionDataPromise = new Promise((resolve) => {
      resolveAppsFlyerConversionData = resolve;
    });
  }
  try {
    appsFlyerConversionDataListener = appsFlyer.onInstallConversionData((payload) => {
      const normalized = normalizeAppsFlyerInstallAttribution(payload);
      persistAppsFlyerFirstTouch(normalized)
        .then((firstTouch) => {
          if (resolveAppsFlyerConversionData) {
            resolveAppsFlyerConversionData(firstTouch);
            resolveAppsFlyerConversionData = null;
          }
          return syncAppsFlyerAttributionToRevenueCat({
            reason: "conversion_callback",
            attributionOverride: firstTouch,
          });
        })
        .catch((error) => {
          console.warn("AppsFlyer conversion handling failed:", error?.message || error);
        });
    });
  } catch (error) {
    console.warn("AppsFlyer conversion listener failed:", error?.message || error);
  }
};

const syncAppsFlyerCustomerUserId = async () => {
  const customerUserId = normalizeAttributionValue(appsFlyerCustomerUserId);
  if (!customerUserId) return false;
  if (!hasAppsFlyer() || typeof appsFlyer.setCustomerUserId !== "function") return false;
  return new Promise((resolve) => {
    try {
      appsFlyer.setCustomerUserId(customerUserId, () => resolve(true));
      setTimeout(() => resolve(true), 250);
    } catch (error) {
      console.warn("AppsFlyer customer user ID sync failed:", error?.message || error);
      resolve(false);
    }
  });
};

const initAppsFlyerSdk = async () => {
  if (!shouldUseAppsFlyer()) return false;
  if (!hasAppsFlyer()) return false;
  if (!normalizeAttributionValue(appsFlyerCustomerUserId)) {
    console.warn("AppsFlyer init blocked: app-scoped customer user ID is missing");
    return false;
  }
  if (appsFlyerInitialized) return true;
  if (!appsFlyerInitPromise) {
    ensureAppsFlyerConversionDataListener();
    await syncAppsFlyerCustomerUserId();
    const options = {
      devKey: APPSFLYER_DEV_KEY,
      isDebug: __DEV__,
      onInstallConversionDataListener: true,
      onDeepLinkListener: false,
    };
    if (Platform.OS === "ios" && APPSFLYER_APP_ID) {
      options.appId = APPSFLYER_APP_ID;
      if (appsFlyerAttWaitSeconds > 0) {
        options.timeToWaitForATTUserAuthorization = appsFlyerAttWaitSeconds;
      }
    }
    appsFlyerInitPromise = new Promise((resolve) => {
      try {
        appsFlyer.initSdk(
          options,
          () => {
            appsFlyerInitialized = true;
            if (__DEV__ && Platform.OS === "android") {
              console.info("[attribution-debug] AppsFlyer initialized", {
                platform: Platform.OS,
                present: true,
              });
            }
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

const syncAppsFlyerPartnerSharing = () => {
  if (!hasAppsFlyer() || typeof appsFlyer.setSharingFilterForPartners !== "function") return;
  try {
    appsFlyer.setSharingFilterForPartners(appsFlyerPartnerSharingAllowed ? [] : ["all"]);
  } catch (error) {
    console.warn("AppsFlyer partner sharing toggle failed:", error?.message || error);
  }
};

const syncAppsFlyerAdvertisingIdCollection = () => {
  if (Platform.OS !== "ios") return;
  if (typeof appsFlyerAdvertisingIdEnabled !== "boolean") return;
  if (!hasAppsFlyer() || typeof appsFlyer.disableAdvertisingIdentifier !== "function") return;
  try {
    appsFlyer.disableAdvertisingIdentifier(!appsFlyerAdvertisingIdEnabled);
  } catch (error) {
    console.warn("AppsFlyer advertising ID toggle failed:", error?.message || error);
  }
};

const syncAppsFlyerAttribution = async () => {
  if (!shouldUseAppsFlyer()) return false;
  syncAppsFlyerPartnerSharing();
  syncAppsFlyerAdvertisingIdCollection();
  return initAppsFlyerSdk();
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
  const initialized = await syncAppsFlyerAttribution();
  if (!initialized) return;
  // RevenueCat is the sole AppsFlyer revenue owner. Emitting af_purchase here as
  // well would double-count the same store transaction after S2S delivery.
  return logAppsFlyerEventRaw(eventName, params);
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

const APP_VERSION = String(APP_CONFIG?.expo?.version || "unknown");
const BUILD_NUMBER = String(
  Platform.OS === "ios"
    ? APP_CONFIG?.expo?.ios?.buildNumber || "unknown"
    : APP_CONFIG?.expo?.android?.versionCode || "unknown"
);

const buildGlobalAnalyticsParams = (params = {}) => ({
  analytics_schema_version: ANALYTICS_SCHEMA_VERSION,
  app_version: APP_VERSION,
  build_number: BUILD_NUMBER,
  platform: Platform.OS,
  experiment_id: String(params?.experiment_id || "none"),
  experiment_variant: String(
    params?.experiment_variant || params?.experiment_group || "none"
  ),
  install_id_present: !!normalizeAttributionValue(analyticsInstallIdentity),
});

const getContractErrorCountBucket = (count) => {
  if (count <= 1) return "1";
  if (count < 10) return "2_9";
  return "10_plus";
};

const recordAnalyticsContractError = async (errorType) => {
  const normalizedErrorType = String(errorType || "unknown_error");
  const nextCount = (analyticsContractErrorCounts.get(normalizedErrorType) || 0) + 1;
  analyticsContractErrorCounts.set(normalizedErrorType, nextCount);
  if (nextCount !== 1 && nextCount !== 10) return;
  const contract = EVENT_CONTRACT.analytics_contract_error;
  const payload = {
    ...buildGlobalAnalyticsParams(),
    error_type: normalizedErrorType,
    count_bucket: getContractErrorCountBucket(nextCount),
  };
  const filtered = filterContractParams(payload, contract);
  const client = getAnalyticsClient();
  if (client && contract.destinations.includes(DESTINATIONS.GA4)) {
    try {
      await client.logEvent("analytics_contract_error", filtered);
    } catch (_error) {}
  }
  if (contract.destinations.includes(DESTINATIONS.AMPLITUDE)) {
    await logAmplitudeEvent("analytics_contract_error", filtered);
  }
};

const handleContractViolation = async (eventName, validation) => {
  if (__DEV__ || process.env.NODE_ENV === "test") {
    const paramSuffix = validation?.paramName ? `:${validation.paramName}` : "";
    throw new Error(
      `[analytics-contract] ${validation?.errorType || "invalid_event"}:${eventName}${paramSuffix}`
    );
  }
  await recordAnalyticsContractError(validation?.errorType || "invalid_event");
};

export const getAnalyticsEventContract = (eventName) =>
  EVENT_CONTRACT[String(eventName || "")] || null;

export const setAppScopedInstallIdentity = async (installId) => {
  const normalized = normalizeAttributionValue(installId);
  if (!normalized) {
    throw new Error("App-scoped install identity is required");
  }
  analyticsInstallIdentity = normalized;
  appsFlyerCustomerUserId = normalized;
  await syncAppsFlyerCustomerUserId();
  await syncProductAnalyticsInstallIdentity();
  return true;
};

export const initAttribution = async ({
  timeToWaitForATTUserAuthorization = 0,
} = {}) => {
  const requestedWait = Math.max(
    0,
    Math.min(
      IOS_ATT_WAIT_SECONDS,
      Math.floor(Number(timeToWaitForATTUserAuthorization) || 0)
    )
  );
  if (!appsFlyerInitialized && !appsFlyerInitPromise) {
    appsFlyerAttWaitSeconds = Platform.OS === "ios" ? requestedWait : 0;
  }
  return syncAppsFlyerAttribution();
};

const getAppsFlyerUIDSafe = () =>
  new Promise((resolve) => {
    if (!hasAppsFlyer() || typeof appsFlyer.getAppsFlyerUID !== "function") {
      resolve(null);
      return;
    }
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(normalizeAttributionValue(value));
    };
    const timeout = setTimeout(() => settle(null), 3000);
    try {
      appsFlyer.getAppsFlyerUID((error, uid) => {
        clearTimeout(timeout);
        if (error) {
          console.warn("AppsFlyer UID unavailable:", error?.message || error);
          settle(null);
          return;
        }
        settle(uid);
      });
    } catch (error) {
      clearTimeout(timeout);
      console.warn("AppsFlyer UID exception:", error?.message || error);
      settle(null);
    }
  });

export const getAppsFlyerAttributionIdentity = async () => {
  const initialized = await initAttribution();
  if (!initialized) {
    return { appsFlyerId: null };
  }
  const appsFlyerId = await getAppsFlyerUIDSafe();
  if (!hasCampaignFields(appsFlyerInstallAttribution)) {
    appsFlyerInstallAttribution = await readStoredAppsFlyerFirstTouch();
  }
  if (!hasCampaignFields(appsFlyerInstallAttribution) && appsFlyerConversionDataPromise) {
    await Promise.race([
      appsFlyerConversionDataPromise,
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }
  return {
    appsFlyerId,
    ...(appsFlyerInstallAttribution || {}),
  };
};

export const syncAppsFlyerAttributionToRevenueCat = async ({
  reason = "manual",
  attributionOverride = null,
} = {}) => {
  revenueCatAttributionSyncAttempt += 1;
  const attempt = revenueCatAttributionSyncAttempt;
  if (!revenueCatAppsFlyerIdConfirmed) {
    try {
      const confirmed = await AsyncStorage.getItem(
        APPSFLYER_REVENUECAT_CONFIRMED_STORAGE_KEY
      );
      revenueCatAppsFlyerIdConfirmed = confirmed === "1";
    } catch (_error) {}
  }
  const initialized = await initAttribution();
  let appsFlyerId = null;
  if (initialized) {
    appsFlyerId = await getAppsFlyerUIDSafe();
  }
  const storedFirstTouch = await readStoredAppsFlyerFirstTouch();
  const firstTouch = await persistAppsFlyerFirstTouch({
    ...storedFirstTouch,
    ...(attributionOverride || {}),
  });
  const attribution = {
    appsFlyerId: normalizeAttributionValue(appsFlyerId),
    ...firstTouch,
  };
  const syncResult = await syncPurchasesAttributionSafe(attribution);
  if (syncResult?.appsFlyerIdSet) {
    revenueCatAppsFlyerIdConfirmed = true;
    AsyncStorage.setItem(
      APPSFLYER_REVENUECAT_CONFIRMED_STORAGE_KEY,
      "1"
    ).catch(() => {});
  }
  const hasProviderId = !!attribution.appsFlyerId;
  const hasCampaign = hasCampaignFields(firstTouch);
  const result = syncResult?.appsFlyerIdSet
    ? syncResult?.failedFields?.length
      ? "partial"
      : "success"
    : hasProviderId
    ? "failed"
    : "missing_provider_id";
  logEvent("attribution_sync_result", {
    provider: "appsflyer",
    result,
    elapsed_bucket: getElapsedBucket(Date.now() - ATTRIBUTION_SYNC_START_MS),
    has_provider_id: hasProviderId,
    has_campaign_fields: hasCampaign,
    attempt,
    app_version: APP_VERSION,
  }).catch(() => {});
  return {
    ...syncResult,
    reason: syncResult?.reason || String(reason || "manual"),
    hasProviderId,
    hasCampaignFields: hasCampaign,
    confirmed: revenueCatAppsFlyerIdConfirmed,
  };
};

export const initAnalytics = async () => {
  await syncAnalyticsCollection();
  await syncAmplitudeCollection();
  await syncProductAnalyticsInstallIdentity();
  await initAttribution();
  if (__DEV__ && Platform.OS === "android") {
    console.info("[attribution-debug] AppsFlyer status", {
      platform: Platform.OS,
      present: hasAppsFlyer(),
      initialized: appsFlyerInitialized,
      enabled: shouldUseAppsFlyer(),
      partnerSharingAllowed: appsFlyerPartnerSharingAllowed,
      analyticsEnabled: isAnalyticsEnabled(),
    });
  }
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
  await syncAmplitudeCollection();
  await syncPerformanceCollection();
  if (!analyticsOptedOut) await syncProductAnalyticsInstallIdentity();
};

export const setAppsFlyerPartnerSharingAllowed = async (allowed = true) => {
  appsFlyerPartnerSharingAllowed = allowed !== false;
  syncAppsFlyerPartnerSharing();
};

export const setAppsFlyerAdvertisingIdEnabled = async (enabled = false) => {
  appsFlyerAdvertisingIdEnabled = enabled === true;
  syncAppsFlyerAdvertisingIdCollection();
};

export const logEvent = async (eventName, params = {}) => {
  const payload = {
    ...(params || {}),
    ...buildGlobalAnalyticsParams(params),
  };
  const validation = validateEventAgainstContract(eventName, payload, EVENT_CONTRACT);
  if (!validation.ok) {
    await handleContractViolation(eventName, validation);
    return { ok: false, reason: validation.errorType };
  }
  const { contract } = validation;
  const client = getAnalyticsClient();
  const filteredParams = filterContractParams(payload, contract);
  if (client && contract.destinations.includes(DESTINATIONS.GA4)) {
    try {
      await client.logEvent(eventName, filteredParams);
    } catch (error) {
      console.warn("Failed to log analytics event:", eventName, error?.message || error);
    }
  }
  if (contract.destinations.includes(DESTINATIONS.AMPLITUDE)) {
    await logAmplitudeEvent(eventName, filteredParams);
  }
  if (contract.destinations.includes(DESTINATIONS.APPSFLYER)) {
    await logAppsFlyerEvent(
      eventName,
      filterDestinationParams(filteredParams, contract, DESTINATIONS.APPSFLYER)
    );
  }
  return { ok: true, destinations: contract.destinations };
};

const readLoggedGa4PurchaseIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(GA4_PURCHASE_DEDUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value || "").trim()).filter(Boolean);
  } catch (error) {
    console.warn("GA4 purchase dedup read failed:", error?.message || error);
    return [];
  }
};

const rememberLoggedGa4PurchaseId = async (transactionId, previousIds = []) => {
  const nextIds = [
    ...previousIds.filter((value) => value !== transactionId),
    transactionId,
  ].slice(-GA4_PURCHASE_DEDUP_MAX_IDS);
  try {
    await AsyncStorage.setItem(GA4_PURCHASE_DEDUP_STORAGE_KEY, JSON.stringify(nextIds));
    return true;
  } catch (error) {
    console.warn("GA4 purchase dedup write failed:", error?.message || error);
    return false;
  }
};

const logCommercePurchaseInternal = async ({
  transactionId,
  value,
  currency,
  productId,
  itemName,
  plan,
} = {}) => {
  const normalizedTransactionId = String(transactionId || "").trim();
  const normalizedValue = Number(value);
  const normalizedCurrency = String(currency || "").trim().toUpperCase();
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedTransactionId) return { ok: false, reason: "missing_transaction_id" };
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return { ok: false, reason: "invalid_value" };
  }
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    return { ok: false, reason: "invalid_currency" };
  }
  if (!normalizedProductId) return { ok: false, reason: "missing_product_id" };

  const previousIds = await readLoggedGa4PurchaseIds();
  if (previousIds.includes(normalizedTransactionId)) {
    return { ok: true, duplicate: true, transactionId: normalizedTransactionId };
  }
  const client = getAnalyticsClient();
  if (!client || typeof client.logPurchase !== "function") {
    return { ok: false, reason: "analytics_unavailable" };
  }
  const normalizedPlan = String(plan || "").trim();
  const normalizedItemName = String(itemName || normalizedPlan || normalizedProductId).trim();
  const item = {
    item_id: normalizedProductId,
    item_name: normalizedItemName || normalizedProductId,
    price: normalizedValue,
    quantity: 1,
  };
  if (normalizedPlan) {
    item.item_category = normalizedPlan;
  }
  try {
    await client.logPurchase({
      transaction_id: normalizedTransactionId,
      value: normalizedValue,
      currency: normalizedCurrency,
      items: [item],
    });
    const dedupPersisted = await rememberLoggedGa4PurchaseId(
      normalizedTransactionId,
      previousIds
    );
    return {
      ok: true,
      duplicate: false,
      dedupPersisted,
      transactionId: normalizedTransactionId,
    };
  } catch (error) {
    console.warn("Failed to log GA4 purchase:", error?.message || error);
    return { ok: false, reason: "log_failed", error };
  }
};

export const logCommercePurchase = (params = {}) => {
  const task = ga4PurchaseLogQueue
    .catch(() => {})
    .then(() => logCommercePurchaseInternal(params));
  ga4PurchaseLogQueue = task.catch(() => {});
  return task;
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
