import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
  Animated,
  Easing,
  Linking,
  PanResponder,
  Switch,
  LayoutAnimation,
  UIManager,
  StatusBar as RNStatusBar,
  AppState,
  Share,
  ActionSheetIOS,
  PixelRatio,
} from "react-native";
import Svg, { Circle as SvgCircle, Defs, Mask, Rect as SvgRect } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import * as NavigationBar from "expo-navigation-bar";
import * as FileSystem from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import Sentry, { initSentry } from "./sentry";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef as captureViewShotRef } from "react-native-view-shot";
import { Settings as FacebookSettings } from "react-native-fbsdk-next";
import {
  initAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsOptOut as setAnalyticsOptOutFlag,
  setUserProperties,
} from "./analytics";
import { SavingsProvider, useRealSavedAmount } from "./src/hooks/useRealSavedAmount";
import { useSavingsSimulation } from "./src/hooks/useSavingsSimulation";

let StoreReview = null;
try {
  // Optional native module – older builds might not include it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  StoreReview = require("expo-store-review");
} catch (error) {
  console.warn("StoreReview unavailable", error);
}
let Sharing = null;
try {
  // Optional: module might be missing on some builds (e.g. Expo Go).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Sharing = require("expo-sharing");
} catch (error) {
  console.warn("Sharing unavailable", error);
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

initSentry();
initAnalytics();
// Keep native splash visible until our custom LogoSplash is ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

const STORAGE_KEYS = {
  PURCHASES: "@almost_purchases",
  PROFILE: "@almost_profile",
  THEME: "@almost_theme",
  LANGUAGE: "@almost_language",
  ONBOARDING: "@almost_onboarded",
  TERMS_ACCEPTED: "@almost_terms_accepted",
  CATALOG: "@almost_catalog_overrides",
  TITLE_OVERRIDES: "@almost_title_overrides",
  EMOJI_OVERRIDES: "@almost_emoji_overrides",
  WISHES: "@almost_wishes",
  SAVED_TOTAL: "@almost_saved_total",
  DECLINES: "@almost_declines",
  PENDING: "@almost_pending",
  FREE_DAY: "@almost_free_day_stats",
  DECISION_STATS: "@almost_decision_stats",
  HISTORY: "@almost_history",
  REFUSE_STATS: "@almost_refuse_stats",
  REWARDS_CELEBRATED: "@almost_rewards_celebrated",
  HEALTH: "@almost_health_points",
  CLAIMED_REWARDS: "@almost_claimed_rewards",
  ANALYTICS_OPT_OUT: "@almost_analytics_opt_out",
  TEMPTATION_GOALS: "@almost_temptation_goals",
  TEMPTATION_INTERACTIONS: "@almost_temptation_interactions",
  CUSTOM_TEMPTATIONS: "@almost_custom_temptations",
  HIDDEN_TEMPTATIONS: "@almost_hidden_temptations",
  IMPULSE_TRACKER: "@almost_impulse_tracker",
  MOOD_STATE: "@almost_mood_state",
  CHALLENGES: "@almost_challenges",
  CUSTOM_REMINDER: "@almost_custom_reminder",
  SMART_REMINDERS: "@almost_smart_reminders",
  DAILY_NUDGES: "@almost_daily_nudges",
  TAMAGOTCHI: "@almost_tamagotchi_state",
  DAILY_SUMMARY: "@almost_daily_summary",
  POTENTIAL_PUSH_PROGRESS: "@almost_potential_push_progress",
  TUTORIAL: "@almost_tutorial_state",
  DAILY_CHALLENGE: "@almost_daily_challenge_state",
  TAB_HINTS: "@almost_tab_hints",
  FOCUS_TARGET: "@almost_focus_target",
  FOCUS_DIGEST: "@almost_focus_digest",
  CATEGORY_OVERRIDES: "@almost_category_overrides",
  DESCRIPTION_OVERRIDES: "@almost_description_overrides",
  FOCUS_DIGEST_PENDING: "@almost_focus_digest_pending",
  TAMAGOTCHI_SKIN: "@almost_tamagotchi_skin",
  TAMAGOTCHI_SKINS_UNLOCKED: "@almost_tamagotchi_skins_unlocked",
  SAVED_TOTAL_PEAK: "@almost_saved_total_peak",
  ACTIVE_GOAL: "@almost_active_goal",
  COIN_SLIDER_MAX: "@almost_coin_slider_max",
  FAB_TUTORIAL: "@almost_fab_tutorial",
  RATING_PROMPT: "@almost_rating_prompt",
  NORTH_STAR_METRIC: "@almost_north_star_metric",
};

const PURCHASE_GOAL = 20000;
const ANDROID_API_LEVEL =
  Platform.OS === "android"
    ? typeof Platform.Version === "string"
      ? parseInt(Platform.Version, 10) || 0
      : Number(Platform.Version) || 0
    : 0;
const SHOULD_USE_ANDROID_LEGACY_MEDIA_PICKER =
  Platform.OS === "android" && ANDROID_API_LEVEL > 0 && ANDROID_API_LEVEL < 33;
const CLASSIC_TAMAGOTCHI_ANIMATIONS = {
  idle: require("./assets/Cat_idle.gif"),
  curious: require("./assets/Cat_curious.gif"),
  follow: require("./assets/Cat_follows.gif"),
  speak: require("./assets/Cat_speaks.gif"),
  happy: require("./assets/Cat_happy.gif"),
  happyHeadshake: require("./assets/Cat_happy_headshake.gif"),
  sad: require("./assets/Cat_sad.gif"),
  ohno: require("./assets/Cat_oh_oh.gif"),
  cry: require("./assets/Cat_cry.gif"),
  waving: require("./assets/Cat_waving.gif"),
};
const GREEN_TAMAGOTCHI_ANIMATIONS = {
  idle: require("./assets/tamagotchi_skins/green/Cat_idle.gif"),
  curious: require("./assets/tamagotchi_skins/green/Cat_curious.gif"),
  follow: require("./assets/tamagotchi_skins/green/Cat_follows.gif"),
  speak: require("./assets/tamagotchi_skins/green/Cat_speaks.gif"),
  happy: require("./assets/tamagotchi_skins/green/Cat_happy.gif"),
  happyHeadshake: require("./assets/tamagotchi_skins/green/Cat_happy_headshake.gif"),
  sad: require("./assets/tamagotchi_skins/green/Cat_sad.gif"),
  ohno: require("./assets/tamagotchi_skins/green/Cat_oh_oh.gif"),
  cry: require("./assets/tamagotchi_skins/green/Cat_cry.gif"),
  waving: require("./assets/tamagotchi_skins/green/Cat_waving.gif"),
};
const TEAL_TAMAGOTCHI_ANIMATIONS = {
  idle: require("./assets/tamagotchi_skins/teal/Cat_idle.gif"),
  curious: require("./assets/tamagotchi_skins/teal/Cat_curious.gif"),
  follow: require("./assets/tamagotchi_skins/teal/Cat_follows.gif"),
  speak: require("./assets/tamagotchi_skins/teal/Cat_speaks.gif"),
  happy: require("./assets/tamagotchi_skins/teal/Cat_happy.gif"),
  happyHeadshake: require("./assets/tamagotchi_skins/teal/Cat_happy_headshake.gif"),
  sad: require("./assets/tamagotchi_skins/teal/Cat_sad.gif"),
  ohno: require("./assets/tamagotchi_skins/teal/Cat_oh_oh.gif"),
  cry: require("./assets/tamagotchi_skins/teal/Cat_cry.gif"),
  waving: require("./assets/tamagotchi_skins/teal/Cat_waving.gif"),
};
const PENDING_COUNTDOWN_FAST_MS = 1000;
const PENDING_COUNTDOWN_SLOW_MS = 60 * 1000;
const PENDING_COUNTDOWN_FAST_THRESHOLD_MS = 5 * 60 * 1000;

const stripEmojis = (text = "") =>
  text
    .replace(
      /(?:\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFF]|[\u2600-\u27BF])/g,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
const YELLOW_TAMAGOTCHI_ANIMATIONS = {
  idle: require("./assets/tamagotchi_skins/yellow/Cat_idle.gif"),
  curious: require("./assets/tamagotchi_skins/yellow/Cat_curious.gif"),
  follow: require("./assets/tamagotchi_skins/yellow/Cat_follows.gif"),
  speak: require("./assets/tamagotchi_skins/yellow/Cat_speaks.gif"),
  happy: require("./assets/tamagotchi_skins/yellow/Cat_happy.gif"),
  happyHeadshake: require("./assets/tamagotchi_skins/yellow/Cat_happy_headshake.gif"),
  sad: require("./assets/tamagotchi_skins/yellow/Cat_sad.gif"),
  ohno: require("./assets/tamagotchi_skins/yellow/Cat_oh_oh.gif"),
  cry: require("./assets/tamagotchi_skins/yellow/Cat_cry.gif"),
  waving: require("./assets/tamagotchi_skins/yellow/Cat_waving.gif"),
};
const PURPLE_TAMAGOTCHI_ANIMATIONS = {
  idle: require("./assets/tamagotchi_skins/purple/Cat_idle.gif"),
  curious: require("./assets/tamagotchi_skins/purple/Cat_curious.gif"),
  follow: require("./assets/tamagotchi_skins/purple/Cat_follows.gif"),
  speak: require("./assets/tamagotchi_skins/purple/Cat_speaks.gif"),
  happy: require("./assets/tamagotchi_skins/purple/Cat_happy.gif"),
  happyHeadshake: require("./assets/tamagotchi_skins/purple/Cat_happy_headshake.gif"),
  sad: require("./assets/tamagotchi_skins/purple/Cat_sad.gif"),
  ohno: require("./assets/tamagotchi_skins/purple/Cat_oh_oh.gif"),
  cry: require("./assets/tamagotchi_skins/purple/Cat_cry.gif"),
  waving: require("./assets/tamagotchi_skins/purple/Cat_waving.gif"),
};
const TAMAGOTCHI_SKIN_OPTIONS = [
  {
    id: "classic",
    label: { ru: "Классический", en: "Classic" },
    description: {
      ru: "Знакомый образ Алми",
      en: "The original Almi look",
    },
    preview: require("./assets/Cat_mascot.png"),
    avatar: require("./assets/Cat_mascot.png"),
    animations: CLASSIC_TAMAGOTCHI_ANIMATIONS,
  },
  {
    id: "green",
    label: { ru: "Лесной", en: "Forest" },
    description: {
      ru: "Мятный исследователь",
      en: "Mint explorer",
    },
    preview: require("./assets/tamagotchi_skins/green/Cat_idle.gif"),
    avatar: require("./assets/tamagotchi_skins/green/Cat_idle.gif"),
    animations: GREEN_TAMAGOTCHI_ANIMATIONS,
  },
  {
    id: "teal",
    label: { ru: "Лазурный", en: "Teal breeze" },
    description: {
      ru: "Свежий морской оттенок",
      en: "Ocean breeze palette",
    },
    preview: require("./assets/tamagotchi_skins/teal/Cat_idle.gif"),
    avatar: require("./assets/tamagotchi_skins/teal/Cat_idle.gif"),
    animations: TEAL_TAMAGOTCHI_ANIMATIONS,
  },
  {
    id: "yellow",
    label: { ru: "Солнечный", en: "Sunny" },
    description: {
      ru: "Тёплый и энергичный",
      en: "Bright and energising",
    },
    preview: require("./assets/tamagotchi_skins/yellow/Cat_idle.gif"),
    avatar: require("./assets/tamagotchi_skins/yellow/Cat_idle.gif"),
    animations: YELLOW_TAMAGOTCHI_ANIMATIONS,
  },
  {
    id: "purple",
    label: { ru: "Сиреневый", en: "Lavender" },
    description: {
      ru: "Немного загадочный",
      en: "A dreamy violet vibe",
    },
    preview: require("./assets/tamagotchi_skins/purple/Cat_idle.gif"),
    avatar: require("./assets/tamagotchi_skins/purple/Cat_idle.gif"),
    animations: PURPLE_TAMAGOTCHI_ANIMATIONS,
  },
];
const TAMAGOTCHI_SKINS = TAMAGOTCHI_SKIN_OPTIONS.reduce((acc, skin) => {
  acc[skin.id] = skin;
  return acc;
}, {});
const DEFAULT_TAMAGOTCHI_SKIN = "classic";
const SUPPORT_EMAIL = "almostappsup@gmail.com";
const FACEBOOK_APP_ID = "1653035139013896";
const HEALTH_COIN_TIERS = [
  { id: "green", value: 1, asset: require("./assets/coins/Coin_green.png") },
  { id: "blue", value: 10, asset: require("./assets/coins/Coin_blue.png") },
  { id: "orange", value: 100, asset: require("./assets/coins/Coin_orange.png") },
  { id: "red", value: 1000, asset: require("./assets/coins/Coin_red.png") },
  { id: "pink", value: 10000, asset: require("./assets/coins/Coin_pink.png") },
];
const BLUE_HEALTH_COIN_TIER =
  HEALTH_COIN_TIERS.find((tier) => tier.id === "blue") || HEALTH_COIN_TIERS[1];
const BLUE_HEALTH_COIN_ASSET = BLUE_HEALTH_COIN_TIER?.asset || null;
const BLUE_HEALTH_COIN_VALUE = BLUE_HEALTH_COIN_TIER?.value || 10;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const CTA_LETTER_SPACING = 0.4;
const FONT_SCALE = typeof PixelRatio.getFontScale === "function" ? PixelRatio.getFontScale() : 1;
const IS_EXTRA_COMPACT_DEVICE = SCREEN_WIDTH <= 375 || (SCREEN_WIDTH <= 390 && FONT_SCALE > 1.1);
const TYPOGRAPHY_SCALE = IS_EXTRA_COMPACT_DEVICE ? 0.92 : 1;
const scaleFontSize = (value) =>
  typeof value === "number" ? Number((value * TYPOGRAPHY_SCALE).toFixed(2)) : value;
const scaleLetterSpacing = (value) =>
  typeof value === "number" ? Number((value * TYPOGRAPHY_SCALE).toFixed(3)) : value;
const scaleTypographyOverrides = (overrides = {}) => {
  if (!overrides || typeof overrides !== "object") return overrides;
  let next = overrides;
  const applyScaled = (key, scaleFn) => {
    if (typeof overrides[key] === "number") {
      if (next === overrides) next = { ...overrides };
      next[key] = scaleFn(overrides[key]);
    }
  };
  applyScaled("fontSize", scaleFontSize);
  applyScaled("lineHeight", scaleFontSize);
  applyScaled("letterSpacing", scaleLetterSpacing);
  return next;
};
// Limit how far dialog-style cards can move when the keyboard is visible.
const MAX_MODAL_KEYBOARD_OFFSET = Math.min(SCREEN_HEIGHT * 0.45, 360);
const OVERLAY_CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 40, 440);
const IS_COMPACT_DEVICE = SCREEN_WIDTH <= 380;
const PROFILE_SUBTITLE_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 12 : 13);
const PROFILE_SUBTITLE_LINE_HEIGHT = scaleFontSize(IS_COMPACT_DEVICE ? 16 : 18);
const PROFILE_STAT_LABEL_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 8.5 : 10);
const PROFILE_STAT_LETTER_SPACING = scaleLetterSpacing(
  IS_COMPACT_DEVICE ? CTA_LETTER_SPACING * 0.6 : CTA_LETTER_SPACING * 0.8
);
const CHALLENGE_TITLE_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 15 : 16);
const CHALLENGE_DESC_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 13 : 14);
const CHALLENGE_LINE_HEIGHT = scaleFontSize(IS_COMPACT_DEVICE ? 18 : 20);
const CHALLENGE_META_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 11.5 : 12);

const THEMES = {
  light: {
    background: "#F6F7FB",
    card: "#FFFFFF",
    text: "#1C1A2A",
    muted: "#7A7F92",
    border: "#E5E6ED",
    primary: "#111",
  },
  dark: {
    background: "#05070D",
    card: "#161B2A",
    text: "#F7F9FF",
    muted: "#A5B1CC",
    border: "#2E374F",
    primary: "#FFC857",
  },
};

const INTER_FONTS = {
  light: "Inter_300Light",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
  black: "Inter_900Black",
};

const SMART_REMINDER_DELAY_MS = 23 * 60 * 60 * 1000;
const SMART_REMINDER_MIN_INTERVAL_MS = 60 * 60 * 1000;
const SMART_REMINDER_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const SMART_REMINDER_LIMIT = 40;
const DAILY_NUDGE_REMINDERS = [
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
];
const DAILY_NUDGE_TITLE_KEYS = [
  "dailyNudgeMorningTitle",
  "dailyNudgeDayTitle",
  "dailyNudgeAfternoonTitle",
  "dailyNudgeEveningTitle",
];
const DAILY_NUDGE_BODY_KEYS = [
  "dailyNudgeMorningBody",
  "dailyNudgeDayBody",
  "dailyNudgeAfternoonBody",
  "dailyNudgeEveningBody",
];
const DAILY_NUDGE_LANGUAGES = ["ru", "en"];
const DAILY_NUDGE_NOTIFICATION_TAG = "daily_nudge";
const ANDROID_DAILY_NUDGE_CHANNEL_ID = "daily-nudges";
const DAILY_CHALLENGE_MIN_SPEND_EVENTS = 2;
const DAILY_CHALLENGE_REWARD_MULTIPLIER = 2;

const DAILY_CHALLENGE_STATUS = {
  IDLE: "idle",
  OFFER: "offer",
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
};
const FOCUS_VICTORY_THRESHOLD = 3;
const FOCUS_VICTORY_REWARD = 3;
const FOCUS_LOSS_THRESHOLD = 3;
const CHALLENGE_REWARD_SCALE = 0.5;
const getScaledChallengeReward = (value = 0) =>
  Math.max(1, Math.round(Math.max(0, value) * CHALLENGE_REWARD_SCALE));
const PUSH_NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

const buildTemptationPressureMap = (events = []) => {
  const map = {};
  (Array.isArray(events) ? events : []).forEach((event) => {
    if (!event?.templateId) return;
    const entry = map[event.templateId] || {
      spend: 0,
      save: 0,
      lastTimestamp: 0,
    };
    if (event.action === "spend") {
      entry.spend += 1;
      if (event.timestamp && event.timestamp > entry.lastTimestamp) {
        entry.lastTimestamp = event.timestamp;
      }
    } else if (event.action === "save") {
      entry.save += 1;
    }
    map[event.templateId] = entry;
  });
  return map;
};

const resolveDailyChallengeTemplateId = (
  pressureMap = {},
  minSpendEvents = DAILY_CHALLENGE_MIN_SPEND_EVENTS
) => {
  const ranked = Object.entries(pressureMap || {})
    .map(([templateId, stats]) => ({
      templateId,
      spend: stats?.spend || 0,
      save: stats?.save || 0,
      lastTimestamp: stats?.lastTimestamp || 0,
      score: (stats?.spend || 0) * 2 - (stats?.save || 0),
    }))
    .filter((entry) => entry.spend >= minSpendEvents && entry.spend > entry.save)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.spend !== a.spend) return b.spend - a.spend;
      return b.lastTimestamp - a.lastTimestamp;
    });
  if (ranked.length > 0) {
    return ranked[0].templateId;
  }
  const desc = (typeof descriptionOverride === "string" && descriptionOverride.trim().length
    ? descriptionOverride
    : null) || desc || "";
  return null;
};

const createInitialDailyChallengeState = () => ({
  id: null,
  dateKey: null,
  templateId: null,
  templateTitle: "",
  emoji: "✨",
  priceUSD: 0,
  rewardBonus: 0,
  baseReward: 0,
  templateLabel: "",
  target: 1,
  progress: 0,
  status: DAILY_CHALLENGE_STATUS.IDLE,
  acceptedAt: null,
  completedAt: null,
  failedAt: null,
  offerDismissed: false,
  rewardGranted: false,
});
const buildDailyNudgeTrigger = (hour, minute) => {
  if (Platform.OS === "android") {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }
  return { hour, minute, second: 0, repeats: true };
};


const normalizeSmartReminderEntries = (list) => {
  const now = Date.now();
  const seen = new Set();
  const normalized = [];
  (Array.isArray(list) ? list : []).forEach((entry) => {
    if (!entry) return;
    const timestamp = Number(entry.timestamp);
    if (!Number.isFinite(timestamp)) return;
    if (now - timestamp > SMART_REMINDER_RETENTION_MS) return;
    const eventId = entry.eventId || entry.id;
    if (!eventId || seen.has(eventId)) return;
    seen.add(eventId);
    normalized.push({
      id: entry.id || `smart-${eventId}`,
      eventId,
      kind: typeof entry.kind === "string" ? entry.kind : "refuse_spend",
      title: typeof entry.title === "string" ? entry.title : "",
      timestamp,
      scheduledAt: Number(entry.scheduledAt) || timestamp + SMART_REMINDER_DELAY_MS,
      notificationId: entry.notificationId || null,
    });
  });
  normalized.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return normalized.slice(0, SMART_REMINDER_LIMIT);
};

const resolveInterFontFamily = (fontWeight) => {
  if (typeof fontWeight === "string") {
    if (fontWeight.toLowerCase() === "bold") return INTER_FONTS.bold;
    if (fontWeight.toLowerCase() === "normal") return INTER_FONTS.regular;
  }
  const numericWeight = Number(fontWeight) || 0;
  if (numericWeight >= 900) return INTER_FONTS.black;
  if (numericWeight >= 800) return INTER_FONTS.extraBold;
  if (numericWeight >= 700) return INTER_FONTS.bold;
  if (numericWeight >= 600) return INTER_FONTS.semiBold;
  if (numericWeight >= 500) return INTER_FONTS.medium;
  if (numericWeight >= 300) return INTER_FONTS.light;
  return INTER_FONTS.regular;
};

const withInterTypography = (Component) => {
  if (!Component?.render) return;
  const defaultRender = Component.render;
  Component.render = function render(props = {}, ref) {
    const styleProp = props.style;
    const baseStyles = Array.isArray(styleProp)
      ? styleProp.filter(Boolean)
      : styleProp
        ? [styleProp]
        : [];
    const flattened = StyleSheet.flatten(baseStyles) || {};
    if (flattened.fontFamily) {
      return defaultRender.apply(this, [props, ref]);
    }
    const resolvedFontFamily = resolveInterFontFamily(flattened.fontWeight);
    const fontStyle = { fontFamily: resolvedFontFamily };
    const nextStyle = baseStyles.length ? [...baseStyles, fontStyle] : fontStyle;
    return defaultRender.apply(this, [{ ...props, style: nextStyle }, ref]);
  };
};

const ensureGlobalInterTypography = (() => {
  let applied = false;
  return () => {
    if (applied) return;
    [Text, TextInput, Animated.Text].forEach(withInterTypography);
    applied = true;
  };
})();

const APP_TUTORIAL_STEPS = [
  {
    id: "feed",
    icon: "🧠",
    titleKey: "tutorialFeedTitle",
    descriptionKey: "tutorialFeedDesc",
    tabs: ["feed"],
  },
  {
    id: "goals",
    icon: "🎯",
    titleKey: "tutorialGoalsTitle",
    descriptionKey: "tutorialGoalsDesc",
    tabs: ["cart"],
  },
  {
    id: "thinking",
    icon: "🧊",
    titleKey: "tutorialThinkingTitle",
    descriptionKey: "tutorialThinkingDesc",
    tabs: ["pending"],
  },
  {
    id: "rewards",
    icon: "🏆",
    titleKey: "tutorialRewardsTitle",
    descriptionKey: "tutorialRewardsDesc",
    tabs: ["purchases"],
  },
  {
    id: "profile",
    icon: "⚙️",
    titleKey: "tutorialProfileTitle",
    descriptionKey: "tutorialProfileDesc",
    tabs: ["profile"],
  },
];
const FAB_TUTORIAL_STATUS = {
  DONE: "done",
  PENDING: "pending",
  SHOWING: "showing",
};
const DEFAULT_TAB_HINTS_STATE = {
  feed: false,
  cart: false,
  pending: false,
  purchases: false,
  profile: false,
};
const CARD_TEXTURE_ACCENTS = ["#8AB9FF", "#FFA4C0", "#8CE7CF", "#FFD48A", "#BBA4FF", "#7FD8FF"];
const TAB_HINT_CONFIG = {
  feed: { titleKey: "tabHintFeedTitle", bodyKey: "tabHintFeedBody" },
  cart: { titleKey: "tabHintCartTitle", bodyKey: "tabHintCartBody" },
  pending: { titleKey: "tabHintPendingTitle", bodyKey: "tabHintPendingBody" },
  purchases: { titleKey: "tabHintPurchasesTitle", bodyKey: "tabHintPurchasesBody" },
  profile: { titleKey: "tabHintProfileTitle", bodyKey: "tabHintProfileBody" },
};
const TAB_BAR_BASE_HEIGHT = 64;
const FAB_BUTTON_SIZE = 64;
const FAB_CONTAINER_BOTTOM = 96;
const FAB_TUTORIAL_MIN_SESSIONS = 3;
const FAB_TUTORIAL_HALO_SIZE = 128;
const FAB_TUTORIAL_CARD_SPACING = 140;
const FAB_TUTORIAL_HALO_INSET = (FAB_TUTORIAL_HALO_SIZE - FAB_BUTTON_SIZE) / 2;

const CELEBRATION_BASE_RU = [
  "Хоп! Ещё одна осознанная экономия",
  "Меньше лишних покупок, больше плана",
  "Кошелёк вздохнул спокойно",
];

const CELEBRATION_MESSAGES = {
  ru: {
    female: [...CELEBRATION_BASE_RU, "Ты снова выбрала умный своп вместо растрат"],
    male: [...CELEBRATION_BASE_RU, "Ты снова выбрал умный своп вместо растрат"],
    none: [...CELEBRATION_BASE_RU, "Снова выбран умный своп вместо растрат"],
    level: "Уровень {{level}}! Экономия становится привычкой 💎",
  },
  en: {
    default: [
      "Boom! Another mindful deal",
      "Less impulse, more plan",
      "Wallet just sighed with relief",
      "Smart deal locked – savings are safe",
    ],
    level: "Level {{level}}! Savings armor upgraded ✨",
  },
};

const getCelebrationMessages = (language, gender = "none") => {
  const entry = CELEBRATION_MESSAGES[language];
  if (!entry) return [];
  if (Array.isArray(entry)) return entry;
  if (Array.isArray(entry.default)) return entry.default;
  const variant =
    (gender && entry[gender]) ||
    entry.none ||
    entry.default ||
    Object.values(entry)[0];
  return Array.isArray(variant) ? variant : [];
};

const RAIN_DROPS = 20;
const CURRENCY_RATES = { USD: 1, EUR: 0.92, RUB: 92 };
const CURRENCY_REWARD_STEPS = { USD: 5, EUR: 5, RUB: 500 };
const DEFAULT_COIN_SLIDER_MAX_USD = 50;
const COIN_SLIDER_SIZE = 220;
const COIN_SLIDER_VALUE_DEADBAND = 0.01;
const COIN_SLIDER_STATE_MIN_INTERVAL = 16;
const COIN_SLIDER_HAPTIC_COOLDOWN_MS = 80;
const COIN_FILL_MIN_HEIGHT = 12;
const CURRENCY_SIGNS = { USD: "$", EUR: "€", RUB: "₽" };
const CURRENCY_FINE_STEPS = { USD: 0.05, EUR: 0.05, RUB: 5 };
const CURRENCY_DISPLAY_PRECISION = { USD: 0, EUR: 0 };
const ECONOMY_RULES = {
  saveRewardStepUSD: 5,
  minSaveReward: 1,
  maxSaveReward: 24,
  baseAchievementReward: 60,
  freeDayRescueCost: 60,
  tamagotchiFeedCost: 1,
  tamagotchiFeedBoost: 24,
  tamagotchiPartyCost: 20,
};
const DEFAULT_REMOTE_IMAGE =
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80";
const REMINDER_DAYS = 14;
const DAY_MS = 1000 * 60 * 60 * 24;
const REMINDER_MS = REMINDER_DAYS * DAY_MS;
const SAVE_SPAM_WINDOW_MS = 1000 * 60 * 5;
const SAVE_SPAM_ITEM_LIMIT = 3;
const SAVE_SPAM_GLOBAL_LIMIT = 5;
const NORTH_STAR_SAVE_THRESHOLD = 2;
const NORTH_STAR_WINDOW_MS = DAY_MS;
const SAVE_ACTION_COLOR = "#2EB873";
const SPEND_ACTION_COLOR = "#D94862";
// Android darkens translucent backgrounds when elevation is applied, so use opaque fallbacks there.
const COIN_ENTRY_SAVE_BACKGROUND =
  Platform.OS === "android" ? "#E6F6EE" : "rgba(46,184,115,0.12)";
const COIN_ENTRY_SPEND_BACKGROUND =
  Platform.OS === "android" ? "#FAE9EC" : "rgba(217,72,98,0.12)";
const GOAL_HIGHLIGHT_COLOR = "#F6C16B";
const GOAL_SWIPE_THRESHOLD = 80;
const DELETE_SWIPE_THRESHOLD = 130;
const CHALLENGE_SWIPE_ACTION_WIDTH = 120;
const BASELINE_SAMPLE_USD = 120;
const CUSTOM_SPEND_SAMPLE_USD = 7.5;
const RATING_PROMPT_DELAY_DAYS = 2; // show on the third calendar day (after two full days)
const ANDROID_REVIEW_URL = "market://details?id=com.sasarei.almostclean";
const ANDROID_REVIEW_WEB_URL = "https://play.google.com/store/apps/details?id=com.sasarei.almostclean";
const LEVEL_SHARE_CAT = require("./assets/Cat_mascot.png");
const LEVEL_SHARE_LOGO = require("./assets/Almost_icon.png");
const LEVEL_SHARE_ACCENT = "#FFB347";
const LEVEL_SHARE_BG = "#050C1A";
const LEVEL_SHARE_MUTED = "rgba(255,255,255,0.65)";
const createInitialRatingPromptState = () => ({
  firstOpenAt: new Date().toISOString(),
  completed: false,
  lastShownAt: null,
  lastAction: null,
  respondedAt: null,
});

const getDayKey = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isSameDay = (tsA, tsB = Date.now()) => {
  if (!tsA) return false;
  return getDayKey(tsA) === getDayKey(tsB);
};
const DEFAULT_TEMPTATION_EMOJI = "✨";
const DEFAULT_GOAL_EMOJI = "🎯";
const MAX_HISTORY_EVENTS = 200;
const HISTORY_RETENTION_MS = DAY_MS * 31;
const HISTORY_VIEWPORT_ROWS = 5;
const HISTORY_ITEM_HEIGHT = 60;
const HISTORY_VIEWPORT_HEIGHT = HISTORY_VIEWPORT_ROWS * HISTORY_ITEM_HEIGHT;
const HISTORY_SAVED_GAIN_EVENTS = new Set(["refuse_spend", "pending_to_decline"]);
const HISTORY_SAVED_LOSS_EVENTS = new Set(["spend"]);
const getHealthCoinTierForAmount = (amount = 0) => {
  const normalized = Math.max(0, Math.floor(amount));
  for (let i = HEALTH_COIN_TIERS.length - 1; i >= 0; i -= 1) {
    const tier = HEALTH_COIN_TIERS[i];
    if (normalized >= tier.value) {
      return tier;
    }
  }
  return HEALTH_COIN_TIERS[0];
};
const getHealthCoinBreakdown = (amount = 0) => {
  let remaining = Math.max(0, Math.floor(amount));
  const breakdown = {};
  for (let i = HEALTH_COIN_TIERS.length - 1; i >= 0; i -= 1) {
    const tier = HEALTH_COIN_TIERS[i];
    const count = Math.floor(remaining / tier.value);
    breakdown[tier.id] = count;
    remaining -= count * tier.value;
  }
  HEALTH_COIN_TIERS.forEach((tier) => {
    if (!breakdown[tier.id]) breakdown[tier.id] = 0;
  });
  return breakdown;
};
const buildHealthCoinEntries = (amount = 0) => {
  const breakdown = getHealthCoinBreakdown(amount);
  return HEALTH_COIN_TIERS.slice().reverse().map((tier) => ({
    ...tier,
    count: breakdown[tier.id] || 0,
  }));
};
const getLocalRewardStep = (currencyCode = activeCurrency) => {
  const code = typeof currencyCode === "string" && currencyCode.trim() ? currencyCode : activeCurrency;
  if (code && CURRENCY_REWARD_STEPS[code]) {
    return CURRENCY_REWARD_STEPS[code];
  }
  const rate = code ? CURRENCY_RATES[code] : null;
  if (rate && ECONOMY_RULES.saveRewardStepUSD > 0) {
    return ECONOMY_RULES.saveRewardStepUSD * rate;
  }
  return ECONOMY_RULES.saveRewardStepUSD;
};
const computeRefuseCoinReward = (amountUSD = 0, currencyCode = activeCurrency) => {
  if (!amountUSD || amountUSD <= 0) return 0;
  const localAmount = convertToCurrency(amountUSD, currencyCode);
  const localStep = getLocalRewardStep(currencyCode);
  if (!localStep || localStep <= 0) return 0;
  const normalized = Math.ceil(localAmount / localStep);
  if (normalized <= 0) return 0;
  const adjusted = Math.max(ECONOMY_RULES.minSaveReward, normalized);
  return Math.min(ECONOMY_RULES.maxSaveReward, adjusted);
};

const computeDailyChallengeBonus = (amountUSD = 0, currencyCode = activeCurrency) => {
  const baseReward = computeRefuseCoinReward(amountUSD, currencyCode);
  const multiplied = Math.round(baseReward * DAILY_CHALLENGE_REWARD_MULTIPLIER);
  if (multiplied > 0) {
    return Math.max(multiplied - baseReward, baseReward || 1);
  }
  return Math.max(1, baseReward || ECONOMY_RULES.minSaveReward);
};

const computeLevelRewardCoins = (level) => {
  if (level <= 1) return 0;
  if (level <= 9) return Math.max(1, level - 1);
  return level;
};

const sumLevelRewardCoins = (level, levelsEarned = 1) => {
  if (level <= 1 || levelsEarned <= 0) return 0;
  const start = Math.max(2, level - levelsEarned + 1);
  let total = 0;
  for (let current = start; current <= level; current += 1) {
    total += computeLevelRewardCoins(current);
  }
  return total;
};
const HEALTH_COIN_LABELS = {
  ru: {
    pink: "розовых",
    red: "красных",
    orange: "оранжевых",
    blue: "синих",
    green: "зелёных",
  },
  en: {
    pink: "pink",
    red: "red",
    orange: "orange",
    blue: "blue",
    green: "green",
  },
};
const formatHealthRewardLabel = (amount = 0, language = "ru") => {
  const entries = buildHealthCoinEntries(amount);
  const labels = HEALTH_COIN_LABELS[language] || HEALTH_COIN_LABELS.en;
  const parts = entries
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${labels[entry.id] || entry.id}`);
  if (!parts.length) {
    return language === "ru" ? "0 монет" : "0 coins";
  }
  return parts.join(" · ");
};

const HealthRewardTokens = ({
  amount = 0,
  color = "#fff",
  iconSize = 18,
  maxItems = 3,
  zeroLabel = "0",
  textSize = 12,
  rowStyle = null,
  countStyle = null,
}) => {
  const entries = useMemo(
    () => buildHealthCoinEntries(amount).filter((entry) => entry.count > 0),
    [amount]
  );
  const visible = entries.slice(0, maxItems);
  const rowStyles = rowStyle ? [styles.healthRewardTokenRow, rowStyle] : [styles.healthRewardTokenRow];
  const countStyles = [
    styles.healthRewardTokenCount,
    { color, fontSize: textSize },
    ...(countStyle ? [countStyle] : []),
  ];
  if (!visible.length) {
    return (
      <View style={rowStyles}>
        <Text style={countStyles}>{zeroLabel}</Text>
      </View>
    );
  }
  return (
    <View style={rowStyles}>
      {visible.map((entry) => (
        <View key={`${entry.id}-${entry.count}`} style={styles.healthRewardToken}>
          <Image
            source={entry.asset}
            style={[styles.healthRewardTokenIcon, { width: iconSize, height: iconSize }]}
          />
          <Text style={countStyles}>{`×${entry.count}`}</Text>
        </View>
      ))}
    </View>
  );
};
const INITIAL_DECISION_STATS = {
  resolvedToWishes: 0,
  resolvedToDeclines: 0,
};

const MOOD_IDS = {
  NEUTRAL: "neutral",
  FOCUSED: "focused",
  IMPULSIVE: "impulsive",
  DOUBTER: "doubter",
  TIRED: "tired",
  DREAMER: "dreamer",
};
const MOOD_MAX_EVENTS = 24;
const MOOD_ACTION_WINDOW_MS = 1000 * 60 * 60 * 48;
const MOOD_EVENT_THRESHOLD = 3;
const MOOD_PENDING_THRESHOLD = 4;
const MOOD_DREAM_WISH_THRESHOLD = 3;
const MOOD_INACTIVITY_THRESHOLD_MS = 1000 * 60 * 60 * 72;
const createMoodStateForToday = (overrides = {}) => ({
  current: MOOD_IDS.NEUTRAL,
  events: [],
  lastInteractionAt: null,
  lastVisitAt: null,
  pendingSnapshot: 0,
  dayKey: getDayKey(Date.now()),
  ...overrides,
});

const INITIAL_MOOD_STATE = createMoodStateForToday();

const MOOD_PRESETS = {
  [MOOD_IDS.NEUTRAL]: {
    label: { ru: "Режим баланса", en: "Balanced mode" },
    hero: {
      ru: "Баланс держится, просто продолжай отмечать победы.",
      en: "Balance holds steady-keep logging the wins.",
    },
    heroComplete: {
      ru: "Режим спокойствия фиксирует каждое достижение.",
      en: "Calm mode celebrates each milestone.",
    },
    motivation: {
      ru: "Небольшой шаг сегодня спасает завтрашний план.",
      en: "A tiny step today protects tomorrow’s plan.",
    },
    saveOverlay: {
      ru: "Баланс усилен ещё одним отказом.",
      en: "Balance reinforced with another skip.",
    },
    impulseOverlay: {
      ru: "Сохраняем спокойствие даже при штормах.",
      en: "Staying calm even when urges spike.",
    },
    pushPendingTitle: {
      ru: "Баланс проверяет хотелку",
      en: "Balance check-in",
    },
    pushPendingBody: {
      ru: "«{{title}}» ждет решения. Подумай, стоит ли держать курс.",
      en: "“{{title}}” is waiting. Decide if it fits the plan.",
    },
    pushImpulseTitle: {
      ru: "Баланс в деле",
      en: "Balance alert",
    },
    pushImpulseBody: {
      ru: "В это время хочется {{temptation}}, но баланс предлагает спасти {{amount}}.",
      en: "This hour usually tempts {{temptation}}, but balance can bank {{amount}}.",
    },
  },
  [MOOD_IDS.FOCUSED]: {
    label: { ru: "Волевой режим", en: "Focused mode" },
    hero: {
      ru: "Волевой режим активен - искушения сами пугаются.",
      en: "Focused mode is on-temptations get nervous.",
    },
    heroComplete: {
      ru: "Волевой режим и цель сделаны! Можно планировать больше.",
      en: "Focused mode + goal complete! Time to plan even bigger.",
    },
    motivation: {
      ru: "Режим силы: собери ещё одно подтверждение дисциплины.",
      en: "Power mode: lock in one more proof of discipline.",
    },
    saveOverlay: {
      ru: "Волевое решение сохранено. Так держать!",
      en: "Willpower locked in. Keep it going!",
    },
    impulseOverlay: {
      ru: "Волевой режим умеет тормозить импульсы.",
      en: "Focused mode crushes impulse spikes.",
    },
    pushPendingTitle: {
      ru: "Волевой пинг",
      en: "Focused ping",
    },
    pushPendingBody: {
      ru: "Ты в волевом режиме - реши, идем ли дальше с «{{title}}».",
      en: "Focused mode speaking-decide what to do with “{{title}}”.",
    },
    pushImpulseTitle: {
      ru: "Волевой сигнал",
      en: "Focused alert",
    },
    pushImpulseBody: {
      ru: "Сейчас чаще хочется {{temptation}}, но волевой режим может отправить {{amount}} в копилку.",
      en: "This hour begs for {{temptation}}, but focused mode can stash {{amount}}.",
    },
  },
  [MOOD_IDS.IMPULSIVE]: {
    label: { ru: "Импульсивный режим", en: "Impulse mode" },
    hero: {
      ru: "Импульсивный режим включён - стоит поймать пару побед.",
      en: "Impulse mode detected-time to capture a few wins.",
    },
    heroComplete: {
      ru: "Импульсы были сильными, но цель всё равно закрыта.",
      en: "Impulses were strong, yet you still hit the target.",
    },
    motivation: {
      ru: "Маленький отказ прямо сейчас вернёт контроль.",
      en: "One tiny skip right now resets control.",
    },
    saveOverlay: {
      ru: "Импульсы медлят - ты перехватил управление.",
      en: "Impulse paused-you took the controls back.",
    },
    impulseOverlay: {
      ru: "Поймай ещё один момент и переведи его в копилку.",
      en: "Catch the next urge and reroute it into savings.",
    },
    pushPendingTitle: {
      ru: "Импульс проверяет «{{title}}»",
      en: "Impulse check-in",
    },
    pushPendingBody: {
      ru: "Импульсивный режим просит ясности: оставляем «{{title}}» или копим?",
      en: "Impulse mode needs clarity: keep “{{title}}” or bank it?",
    },
    pushImpulseTitle: {
      ru: "Импульс на подходе",
      en: "Impulse incoming",
    },
    pushImpulseBody: {
      ru: "Чаще всего сейчас берешь {{temptation}}. Попробуй отправить {{amount}} в копилку.",
      en: "{{temptation}} usually wins now. Try sending {{amount}} to savings instead.",
    },
  },
  [MOOD_IDS.DOUBTER]: {
    label: { ru: "Режим сомнений", en: "Doubter mode" },
    hero: {
      ru: "Режим сомнений активен - выбери хотя бы одно уверенное решение.",
      en: "Doubter mode is on-choose one confident move.",
    },
    heroComplete: {
      ru: "Сомневаешься, но цели достигаются. Значит, курс верный.",
      en: "Doubts aside, goals still get reached. The course works.",
    },
    motivation: {
      ru: "Выбери одну мысль «копить» и закрепи уверенность.",
      en: "Pick one “save it” thought and lock it in.",
    },
    saveOverlay: {
      ru: "Это решение снимает сомнения.",
      en: "That choice dissolves doubts.",
    },
    impulseOverlay: {
      ru: "Сомнения лучше переводить в цифры, а не покупки.",
      en: "Turn doubts into numbers, not purchases.",
    },
    pushPendingTitle: {
      ru: "Сомнения просят ответа",
      en: "Doubter check",
    },
    pushPendingBody: {
      ru: "«{{title}}» висит в сомнениях. Реши, куда его направить.",
      en: "“{{title}}” is stuck in limbo. Decide where it belongs.",
    },
    pushImpulseTitle: {
      ru: "Сомневаешься?",
      en: "Feeling unsure?",
    },
    pushImpulseBody: {
      ru: "Когда тянет к {{temptation}}, попробуй направить {{amount}} в копилку - уверенность вернётся.",
      en: "When {{temptation}} calls, redirect {{amount}} to savings to regain certainty.",
    },
  },
  [MOOD_IDS.TIRED]: {
    label: { ru: "Режим отдыха", en: "Recharge mode" },
    hero: {
      ru: "Давно не виделись - режим отдыха напоминает о мягком старте.",
      en: "Long time no see-recharge mode suggests a gentle restart.",
    },
    heroComplete: {
      ru: "Паузы тоже часть пути. Возвращайся, когда готов.",
      en: "Breaks are part of the path. Return when ready.",
    },
    motivation: {
      ru: "Начни с одного отказа сегодня и посмотри, что изменится.",
      en: "Start with one skip today and see the shift.",
    },
    saveOverlay: {
      ru: "Вот и мягкий рестарт. Так держать.",
      en: "There’s the gentle restart. Nice.",
    },
    impulseOverlay: {
      ru: "Отдохнувшая версия тебя умеет говорить «потом».",
      en: "Rested-you can say “later” with ease.",
    },
    pushPendingTitle: {
      ru: "Вернись к «{{title}}»",
      en: "Come back to “{{title}}”",
    },
    pushPendingBody: {
      ru: "Режим отдыха не вечный. Реши, что делать с «{{title}}».",
      en: "Recharge mode isn’t forever. Decide what to do with “{{title}}”.",
    },
    pushImpulseTitle: {
      ru: "Мягкий сигнал",
      en: "Gentle alert",
    },
    pushImpulseBody: {
      ru: "Паузы были длинными, но даже сейчас можно сберечь {{amount}} от {{temptation}}.",
      en: "Breaks ran long, yet this minute can still save {{amount}} from {{temptation}}.",
    },
  },
  [MOOD_IDS.DREAMER]: {
    label: { ru: "Мечтательный режим", en: "Dreamer mode" },
    hero: {
      ru: "Мечтательный режим активен - в «думаем» уже целая галерея.",
      en: "Dreamer mode is on-your Thinking shelf is a gallery.",
    },
    heroComplete: {
      ru: "Даже мечтатели доводят планы до конца.",
      en: "Even dreamers finish their plans.",
    },
    motivation: {
      ru: "Выбери одну мечту и нажми «копить» сегодня.",
      en: "Pick one dream and tap “save it” today.",
    },
    saveOverlay: {
      ru: "Мечта зафиксирована реальным действием.",
      en: "Dream locked in with a real action.",
    },
    impulseOverlay: {
      ru: "Пусть мечты копятся в цифрах, а не расходах.",
      en: "Let dreams live in numbers, not expenses.",
    },
    pushPendingTitle: {
      ru: "Мечты ждут старта",
      en: "Dreams are waiting",
    },
    pushPendingBody: {
      ru: "В «думаем» уже очередь. Реши, что делать с «{{title}}».",
      en: "Thinking is crowded. Decide what to do with “{{title}}”.",
    },
    pushImpulseTitle: {
      ru: "Мечтательный сигнал",
      en: "Dreamer alert",
    },
    pushImpulseBody: {
      ru: "Лучше добавить {{amount}} в мечту, чем снова брать {{temptation}}.",
      en: "Add {{amount}} to the dream instead of grabbing {{temptation}} again.",
    },
  },
};

const lightenColor = (hex, amount = 0.25) => {
  if (typeof hex !== "string" || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const num = parseInt(full.slice(1), 16);
  if (Number.isNaN(num)) return hex;
  const adjust = (channel) => {
    const delta = 255 * amount;
    const next = channel + delta;
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  const r = adjust((num >> 16) & 255);
  const g = adjust((num >> 8) & 255);
  const b = adjust(num & 255);
  return `rgb(${r}, ${g}, ${b})`;
};

const MOOD_GRADIENTS = {
  [MOOD_IDS.NEUTRAL]: {
    start: "#CDE6FF",
    end: "#F3F7FF",
    accent: "#A2C9FF",
  },
  [MOOD_IDS.FOCUSED]: {
    start: "#FFE8C7",
    end: "#FFD6E7",
    accent: "#FFB973",
  },
  [MOOD_IDS.IMPULSIVE]: {
    start: "#FFD1CC",
    end: "#FFF0DA",
    accent: "#FF8A7F",
  },
  [MOOD_IDS.DOUBTER]: {
    start: "#E3D8FF",
    end: "#F7E9FF",
    accent: "#C7B1FF",
  },
  [MOOD_IDS.TIRED]: {
    start: "#D5E0FF",
    end: "#ECEFF5",
    accent: "#9AB0FF",
  },
  [MOOD_IDS.DREAMER]: {
    start: "#CFF7F1",
    end: "#E9E2FF",
    accent: "#94D8C7",
  },
};

const getMoodGradient = (moodId = MOOD_IDS.NEUTRAL) =>
  MOOD_GRADIENTS[moodId] || MOOD_GRADIENTS[MOOD_IDS.NEUTRAL];

const applyThemeToMoodGradient = (palette, themeKey = "light") => {
  if (!palette) return getMoodGradient();
  if (themeKey !== "dark") return palette;
  return {
    start: lightenColor(palette.start, -0.55),
    end: lightenColor(palette.end, -0.65),
    accent: lightenColor(palette.accent, 0.35),
  };
};

const MoodGradientBlock = ({ colors: palette, style, children }) => {
  const gradientColors = palette || MOOD_GRADIENTS[MOOD_IDS.NEUTRAL];
  return (
    <View
      style={[
        styles.moodGradientBlock,
        { backgroundColor: gradientColors.start },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.moodGradientOverlay,
          { backgroundColor: gradientColors.end },
        ]}
      />
      {children}
    </View>
  );
};

const CoinRainOverlay = React.memo(({ dropCount = 14 }) => {
  const drops = useRef(
    Array.from({ length: dropCount }).map((_, idx) => {
      const anim = new Animated.Value(Math.random());
      return {
        key: `coin_rain_${idx}`,
        anim,
        left: Math.random() * (SCREEN_WIDTH - 40),
        size: 20 + Math.random() * 14,
        duration: 4200 + Math.random() * 1800,
        delay: Math.random() * 1400,
      };
    })
  ).current;

  useEffect(() => {
    const loops = drops.map(({ anim, duration, delay }) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return animation;
    });
    return () => {
      loops.forEach((animation) => animation?.stop?.());
    };
  }, [drops]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {drops.map(({ key, anim, left, size }) => {
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-160, Dimensions.get("window").height + 120],
        });
        const translateX = anim.interpolate({
          inputRange: [0, 0.2, 0.5, 0.8, 1],
          outputRange: [left - 16, left + 12, left - 8, left + 6, left - 2],
        });
        const opacity = anim.interpolate({
          inputRange: [0, 0.15, 0.85, 1],
          outputRange: [0, 0.9, 0.8, 0],
        });
        const rotate = anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["180deg", "540deg"],
        });
        return (
          <Animated.Image
            key={key}
            source={HEALTH_COIN_TIERS[0].asset}
            style={{
              position: "absolute",
              left: 0,
              width: size,
              height: size,
              opacity,
              transform: [
                { translateX },
                { translateY },
                { rotate },
              ],
            }}
            resizeMode="contain"
          />
        );
      })}
    </View>
  );
});

const PartyFirework = ({ color, size = 160, delay = 0, style }) => {
  const scale = useRef(new Animated.Value(0.2)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    scale.setValue(0.2);
    opacity.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 1100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.85,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 880,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(scale, {
          toValue: 0.2,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, scale]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.partyFireworkRing,
        style,
        {
          borderColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

const PartyFireworksLayer = ({ isDarkMode = false }) => {
  const palette = useMemo(
    () => (isDarkMode ? PARTY_FIREWORK_COLORS.dark : PARTY_FIREWORK_COLORS.light),
    [isDarkMode]
  );
  return (
    <View pointerEvents="none" style={styles.partyFireworksOverlay}>
      {PARTY_FIREWORK_CONFIGS.map((config, index) => (
        <PartyFirework
          key={`firework_${index}`}
          color={palette[index % palette.length]}
          size={config.size}
          delay={config.delay}
          style={{
            top: config.top,
            bottom: config.bottom,
            left: config.left,
            right: config.right,
          }}
        />
      ))}
    </View>
  );
};

const TAMAGOTCHI_IDLE_VARIANTS = ["idle", "idle", "curious", "follow", "speak"];
const TAMAGOTCHI_STARVING_VARIANTS = ["cry", "cry", "sad", "ohno", "idle"];
const TAMAGOTCHI_REACTION_DURATION = {
  happy: 3600,
  happyHeadshake: 3600,
  sad: 4200,
  ohno: 4000,
};
const TAMAGOTCHI_DECAY_INTERVAL_MS = 1000 * 60 * 5;
const TAMAGOTCHI_DECAY_STEP = 2;
const TAMAGOTCHI_COIN_DECAY_TICKS = 6;
const TAMAGOTCHI_FEED_AMOUNT = ECONOMY_RULES.tamagotchiFeedBoost;
const TAMAGOTCHI_MAX_HUNGER = 100;
const TAMAGOTCHI_FEED_COST = ECONOMY_RULES.tamagotchiFeedCost;
const TAMAGOTCHI_PARTY_COST = ECONOMY_RULES.tamagotchiPartyCost;
const PARTY_FIREWORK_CONFIGS = [
  { top: "12%", left: "18%", size: 150, delay: 0 },
  { top: "18%", right: "16%", size: 120, delay: 180 },
  { bottom: "26%", left: "20%", size: 170, delay: 360 },
  { bottom: "22%", right: "18%", size: 140, delay: 520 },
  { top: "30%", left: "40%", size: 110, delay: 420 },
];
const PARTY_FIREWORK_COLORS = {
  light: ["#FFB457", "#FF6FD8", "#7CDAFF", "#FFD36E"],
  dark: ["#FFD685", "#FF8FF3", "#7DC6FF", "#9BFFDA"],
};
const TAMAGOTCHI_PARTY_BLUE_COST = Math.max(
  1,
  Math.round(TAMAGOTCHI_PARTY_COST / HEALTH_COIN_TIERS[1].value)
);
const TAMAGOTCHI_FOOD_OPTIONS = [
  {
    id: "berries",
    tier: "snack",
    emoji: "🍓",
    hungerBoost: Math.round(TAMAGOTCHI_FEED_AMOUNT * 0.55),
    cost: Math.max(1, Math.round(TAMAGOTCHI_FEED_COST)),
    label: { ru: "Ягодки", en: "Berries" },
  },
  {
    id: "fish",
    tier: "treat",
    emoji: "🐟",
    hungerBoost: TAMAGOTCHI_FEED_AMOUNT,
    cost: Math.max(2, Math.round(TAMAGOTCHI_FEED_COST * 2)),
    label: { ru: "Рыбка", en: "Fish" },
  },
  {
    id: "sushi",
    tier: "deluxe",
    emoji: "🍣",
    hungerBoost: TAMAGOTCHI_FEED_AMOUNT + 12,
    cost: Math.max(4, Math.round(TAMAGOTCHI_FEED_COST * 4)),
    label: { ru: "Суши", en: "Sushi" },
  },
  {
    id: "cake",
    tier: "deluxe",
    emoji: "🍰",
    hungerBoost: TAMAGOTCHI_FEED_AMOUNT + 18,
    cost: Math.max(5, Math.round(TAMAGOTCHI_FEED_COST * 5)),
    label: { ru: "Десерт", en: "Dessert" },
  },
];
const TAMAGOTCHI_FOOD_MAP = TAMAGOTCHI_FOOD_OPTIONS.reduce((acc, option) => {
  acc[option.id] = option;
  return acc;
}, {});
const TAMAGOTCHI_DEFAULT_FOOD_ID =
  TAMAGOTCHI_FOOD_OPTIONS[0]?.id || (TAMAGOTCHI_FOOD_OPTIONS[1]?.id ?? "berries");
const resolveTamagotchiFoodTier = (hunger = TAMAGOTCHI_MAX_HUNGER) => {
  const normalized = Math.max(0, Math.min(TAMAGOTCHI_MAX_HUNGER, hunger));
  if (normalized < 30) return "deluxe";
  if (normalized < 60) return "treat";
  return "snack";
};
const pickTamagotchiFoodByTier = (tier = "snack", excludeId = null) => {
  const pool = TAMAGOTCHI_FOOD_OPTIONS.filter((food) => food.tier === tier);
  const fallback = pool.length ? pool : TAMAGOTCHI_FOOD_OPTIONS;
  if (!fallback.length) return null;
  const candidates =
    excludeId && fallback.length > 1 ? fallback.filter((food) => food.id !== excludeId) : fallback;
  const list = candidates.length ? candidates : fallback;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex]?.id || fallback[0].id;
};
const resolveNextTamagotchiFoodId = (
  hunger = TAMAGOTCHI_MAX_HUNGER,
  prevId = TAMAGOTCHI_DEFAULT_FOOD_ID,
  forceChange = false
) => {
  const nextTier = resolveTamagotchiFoodTier(hunger);
  const prevFood = TAMAGOTCHI_FOOD_MAP[prevId];
  const prevTier = prevFood?.tier || resolveTamagotchiFoodTier(TAMAGOTCHI_MAX_HUNGER);
  if (!forceChange && prevTier === nextTier && prevFood) {
    return prevId;
  }
  return pickTamagotchiFoodByTier(nextTier, forceChange ? prevId : null) || prevId;
};
const TAMAGOTCHI_HUNGER_LOW_THRESHOLD = 50;
const TAMAGOTCHI_START_STATE = {
  hunger: 80,
  coins: 5,
  lastFedAt: null,
  lastDecayAt: null,
  coinTick: 0,
  desiredFoodId: TAMAGOTCHI_DEFAULT_FOOD_ID,
};
const TAMAGOTCHI_NOTIFICATION_COPY = {
  ru: {
    low: "Алми из Almost проголодался — загляни и покорми его.",
    starving: "Алми совсем ослаб. Открой Almost и накорми его скорее.",
  },
  en: {
    low: "Almi from Almost is hungry — drop in and feed him.",
    starving: "Almi is starving. Open Almost and give him a snack.",
  },
};

const computeTamagotchiDecay = (state = TAMAGOTCHI_START_STATE, timestamp = Date.now()) => {
  const source = state || {};
  const now = Number.isFinite(timestamp) ? timestamp : Date.now();
  const lastStored = source.lastDecayAt;
  const last =
    typeof lastStored === "number" && Number.isFinite(lastStored)
      ? lastStored
      : Number(lastStored) || now;
  const hunger = Math.min(TAMAGOTCHI_MAX_HUNGER, Math.max(0, Number(source.hunger) || 0));
  const coins = Math.max(0, Math.floor(Number(source.coins) || 0));
  const coinTick = Math.max(0, Number(source.coinTick) || 0);
  const elapsed = Math.max(0, now - last);
  const ticks = Math.floor(elapsed / TAMAGOTCHI_DECAY_INTERVAL_MS);
  if (ticks <= 0) {
    return {
      state: {
        ...source,
        hunger,
        coins,
        coinTick,
        lastDecayAt: now,
      },
      burnedCoins: 0,
    };
  }
  const hungerDrop = ticks * TAMAGOTCHI_DECAY_STEP;
  const nextHunger = Math.max(0, hunger - hungerDrop);
  const totalTicks = coinTick + ticks;
  const nextCoinTick = totalTicks % TAMAGOTCHI_COIN_DECAY_TICKS;
  const decayDuration = ticks * TAMAGOTCHI_DECAY_INTERVAL_MS;
  const hungerDelta = hunger - nextHunger;
  const tierChanged = resolveTamagotchiFoodTier(nextHunger) !== resolveTamagotchiFoodTier(hunger);
  const shouldRefreshCraving =
    !source?.desiredFoodId || tierChanged || hungerDelta >= TAMAGOTCHI_DECAY_STEP * 3;
  const desiredFoodId = shouldRefreshCraving
    ? resolveNextTamagotchiFoodId(nextHunger, source?.desiredFoodId, hungerDelta > 0)
    : source.desiredFoodId;
  return {
    state: {
      ...source,
      hunger: nextHunger,
      coins,
      lastDecayAt: last + decayDuration,
      coinTick: nextCoinTick,
      desiredFoodId: desiredFoodId || TAMAGOTCHI_DEFAULT_FOOD_ID,
    },
    burnedCoins: 0,
  };
};

const getTamagotchiMood = (hunger = 0, language = "ru") => {
  const texts = {
    ru: {
      happy: "Алми сытый и довольный",
      calm: "Алми чуть проголодался",
      sad: "Алми грустит, хочет монетку",
      urgent: "Алми очень голодный!",
    },
    en: {
      happy: "Almi is well-fed and happy",
      calm: "Almi is getting hungry",
      sad: "Almi is sad, needs a coin",
      urgent: "Almi is very hungry!",
    },
  };
  const dict = texts[language] || texts.ru;
  if (hunger >= 75) return { label: dict.happy, tone: "happy" };
  if (hunger >= 45) return { label: dict.calm, tone: "calm" };
  if (hunger >= 20) return { label: dict.sad, tone: "sad" };
  return { label: dict.urgent, tone: "urgent" };
};

function AlmiTamagotchi({
  override,
  onOverrideComplete,
  style,
  isStarving = false,
  animations = CLASSIC_TAMAGOTCHI_ANIMATIONS,
}) {
  const [currentKey, setCurrentKey] = useState("idle");
  const idleTimerRef = useRef(null);
  const overrideTimerRef = useRef(null);
  const idleVariants = useMemo(
    () => (isStarving ? TAMAGOTCHI_STARVING_VARIANTS : TAMAGOTCHI_IDLE_VARIANTS),
    [isStarving]
  );
  const resolveNextIdleKey = useCallback(() => {
    const pool = idleVariants.length ? idleVariants : TAMAGOTCHI_IDLE_VARIANTS;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index] || "idle";
  }, [idleVariants]);

  const scheduleIdleCycle = useCallback(
    (delay = 4500) => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        const next = resolveNextIdleKey();
        setCurrentKey(next);
        scheduleIdleCycle(5000 + Math.random() * 3000);
      }, delay);
    },
    [resolveNextIdleKey]
  );

  useEffect(() => {
    scheduleIdleCycle(2200);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    };
  }, [scheduleIdleCycle]);

  useEffect(() => {
    if (!override) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    const key = animations[override.type] ? override.type : "happy";
    setCurrentKey(key);
    overrideTimerRef.current = setTimeout(() => {
      onOverrideComplete?.();
      scheduleIdleCycle(2500);
    }, override.duration || 3200);
  }, [animations, override?.key, override?.type, override?.duration, onOverrideComplete, scheduleIdleCycle]);

  const source = animations[currentKey] || animations.idle;
  return (
    <View style={[styles.almiMascotWrap, style]}>
      <Image
        source={source}
        defaultSource={animations.idle}
        style={styles.almiMascotImage}
        resizeMode="contain"
        fadeDuration={0}
      />
    </View>
  );
}
const MAX_IMPULSE_EVENTS = 180;
const MIN_IMPULSE_EVENTS_FOR_MAP = 4;
const IMPULSE_ALERT_COOLDOWN_MS = 1000 * 60 * 45;
const IMPULSE_CATEGORY_DEFS = {
  food: { id: "food", ru: "Еда", en: "Food", emoji: "🍜" },
  things: { id: "things", ru: "Вещи", en: "Things", emoji: "🎁" },
  fun: { id: "fun", ru: "Развлечения", en: "Entertainment", emoji: "🎉" },
  vices: { id: "vices", ru: "Вредные мелочи", en: "Small vices", emoji: "⚡️" },
};
const IMPULSE_CATEGORY_ORDER = ["food", "things", "fun", "vices"];
const DEFAULT_IMPULSE_CATEGORY = "vices";
const INITIAL_IMPULSE_TRACKER = {
  events: [],
  lastAlerts: {},
};

const padHour = (value) => value.toString().padStart(2, "0");
const formatImpulseWindowLabel = (hour, span = 2) => {
  if (!Number.isInteger(hour)) return null;
  const start = padHour(hour);
  const end = padHour((hour + span) % 24);
  return `${start}:00–${end}:00`;
};

const resolveImpulseCategory = (item = {}) => {
  const override = typeof item?.impulseCategoryOverride === "string" ? item.impulseCategoryOverride : null;
  if (override && IMPULSE_CATEGORY_DEFS[override]) {
    return override;
  }
  const categories = Array.isArray(item.categories)
    ? item.categories.map((entry) => (entry || "").toLowerCase())
    : [];
  const price = Number(item.priceUSD ?? item.basePriceUSD ?? 0) || 0;
  const matches = (...keys) => categories.some((cat) => keys.includes(cat));
  if (matches("food", "groceries", "meal", "dining")) return "food";
  if (matches("coffee", "tea", "habit") && price <= 30) return "vices";
  if (matches("travel", "wow", "game", "gaming", "fun", "experience", "movie", "concert")) return "fun";
  if (matches("style", "tech", "phone", "wearable", "fashion", "beauty", "home", "sport", "flagship")) return "things";
  if (matches("lifestyle", "custom", "gift") && price <= 60) return "vices";
  if (price <= 18) return "vices";
  if (price <= 90) return "food";
  return "things";
};

const resolveGoalTypeFromTarget = (targetUSD = 0) => {
  if (!Number.isFinite(targetUSD)) return "short_term";
  return targetUSD >= 1000 ? "long_term" : "short_term";
};

const isCustomTemptation = (item = null) => {
  if (!item) return false;
  const categories = Array.isArray(item.categories) ? item.categories : [];
  if (categories.includes("custom")) return true;
  if (typeof item.id === "string") {
    return item.id.startsWith("custom_") || item.id.startsWith("custom");
  }
  return false;
};

const buildImpulseInsights = (events = []) => {
  if (!Array.isArray(events) || !events.length) {
    const categories = IMPULSE_CATEGORY_ORDER.reduce((acc, id) => {
      acc[id] = { save: 0, spend: 0 };
      return acc;
    }, {});
    return { categories, hotLose: null, hotWin: null, activeRisk: null, hottestCategory: null, eventCount: 0 };
  }
  const categories = IMPULSE_CATEGORY_ORDER.reduce((acc, id) => {
    acc[id] = { save: 0, spend: 0 };
    return acc;
  }, {});
  const templateStats = new Map();
  let processedEvents = 0;
  let totalSaves = 0;
  let totalSpends = 0;
  events.forEach((event) => {
    if (!event || !event.templateId) return;
    processedEvents += 1;
    const category = event.category || "things";
    if (!categories[category]) {
      categories[category] = { save: 0, spend: 0 };
    }
    if (event.action === "save") {
      categories[category].save += 1;
      totalSaves += 1;
    } else if (event.action === "spend") {
      categories[category].spend += 1;
      totalSpends += 1;
    }
    const stat =
      templateStats.get(event.templateId) || {
        templateId: event.templateId,
        title: event.title,
        emoji: event.emoji,
        category,
        saveCount: 0,
        spendCount: 0,
        saveHours: Array(24).fill(0),
        spendHours: Array(24).fill(0),
        lastAmountUSD: event.amountUSD || 0,
      };
    if (event.action === "save") {
      stat.saveCount += 1;
      if (Number.isInteger(event.hour)) {
        stat.saveHours[event.hour] = (stat.saveHours[event.hour] || 0) + 1;
      }
    } else if (event.action === "spend") {
      stat.spendCount += 1;
      if (Number.isInteger(event.hour)) {
        stat.spendHours[event.hour] = (stat.spendHours[event.hour] || 0) + 1;
      }
      stat.lastAmountUSD = event.amountUSD || stat.lastAmountUSD;
    }
    templateStats.set(event.templateId, stat);
  });
  const selectHotHour = (hours = []) => {
    let chosen = null;
    let best = 0;
    hours.forEach((value, hour) => {
      if (value > best) {
        best = value;
        chosen = hour;
      }
    });
    return {
      hour: Number.isInteger(chosen) ? chosen : null,
      count: best,
      label: Number.isInteger(chosen) ? formatImpulseWindowLabel(chosen) : null,
    };
  };
  let hotLose = null;
  let hotWin = null;
  templateStats.forEach((stat) => {
    const total = stat.saveCount + stat.spendCount;
    if (!total) return;
    const loseRate = stat.spendCount / total;
    if (stat.spendCount >= 1 && loseRate >= 0.5) {
      if (!hotLose || stat.spendCount > hotLose.spendCount || loseRate > hotLose.lossRate) {
        hotLose = {
          ...stat,
          lossRate: loseRate,
          hotspot: selectHotHour(stat.spendHours),
        };
      }
    }
    const winRate = stat.saveCount / total;
    if (stat.saveCount >= 1 && winRate >= 0.5) {
      if (!hotWin || stat.saveCount > hotWin.saveCount || winRate > hotWin.winRate) {
        hotWin = {
          ...stat,
          winRate,
          hotspot: selectHotHour(stat.saveHours),
        };
      }
    }
  });
  const nowHour = new Date().getHours();
  let activeRisk = null;
  templateStats.forEach((stat) => {
    const spendHits = stat.spendHours[nowHour] || 0;
    if (spendHits < 2) return;
    const saveHits = stat.saveHours[nowHour] || 0;
    if (saveHits >= spendHits) return;
    const total = stat.saveCount + stat.spendCount;
    if (!total) return;
    const lossRate = stat.spendCount / total;
    if (lossRate < 0.6) return;
    if (!activeRisk || spendHits > activeRisk.spendHits) {
      activeRisk = {
        templateId: stat.templateId,
        title: stat.title,
        emoji: stat.emoji,
        category: stat.category,
        spendHits,
        hour: nowHour,
        windowLabel: formatImpulseWindowLabel(nowHour),
        amountUSD: stat.lastAmountUSD,
      };
    }
  });
  const hottestCategory = IMPULSE_CATEGORY_ORDER.reduce(
    (best, id) => {
      const entry = categories[id];
      const delta = (entry?.spend || 0) - (entry?.save || 0);
      if (!best || delta > best.delta) {
        return { id, delta };
      }
      return best;
    },
    null
  );
  return {
    categories,
    hotLose: hotLose
      ? {
          templateId: hotLose.templateId,
          title: hotLose.title,
          emoji: hotLose.emoji,
          category: hotLose.category,
          count: hotLose.spendCount,
          rate: hotLose.lossRate,
          windowLabel: hotLose.hotspot?.label || null,
        }
      : null,
    hotWin: hotWin
      ? {
          templateId: hotWin.templateId,
          title: hotWin.title,
          emoji: hotWin.emoji,
          category: hotWin.category,
          count: hotWin.saveCount,
          rate: hotWin.winRate,
          windowLabel: hotWin.hotspot?.label || null,
        }
      : null,
    activeRisk,
    hottestCategory,
    eventCount: processedEvents,
    totalSaveCount: totalSaves,
    totalSpendCount: totalSpends,
  };
};

const renderTemplateString = (template, params = {}) => {
  if (!template || typeof template !== "string") return "";
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] !== undefined && params[key] !== null ? String(params[key]) : ""
  );
};

const SwipeableChallengeCard = ({
  children,
  colors,
  cancelLabel,
  onCancel,
  onSwipeOpen,
  onSwipeClose,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureStartOffset = useRef(0);
  const closerRef = useRef(null);

  const closeRow = useCallback(
    (notify = true) => {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (notify) {
          onSwipeClose?.(closerRef.current);
          closerRef.current = null;
        }
      });
    },
    [onSwipeClose, translateX]
  );

  const notifyOpen = useCallback(() => {
    const closer = () => closeRow();
    closerRef.current = closer;
    onSwipeOpen?.(closer);
  }, [closeRow, onSwipeOpen]);

  const openManual = useCallback(() => {
    setManualVisible(true);
    setManualError("");
    setManualValue("");
  }, []);
  const closeManual = useCallback(() => {
    setManualVisible(false);
    setManualError("");
  }, []);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx < -6,
        onPanResponderGrant: () => {
          translateX.stopAnimation((value) => {
            gestureStartOffset.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const base = gestureStartOffset.current || 0;
          const next = Math.max(-CHALLENGE_SWIPE_ACTION_WIDTH, Math.min(base + gestureState.dx, 0));
          translateX.setValue(next);
        },
        onPanResponderRelease: () => {
          translateX.stopAnimation((value) => {
            const shouldOpen = value < -CHALLENGE_SWIPE_ACTION_WIDTH * 0.35;
            Animated.timing(translateX, {
              toValue: shouldOpen ? -CHALLENGE_SWIPE_ACTION_WIDTH : 0,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => {
              if (shouldOpen) {
                notifyOpen();
              } else {
                closeRow();
              }
            });
          });
        },
        onPanResponderTerminate: () => {
          closeRow();
        },
      }),
    [closeRow, notifyOpen, translateX]
  );

  return (
    <View style={styles.challengeSwipeWrapper}>
      <View style={[styles.challengeSwipeActions, { backgroundColor: SPEND_ACTION_COLOR }]}>
        <TouchableOpacity
          style={[styles.challengeSwipeButton, { backgroundColor: SPEND_ACTION_COLOR }]}
          onPress={() => {
            closeRow();
            onCancel?.();
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.challengeSwipeButtonText, { color: colors.background }]}>{cancelLabel}</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

const getMoodPreset = (moodId = MOOD_IDS.NEUTRAL, language = "ru") => {
  const preset = MOOD_PRESETS[moodId] || MOOD_PRESETS[MOOD_IDS.NEUTRAL];
  const localize = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value[language] || value.en || "";
  };
  return {
    id: preset.id || moodId,
    label: localize(preset.label),
    hero: localize(preset.hero),
    heroComplete: localize(preset.heroComplete),
    motivation: localize(preset.motivation),
    saveOverlay: localize(preset.saveOverlay),
    impulseOverlay: localize(preset.impulseOverlay),
    pushPendingTitle: localize(preset.pushPendingTitle),
    pushPendingBody: localize(preset.pushPendingBody),
    pushImpulseTitle: localize(preset.pushImpulseTitle),
    pushImpulseBody: localize(preset.pushImpulseBody),
  };
};

const getLatestEventTimestamp = (events = [], type) => {
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    if (event?.type === type && event.timestamp) {
      return event.timestamp;
    }
  }
  return null;
};

const evaluateMoodState = (state = createMoodStateForToday(), context = {}) => {
  const now = context.now || Date.now();
  const pendingCount =
    context.pendingCount !== undefined ? context.pendingCount : state.pendingSnapshot || 0;
  const filteredEvents = (state.events || []).filter(
    (event) => now - (event.timestamp || 0) <= MOOD_ACTION_WINDOW_MS
  );
  const counts = filteredEvents.reduce(
    (acc, event) => {
      if (event?.type && acc[event.type] !== undefined) {
        acc[event.type] += 1;
      }
      return acc;
    },
    { save: 0, spend: 0, maybe: 0, dream: 0 }
  );
  let nextMood = state.current || MOOD_IDS.NEUTRAL;
  const lastInteraction = state.lastInteractionAt || state.lastVisitAt || 0;
  if (lastInteraction && now - lastInteraction >= MOOD_INACTIVITY_THRESHOLD_MS) {
    nextMood = MOOD_IDS.TIRED;
  } else {
    const candidates = [];
    if (counts.spend >= MOOD_EVENT_THRESHOLD) {
      const timestamp = getLatestEventTimestamp(filteredEvents, "spend");
      if (timestamp) candidates.push({ mood: MOOD_IDS.IMPULSIVE, timestamp });
    }
    if (counts.save >= MOOD_EVENT_THRESHOLD) {
      const timestamp = getLatestEventTimestamp(filteredEvents, "save");
      if (timestamp) candidates.push({ mood: MOOD_IDS.FOCUSED, timestamp });
    }
    if (counts.maybe >= MOOD_EVENT_THRESHOLD) {
      const timestamp = getLatestEventTimestamp(filteredEvents, "maybe");
      if (timestamp) candidates.push({ mood: MOOD_IDS.DOUBTER, timestamp });
    }
    if (counts.dream >= MOOD_DREAM_WISH_THRESHOLD) {
      const timestamp = getLatestEventTimestamp(filteredEvents, "dream");
      if (timestamp) candidates.push({ mood: MOOD_IDS.DREAMER, timestamp });
    }
    if (pendingCount >= MOOD_PENDING_THRESHOLD) {
      candidates.push({ mood: MOOD_IDS.DREAMER, timestamp: now });
    }
    if (candidates.length) {
      candidates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      nextMood = candidates[0].mood;
    } else {
      nextMood = MOOD_IDS.NEUTRAL;
    }
  }
  return {
    ...state,
    current: nextMood,
    events: filteredEvents,
    pendingSnapshot: pendingCount,
  };
};

const mapHistoryEventsToMoodEvents = (history = [], now = Date.now()) =>
  history
    .filter((entry) => entry?.timestamp && now - entry.timestamp <= MOOD_ACTION_WINDOW_MS)
    .map((entry) => {
      if (entry.kind === "refuse_spend") return { type: "save", timestamp: entry.timestamp };
      if (entry.kind === "spend") return { type: "spend", timestamp: entry.timestamp };
      if (entry.kind === "pending_added") return { type: "maybe", timestamp: entry.timestamp };
      if (entry.kind === "wish_added") return { type: "dream", timestamp: entry.timestamp };
      return null;
    })
    .filter(Boolean)
    .slice(0, MOOD_MAX_EVENTS);

const WEEKDAY_LABELS = {
  ru: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const WEEKDAY_LABELS_MONDAY_FIRST = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const buildSavingsBreakdown = (
  history = [],
  currency = DEFAULT_PROFILE.currency,
  resolveTemplateTitle,
  language = "ru"
) => {
  const now = Date.now();
  const dayLabels = WEEKDAY_LABELS[language] || WEEKDAY_LABELS.en;
  const palette = ["#3E8EED", "#F6A23D", "#8F7CF6", "#2EB873", "#E15555", "#FFC857"];
  const totalsByTitle = {};
  const daysRaw = Array.from({ length: 7 }).map((_, idx) => {
    const dayStart = new Date(now - (6 - idx) * DAY_MS);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + DAY_MS;
    const label = dayLabels[dayStart.getDay()];
    const stacks = {};
    history.forEach((entry) => {
      if (entry?.kind !== "refuse_spend") return;
      if (!entry?.timestamp || entry.timestamp < dayStart.getTime() || entry.timestamp >= dayEnd) return;
      const resolvedTitle =
        (resolveTemplateTitle &&
          resolveTemplateTitle(entry.meta?.templateId, entry.meta?.title || entry.title)) ||
        null;
      const baseTitle =
        (resolvedTitle ||
          entry.meta?.title ||
          entry.title ||
          entry.meta?.templateId ||
          entry.emoji ||
          entry.id ||
          (language === "ru" ? "Отказ" : "Skip"))
          .toString()
          .slice(0, 42);
      const stripped = stripEmojis(baseTitle);
      const title = (stripped || baseTitle || (language === "ru" ? "Отказ" : "Skip")).trim();
      const amount = Math.max(0, Number(entry.meta?.amountUSD) || 0);
      stacks[title] = (stacks[title] || 0) + amount;
      totalsByTitle[title] = (totalsByTitle[title] || 0) + amount;
    });
    const total = Object.values(stacks).reduce((sum, v) => sum + v, 0);
    return { label, stacks, total };
  });
  const sortedTitles = Object.entries(totalsByTitle)
    .sort((a, b) => b[1] - a[1])
    .map(([title]) => title);
  const topTitles = sortedTitles.slice(0, 5);
  const colorMap = {};
  topTitles.forEach((title, idx) => {
    colorMap[title] = palette[idx % palette.length];
  });
  const otherColor = "#F6C16B";
  const days = daysRaw.map((day) => {
    const stacksArray = [];
    const otherSum = Object.entries(day.stacks).reduce((acc, [title, value]) => {
      if (colorMap[title]) {
        stacksArray.push({ title, value, color: colorMap[title] });
        return acc;
      }
      return acc + value;
    }, 0);
    if (otherSum > 0) {
      stacksArray.push({ title: "Другие", value: otherSum, color: otherColor });
    }
    return { label: day.label, total: day.total, stacks: stacksArray };
  });
  const grandTotal = Object.values(totalsByTitle).reduce((sum, v) => sum + v, 0) || 1;
  const legend = topTitles.map((title, idx) => ({
    id: title,
    label: title,
    value: totalsByTitle[title],
    percent: Math.round((totalsByTitle[title] / grandTotal) * 100),
    color: palette[idx % palette.length],
  }));
  const otherTotal = grandTotal - legend.reduce((sum, item) => sum + item.value, 0);
  if (otherTotal > 0) {
    legend.push({
      id: "other",
      label: "Другие",
      value: otherTotal,
      percent: Math.max(1, Math.round((otherTotal / grandTotal) * 100)),
      color: otherColor,
    });
  }
  const formatLocal = (usd) => formatCurrency(convertToCurrency(usd || 0, currency), currency);
  return { days, legend, formatLocal };
};

const computeRefuseStreak = (history = []) => {
  if (!Array.isArray(history)) return 0;
  const sorted = [...history]
    .filter((entry) => entry?.timestamp)
    .sort((a, b) => b.timestamp - a.timestamp);
  let streak = 0;
  for (const entry of sorted) {
    if (entry.kind === "refuse_spend") {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
};

const deriveMoodFromState = (state = createMoodStateForToday(), pendingCount = 0, now = Date.now()) => {
  const events = Array.isArray(state.events) ? state.events : [];
  const filtered = events.filter(
    (event) => event?.timestamp && now - event.timestamp <= MOOD_ACTION_WINDOW_MS
  );
  const counts = filtered.reduce(
    (acc, event) => {
      if (event?.type && acc[event.type] !== undefined) {
        acc[event.type] += 1;
      }
      return acc;
    },
    { save: 0, spend: 0, maybe: 0, dream: 0 }
  );
  const lastInteraction = state.lastInteractionAt || state.lastVisitAt || filtered[0]?.timestamp || 0;
  if (lastInteraction && now - lastInteraction >= MOOD_INACTIVITY_THRESHOLD_MS) {
    return MOOD_IDS.TIRED;
  }
  const candidates = [];
  if (counts.spend >= MOOD_EVENT_THRESHOLD) {
    const timestamp = getLatestEventTimestamp(filtered, "spend");
    if (timestamp) candidates.push({ mood: MOOD_IDS.IMPULSIVE, timestamp });
  }
  if (counts.save >= MOOD_EVENT_THRESHOLD) {
    const timestamp = getLatestEventTimestamp(filtered, "save");
    if (timestamp) candidates.push({ mood: MOOD_IDS.FOCUSED, timestamp });
  }
  if (counts.maybe >= MOOD_EVENT_THRESHOLD) {
    const timestamp = getLatestEventTimestamp(filtered, "maybe");
    if (timestamp) candidates.push({ mood: MOOD_IDS.DOUBTER, timestamp });
  }
  if (counts.dream >= MOOD_DREAM_WISH_THRESHOLD) {
    const timestamp = getLatestEventTimestamp(filtered, "dream");
    if (timestamp) candidates.push({ mood: MOOD_IDS.DREAMER, timestamp });
  }
  if (pendingCount >= MOOD_PENDING_THRESHOLD) {
    candidates.push({ mood: MOOD_IDS.DREAMER, timestamp: now });
  }
  if (candidates.length) {
    candidates.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return candidates[0].mood;
  }
  return MOOD_IDS.NEUTRAL;
};

const getImpulseCategoryLabel = (id, language = "en") => {
  const entry = IMPULSE_CATEGORY_DEFS[id];
  if (!entry) return id;
  const localeKey = language === "ru" ? "ru" : "en";
  return `${entry.emoji} ${entry[localeKey]}`;
};

const RainOverlay = ({ colors }) => {
  const drops = useMemo(
    () =>
      Array.from({ length: RAIN_DROPS }, (_, index) => ({
        id: index,
        left: Math.random() * SCREEN_WIDTH,
        delay: Math.random() * 800,
        height: 80 + Math.random() * 60,
      })),
    []
  );

  return (
    <View style={styles.rainLayer} pointerEvents="none">
      {drops.map((drop) => (
        <RainDrop key={drop.id} {...drop} colors={colors} />
      ))}
    </View>
  );
};

const RainDrop = ({ left, delay, height, colors }) => {
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: 500,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -120,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, translateY]);

  return (
    <Animated.View
      style={[
        styles.rainDrop,
        {
          left,
          height,
          backgroundColor: colors.muted,
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const BASE_HORIZONTAL_PADDING = Platform.OS === "android" ? 20 : 30;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
  Haptics.impactAsync(style).catch(() => {});
};

const triggerSuccessHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

const convertToCurrency = (valueUSD = 0, currency = activeCurrency) => {
  if (!valueUSD) return 0;
  const rate = CURRENCY_RATES[currency] || 1;
  return valueUSD * rate;
};

const convertFromCurrency = (valueLocal = 0, currency = activeCurrency) => {
  if (!valueLocal) return 0;
  const rate = CURRENCY_RATES[currency] || 1;
  if (!rate) return valueLocal;
  return valueLocal / rate;
};

const POTENTIAL_PUSH_STEP_EUR = 10;
const POTENTIAL_PUSH_STEP_USD = convertFromCurrency(POTENTIAL_PUSH_STEP_EUR, "EUR");
const POTENTIAL_PUSH_STEP_LOCAL_MAP = {
  USD: 10,
  EUR: 10,
  RUB: 1000,
  DEFAULT: 10,
};
const POTENTIAL_PUSH_STEP_LOCAL_FALLBACK =
  POTENTIAL_PUSH_STEP_LOCAL_MAP.DEFAULT || POTENTIAL_PUSH_STEP_EUR;
const POTENTIAL_PUSH_MAX_MULTIPLIER = 5;
const POTENTIAL_PUSH_FAST_GAIN_WINDOW_MS = 2 * 60 * 60 * 1000;
const POTENTIAL_PUSH_COOLDOWN_WINDOW_MS = 36 * 60 * 60 * 1000;
const DEFAULT_POTENTIAL_PUSH_STATE = {
  lastStep: 0,
  lastStatus: null,
  baselineKey: null,
  stepMultiplier: 1,
  lastNotifiedAt: 0,
};

const getCurrencyPrecision = (currency = activeCurrency) => {
  if (currency === "USD" || currency === "EUR") return 2;
  return 0;
};

const getCurrencyDisplayPrecision = (currency = activeCurrency) => {
  if (Object.prototype.hasOwnProperty.call(CURRENCY_DISPLAY_PRECISION, currency)) {
    return CURRENCY_DISPLAY_PRECISION[currency];
  }
  return getCurrencyPrecision(currency);
};

const getCurrencyFineStep = (currency = activeCurrency) => {
  if (CURRENCY_FINE_STEPS[currency]) return CURRENCY_FINE_STEPS[currency];
  const precision = getCurrencyPrecision(currency);
  return precision > 0 ? Math.pow(10, -precision) : 1;
};

const roundCurrencyValue = (value = 0, currency = activeCurrency, precisionOverride = null) => {
  const precision =
    typeof precisionOverride === "number" && Number.isFinite(precisionOverride)
      ? precisionOverride
      : getCurrencyPrecision(currency);
  const factor = Math.pow(10, precision);
  if (!Number.isFinite(factor) || factor <= 0) return Number(value) || 0;
  return Math.round(((Number(value) || 0) + Number.EPSILON) * factor) / factor;
};

const snapCurrencyValue = (value = 0, currency = activeCurrency) => {
  const step = CURRENCY_FINE_STEPS[currency];
  if (!step || step <= 0) {
    return roundCurrencyValue(value, currency);
  }
  const snapped = Math.round((Number(value) || 0) / step) * step;
  return roundCurrencyValue(snapped, currency);
};

const formatSampleAmount = (valueUSD, currencyCode) =>
  formatCurrency(convertToCurrency(valueUSD, currencyCode), currencyCode);

const formatNumberInputValue = (value) => {
  if (!Number.isFinite(value)) return "";
  const formatted = value.toFixed(2).replace(/\.?0+$/, "");
  return formatted;
};

const parseNumberInputValue = (value = "") => {
  if (typeof value !== "string") return NaN;
  const normalized = value.replace(/[^\d,.\s]/g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const formatLatestSavingTimestamp = (timestamp, language = "ru") => {
  if (!timestamp) return null;
  try {
    const locale = language === "ru" ? "ru-RU" : "en-US";
    const date = new Date(timestamp);
    const dateLabel = date.toLocaleDateString(locale, { day: "numeric", month: "short" });
    const timeLabel = date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dateLabel}, ${timeLabel}`;
  } catch {
    return null;
  }
};

const normalizeEmojiValue = (value, fallback) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return fallback;
  const firstGrapheme = Array.from(trimmed)[0];
  return firstGrapheme || fallback;
};

const limitEmojiInput = (value) => {
  if (!value) return "";
  const trimmed = value.trim();
  const firstGrapheme = Array.from(trimmed)[0];
  return firstGrapheme || "";
};

const getPersonaPreset = (personaId) => PERSONA_PRESETS[personaId] || PERSONA_PRESETS[DEFAULT_PERSONA_ID];

const createPersonaTemptation = (preset) => {
  if (!preset?.habit) return null;
  const habit = preset.habit;
  return {
    id: `persona_${preset.id}`,
    emoji: habit.emoji || preset.emoji || "✨",
    image: habit.image,
    color: habit.color || "#FFF5E6",
    categories: habit.categories || ["habit"],
    basePriceUSD: habit.basePriceUSD || 5,
    priceUSD: habit.basePriceUSD || 5,
    title: habit.title,
    description: habit.description,
    audience: preset.audience || habit.audience || null,
  };
};

const parseAmountValue = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const resolveCustomPriceUSD = (customSpend, fallbackCurrency = DEFAULT_PROFILE.currency) => {
  const direct = parseAmountValue(customSpend?.amountUSD);
  if (direct > 0) return direct;
  const local = parseAmountValue(customSpend?.amount ?? customSpend?.amountLocal ?? customSpend?.price);
  if (local > 0) {
    const currencyCode = customSpend?.currency || fallbackCurrency || DEFAULT_PROFILE.currency;
    return convertFromCurrency(local, currencyCode);
  }
  return 0;
};

const buildCustomTemptationDescription = (gender = "none") => {
  const isFemale = gender === "female";
  const isMale = gender === "male";
  let ru = "Это искушение ты добавил(а) сам(а). Отслеживай его и побеждай чаще.";
  if (isMale) {
    ru = "Это искушение ты добавил сам. Отслеживай его и побеждай чаще.";
  } else if (isFemale) {
    ru = "Это искушение ты добавила сама. Отслеживай его и побеждай чаще.";
  }
  const en = "You added this temptation yourself. Track it and beat it more often.";
  return {
    ru,
    en,
  };
};

const createCustomHabitTemptation = (customSpend, fallbackCurrency, gender = "none") => {
  if (!customSpend?.title) return null;
  const price = resolveCustomPriceUSD(customSpend, fallbackCurrency);
  if (!price) return null;
  const title = customSpend.title;
  const description = buildCustomTemptationDescription(gender);
  const impulseCategory =
    customSpend.impulseCategory && IMPULSE_CATEGORY_DEFS[customSpend.impulseCategory]
      ? customSpend.impulseCategory
      : null;
  const categories = ["habit", "custom"];
  if (impulseCategory) {
    categories.push(impulseCategory);
  }
  return {
    id: customSpend.id || "custom_habit",
    emoji: customSpend.emoji || "💡",
    color: "#FFF5E6",
    categories,
    basePriceUSD: price,
    priceUSD: price,
    title: {
      ru: title,
      en: title,
    },
    description,
    impulseCategoryOverride: impulseCategory,
  };
};

const hasValidCustomPrice = (entry) => {
  if (!entry || typeof entry !== "object") return false;
  const price = Number(entry.priceUSD);
  if (Number.isFinite(price) && price > 0) return true;
  const basePrice = Number(entry.basePriceUSD);
  return Number.isFinite(basePrice) && basePrice > 0;
};

const normalizeCustomTemptationEntry = (
  entry,
  fallbackCurrency = DEFAULT_PROFILE.currency
) => {
  if (!entry || typeof entry !== "object") return null;
  const genderValue = entry?.gender || "none";
  if (hasValidCustomPrice(entry)) {
    const entryCategory =
      entry.impulseCategoryOverride || entry.impulseCategory || null;
    const normalizedCategory =
      entryCategory && IMPULSE_CATEGORY_DEFS[entryCategory] ? entryCategory : null;
    return {
      ...entry,
      description: buildCustomTemptationDescription(genderValue),
      impulseCategoryOverride: normalizedCategory,
    };
  }
  const rebuilt = createCustomHabitTemptation(entry, fallbackCurrency, genderValue);
  if (!rebuilt) return null;
  const merged = { ...rebuilt, ...entry };
  merged.priceUSD = rebuilt.priceUSD;
  merged.basePriceUSD = rebuilt.basePriceUSD;
  merged.description = rebuilt.description;
  const entryCategory =
    entry.impulseCategoryOverride || entry.impulseCategory || rebuilt.impulseCategoryOverride;
  merged.impulseCategoryOverride =
    entryCategory && IMPULSE_CATEGORY_DEFS[entryCategory] ? entryCategory : rebuilt.impulseCategoryOverride || null;
  return merged;
};

const matchesGenderAudience = (card, gender = "none") => {
  if (!card || !card.audience || !gender || gender === "none") return true;
  const list = Array.isArray(card.audience) ? card.audience : [card.audience];
  return list.includes(gender);
};

const buildPersonalizedTemptations = (profile, baseList = DEFAULT_TEMPTATIONS) => {
  const preset = getPersonaPreset(profile?.persona);
  const customFirst = createCustomHabitTemptation(
    profile?.customSpend,
    profile?.currency,
    profile?.gender
  );
  const personaCard = createPersonaTemptation(preset);
  const gender = profile?.gender || "none";
  const seen = new Set();
  const result = [];
  const pushIfVisible = (card) => {
    if (!card || seen.has(card.id)) return;
    if (!matchesGenderAudience(card, gender)) return;
    seen.add(card.id);
    result.push(card);
  };

  // 1) Кастомная карта пользователя всегда первая, если есть.
  pushIfVisible(customFirst);
  // 2) Карта персоны — сразу после кастомной или первой, если кастомной нет.
  pushIfVisible(personaCard);

  // Остальные, отсортированные по цене.
  const pool = [...baseList].filter((item) => item && !seen.has(item.id));
  const sortedPool = pool
    .filter((item) => matchesGenderAudience(item, gender))
    .sort((a, b) => {
      const priceA = a.priceUSD ?? a.basePriceUSD ?? Number.POSITIVE_INFINITY;
      const priceB = b.priceUSD ?? b.basePriceUSD ?? Number.POSITIVE_INFINITY;
      return priceA - priceB;
    });
  return [...result, ...sortedPool];
};

const mergeInteractionStatMaps = (base = {}, incoming = {}) => {
  const result = { ...(base || {}) };
  Object.entries(incoming || {}).forEach(([templateId, stats]) => {
    if (!stats) return;
    const current = result[templateId] || { saveCount: 0, spendCount: 0, lastInteractionAt: 0 };
    const saveCount = (current.saveCount || 0) + (stats.saveCount || 0);
    const spendCount = (current.spendCount || 0) + (stats.spendCount || 0);
    const lastInteractionAt = Math.max(current.lastInteractionAt || 0, stats.lastInteractionAt || 0);
    result[templateId] = {
      saveCount,
      spendCount,
      lastInteractionAt,
    };
  });
  return result;
};

const useFadeIn = () => {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fade]);
  return fade;
};

const FEED_FREQUENT_PIN_LIMIT = 5;

const TRANSLATIONS = {
  ru: {
    appTagline: "Витрина искушений которая помогает копить",
    tamagotchiHungryBubble: "🐟",
    tamagotchiFoodMenuTitle: "Меню Алми",
    tamagotchiFoodBoostLabel: "+{{percent}}% сытости",
    tamagotchiFoodWantLabel: "Хочу",
    tamagotchiSkinTitle: "Образ Алми",
    tamagotchiSkinSubtitle: "Новый стиль Алми мотивирует экономить по-новому",
    tamagotchiSkinCurrent: "Активно",
    tamagotchiSkinUnlockTitle: "Almost только запустился 🚀",
    tamagotchiSkinUnlockDescription:
      "Помоги нам стать лучше: отправь отзыв на {{email}} и разблокируй все образы.",
    tamagotchiSkinUnlockButton: "Написать отзыв и открыть скины",
    tamagotchiSkinLockedBadge: "Закрыто",
    heroAwaiting: "В листе желаний",
    heroSpendLine: {
      female: "Последняя экономия: «{{title}}».",
      male: "Последняя экономия: «{{title}}».",
      none: "Последняя экономия: «{{title}}».",
    },
    heroSpendRecentTitle: "Последние экономии:",
    heroSpendFallback: {
      female: "Каждый отказ приближает к цели. Продолжай фиксировать победы.",
      male: "Каждый отказ приближает к цели. Продолжай фиксировать победы.",
      none: "Каждый отказ приближает к цели. Продолжай фиксировать победы.",
    },
    heroEconomyContinues: "Экономия продолжается.",
    heroExpand: "Показать детали",
    heroCollapse: "Скрыть детали",
    heroDailyTitle: "Неделя экономии",
    heroDailyEmpty: "Пока пусто, попробуй отказать себе хотя бы раз.",
    feedEmptyTitle: "Фильтр пуст",
    feedEmptySubtitle: "Попробуй другой тег или обнови каталог",
    buyNow: "Оплатить через {{pay}}",
    addToCart: "Отложить и подумать",
    buyExternal: "Перейти к товару",
    cartTitle: "Корзина",
    cartEmptyTitle: "Грустно без твоих хотелок",
    cartEmptySubtitle: "Добавь то, что реально нужно: приложению нравится спасать бюджет",
    buyLabel: "Взять",
    buyAllLabel: "Оформить всё и экономить",
    totalLabel: "Сумма",
    cartRemove: "Удалить",
    wishlistTitle: "Мои цели",
    wishlistEmptyTitle: "Пока нет целей",
    wishlistEmptySubtitle: "Добавь мечту из ленты и начинай копить в своём темпе",
    wishlistTab: "Цели",
    wishlistProgress: "{{current}} из {{target}}",
    wishlistSavedHint: "Сколько нужно накопить",
    wishlistSaveProgress: "Обновить прогресс",
    wishlistSetActive: "Сделать активной",
    wishlistActive: "Активная цель",
    wishlistRemove: "Убрать",
    wishlistRemoveConfirm: "Убрать эту хотелку?",
    wishlistDoneLabel: "Готово",
    wishlistSummary: "Всего целей на {{amount}}",
    freeDayButton: "Бесплатный день",
    freeDayLocked: "После 18:00",
    freeDayBlocked: "Недоступно",
    freeDayStatusAvailable: "Записать",
    freeDayStatusLogged: "Записано",
    freeDayLoggedToday: "Записано",
    freeDayConfirm: "Удалось прожить день без лишних трат?",
    freeDayCongrats: "Серия {{days}} дня(ей)! Отличный фокус.",
    freeDayMilestone: "Серия {{days}} дней! Новый титул!",
    freeDayCardTitle: "Серия бесплатных дней",
    freeDayActiveLabel: "Серия {{days}} дня",
    freeDayInactiveLabel: "Отметь день без трат",
    freeDayCurrentLabel: "Текущая",
    freeDayBestLabel: "Лучшая",
    freeDayTotalShort: "Всего",
    freeDayWeekTitle: "Эта неделя",
    freeDayExpand: "Показать детали",
    freeDayCollapse: "Скрыть",
    freeDayTotalLabel: "Всего: {{total}}",
    freeDayRescueTitle: "Пропущен день?",
    freeDayRescueSubtitle: "Потрать {{cost}} здоровья, чтобы серия жила.",
    freeDayRescueButton: "Спасти серию",
    freeDayRescuePillLabel: "Спасти ×{{count}}",
    freeDayRescueNeedHealth: "Нужно {{cost}} здоровья",
    freeDayRescueNeedTime: "Доступно после 18:00",
    freeDayRescueOverlay: "Серия спасена",
    freeDayCoinReward: "Бесплатный день: +{{coins}} синие монеты.",
    freeDayCoinRewardStreak: "🔥 Серия {{days}} дня(ей): ещё +{{coins}} синие монеты.",
    impulseCardTitle: "Импульс-карта",
    impulseCardSubtitle: "Фиксируем, где искушения чаще всего побеждают или проигрывают.",
    impulseLoseLabel: "Чаще сдаёшься",
    impulseLoseCopy: "{{temptation}} чаще цепляет в окно {{time}}.",
    impulseLoseEmpty: "Слабых зон пока нет.",
    impulseWinLabel: "Чаще побеждаешь",
    impulseWinCopy: "На {{temptation}} чаще всего отказываешь себе в {{time}}.",
    impulseWinEmpty: "Пока нет данных о победах - попробуй нажать «копить».",
    impulseTrendLabel: "Больше всего импульсов в категории {{category}}",
    impulseCategorySave: "Спасения: {{count}}",
    impulseCategorySpend: "Срывы: {{count}}",
    impulseAnytimeLabel: "любое время",
    impulseExpand: "Развернуть",
    impulseCollapse: "Скрыть карту",
    impulseAlertTitle: "Зона импульса",
    impulseAlertMessage:
      "Ты в зоне импульсивных трат на {{temptation}} ({{window}}). Откажись и отправь {{amount}} в копилку!",
    impulseNotificationTitle: "Almost заметил импульс: «{{temptation}}»",
    impulseNotificationBody: "В это время ты обычно тратишься. Сделай паузу и отправь {{amount}} в Almost.",
    impulseCategoryLabel: "Категория импульса",
    focusDigestPositiveTitle: "Держишь курс!",
    focusDigestPositiveBody:
      "Ты чаще отказываешься, чем тратишь.\nСильная сторона: «{{strong}}».\nСлабая сторона: «{{weak}}».",
    focusDigestNegativeTitle: "Внимание к расходам",
    focusDigestNegativeBody:
      "Трат стало больше.\nГлавная трата: «{{weak}}». Сфокусируйся на ней.",
    focusDigestStrongLabel: "Сильная сторона",
    focusDigestWeakLabel: "Слабая сторона",
    focusDigestButton: "Сфокусироваться",
    focusDigestDismiss: "Позже",
    focusDigestMissing: "Нет данных",
    focusBadgeLabel: "Фокус",
    focusPromptTitle: "Возьми под контроль",
    focusPromptBody: "Ты несколько раз поддалась на «{{title}}». Сделаем его фокусом?",
    focusVictoryReward: "Фокус «{{title}}» побеждён! +3 зелёных монеты",
    focusRewardTitle: "Фокус побеждён!",
    focusRewardSubtitle: "Ты трижды отказалась от «{{title}}». +{{amount}} зелёных монет.",
    dailyReflectionReminderTitle: "Вечерний чек-ин Almost",
    dailyReflectionReminderBody:
      "До полуночи {{time}}. Запиши трату или экономию — так умные подсказки останутся точными.",
    pendingTab: "Думаем",
    pendingTitle: "Думаем",
    pendingEmptyTitle: "В «думаем» пусто",
    pendingEmptySubtitle: "Отправляй цели в «думаем», и мы вернёмся через 14 дней.",
    pendingDaysLeft: "Осталось {{days}} д.",
    pendingExpired: "Срок вышел",
    pendingDueToday: "Реши сегодня",
    pendingActionWant: "Начать копить",
    pendingActionDecline: "Сэкономить",
    pendingNotificationTitle: "Almost: пора решить «{{title}}»",
    pendingNotificationBody: {
      female: "Две недели прошли. Начнём копить на «{{title}}» или отпустим его?",
      male: "Две недели прошли. Начнём копить на «{{title}}» или отпустим его?",
      none: "Две недели прошли. Что делаем с «{{title}}» — копим или отпускаем?",
    },
    pendingAdded: "Добавлено в «думаем». Напомним вовремя.",
    pendingDeleteConfirm: "Убрать эту хотелку из «думаем»?",
    pendingCustomError: "Укажи название и стоимость хотелки.",
    feedTab: "Лента",
    profileTab: "Профиль",
    payButton: "Оплатить",
    cartOverlay: "Экономия пополнена",
    purchasesTitle: "Награды",
    purchasesSubtitle: "Следи за достижениями и напоминай себе, зачем копишь",
    progressLabel: "Уровень осознанности",
    progressGoal: "{{current}} / {{goal}}",
    progressHint: "Осталось {{amount}} до титула ‘герой финансового дзена’",
    emptyPurchases: "Пока чисто. Значит, ты в плюсе",
    profileEdit: "Редактировать",
    profileSave: "Сохранить",
    profileCancel: "Отмена",
    profileOk: "ок",
    profileJoinDate: "В осознанной экономии с {{date}}",
    settingsTitle: "Настройки и персонализация",
    analyticsOptInLabel: "Отправлять анонимную аналитику",
    analyticsOptInHint: "Помогает улучшать Almost без передачи личных данных",
    themeLabel: "Тема",
    themeLight: "Светлая",
    themeDark: "Тёмная",
    languageLabel: "Язык",
    languageRussian: "Русский",
    languageEnglish: "English",
    partialInfo: "Частичная оплата недоступна для нескольких товаров",
    partialLabel: "Введи сумму (до {{amount}})",
    partialError: "Нужна сумма от 1 и не больше полной стоимости",
    buyFull: "Купить целиком",
    buyPartial: "Купить часть",
    thinkLater: "Подумаю позже",
    wantAction: "В цели",
    saveAction: "Копить",
    maybeAction: "Подумаю",
    spendAction: "Потратить",
    editPrice: "Изменить цену",
    actionSoon: "Скоро добавим действие",
    saveSpamWarningItem: "Кажется, вы уже трижды подряд нажали «копить» на этой карточке за последние пять минут. Сделайте паузу, чтобы избежать случайных нажатий.",
    saveSpamWarningGlobal: "Слишком много быстрых нажатий «копить». Проверьте, что это не случайность, и попробуйте чуть позже.",
    priceEditTitle: "Настрой цену",
    priceEditPlaceholder: "Сумма в текущей валюте",
    priceEditSave: "Сохранить",
    priceEditReset: "Сбросить",
    priceEditCancel: "Отмена",
    priceEditDelete: "Удалить искушение",
    priceEditDeleteConfirm: "Удалить это искушение?",
    priceEditError: "Введи сумму больше нуля",
    priceEditNameLabel: "Название карточки",
    priceEditAmountLabel: "Стоимость ({{currency}})",
    wishAdded: "Добавлено в цели: {{title}}",
    wishDeclined: "+{{amount}} к копилке. Отличное решение!",
    customTemptationAdded: "Добавлено в искушения: {{title}}",
    saveCelebrateTitlePrefix: "Сэкономлено на:",
    saveCelebrateSubtitle: "Алми радуется, счёт пополнен!",
    saveGoalRemaining: "Примерно {{count}} таких решений до цели «{{goal}}».",
    saveGoalComplete: "Цель «{{goal}}» достигнута! Можно праздновать.",
    statsSpent: "Закрыто целей",
    statsSaved: "Спасено",
    statsItems: "Целей",
    statsCart: "В листе",
    statsDeclines: "Экономий",
    statsSpends: "Трат",
    statsFreeDays: "Серия",
    analyticsTitle: "Прогресс",
    analyticsPendingToBuy: "Цели",
    analyticsPendingToDecline: "Отказы",
    analyticsFridgeCount: "В «думаем»",
    analyticsBestStreak: "Бесплатных дней",
    analyticsConsentTitle: "Поможешь нам стать лучше?",
    analyticsConsentBody:
      "Мы собираем анонимную аналитику, чтобы понимать, какие решения помогают экономить чаще. Никакие персональные данные не сохраняем.",
    analyticsConsentAgree: "Делиться аналитикой",
    analyticsConsentSkip: "Продолжить без аналитики",
    onboardingBack: "Назад",
    historyTitle: "История событий",
    historyEmpty: "Тишина. Добавь цель или отметь бесплатный день.",
    privacyPolicyLink: "Политика конфиденциальности",
    privacyPolicyHint: "Откроем документ в браузере.",
    supportLink: "Поддержка",
    supportHint: "almostappsup@gmail.com",
    ratingPromptTitle: "Оцени Almost в сторе",
    ratingPromptBody: "Если Almost помогает держать импульсы под контролем, поставь оценку — это очень поддержит команду.",
    ratingPromptLater: "Позже",
    ratingPromptAction: "Оценить",
    levelShareButton: "Поделиться уровнем",
    levelShareModalTitle: "Новый уровень!",
    levelShareModalCaption: "Скринь карточку и отправляй друзьям",
    levelShareModalShare: "Делиться картинкой",
    levelShareModalClose: "Закрыть",
    levelShareError: "Не удалось поделиться. Попробуй позже.",
    levelShareShareMessage: "Я на уровне {{level}} в Almost. Присоединяйся к осознанным тратам!",
    levelShareCardBadge: "ALMOST HERO",
    levelShareCardTitle: "Уровень {{level}}",
    levelShareCardSubtitle: "Алми радуется моему прогрессу",
    levelShareJoin: "Присоединяйся к осознанным расходам",
    levelShareFooterBrand: "Almost",
    levelShareFooterHint: "APP",
    historyWishAdded: "Добавлена хотелка: {{title}}",
    historyWishProgress: "Прогресс по «{{title}}»: {{amount}} из {{target}}",
    historyWishDone: "Цель достигнута: {{title}}",
    historyDecline: "Отказ от {{title}} (+{{amount}})",
    historyRefuseSpend: "Сохранено на «{{title}}» (+{{amount}})",
    historyPendingAdded: "Отложено на 14 дней: {{title}}",
    historyPendingWant: "После паузы решили копить: {{title}}",
    historyPendingDecline: "После паузы отказ: {{title}} (+{{amount}})",
    historyPendingRemoved: "Удалено из «думаем»: {{title}}",
    historyFreeDay: "Бесплатный день №{{total}}",
    historySpend: {
      female: "Потратила: {{title}} (-{{amount}})",
      male: "Потратил: {{title}} (-{{amount}})",
      none: "Потрачено: {{title}} (-{{amount}})",
    },
    historyWishRemoved: "Удалена цель: {{title}}",
    historyGoalStarted: "Начата цель: {{title}}",
    historyGoalCancelled: "Отменена цель: {{title}}",
    historyRewardClaimed: "Получено достижение: {{title}}",
    historyTimestamp: "{{date}} · {{time}}",
    historyUnknown: "Событие",
    progressHeroTitle: "Реально спасено",
    progressHeroLevel: "Уровень {{level}}",
    progressHeroNext: "До следующего уровня {{amount}}",
    levelCelebrate: {
      female: "Ты достигла уровня {{level}}! Экономия становится привычкой.",
      male: "Ты достиг уровня {{level}}! Экономия становится привычкой.",
      none: "Новый уровень {{level}}! Экономия становится привычкой.",
    },
    tileRefuseCount: {
      female: "Отказалась уже {{count}} раз · +{{amount}}",
      male: "Отказался уже {{count}} раз · +{{amount}}",
      none: "Отказались уже {{count}} раз · +{{amount}}",
    },
    tileRefuseMessage: "Точно не покупай это сегодня, так ты действуешь в своих интересах.",
    tileReady: "Доступно",
    tileLocked: "Пока копим",
    spendWarning: {
      female: "Потратишь {{amount}}, точно готова?",
      male: "Потратишь {{amount}}, точно готов?",
      none: "Потратишь {{amount}}, точно готов(а)?",
    },
    spendSheetTitle: "Almost Pay",
    spendSheetSubtitle: "Шутливый Pay напоминает: экономия любит терпение.",
    spendSheetHint: "Дважды нажми (мысленно) на кнопку, если всё-таки тратишь.",
    spendSheetCancel: "Продолжить копить",
    spendSheetConfirm: "Потратить всё равно",
    stormOverlayMessage: "Гроза трат гремит. Может, спрячем карту?",
    rewardsEmpty: "Собери достижения: откажись от пары лишних хотелок или отметь бесплатный день.",
    goalsTitle: "Цели и награды",
    rewardUnlocked: "Достигнуто",
    rewardLocked: "Осталось {{amount}}",
    rewardRemainingAmount: "Осталось {{amount}}",
    rewardRemainingDays: "Осталось {{count}} дней",
    rewardRemainingRefuse: "Осталось {{count}} отказов",
    rewardRemainingFridge: "Осталось {{count}} хотелок в «думаем»",
    rewardRemainingDecisions: "Осталось {{count}} решений из «думаем»",
    rewardLockedGeneric: "Осталось {{count}} шагов",
    rewardBadgeLabel: "Награда",
    rewardBadgeClaimed: "Получено!",
    rewardClaimCta: "Собрать",
    rewardClaimHint: "Собери и получи {{amount}} здоровья",
    rewardClaimedStatus: "Здоровье получено",
    rewardHealthBonus: "+{{amount}} здоровья",
    freeDayHealthTitle: "Монетки",
    freeDayHealthSubtitle: "Тратятся на спасение серии и Алми.",
    rewardCelebrateTitle: "Награда {{title}} получена!",
    rewardCelebrateSubtitle: "Алми ликует: продолжай накапливать достижения.",
    challengeTabTitle: "Челленджи",
    challengeRewardsTabTitle: "Награды",
    challengeStartCta: "Взять челлендж",
    challengeClaimCta: "Собрать награду",
    challengeActiveCta: "В процессе",
    challengeStatusAvailable: "Готов к старту",
    challengeStatusActive: "Активен",
    challengeStatusCompleted: "Готов к выдаче",
    challengeStatusExpired: "Просрочен",
    challengeStatusClaimed: "Пройден",
    challengeRewardLabel: "Награда",
    challengeRewardHealth: "+{{amount}} здоровья",
    challengeProgressLabel: "{{current}} / {{target}}",
    challengeDurationLabel: "Длительность: {{days}} дн.",
    challengeTimeLeftLabel: "Осталось {{time}}",
    challengeTimeDayShort: "д",
    challengeTimeHourShort: "ч",
    challengeTimeMinuteShort: "м",
    challengeTimeExpired: "Время вышло",
    challengeReadyToClaim: "Готов к выдаче",
    challengeRestartHint: "Можно повторить - длительность {{days}} дн.",
    challengeStartedOverlay: "Челлендж «{{title}}» запущен",
    challengeCompletedOverlay: "«{{title}}» выполнен - забери награду!",
    challengeClaimedOverlay: "За челлендж «{{title}}» · +{{amount}} монет",
    challengeReminderTitle: "Челлендж Almost «{{title}}»",
    challengeReminderBody: "До финиша рукой подать. Отметь отказ и забери награду за «{{title}}».",
    challengeCancelAction: "Отменить",
    challengeAcceptConfirmTitle: "Начать челлендж?",
    challengeAcceptConfirmMessage: "Запустить «{{title}}»? Время пойдёт сразу.",
    challengeAcceptConfirmYes: "Начать",
    challengeAcceptConfirmNo: "Не сейчас",
    challengeCancelConfirmTitle: "Отменить челлендж?",
    challengeCancelConfirmMessage: "Прервать «{{title}}»? Прогресс обнулится.",
    challengeCancelConfirmYes: "Отменить",
    challengeCancelConfirmNo: "Продолжить",
    dailyChallengeOfferBadge: "мини-челлендж",
    dailyChallengeOfferTitle: "Вызов дня",
    dailyChallengeOfferSubtitle: "Попробуй провести день без «{{temptation}}»",
    dailyChallengeOfferHint: "Откажись хотя бы один раз и получишь двойную награду.",
    dailyChallengeOfferReward: "+{{amount}} монет сверху",
    dailyChallengeOfferAccept: "Принять вызов",
    dailyChallengeOfferLater: "Позже",
    dailyChallengeWidgetBadge: "мини-челлендж",
    dailyChallengeWidgetTitle: "Активный челлендж",
    dailyChallengeWidgetDesc: "День без «{{temptation}}» = монеты х2",
    dailyChallengeWidgetProgress: "Прогресс {{current}} / {{target}}",
    dailyChallengeWidgetReward: "+{{amount}} монет",
    dailyChallengeRewardReason: "Мини-челлендж «{{temptation}}» выполнен",
    dailyChallengeRewardNotificationTitle: "Almost: мини-челлендж закрыт",
    dailyChallengeRewardNotificationBody: "«{{temptation}}» сдалось — забери бонус +{{amount}} монет.",
    dailyChallengeFailedText: "Сегодня «{{temptation}}» оказалось сильнее",
    healthCelebrateTitle: "+{{amount}} монет",
    healthCelebrateSubtitle: "Сохраняй серию бесплатных дней.",
    healthCelebrateLevel: "Новый уровень! Алми доволен.",
    healthCelebrateReward: "Награда собрана - здоровье пополнено.",
    rainMessage: "Как же так? Спаси денежки.",
    developerReset: "Сбросить данные",
    developerResetConfirm: "Очистить цели, историю и профиль?",
    developerResetCancel: "Оставить",
    developerResetApply: "Сбросить",
    openSettings: "Настройки",
    defaultDealTitle: "Цель",
    defaultDealDesc: "Опиши, зачем ты копишь",
    photoLibrary: "Из галереи",
    photoCamera: "Через камеру",
    photoTapHint: "Тапни, чтобы добавить фото",
    photoPromptTitle: "Добавим фото?",
    photoPromptSubtitle: "Выбери: камера или галерея",
    photoPermissionDenied: "Нужно разрешение на доступ к камере или фото, чтобы добавить аватар.",
    photoPermissionSettings: "Открой настройки, чтобы дать доступ Almost к камере и фото.",
    photoPickerError: "Что-то пошло не так. Попробуй ещё раз.",
    registrationTitle: "Познакомимся",
    registrationSubtitle: "Расскажи о себе, чтобы Almost говорил на твоём языке",
    languageTitle: "Выбери язык",
    languageSubtitle: "Чтобы подсказки звучали естественно",
    languageCurrencyHint: "Язык и валюту можно поменять позже в профиле.",
    languageTermsHint: "Нажимая «Дальше», ты принимаешь пользовательское соглашение Almost.",
    languageTermsAccepted: "Соглашение уже принято — можешь двигаться дальше.",
    languageTermsLink: "Прочитать пользовательское соглашение",
    inputFirstName: "Имя",
    inputLastName: "Фамилия",
    inputMotto: "Девиз дня",
    currencyLabel: "Валюта накоплений",
    nextButton: "Дальше",
    goalTitle: "Определим цель",
    goalSubtitle: "Выбери главное направление экономии",
    goalCustomSectionTitle: "Свои цели",
    goalCustomCreate: "Добавить свою цель",
    goalButton: "Готово",
    goalPrimaryBadge: "Главная цель",
    goalTargetTitle: "Сколько нужно на цель?",
    goalTargetSubtitle: "Укажи сумму - Almost будет держать фокус и прогресс.",
    goalTargetPlaceholder: "Например 1200",
    goalTargetHint: "Сумму можно поменять позже в профиле.",
    goalTargetCTA: "Запомнить",
    goalTargetError: "Введи сумму цели",
    goalTargetLabel: "Сумма главной цели",
    primaryGoalLabel: "Главная цель",
    primaryGoalLocked: "Эту цель можно поменять только в профиле.",
    primaryGoalRemaining: "Осталось {{amount}}",
    goalWidgetTargetLabel: "Цель: {{amount}}",
    goalWidgetRemaining: "Осталось {{amount}}",
    goalWidgetComplete: "Цель достигнута",
    goalWidgetTitle: "До цели",
    goalWidgetCompleteTagline: "Экономия продолжалась - и цель закрыта.",
    goalAssignPromptTitle: "Куда зачесть экономию?",
    goalAssignPromptSubtitle: "Выбери цель, которую наполняет «{{title}}».",
    goalAssignNone: "Пока без цели",
    goalAssignTemptationTitle: "Назначить искушение",
    goalAssignTemptationSubtitle: "Что будет пополнять «{{goal}}»?",
    goalAssignClear: "Сбросить назначение",
    goalAssignFieldLabel: "Куда копим",
    goalDestinationLabel: "Куда копим",
    goalStatusInWishlist: "в цели",
    goalSwipeAdd: "в цели",
    goalSwipeDelete: "Удалить",
    goalPinnedBadge: "Цель",
    goalRemoved: "Карточка убрана из целей",
    goalEditAction: "Изменить",
    goalDeleteAction: "Удалить",
    goalEditModalTitle: "Редактировать цель",
    goalEditNameLabel: "Название цели",
    goalEditTargetLabel: "Сумма цели",
    goalEditEmojiLabel: "Эмодзи цели",
    goalEditSave: "Сохранить",
    goalEditCancel: "Отмена",
    goalEditNameError: "Введи название цели",
    goalEditTargetError: "Введи сумму цели",
    goalAssignPromptTitle: "Куда зачесть экономию?",
    goalAssignPromptSubtitle: "Выбери цель, которую наполняет «{{title}}».",
    goalAssignNone: "Пока без цели",
    goalAssignTemptationTitle: "Назначить искушение",
    goalAssignTemptationSubtitle: "Что будет пополнять «{{goal}}»?",
    goalAssignClear: "Сбросить назначение",
    goalAssignFieldLabel: "Куда копим",
    goalCelebrationTitle: "Главная цель достигнута!",
    goalCelebrationSubtitle: "Алми гордится тобой. Можно выбрать новую мечту.",
    goalCelebrationTarget: "Собрано {{amount}}",
    goalRenewalTitle: "Новая главная цель?",
    goalRenewalSubtitle: "Зафиксируй следующую мечту, чтобы Almost продолжал вести тебя к ней.",
    goalRenewalCreate: "Создать цель",
    goalRenewalLater: "Позже",
    levelWidgetTitle: "Прогресс уровней",
    levelWidgetCurrent: "Уровень {{level}}",
    levelWidgetSubtitle: "До следующего уровня {{amount}}",
    levelWidgetTarget: "Следующий уровень при {{amount}}",
    levelWidgetMaxed: "Максимальный уровень достигнут!",
    onboardingGuideTitle: "Смысл Almost",
    onboardingGuideSubtitle: "Первые шаги в борьбе с потребительством и импульсивными тратами.",
    onboardingGuideButton: "Продолжить",
    termsTitle: "Пользовательское соглашение",
    termsSubtitle: "Прочитай ключевые условия Almost. Продолжая, ты подтверждаешь согласие с ними.",
    termsViewFull: "Открыть полную версию",
    termsLinkHint: "Ссылка откроет документ в браузере.",
    termsAccept: "Принимаю",
    termsDecline: "Отменить",
    guideStepTrackTitle: "Главная цель: осознанность",
    guideStepTrackDesc: "Мы помогаем тратить деньги только на важное, сохраняя бюджет и фокус на крупных целях.",
    guideStepDecisionTitle: "Меню искушений",
    guideStepDecisionDesc: "Отмечай каждое искушение и уставай перед ним, и тогда деньги остаются в кошельке, а Almost фиксирует победы.",
    guideStepRewardTitle: "Визуализация прогресса",
    guideStepRewardDesc: "Не забывай отмечать, на чём сэкономила: приложение показывает путь к глобальной цели и даёт мотивацию.",
    personaTitle: "Расскажи про себя",
    personaSubtitle: "Расскажи о себе, чтобы приложение было персонализированным.",
    personaGenderLabel: "Как к тебе обращаться?",
    personaHabitLabel: "Профиль, который ближе всего",
    personaConfirm: "Продолжить",
    customSpendTitle: "Твоё ежедневное искушение",
    customSpendSubtitle: "Дай ему имя - Almost поможет отказываться чаще.",
    customSpendNamePlaceholder: "Матча, сигареты, маникюр...",
    customSpendAmountLabel: "Сколько стоит один раз?",
    customSpendAmountPlaceholder: "Например {{amount}}",
    customSpendFrequencyLabel: "Сколько раз в неделю поддаёшься?",
    customSpendFrequencyPlaceholder: "Например 4",
    customSpendHint: "Это всегда можно поменять в профиле.",
    customSpendSkip: "Пропустить",
    smartReminderTitle: [
      "Almost ловит «{{temptation}}»",
      "Алми чувствует импульс: «{{temptation}}»",
      "Умное напоминание Almost про «{{temptation}}»",
    ],
    smartReminderBody: [
      "Недавно Almost записал «{{temptation}}». Повтори паузу и направь деньги в цель.",
      "Almost заметил привычку: вдохни перед «{{temptation}}» и выбери копилку.",
      "Держим серию отказов — «{{temptation}}» подождёт ещё чуть-чуть.",
      "Алми шепчет: чем чаще выбираешь копилку вместо «{{temptation}}», тем умнее подсказки.",
    ],
    smartInsightDeclineTitle: {
      female: "Almost запомнил вчерашний отказ от «{{temptation}}»",
      male: "Almost запомнил вчерашний отказ от «{{temptation}}»",
      none: "Almost запомнил отказ от «{{temptation}}» вчера",
    },
    smartInsightDeclineBody: "Повтори победу сегодня — Almost запишет новую серию.",
    smartInsightSpendTitle: {
      female: "Almost заметил вчерашний срыв на «{{temptation}}»",
      male: "Almost заметил вчерашний срыв на «{{temptation}}»",
      none: "Almost заметил, что «{{temptation}}» победило вчера",
    },
    smartInsightSpendBody: "Сделай паузу сегодня, и Almost отметит победу в копилке.",
    dailyNudgeMorningTitle: ["Утренний пинг Almost", "Алми проверяет фокус"],
    dailyNudgeMorningBody: [
      "Начни день осознанно: вспомни, ради какой цели ты копишь.",
      "Алми следит за импульсами — сделай паузу перед первой покупкой.",
    ],
    dailyNudgeDayTitle: ["Дневной чек Almost", "Алми держит фокус"],
    dailyNudgeDayBody: [
      "В середине дня импульсы растут. Подумай, поддержит ли покупка твою цель.",
      "Если рука тянется к кошельку, вспомни про Almost и выбери копилку.",
    ],
    dailyNudgeAfternoonTitle: ["Послеобеденный чек-поинт Almost", "Алми сбавляет темп"],
    dailyNudgeAfternoonBody: [
      "Сделай чек-ин перед любой покупкой и отправь свободные деньги в Almost.",
      "Пятиминутная пауза сейчас поможет удержать курс экономии.",
    ],
    dailyNudgeEveningTitle: ["Вечерний щит Almost", "Алми бережёт твой вечер"],
    dailyNudgeEveningBody: [
      "Вечером особенно тянет тратить. Запиши победу, даже если она маленькая.",
      "Закрой день записью в Almost — так подсказки останутся умными.",
    ],
    baselineTitle: "Сколько уходит на мелкие импульсы?",
    baselineSubtitle: "Прикинь месячную сумму - Almost сравнит её с реальными победами.",
    baselinePlaceholder: "Например {{amount}}",
    baselineCTA: "Запомнить",
    baselineHint: "Это ориентир, позже можно обновить его в профиле.",
    baselineInputError: "Введи сумму ежемесячных необязательных трат",
    potentialBlockTitle: "Потенциал экономии",
    potentialBlockSubtitle: "",
    potentialBlockStatusAhead: "Ого! Ты опережаешь прогноз. Держи темп!",
    potentialBlockStatusStart: "Начни отмечать отказы - потенциал ждёт.",
    potentialBlockStatusBehind: "Ты на пути, но потенциал выше.",
    potentialBlockStatusOnTrack: "Ты почти полностью используешь потенциал. Продолжай!",
    potentialBlockActualLabel: "Реально спасено",
    potentialBlockPotentialLabel: "Потенциал",
    potentialBlockHint: "Потенциал ещё {{amount}}. Не всё потеряно 🙂",
    potentialBlockDetails:
      "Он берёт ваш ежемесячный бюджет на искушения (тот, что вы указали при регистрации), делит сумму на секунды и показывает, сколько денег можно было бы спасти прямо сейчас.",
    potentialBlockCta: "Расскажи, сколько уходит на мелкие траты, и мы покажем, сколько ты мог бы уже спасти.",
    potentialPushAheadTitle: "Ты обгоняешь свой потенциал!",
    potentialPushAheadBody:
      "Потенциал дошёл до {{potential}}, а у тебя уже {{actual}}. Продолжай держать темп.",
    potentialPushBehindTitle: "Счётчик потенциала ждёт тебя",
    potentialPushBehindBody:
      "Потенциал уже {{potential}}, до него осталось {{shortfall}}. Сделай паузу перед тратой и отметь новую экономию.",
    quickCustomTitle: "Новое искушение",
    quickCustomSubtitle: "Опиши траты, от которых хочешь отказаться первой",
    quickCustomNameLabel: "Название",
    quickCustomAmountLabel: "Стоимость ({{currency}})",
    quickCustomEmojiLabel: "Эмодзи карточки",
    quickCustomConfirm: "Добавить",
    quickCustomCancel: "Отмена",
    coinEntryTitle: "Сколько внести?",
    coinEntrySubtitle: "Проведи монетку вверх-вниз и выбери категорию.",
    coinEntryHint: "Нажми кнопку выше, чтобы подтвердить копилку или трату.",
    coinEntryManual: "...",
    coinEntryManualTitle: "Выбери новый максимум",
    coinEntryManualPlaceholder: "Например {{amount}}",
    coinEntryManualSave: "Запомнить",
    coinEntryManualCancel: "Отмена",
    coinEntryManualError: "Введи корректную сумму",
    coinEntryManualAmountTitle: "Введи сумму вручную",
    coinEntryManualAmountPlaceholder: "Например {{amount}}",
    coinEntryCategoryLabel: "Категория",
    coinEntryCategoryError: "Сначала выбери категорию",
    coinEntrySaveLabel: "Быстрое накопление",
    coinEntrySpendLabel: "Быстрая трата",
    fabNewGoal: "Новая цель",
    fabNewTemptation: "Новая трата",
    fabQuickActionTitle: "Последнее искушение",
    fabQuickActionSubtitle: "Повтори действие для «{{title}}»",
    fabQuickActionEmpty: "Не нашлось последнего действия. Сначала взаимодействуй с карточкой.",
    fabTutorialTitle: "Кнопка «+»",
    fabTutorialDesc:
      "Тапай, чтобы быстро записать кастомную трату или накопление. Зажми, чтобы создать цель или искушение.",
    fabTutorialAction: "Понятно",
    newGoalTitle: "Новая цель",
    newGoalSubtitle: "Как назовём мечту и сколько она стоит?",
    newGoalNameLabel: "Название цели",
    newGoalTargetLabel: "Сумма ({{currency}})",
    newGoalEmojiLabel: "Эмодзи цели",
    newGoalCreate: "Создать цель",
    newGoalCancel: "Отмена",
    newPendingTitle: "Новое «думаем»",
    newPendingSubtitle: "Опиши искушение, которое разумно отложить на 14 дней.",
    newPendingNameLabel: "Название",
    newPendingAmountLabel: "Стоимость ({{currency}})",
    newPendingEmojiLabel: "Эмодзи карточки",
    newPendingCreate: "Добавить в «думаем»",
    newPendingCancel: "Отмена",
    tutorialFeedTitle: "Лента искушений",
    tutorialFeedDesc: "Отмечай импульсы и выбирай: копить, добавить в цели или подумать 14 дней.",
    tutorialGoalsTitle: "Цели",
    tutorialGoalsDesc: "Здесь живут мечты. Следи за прогрессом и обновляй цель.",
    tutorialThinkingTitle: "Меню «Думаем»",
    tutorialThinkingDesc: "Отправляй импульсы на паузу и возвращайся к ним через 14 дней, чтобы решить трезво.",
    tutorialRewardsTitle: "Награды и челленджи",
    tutorialRewardsDesc: "Заглядывай сюда, чтобы собирать награды за прогресс и запускать челленджи с бонусами.",
    tutorialProfileTitle: "Профиль и мотивация",
    tutorialProfileDesc: "Тут меняешь тему, язык, напоминания и персонализацию приложения под себя.",
    tutorialSkip: "Пропустить",
    tutorialNext: "Дальше",
    tutorialDone: "Завершить",
    tutorialProgress: "{{current}} из {{total}}",
    tabHintFeedTitle: "Главный экран",
    tabHintFeedBody: "Фиксируй импульсы и выбирай: копить, добавить в цели или отложить на потом.",
    tabHintCartTitle: "Цели",
    tabHintCartBody: "Ставь мечты в приоритет и обновляй прогресс, когда копишь.",
    tabHintPendingTitle: "Меню «Думаем»",
    tabHintPendingBody: "Отправляй покупки на паузу и возвращайся через 14 дней, чтобы решить трезво.",
    tabHintPurchasesTitle: "Награды",
    tabHintPurchasesBody: "Собирай достижения и запускай челленджи с дополнительными монетами.",
    tabHintProfileTitle: "Профиль",
    tabHintProfileBody: "Настраивай тему, язык, напоминания и личные цели.",
    tabHintGotIt: "Понятно",
  },
  en: {
    appTagline: "An offline temptation board that keeps savings safe",
    tamagotchiHungryBubble: "🐟",
    tamagotchiFoodMenuTitle: "Almi's menu",
    tamagotchiFoodBoostLabel: "+{{percent}}% fullness",
    tamagotchiFoodWantLabel: "Want",
    tamagotchiSkinTitle: "Almi skins",
    tamagotchiSkinSubtitle: "A new vibe for Almi keeps your savings fresh",
    tamagotchiSkinCurrent: "Selected",
    tamagotchiSkinUnlockTitle: "Almost just launched 🚀",
    tamagotchiSkinUnlockDescription:
      "Help us get better: send feedback to {{email}} and unlock every skin.",
    tamagotchiSkinUnlockButton: "Send feedback & unlock skins",
    tamagotchiSkinLockedBadge: "Locked",
    heroAwaiting: "On the wish list",
    heroSpendLine: {
      female: "Latest save: “{{title}}”.",
      male: "Latest save: “{{title}}”.",
      none: "Latest save: “{{title}}”.",
    },
    heroSpendRecentTitle: "Recent saves:",
    heroSpendFallback: "Every mindful pause fuels the freedom fund",
    heroEconomyContinues: "Savings continue.",
    heroExpand: "Show details",
    heroCollapse: "Hide details",
    heroDailyTitle: "Weekly savings",
    heroDailyEmpty: "No skips yet. Try saving once this week.",
    feedEmptyTitle: "Nothing here",
    feedEmptySubtitle: "Try another tag or refresh the catalog",
    buyNow: "Pay with {{pay}}",
    addToCart: "Save for later",
    buyExternal: "Open product page",
    wishlistTitle: "Goals",
    wishlistEmptyTitle: "No goals yet",
    wishlistEmptySubtitle: "Pick a temptation from the feed and start saving for it",
    buyLabel: "Grab",
    buyAllLabel: "Check out everything",
    totalLabel: "Total",
    cartRemove: "Remove",
    wishlistTab: "Goals",
    wishlistProgress: "{{current}} of {{target}}",
    wishlistSavedHint: "How much you need to save",
    wishlistSaveProgress: "Update progress",
    wishlistSetActive: "Set active",
    wishlistActive: "Active goal",
    wishlistRemove: "Remove",
    wishlistRemoveConfirm: "Remove this wish?",
    wishlistDoneLabel: "Done",
    wishlistSummary: "Total targets worth {{amount}}",
    freeDayButton: "Free day",
    freeDayLocked: "After 6 pm",
    freeDayBlocked: "Unavailable",
    freeDayStatusAvailable: "Log day",
    freeDayStatusLogged: "Logged",
    freeDayLoggedToday: "Logged today",
    freeDayConfirm: "Stayed away from impulse buys today?",
    freeDayCongrats: "{{days}} day streak! Budget loves it.",
    freeDayMilestone: "{{days}} days in a row! New badge unlocked.",
    freeDayCardTitle: "Free-day streak",
    freeDayActiveLabel: "Streak {{days}} days",
    freeDayInactiveLabel: "Log an impulse-free evening",
    freeDayCurrentLabel: "Current",
    freeDayBestLabel: "Best",
    freeDayTotalShort: "Total",
    freeDayWeekTitle: "This week",
    freeDayExpand: "Show details",
    freeDayCollapse: "Hide",
    freeDayTotalLabel: "Total: {{total}}",
    freeDayRescueTitle: "Missed a day?",
    freeDayRescueSubtitle: "Spend {{cost}} health to keep the streak alive.",
    freeDayRescueButton: "Rescue streak",
    freeDayRescuePillLabel: "Rescue ×{{count}}",
    freeDayRescueNeedHealth: "Need {{cost}} health",
    freeDayRescueNeedTime: "Available after 6 pm",
    freeDayRescueOverlay: "Streak rescued",
    freeDayCoinReward: "Free day logged: +{{coins}} blue coins.",
    freeDayCoinRewardStreak: "🔥 {{days}}-day streak: +{{coins}} blue coins.",
    impulseCardTitle: "Impulse map",
    impulseCardSubtitle: "See when temptations usually win or when you stay strong.",
    impulseLoseLabel: "Weak spot",
    impulseLoseCopy: "{{temptation}} usually wins around {{time}}.",
    impulseLoseEmpty: "No weak spots yet.",
    impulseWinLabel: "Winning streak",
    impulseWinCopy: "You resist {{temptation}} most often around {{time}}.",
    impulseWinEmpty: "Wins will show up once you log more saves.",
    impulseTrendLabel: "Most impulses land in {{category}}",
    impulseCategorySave: "Saves: {{count}}",
    impulseCategorySpend: "Splurges: {{count}}",
    impulseAnytimeLabel: "any time",
    impulseExpand: "Expand",
    impulseCollapse: "Hide map",
    impulseAlertTitle: "Impulse alert",
    impulseAlertMessage:
      "You’re entering a high-impulse zone for {{temptation}} ({{window}}). Skip it and stash {{amount}}!",
    impulseNotificationTitle: "Almost spotted an impulse: “{{temptation}}”",
    impulseNotificationBody: "You usually cave now. Take an Almost pause and stash {{amount}}.",
    impulseCategoryLabel: "Impulse category",
    focusDigestPositiveTitle: "Trend is on track",
    focusDigestPositiveBody:
      "You resist more than you spend.\nBiggest win: “{{strong}}”.\nWatch “{{weak}}”.",
    focusDigestNegativeTitle: "Time to refocus",
    focusDigestNegativeBody:
      "Spending is outpacing saves.\nBiggest leak: “{{weak}}”. Focus on it.",
    focusDigestStrongLabel: "Biggest win",
    focusDigestWeakLabel: "Needs attention",
    focusDigestButton: "Focus",
    focusDigestDismiss: "Later",
    focusDigestMissing: "No data yet",
    focusBadgeLabel: "Focus",
    focusPromptTitle: "Refocus time",
    focusPromptBody: "You caved to “{{title}}” a few times. Make it your focus?",
    focusVictoryReward: "Focus “{{title}}” conquered! +3 green coins",
    focusRewardTitle: "Focus conquered!",
    focusRewardSubtitle: "You resisted “{{title}}” three times. +{{amount}} green coins.",
    dailyReflectionReminderTitle: "Almost nightly check-in",
    dailyReflectionReminderBody:
      "{{time}} left today. Log a save or spend so our smart nudges stay relevant.",
    pendingTab: "Thinking",
    pendingTitle: "Thinking",
    pendingEmptyTitle: "Nothing in Thinking",
    pendingEmptySubtitle: "Park temptations in Thinking and we’ll remind you in 14 days.",
    pendingDaysLeft: "{{days}} days left",
    pendingExpired: "Decision overdue",
    pendingDueToday: "Decide today",
    pendingActionWant: "Start saving",
    pendingActionDecline: "Save it",
    pendingNotificationTitle: "Almost check-in: decide on “{{title}}”",
    pendingNotificationBody: "Two weeks are up. Start saving for “{{title}}” or let it go?",
    pendingAdded: "Sent to Thinking. We’ll remind you in 2 weeks.",
    pendingDeleteConfirm: "Remove this item from Thinking?",
    pendingCustomError: "Add a name and price for this temptation.",
    feedTab: "Feed",
    profileTab: "Profile",
    payButton: "Pay",
    cartOverlay: "Savings updated",
    purchasesTitle: "Rewards",
    purchasesSubtitle: "Track achievements and remind yourself why you save",
    progressLabel: "Mindful level",
    progressGoal: "{{current}} / {{goal}}",
    progressHint: "Only {{amount}} left until ‘budget zen master’",
    emptyPurchases: "Nothing yet. Which already saves money",
    profileEdit: "Edit",
    profileSave: "Save",
    profileCancel: "Cancel",
    profileOk: "Ok",
    profileJoinDate: "Mindful saving since {{date}}",
    settingsTitle: "Settings & personalisation",
    analyticsOptInLabel: "Send anonymous analytics",
    analyticsOptInHint: "Helps improve Almost without sharing personal data",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    languageLabel: "Language",
    languageRussian: "Русский",
    languageEnglish: "English",
    partialInfo: "Partial payment isn’t available for bundles",
    partialLabel: "Enter amount (up to {{amount}})",
    partialError: "Enter a value between 1 and the total cost",
    buyFull: "Pay full",
    buyPartial: "Pay partially",
    thinkLater: "Think later",
    wantAction: "Add to goals",
    saveAction: "Save it",
    maybeAction: "Think later",
    spendAction: "Spend it",
    editPrice: "Edit price",
    actionSoon: "Detailed flow is coming in the next update.",
    saveSpamWarningItem: "Looks like you tapped “Save it” on this card several times within five minutes. Take a short pause to avoid accidental taps.",
    saveSpamWarningGlobal: "Lots of fast “Save it” taps in a row. Double-check that it’s intentional and try again in a moment.",
    priceEditTitle: "Adjust the target amount",
    priceEditPlaceholder: "Enter amount",
    priceEditSave: "Save",
    priceEditReset: "Reset",
    priceEditCancel: "Cancel",
    priceEditDelete: "Delete temptation",
    priceEditDeleteConfirm: "Remove this temptation?",
    priceEditError: "Enter a positive number",
    priceEditNameLabel: "Card name",
    priceEditAmountLabel: "Amount ({{currency}})",
    wishAdded: "Added to wishes: {{title}}",
    wishDeclined: "+{{amount}} safely tucked away",
    customTemptationAdded: "Added to temptations: {{title}}",
    saveCelebrateTitlePrefix: "Skipped:",
    saveCelebrateSubtitle: "Almi purrs: savings up!",
    saveGoalRemaining: "Roughly {{count}} more skips to reach “{{goal}}”.",
    saveGoalComplete: "Goal “{{goal}}” reached! Celebrate the win.",
    freeDayButton: "Free day",
    freeDayLocked: "After 6 pm",
    freeDayBlocked: "Unavailable",
    freeDayStatusAvailable: "Log day",
    freeDayStatusLogged: "Logged",
    freeDayLoggedToday: "Logged today",
    freeDayConfirm: "Stayed away from impulse buys today?",
    freeDayCongrats: "{{days}} day streak! Budget loves it.",
    freeDayMilestone: "{{days}} days in a row! New badge unlocked.",
    freeDayStreakLabel: "Free-day streak",
    freeDayTotalLabel: "Total: {{total}}",
    statsSpent: "Finished goals",
    statsSaved: "Saved",
    statsItems: "Goals",
    statsCart: "In list",
    statsDeclines: "Saves",
    statsSpends: "Spends",
    statsFreeDays: "Streak",
    analyticsTitle: "Progress",
    analyticsPendingToBuy: "Wishes",
    analyticsPendingToDecline: "Savings",
    analyticsFridgeCount: "Thinking list",
    analyticsBestStreak: "Free days",
    analyticsConsentTitle: "Help us improve?",
    analyticsConsentBody:
      "We collect anonymous analytics to see which moments inspire more saving. No personal data is stored.",
    analyticsConsentAgree: "Share analytics",
    analyticsConsentSkip: "Skip for now",
    onboardingBack: "Back",
    historyTitle: "Event log",
    historyEmpty: "Nothing yet. Add a goal or mark a free day.",
    privacyPolicyLink: "Privacy policy",
    privacyPolicyHint: "Opens in your browser.",
    supportLink: "Contact support",
    supportHint: "almostappsup@gmail.com",
    ratingPromptTitle: "Enjoying Almost?",
    ratingPromptBody: "If it helps tame impulse buys, leave a quick store review — it keeps the team motivated.",
    ratingPromptLater: "Maybe later",
    ratingPromptAction: "Rate Almost",
    levelShareButton: "Share level",
    levelShareModalTitle: "Level unlocked!",
    levelShareModalCaption: "Grab this card and hype your win",
    levelShareModalShare: "Share this card",
    levelShareModalClose: "Close",
    levelShareError: "Couldn’t share this time. Try again later.",
    levelShareShareMessage: "I'm already level {{level}} in Almost. Join the mindful crew!",
    levelShareCardBadge: "ALMOST HERO",
    levelShareCardTitle: "Level {{level}}",
    levelShareCardSubtitle: "Almi is cheering for me",
    levelShareJoin: "Join mindful spenders",
    levelShareFooterBrand: "Almost",
    levelShareFooterHint: "APP",
    historyWishAdded: "Wish added: {{title}}",
    historyWishProgress: "Progress “{{title}}”: {{amount}} of {{target}}",
    historyWishDone: "Goal completed: {{title}}",
    historyDecline: "Declined {{title}} (+{{amount}} saved)",
    historyRefuseSpend: "Skipped {{title}} (+{{amount}} saved)",
    historyPendingAdded: "Queued for later: {{title}}",
    historyPendingWant: "Later decision → saving: {{title}}",
    historyPendingDecline: "Later decision → decline: {{title}} (+{{amount}})",
    historyPendingRemoved: "Removed from Thinking: {{title}}",
    historyFreeDay: "Free day #{{total}}",
    historySpend: "Spent on {{title}} (-{{amount}})",
    historyWishRemoved: "Goal removed: {{title}}",
    historyGoalStarted: "Goal started: {{title}}",
    historyGoalCancelled: "Goal cancelled: {{title}}",
    historyRewardClaimed: "Reward claimed: {{title}}",
    historyTimestamp: "{{date}} · {{time}}",
    historyUnknown: "Event",
    progressHeroTitle: "Real savings",
    progressHeroLevel: "Level {{level}}",
    progressHeroNext: "To next level {{amount}}",
    levelCelebrate: "Level {{level}} unlocked, savings armor upgraded!",
    tileRefuseCount: "Already skipped {{count}}× · +{{amount}}",
    tileRefuseMessage: "Skip it today and your savings will thank you",
    tileReady: "Ready to enjoy",
    tileLocked: "Still saving",
    spendWarning: "Spending {{amount}}. Sure about it?",
    spendSheetTitle: "Almost Pay",
    spendSheetSubtitle: "Our playful Pay suggests saving just a bit longer.",
    spendSheetHint: "Double-press (in spirit) to go ahead anyway.",
    spendSheetCancel: "Keep saving",
    spendSheetConfirm: "Spend anyway",
    stormOverlayMessage: "Stormy spending vibes. Still want to swipe?",
    rewardsEmpty: "Earn achievements by skipping temptations or logging a free day.",
    goalsTitle: "Goals & rewards",
    rewardUnlocked: "Unlocked",
    rewardLocked: "{{amount}} to go",
    rewardRemainingAmount: "{{amount}} to go",
    rewardRemainingDays: "{{count}} days remaining",
    rewardRemainingRefuse: "{{count}} more skips",
    rewardRemainingFridge: "{{count}} more Thinking items",
    rewardRemainingDecisions: "{{count}} Thinking decisions left",
    rewardLockedGeneric: "{{count}} steps remaining",
    rewardBadgeLabel: "Reward",
    rewardBadgeClaimed: "Claimed!",
    rewardClaimCta: "Collect",
    rewardClaimHint: "Collect to gain {{amount}} health",
    rewardClaimedStatus: "Health banked",
    rewardHealthBonus: "+{{amount}} health",
    freeDayHealthTitle: "Coins",
    freeDayHealthSubtitle: "Spend to rescue streaks and feed Almi.",
    rewardCelebrateTitle: "{{title}} unlocked!",
    rewardCelebrateSubtitle: "Almi is proud-keep the streak going.",
    challengeTabTitle: "Challenges",
    challengeRewardsTabTitle: "Rewards",
    challengeStartCta: "Start challenge",
    challengeClaimCta: "Collect reward",
    challengeActiveCta: "In progress",
    challengeStatusAvailable: "Ready to start",
    challengeStatusActive: "Active",
    challengeStatusCompleted: "Ready to claim",
    challengeStatusExpired: "Expired",
    challengeStatusClaimed: "Completed",
    challengeRewardLabel: "Reward",
    challengeRewardHealth: "+{{amount}} health",
    challengeProgressLabel: "{{current}} / {{target}}",
    challengeDurationLabel: "Duration: {{days}} days",
    challengeTimeLeftLabel: "{{time}} left",
    challengeTimeDayShort: "d",
    challengeTimeHourShort: "h",
    challengeTimeMinuteShort: "m",
    challengeTimeExpired: "Time is up",
    challengeReadyToClaim: "Reward ready",
    challengeRestartHint: "Repeat anytime ({{days}}-day run)",
    challengeStartedOverlay: "Challenge “{{title}}” started",
    challengeCompletedOverlay: "“{{title}}” complete - collect the bonus!",
    challengeClaimedOverlay: "Challenge “{{title}}” · +{{amount}} coins",
    challengeReminderTitle: "Almost challenge “{{title}}”",
    challengeReminderBody: "You're close to the finish. Log another save for “{{title}}” and claim the reward.",
    challengeCancelAction: "Cancel",
    challengeAcceptConfirmTitle: "Start challenge?",
    challengeAcceptConfirmMessage: "Kick off “{{title}}”? The timer starts right away.",
    challengeAcceptConfirmYes: "Start",
    challengeAcceptConfirmNo: "Not now",
    challengeCancelConfirmTitle: "Cancel this challenge?",
    challengeCancelConfirmMessage: "Stop “{{title}}”? All progress will reset.",
    challengeCancelConfirmYes: "Cancel",
    challengeCancelConfirmNo: "Keep going",
    dailyChallengeOfferBadge: "daily challenge",
    dailyChallengeOfferTitle: "Today’s mini challenge",
    dailyChallengeOfferSubtitle: "Go a day without “{{temptation}}”",
    dailyChallengeOfferHint: "Skip it once today and grab double rewards.",
    dailyChallengeOfferReward: "+{{amount}} bonus health",
    dailyChallengeOfferAccept: "Accept challenge",
    dailyChallengeOfferLater: "Maybe later",
    dailyChallengeWidgetBadge: "daily challenge",
    dailyChallengeWidgetTitle: "Active mini challenge",
    dailyChallengeWidgetDesc: "Day without “{{temptation}}” = coins x2",
    dailyChallengeWidgetProgress: "Progress {{current}} / {{target}}",
    dailyChallengeWidgetReward: "+{{amount}} health",
    dailyChallengeRewardReason: "Mini challenge “{{temptation}}” complete",
    dailyChallengeRewardNotificationTitle: "Almost daily challenge complete",
    dailyChallengeRewardNotificationBody: "“{{temptation}}” gave in — grab your +{{amount}} coin bonus.",
    dailyChallengeFailedText: "“{{temptation}}” won today",
    healthCelebrateTitle: "+{{amount}} coins",
    healthCelebrateSubtitle: "Use it to rescue your free-day streak.",
    healthCelebrateLevel: "Level up! Almi is happy.",
    healthCelebrateReward: "Reward collected - health restored.",
    rainMessage: "Oh no! Protect the cash.",
    developerReset: "Reset data",
    developerResetConfirm: "Clear wishes, history and profile?",
    developerResetCancel: "Keep",
    developerResetApply: "Reset",
    openSettings: "Settings",
    defaultDealTitle: "Goal",
    defaultDealDesc: "Describe what you’re saving for",
    photoLibrary: "From library",
    photoCamera: "Use camera",
    photoTapHint: "Tap to add a photo",
    photoPromptTitle: "Add a photo?",
    photoPromptSubtitle: "Choose camera or library",
    photoPermissionDenied: "We need camera or photo access to update your avatar.",
    photoPermissionSettings: "Open Settings to let Almost access the camera and photos.",
    photoPickerError: "Something went wrong. Please try again.",
    registrationTitle: "Let’s set things up",
    registrationSubtitle: "Tell us who you are so Almost speaks your language",
    languageTitle: "Choose a language",
    languageSubtitle: "We’ll tailor every hint to you",
    languageCurrencyHint: "You can adjust language and currency later in Profile.",
    languageTermsHint: "By continuing you accept Almost’s Terms of Use.",
    languageTermsAccepted: "Terms accepted — you can move ahead.",
    languageTermsLink: "Read the full Terms of Use",
    inputFirstName: "First name",
    inputLastName: "Last name",
    inputMotto: "Personal motto",
    currencyLabel: "Savings currency",
    nextButton: "Continue",
    goalTitle: "Pick a goal",
    goalSubtitle: "Where should your mindful deals lead?",
    goalCustomSectionTitle: "Your goals",
    goalCustomCreate: "Add your own goal",
    goalButton: "Start saving",
    goalPrimaryBadge: "Primary goal",
    goalTargetTitle: "How big is this goal?",
    goalTargetSubtitle: "Set the amount so Almost tracks every dollar toward it.",
    goalTargetPlaceholder: "E.g. 1200",
    goalTargetHint: "You can edit the amount later in the profile.",
    goalTargetCTA: "Save amount",
    goalTargetError: "Enter a goal amount",
    goalTargetLabel: "Goal amount",
    primaryGoalLabel: "Primary goal",
    primaryGoalLocked: "Change this goal later from your profile.",
    primaryGoalRemaining: "Remaining {{amount}}",
    goalWidgetTargetLabel: "Goal: {{amount}}",
    goalWidgetRemaining: "{{amount}} to go",
    goalWidgetComplete: "Goal completed",
    goalWidgetTitle: "To goal",
    goalWidgetCompleteTagline: "Savings kept rolling - mission accomplished.",
    goalAssignPromptTitle: "Where should this savings go?",
    goalAssignPromptSubtitle: "Pick the goal that “{{title}}” will fund.",
    goalAssignNone: "No goal yet",
    goalAssignTemptationTitle: "Assign temptation",
    goalAssignTemptationSubtitle: "Which habit fills “{{goal}}”?",
    goalAssignClear: "Clear assignment",
    goalAssignFieldLabel: "Sends savings to",
    goalDestinationLabel: "Saving for",
    goalStatusInWishlist: "Add to goal",
    goalSwipeAdd: "Add to goal",
    goalSwipeDelete: "Delete",
    goalPinnedBadge: "Goal",
    goalRemoved: "Goal removed",
    goalEditAction: "Edit",
    goalDeleteAction: "Remove",
    goalEditModalTitle: "Edit goal",
    goalEditNameLabel: "Goal name",
    goalEditTargetLabel: "Goal amount",
    goalEditEmojiLabel: "Goal emoji",
    goalEditSave: "Save",
    goalEditCancel: "Cancel",
    goalEditNameError: "Enter a goal name",
    goalEditTargetError: "Set a goal amount",
    goalCelebrationTitle: "Main goal complete!",
    goalCelebrationSubtitle: "Almi is proud - time to pick the next dream.",
    goalCelebrationTarget: "Saved {{amount}}",
    goalRenewalTitle: "Pick a new main goal",
    goalRenewalSubtitle: "You finished this one - lock in a fresh target to keep the streak alive.",
    goalRenewalCreate: "Set new goal",
    goalRenewalLater: "Later",
    levelWidgetTitle: "Level progress",
    levelWidgetCurrent: "Level {{level}}",
    levelWidgetSubtitle: "{{amount}} to the next level",
    levelWidgetTarget: "Next level at {{amount}} total",
    levelWidgetMaxed: "Top level reached - legendary saver!",
    onboardingGuideTitle: "What Almost is about",
    onboardingGuideSubtitle: "A mindful antidote to consumerism and impulse buys.",
    onboardingGuideButton: "Got it",
    termsTitle: "Terms of Use",
    termsSubtitle: "Please review the key points. Continuing means you agree to the Almost Terms.",
    termsViewFull: "Open the full document",
    termsLinkHint: "We’ll open the document in your browser.",
    termsAccept: "I agree",
    termsDecline: "Not now",
    guideStepTrackTitle: "Your main mission",
    guideStepTrackDesc: "Spend consciously, protect the budget, and focus on the goals that actually matter.",
    guideStepDecisionTitle: "Temptation menu",
    guideStepDecisionDesc: "Log each temptation and resist it so Almost records the win and keeps that cash untouched.",
    guideStepRewardTitle: "See the big picture",
    guideStepRewardDesc: "Check off every saved item and watch the app visualize the bigger goal you’re working toward.",
    personaTitle: "Tell us about you",
    personaSubtitle: "Tell us about yourself so the app can be personalized.",
    personaGenderLabel: "How should we address you?",
    personaHabitLabel: "Pick a starter profile",
    personaConfirm: "Continue",
    customSpendTitle: "Your daily temptation",
    customSpendSubtitle: "Give it a short name and Almost will help you resist it more often.",
    customSpendNamePlaceholder: "Morning latte, cigarettes, nail art…",
    customSpendAmountLabel: "Cost per attempt",
    customSpendAmountPlaceholder: "E.g. {{amount}}",
    customSpendFrequencyLabel: "How many times per week does it usually win?",
    customSpendFrequencyPlaceholder: "E.g. 4",
    customSpendHint: "You can change this anytime in the profile.",
    customSpendSkip: "Skip for now",
    smartReminderTitle: [
      "Almost spotted “{{temptation}}”",
      "Pause with Almi: “{{temptation}}”",
      "Almost focus ping: “{{temptation}}”",
    ],
    smartReminderBody: [
      "You logged “{{temptation}}” recently. Repeat the pause and send the cash to your goal.",
      "Almost flagged this routine — take a breath before “{{temptation}}” and choose savings.",
      "Keep the streak alive. “{{temptation}}” can wait a little longer.",
      "Smart tip: every time you skip “{{temptation}}”, Almost keeps your insights sharp.",
    ],
    smartInsightDeclineTitle: "Almost remembers yesterday's win over “{{temptation}}”",
    smartInsightDeclineBody: "Say no again today and Almost will lock in the streak.",
    smartInsightSpendTitle: "Almost noticed “{{temptation}}” won yesterday",
    smartInsightSpendBody: "Hold the line today so Almost can celebrate a save.",
    dailyNudgeMorningTitle: ["Morning nudge from Almost", "Focus check from Almi"],
    dailyNudgeMorningBody: [
      "Set the tone: skip the first impulse and remember your goal.",
      "Almi is checking in — pause before the first swipe today.",
    ],
    dailyNudgeDayTitle: ["Midday Almost check-in", "Focus boost from Almi"],
    dailyNudgeDayBody: [
      "Afternoon impulses climb. Ask if this buy still serves your goal.",
      "Almost noticed lunch-time splurges. Take a mindful pause.",
    ],
    dailyNudgeAfternoonTitle: ["Post-lunch check-in with Almost", "Tap the brakes with Almi"],
    dailyNudgeAfternoonBody: [
      "Take a breath before tapping buy and reroute that money to savings.",
      "A five-minute pause now keeps your savings autopilot engaged.",
    ],
    dailyNudgeEveningTitle: ["Evening shield from Almost", "Almi wraps up your day"],
    dailyNudgeEveningBody: [
      "Evenings tempt the most. Log a win before bed.",
      "Close the day inside Almost — even a tiny save keeps nudges smart.",
    ],
    baselineTitle: "How much slips on small stuff?",
    baselineSubtitle: "Estimate one month of coffees, snacks and impulse buys to compare with real wins.",
    baselinePlaceholder: "E.g. {{amount}}",
    baselineCTA: "Save amount",
    baselineHint: "Rough number is fine - you can tweak it later in Profile.",
    baselineInputError: "Enter your rough monthly spend on non‑essentials",
    potentialBlockTitle: "Potential vs real savings",
    potentialBlockSubtitle: "",
    potentialBlockStatusAhead: "Whoa, you’re beating the forecast!",
    potentialBlockStatusStart: "Start logging wins - the potential is waiting.",
    potentialBlockStatusBehind: "You're on track, but there’s even more potential.",
    potentialBlockStatusOnTrack: "You’re tapping almost all the potential. Keep going!",
    potentialBlockActualLabel: "Actually saved",
    potentialBlockPotentialLabel: "Potential",
    potentialBlockHint: "There’s still {{amount}} of potential left. Keep it up 🙂",
    potentialBlockDetails:
      "It grabs the monthly temptation budget you set during onboarding, slices it into seconds, and shows how much you could have already saved right now.",
    potentialBlockCta: "Tell us how much usually slips on small extras and we’ll show the potential savings.",
    potentialPushAheadTitle: "You’re ahead of your potential!",
    potentialPushAheadBody:
      "The potential counter just hit {{potential}}, and you’re already at {{actual}}. Keep that streak going!",
    potentialPushBehindTitle: "Catch up to your potential",
    potentialPushBehindBody:
      "Potential is already {{potential}} – only {{shortfall}} to catch up. Pause before the next purchase and log a win.",
    quickCustomTitle: "Add temptation",
    quickCustomSubtitle: "Name the impulse and set a price to add it to the deck",
    quickCustomNameLabel: "Name",
    quickCustomAmountLabel: "Cost ({{currency}})",
    quickCustomEmojiLabel: "Card emoji",
    quickCustomConfirm: "Add",
    quickCustomCancel: "Cancel",
    coinEntryTitle: "How much?",
    coinEntrySubtitle: "Slide the coin and pick a category.",
    coinEntryHint: "Use the buttons above to save or spend.",
    coinEntryManual: "...",
    coinEntryManualTitle: "Set new slider max",
    coinEntryManualPlaceholder: "E.g. {{amount}}",
    coinEntryManualSave: "Remember",
    coinEntryManualCancel: "Cancel",
    coinEntryManualError: "Enter a valid amount",
    coinEntryManualAmountTitle: "Enter custom amount",
    coinEntryManualAmountPlaceholder: "E.g. {{amount}}",
    coinEntryCategoryLabel: "Category",
    coinEntryCategoryError: "Pick a category first",
    coinEntrySaveLabel: "Quick save",
    coinEntrySpendLabel: "Quick spend",
    fabNewGoal: "New goal",
    fabNewTemptation: "New spend",
    fabQuickActionTitle: "Last temptation",
    fabQuickActionSubtitle: "Repeat action for “{{title}}”",
    fabQuickActionEmpty: "No recent temptation yet. Interact with a card first.",
    fabTutorialTitle: "Meet the “+”",
    fabTutorialDesc:
      "Tap to log a custom impulse with your own amount and category. Hold to create new goals or custom spends.",
    fabTutorialAction: "Got it",
    newGoalTitle: "New goal",
    newGoalSubtitle: "Name the dream and set its target.",
    newGoalNameLabel: "Goal name",
    newGoalTargetLabel: "Target ({{currency}})",
    newGoalEmojiLabel: "Goal emoji",
    newGoalCreate: "Create goal",
    newGoalCancel: "Cancel",
    newPendingTitle: "New Thinking item",
    newPendingSubtitle: "Describe the temptation you want to park for 14 days.",
    newPendingNameLabel: "Name",
    newPendingAmountLabel: "Price ({{currency}})",
    newPendingEmojiLabel: "Card emoji",
    newPendingCreate: "Add to Thinking",
    newPendingCancel: "Cancel",
    tutorialFeedTitle: "Temptation feed",
    tutorialFeedDesc: "Log every impulse and choose: save it, add to goals, or park it for 14 days.",
    tutorialGoalsTitle: "Goals",
    tutorialGoalsDesc: "All dreams live here. Track progress and top up your goal.",
    tutorialThinkingTitle: "Thinking tab",
    tutorialThinkingDesc: "Park temptations for 14 days and return with a cooler head before deciding.",
    tutorialRewardsTitle: "Rewards & challenges",
    tutorialRewardsDesc: "Visit this tab to claim achievements and start challenges with bonus health.",
    tutorialProfileTitle: "Profile & motivation",
    tutorialProfileDesc: "Adjust theme, language, reminders, and all personalization tweaks that keep Almost yours.",
    tutorialSkip: "Skip",
    tutorialNext: "Next",
    tutorialDone: "Finish",
    tutorialProgress: "{{current}} of {{total}}",
    tabHintFeedTitle: "Temptation feed",
    tabHintFeedBody: "Log impulses here and decide to save, add to goals, or park for later.",
    tabHintCartTitle: "Goals",
    tabHintCartBody: "Track your dreams, set priorities, and update progress as you save.",
    tabHintPendingTitle: "Thinking tab",
    tabHintPendingBody: "Send wants to a 14-day pause and come back with a cooler head.",
    tabHintPurchasesTitle: "Rewards",
    tabHintPurchasesBody: "Claim achievements and start challenges for bonus health coins.",
    tabHintProfileTitle: "Profile",
    tabHintProfileBody: "Tune theme, language, reminders, and personal targets.",
    tabHintGotIt: "Got it",
  },
};
const collectDailyNudgeVariants = (keys = []) => {
  const variants = new Set();
  DAILY_NUDGE_LANGUAGES.forEach((lng) => {
    const dict = TRANSLATIONS[lng] || {};
    keys.forEach((key) => {
      const raw = dict[key];
      if (Array.isArray(raw)) {
        raw.forEach((value) => {
          if (typeof value === "string") {
            const normalized = value.trim();
            if (normalized.length) {
              variants.add(normalized);
            }
          }
        });
      } else if (typeof raw === "string") {
        const normalized = raw.trim();
        if (normalized.length) {
          variants.add(normalized);
        }
      }
    });
  });
  return variants;
};
const DAILY_NUDGE_TITLE_VARIANTS = collectDailyNudgeVariants(DAILY_NUDGE_TITLE_KEYS);
const DAILY_NUDGE_BODY_VARIANTS = collectDailyNudgeVariants(DAILY_NUDGE_BODY_KEYS);
const matchesDailyNudgeText = (text, variants) => {
  if (typeof text !== "string") return false;
  const normalized = text.trim();
  return normalized.length > 0 && variants.has(normalized);
};
const isKnownDailyNudgeNotification = (content = {}) => {
  if (!content) return false;
  const data = content.data;
  if (data?.type === DAILY_NUDGE_NOTIFICATION_TAG || data?.tag === DAILY_NUDGE_NOTIFICATION_TAG) {
    return true;
  }
  return (
    matchesDailyNudgeText(content.title, DAILY_NUDGE_TITLE_VARIANTS) &&
    matchesDailyNudgeText(content.body, DAILY_NUDGE_BODY_VARIANTS)
  );
};

const CATEGORY_LABELS = {
  all: { ru: "все", en: "all" },
  tech: { ru: "техника", en: "tech" },
  flagship: { ru: "флагман", en: "flagship" },
  iphone: { ru: "iphone", en: "iphone" },
  laptop: { ru: "ноут", en: "laptop" },
  work: { ru: "работа", en: "work" },
  audio: { ru: "аудио", en: "audio" },
  style: { ru: "стиль", en: "style" },
  wearable: { ru: "носимое", en: "wearable" },
  sport: { ru: "спорт", en: "sport" },
  home: { ru: "дом", en: "home" },
  wow: { ru: "вау", en: "wow" },
  gift: { ru: "подарки", en: "gift" },
  coffee: { ru: "кофе", en: "coffee" },
  eco: { ru: "эко", en: "eco" },
  food: { ru: "еда", en: "food" },
  wellness: { ru: "забота", en: "wellness" },
  retro: { ru: "ретро", en: "retro" },
  lifestyle: { ru: "лайф", en: "lifestyle" },
  stationery: { ru: "бумага", en: "stationery" },
  phone: { ru: "телефон", en: "phone" },
  travel: { ru: "путешествия", en: "travel" },
  dream: { ru: "мечты", en: "dream" },
  habit: { ru: "привычки", en: "habit" },
  habbit: { ru: "привычки", en: "habit" },
  custom: { ru: "свои", en: "custom" },
  daily: { ru: "ежедневное", en: "daily" },
  health: { ru: "здоровье", en: "health" },
  vices: { ru: "вредные", en: "vices" },
};

const normalizeCategoryKey = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const resolveCategoryLabel = (categoryKey, language = "en") => {
  const normalized = normalizeCategoryKey(categoryKey);
  const entry = CATEGORY_LABELS[normalized] || CATEGORY_LABELS[categoryKey];
  const fallback = normalized || categoryKey || "";
  const localized = entry?.[language] || entry?.en || fallback;
  return localized.toUpperCase();
};

const CURRENCIES = ["USD", "EUR", "RUB"];

const CURRENCY_LOCALES = {
  USD: "en-US",
  EUR: "de-DE",
  RUB: "ru-RU",
};

const TERMS_LINKS = {
  ru: "https://www.notion.so/RU-2b24e58ea9a0809ea04fe54138975e96",
  en: "https://www.notion.so/TERMS-OF-USE-EN-2b24e58ea9a0801292ead33eba50d02b",
};

const PRIVACY_LINKS = {
  ru: "https://www.notion.so/RU-2b24e58ea9a08032b017d3a5c69bbf48",
  en: "https://www.notion.so/PRIVACY-POLICY-EN-2b24e58ea9a08033abe7e038e63a2003",
};

const TERMS_POINTS = {
  ru: [
    "Almost помогает развивать осознанность в тратах и не является банком, брокером или финансовым консультантом. Любые решения о расходах и накоплениях остаются на стороне пользователя.",
    "Ты подтверждаешь, что регистрационные данные переданы добровольно, точны и могут использоваться Almost для персонализации сервиса, уведомлений и аналитики в обезличенном виде.",
    "Мы собираем и храним только минимально необходимые данные профиля. Ты можешь обновить или удалить их через настройки и поддержку. При удалении профиля мы стираем связанные события и историю.",
    "Соглашение регулируется законодательством страны регистрации Almost. Споры решаются переговорами, а при необходимости — в суде по месту регистрации сервиса.",
  ],
  en: [
    "Almost is a mindful spending companion, not a bank, broker, or financial advisor. Every decision about saving or spending remains your responsibility.",
    "You confirm that the information you share is accurate and voluntarily provided so Almost can personalise hints, notifications, and anonymised analytics.",
    "We store only the minimum profile data required to operate the app. You can edit or request deletion via settings and support, which wipes related history from our systems.",
    "This agreement is governed by the laws of the jurisdiction where Almost is registered. Any dispute is settled amicably first and, if needed, in the courts of that jurisdiction.",
  ],
};

const HOW_IT_WORKS_STEPS = [
  { id: "track", emoji: "📸", titleKey: "guideStepTrackTitle", descKey: "guideStepTrackDesc" },
  { id: "decide", emoji: "🎯", titleKey: "guideStepDecisionTitle", descKey: "guideStepDecisionDesc" },
  { id: "reward", emoji: "🏆", titleKey: "guideStepRewardTitle", descKey: "guideStepRewardDesc" },
];

const PERSONA_PRESETS = {
  mindful_coffee: {
    id: "mindful_coffee",
    emoji: "☕️",
    title: {
      ru: "Любитель кофе",
      en: "Coffee devotee",
    },
    description: {
      ru: "Первая цель: замедлить походы за кофе навынос.",
      en: "Goal one: slow down the take-away coffee habit.",
    },
    tagline: {
      ru: "Каждая некупленная чашка дарит +{{amount}} копилке.",
      en: "Every skipped cup adds +{{amount}} to the stash.",
    },
    habit: {
      emoji: "☕️",
      color: "#FFF3E0",
      categories: ["habit", "daily"],
      basePriceUSD: 5,
      title: {
        ru: "Кофе навынос",
        en: "Coffee run",
      },
      description: {
        ru: "Сладкий момент слабости каждое утро.",
        en: "Sweet little impulse every morning.",
      },
    },
  },
  habit_smoking: {
    id: "habit_smoking",
    emoji: "🚬",
    title: {
      ru: "Отказ от сигарет",
      en: "Quit smoking",
    },
    description: {
      ru: "Первая ступень: меньше случайных сигарет и перекуров.",
      en: "First tier: fewer casual cigarettes and smoke breaks.",
    },
    tagline: {
      ru: "Каждая пропущенная сигарета держит бюджет в тонусе.",
      en: "Every skipped cigarette keeps the budget sharp.",
    },
    habit: {
      emoji: "🚬",
      color: "#FFE8E0",
      categories: ["habit", "health"],
      basePriceUSD: 7,
      title: {
        ru: "Пачка сигарет",
        en: "Pack of cigarettes",
      },
      description: {
        ru: "Пропустить перекур значит ускорить прогресс.",
        en: "Skip the smoke break, speed up the progress.",
      },
    },
  },
  glam_beauty: {
    id: "glam_beauty",
    emoji: "💄",
    audience: ["female"],
    title: {
      ru: "Бьюти-фанат",
      en: "Beauty fan",
    },
    description: {
      ru: "Контролируем спонтанные бьюти-покупки и подписки.",
      en: "Keep beauty splurges and subs in check.",
    },
    tagline: {
      ru: "Один пропущенный бьюти-дроп = {{amount}} для большой цели.",
      en: "One skipped beauty drop = {{amount}} toward the big goal.",
    },
    habit: {
      emoji: "💄",
      color: "#FFE5F1",
      categories: ["style", "habit"],
      basePriceUSD: 18,
      title: {
        ru: "Мини бьюти-дроп",
        en: "Mini beauty haul",
      },
      description: {
        ru: "Тени, помада и ещё один «нужный» уход.",
        en: "Shadow, lipstick and yet another “needed” serum.",
      },
    },
  },
  gamer_loot: {
    id: "gamer_loot",
    emoji: "🎮",
    audience: ["male"],
    title: {
      ru: "Геймер",
      en: "Gamer",
    },
    description: {
      ru: "Замедляем донаты, лутбоксы и ночные DLC.",
      en: "Cool down loot boxes, microtransactions and DLC binges.",
    },
    tagline: {
      ru: "Каждый пропущенный донат = {{amount}} на мечту IRL.",
      en: "Every skipped microtransaction frees {{amount}} for IRL goals.",
    },
    habit: {
      emoji: "🎮",
      color: "#D9F7FF",
      categories: ["wow", "habit"],
      basePriceUSD: 10,
      title: {
        ru: "Игровой донат",
        en: "Game microtransaction",
      },
      description: {
        ru: "Пара пропущенных скинов даёт плюс к прогрессу.",
        en: "Skip a couple skins, gain momentum.",
      },
    },
  },
  foodie_delivery: {
    id: "foodie_delivery",
    emoji: "🍕",
    title: {
      ru: "Любитель доставки",
      en: "Delivery lover",
    },
    description: {
      ru: "Первая миссия: меньше спонтанной еды из приложения.",
      en: "Mission one: fewer random delivery orders.",
    },
    tagline: {
      ru: "Перескочил доставку и сохранил {{amount}} на реальную цель.",
      en: "Skip delivery, unlock {{amount}} for real goals.",
    },
    habit: {
      emoji: "🍕",
      color: "#FFF8E3",
      categories: ["food", "habit"],
      basePriceUSD: 15,
      title: {
        ru: "Доставка вечерком",
        en: "Night delivery",
      },
      description: {
        ru: "Пицца, поке или суши? Выбираешь прогресс.",
        en: "Pizza, poke or sushi? You choose progress.",
      },
    },
  },
  online_impulse: {
    id: "online_impulse",
    emoji: "📦",
    title: {
      ru: "Онлайн-шопер",
      en: "Online shopper",
    },
    description: {
      ru: "Любит импульсивные онлайн-покупки. Кладём в список, а не в корзину.",
      en: "Loves impulse online buys. Park them in a list instead of checkout.",
    },
    tagline: {
      ru: "Каждый несостоявшийся заказ = {{amount}} ближе к цели.",
      en: "Every skipped checkout moves {{amount}} closer to your goal.",
    },
    habit: {
      emoji: "📦",
      color: "#E8F0FF",
      categories: ["wow", "things", "habit"],
      basePriceUSD: 25,
      title: {
        ru: "Онлайн-импульс",
        en: "Online impulse",
      },
      description: {
        ru: "Ещё одна посылка, которая могла стать прогрессом.",
        en: "Another package that could have been progress.",
      },
    },
  },
  anime_fan: {
    id: "anime_fan",
    emoji: "🎌",
    title: {
      ru: "Любитель аниме",
      en: "Anime fan",
    },
    description: {
      ru: "Мерч, манга и фигурки. Фиксируем только то, что реально важно.",
      en: "Merch, manga, figures. Log only what truly matters.",
    },
    tagline: {
      ru: "Пропустил очередной сет — {{amount}} в копилку мечты.",
      en: "Skipped the next merch drop—{{amount}} to your dream.",
    },
    habit: {
      emoji: "🎌",
      color: "#F2E8FF",
      categories: ["wow", "habit", "style"],
      basePriceUSD: 18,
      title: {
        ru: "Аниме-мерч",
        en: "Anime merch",
      },
      description: {
        ru: "Фигурка, томик или брелок — решай осознанно.",
        en: "Figure, volume, or keychain—choose mindfully.",
      },
    },
  },
  sub_lover: {
    id: "sub_lover",
    emoji: "🧾",
    title: {
      ru: "Любитель подписок",
      en: "Subscription lover",
    },
    description: {
      ru: "Стриминг, сервисы, доп‑фичи. Держим подписки под контролем.",
      en: "Streaming, SaaS, extra features. Keep subs under control.",
    },
    tagline: {
      ru: "Отменил лишнее — {{amount}} осталась в целях.",
      en: "Cancel the extra sub—{{amount}} stays with your goals.",
    },
    habit: {
      emoji: "🧾",
      color: "#E9FFF3",
      categories: ["habit", "daily"],
      basePriceUSD: 12,
      title: {
        ru: "Лишняя подписка",
        en: "Extra subscription",
      },
      description: {
        ru: "Месячные платежи, которые незаметно съедают бюджет.",
        en: "Monthly payments quietly draining the budget.",
      },
    },
  },
  fashion_fan: {
    id: "fashion_fan",
    emoji: "👗",
    title: {
      ru: "Любитель шмоток",
      en: "Fashion lover",
    },
    description: {
      ru: "Следит за дропами и скидками. Учимся тормозить импульсы.",
      en: "Tracks drops and sales. Time to slow the impulses.",
    },
    tagline: {
      ru: "Каждый нескупленный дроп = {{amount}} к большому плану.",
      en: "Every unsnapped drop adds {{amount}} to the big plan.",
    },
    habit: {
      emoji: "👜",
      color: "#FFF0F2",
      categories: ["style", "habit"],
      basePriceUSD: 35,
      title: {
        ru: "Импульсный шоппинг",
        en: "Impulse fashion pick",
      },
      description: {
        ru: "Сумка, худи или кроссы — фиксируй, а не хватай.",
        en: "Bag, hoodie or sneakers—log it, don't grab it.",
      },
    },
  },
};

const PERSONA_HABIT_TYPES = {
  mindful_coffee: "coffee",
  habit_smoking: "smoking",
  glam_beauty: "beauty",
  gamer_loot: "gaming",
  foodie_delivery: "delivery",
  online_impulse: "shopping",
  anime_fan: "anime",
  sub_lover: "subscriptions",
  fashion_fan: "fashion",
};

const DEFAULT_PERSONA_ID = "mindful_coffee";

const GENDER_OPTIONS = [
  { id: "female", label: { ru: "Женщина", en: "Female" }, emoji: "💁‍♀️" },
  { id: "male", label: { ru: "Мужчина", en: "Male" }, emoji: "🧑‍🦱" },
  { id: "none", label: { ru: "Не указывать", en: "Prefer not to say" }, emoji: "🤫" },
];

const GOAL_PRESETS = [
  { id: "travel", ru: "Путешествия", en: "Travel", emoji: "✈️", targetUSD: 1500 },
  { id: "tech", ru: "Техника", en: "Tech upgrade", emoji: "💻", targetUSD: 900 },
  { id: "daily", ru: "Ежедневные цели", en: "Daily treats", emoji: "🍩", targetUSD: 250 },
  { id: "save", ru: "Просто копить", en: "Rainy-day fund", emoji: "💰", targetUSD: 600 },
];

const PRIMARY_GOAL_KIND = "primary_goal";
const PRIMARY_GOAL_WISH_ID_LEGACY = "wish_primary_goal";
const getPrimaryGoalWishId = (goalId = "default") => `wish_primary_goal_${goalId}`;

const getGoalPreset = (goalId) => GOAL_PRESETS.find((goal) => goal.id === goalId);
const getGoalDefaultTargetUSD = (goalId) => {
  const preset = getGoalPreset(goalId);
  return preset?.targetUSD || 500;
};

const insertWishAfterPrimary = (list = [], newWish) => {
  if (!newWish) return list;
  const lastPrimaryIndex = list.reduce(
    (lastIndex, wish, index) => (wish?.kind === PRIMARY_GOAL_KIND ? index : lastIndex),
    -1
  );
  if (lastPrimaryIndex === -1) {
    return [newWish, ...list];
  }
  const before = list.slice(0, lastPrimaryIndex + 1);
  const after = list.slice(lastPrimaryIndex + 1);
  return [...before, newWish, ...after];
};

const removePrimaryGoalFromProfile = (profileState = {}, goalId) => {
  if (!goalId) return profileState;
  const currentGoals = Array.isArray(profileState.primaryGoals) ? profileState.primaryGoals : [];
  const filtered = currentGoals.filter((goal) => goal.id !== goalId);
  const nextGoalId = filtered[0]?.id || profileState.goal || DEFAULT_PROFILE.goal;
  const nextGoalTarget = filtered[0]
    ? (Number.isFinite(filtered[0].targetUSD) && filtered[0].targetUSD > 0
        ? filtered[0].targetUSD
        : getGoalDefaultTargetUSD(filtered[0].id))
    : getGoalDefaultTargetUSD(nextGoalId);
  return {
    ...profileState,
    primaryGoals: filtered,
    goal: nextGoalId,
    goalTargetUSD: nextGoalTarget,
    goalCelebrated: filtered.length ? profileState.goalCelebrated : false,
  };
};

const updatePrimaryGoalTargetInProfile = (profileState = {}, goalId, targetUSD, extra = {}) => {
  if (!goalId) return profileState;
  const currentGoals = Array.isArray(profileState.primaryGoals) ? profileState.primaryGoals : [];
  const updated = currentGoals.map((goal) =>
    goal.id === goalId ? { ...goal, targetUSD, ...extra } : goal
  );
  const activeGoalId = profileState.goal || updated[0]?.id || goalId;
  const activeEntry = updated.find((goal) => goal.id === activeGoalId) || updated[0] || null;
  const nextTarget = activeEntry
    ? (Number.isFinite(activeEntry.targetUSD) && activeEntry.targetUSD > 0
        ? activeEntry.targetUSD
        : getGoalDefaultTargetUSD(activeEntry.id))
    : getGoalDefaultTargetUSD(activeGoalId);
  return {
    ...profileState,
    primaryGoals: updated,
    goal: activeEntry?.id || activeGoalId,
    goalTargetUSD: nextTarget,
  };
};

const DEFAULT_PROFILE = {
  name: "Nina Cleanova",
  firstName: "Nina",
  lastName: "Cleanova",
  subtitle: "",
  motto: "",
  bio: "Люблю красивые вещи, но больше люблю финансовый план",
  avatar: "",
  currency: "USD",
  goal: "save",
  goalTargetUSD: getGoalDefaultTargetUSD("save"),
  primaryGoals: [{ id: "save", targetUSD: getGoalDefaultTargetUSD("save") }],
  goalCelebrated: false,
  goalRenewalPending: false,
  persona: "mindful_coffee",
  gender: "none",
  customSpend: null,
  spendingProfile: {
    baselineMonthlyWasteUSD: 0,
    baselineStartAt: null,
  },
  joinedAt: null,
};

const DEFAULT_PROFILE_PLACEHOLDER = {
  ...DEFAULT_PROFILE,
  name: "",
  firstName: "",
  lastName: "",
  subtitle: "",
  motto: "",
  bio: "",
};

const resolvePotentialPushStepUSD = (currencyCode = DEFAULT_PROFILE.currency) => {
  const normalizedCode =
    typeof currencyCode === "string" && currencyCode.trim().length > 0
      ? currencyCode.trim().toUpperCase()
      : DEFAULT_PROFILE.currency;
  const convertCode = CURRENCIES.includes(normalizedCode) ? normalizedCode : DEFAULT_PROFILE.currency;
  const localStep =
    POTENTIAL_PUSH_STEP_LOCAL_MAP[normalizedCode] ??
    POTENTIAL_PUSH_STEP_LOCAL_MAP[convertCode] ??
    POTENTIAL_PUSH_STEP_LOCAL_FALLBACK;
  const resolvedUSD = convertFromCurrency(localStep, convertCode);
  if (Number.isFinite(resolvedUSD) && resolvedUSD > 0) {
    return resolvedUSD;
  }
  return POTENTIAL_PUSH_STEP_USD;
};

const INITIAL_REGISTRATION = {
  firstName: "",
  lastName: "",
  motto: "",
  avatar: "",
  currency: "USD",
  gender: "none",
  persona: "mindful_coffee",
  customSpendTitle: "",
  customSpendAmount: "",
  customSpendFrequency: "",
   customSpendCategory: DEFAULT_IMPULSE_CATEGORY,
  baselineMonthlyWaste: "",
  baselineCapturedAt: null,
  goalSelections: [],
  goalTargetMap: {},
  customGoals: [],
  goalTargetConfirmed: [],
};

const DEFAULT_TEMPTATIONS = [
  {
    id: "coffee_to_go",
    emoji: "☕️",
    image:
      "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=600&q=80",
    color: "#FFF3E0",
    categories: ["coffee", "food"],
    basePriceUSD: 5,
    priceUSD: 5,
    title: {
      ru: "Кофе навынос",
      en: "Coffee to-go",
    },
    description: {
      ru: "Самая мелкая трата, которая, если её не заметить, съедает бюджет каждый день.",
      en: "Tiny daily swipe that quietly eats the budget if you don’t watch it.",
    },
  },
  {
    id: "croissant_break",
    emoji: "🥐",
    image:
      "https://images.unsplash.com/photo-1464306076886-da185f6a9d12?auto=format&fit=crop&w=600&q=80",
    color: "#FFFBEA",
    categories: ["food", "coffee"],
    basePriceUSD: 8,
    priceUSD: 8,
    title: {
      ru: "Утренний круассан",
      en: "Morning croissant",
    },
    description: {
      ru: "Маленькое удовольствие, которое запускает большой прогресс, если его отложить.",
      en: "A tiny treat that becomes a big level boost once you skip it.",
    },
  },
  {
    id: "fancy_latte",
    emoji: "🥤",
    image:
      "https://images.unsplash.com/photo-1509043759401-136742328bb3?auto=format&fit=crop&w=600&q=80",
    color: "#E8F5E9",
    categories: ["coffee", "lifestyle"],
    basePriceUSD: 12,
    priceUSD: 12,
    title: {
      ru: "Матча-латте",
      en: "Matcha latte",
    },
    description: {
      ru: "Стеклянный стакан + топинг = почти абонемент в спортзал за месяц.",
      en: "Glass cup + topping = nearly a gym pass per month if you bank it.",
    },
  },
  {
    id: "phone",
    emoji: "📱",
    image:
      "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?auto=format&fit=crop&w=600&q=80",
    color: "#F6DFFF",
    categories: ["tech", "flagship", "phone"],
    basePriceUSD: 1199,
    priceUSD: 1199,
    title: {
      ru: "Новый смартфон",
      en: "New smartphone",
    },
    description: {
      ru: "Свежий гаджет с двойной камерой, который так легко оправдать. Проверим, стоит ли он эмоций?",
      en: "Shiny dual-camera flagship tempting every scroll. Is the hype worth your savings?",
    },
  },
  {
    id: "sneakers",
    emoji: "👟",
    image:
      "https://images.unsplash.com/photo-1528701800489-20be3cbe2c05?auto=format&fit=crop&w=600&q=80",
    color: "#E3F6E8",
    categories: ["style", "sport"],
    basePriceUSD: 260,
    priceUSD: 260,
    title: {
      ru: "Лимитированные кроссы",
      en: "Limited sneakers",
    },
    description: {
      ru: "Редкий дроп с очередью из желающих. Иногда вместо очереди лучше пополнить копилку.",
      en: "Rare drop everyone chases. Maybe the real flex is topping up your stash.",
    },
  },
  {
    id: "watch",
    emoji: "⌚️",
    image:
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=600&q=80",
    color: "#FFE5F1",
    categories: ["tech", "wearable"],
    basePriceUSD: 799,
    priceUSD: 799,
    title: {
      ru: "Премиальные часы",
      en: "Premium watch",
    },
    description: {
      ru: "Отслеживает пульс и расходы, если враг не носит их каждый день.",
      en: "Tracks your pulse and spending if you resist wearing it daily.",
    },
  },
  {
    id: "console",
    emoji: "🎮",
    image:
      "https://images.unsplash.com/photo-1486401899868-0e435ed85128?auto=format&fit=crop&w=600&q=80",
    color: "#D9F7FF",
    categories: ["wow", "home"],
    audience: ["male"],
    basePriceUSD: 549,
    priceUSD: 549,
    title: {
      ru: "Игровая приставка",
      en: "Game console",
    },
    description: {
      ru: "Лучший способ вечерами спасать мир и бюджет. До тех пор, пока ты не нажал «купить».",
      en: "Saves worlds at night and your budget if you pause before checkout.",
    },
  },
  {
    id: "pizza",
    emoji: "🍕",
    image:
      "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&w=600&q=80",
    color: "#FFF4D5",
    categories: ["food", "wow"],
    basePriceUSD: 25,
    priceUSD: 25,
    title: {
      ru: "Сет пицц и роллов",
      en: "Pizza & rolls night",
    },
    description: {
      ru: "Пятничный ритуал, который легко превращается в тысячу рублей, улетевших в никуда.",
      en: "Friday ritual that quickly becomes a $40 habit. Maybe cook tonight?",
    },
  },
  {
    id: "late_night_takeout",
    emoji: "🍱",
    image:
      "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=900&q=80",
    color: "#FFEFE9",
    categories: ["food", "wow"],
    basePriceUSD: 35,
    priceUSD: 35,
    title: {
      ru: "Дополнительный сет роллов",
      en: "Extra sushi add-on",
    },
    description: {
      ru: "Кажется мелочью в доставке, но именно он делает чек заметно выше.",
      en: "Tiny add-on in the cart that silently pushes the total over the top.",
    },
  },
  {
    id: "movie_premiere_combo",
    emoji: "🎬",
    image:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
    color: "#F4F2FF",
    categories: ["fun", "food"],
    basePriceUSD: 45,
    priceUSD: 45,
    title: {
      ru: "Кино + закуски",
      en: "Movie night combo",
    },
    description: {
      ru: "Билеты, попкорн и лимонад, которые легко превратить в взнос в копилку.",
      en: "Tickets, popcorn and soda that could become a little boost to savings.",
    },
  },
  {
    id: "beauty_box",
    emoji: "💄",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    color: "#FFE9F2",
    categories: ["beauty", "lifestyle"],
    audience: ["female"],
    basePriceUSD: 65,
    priceUSD: 65,
    title: {
      ru: "Beauty-бокс месяца",
      en: "Monthly beauty box",
    },
    description: {
      ru: "Коробочка сюрпризов, которая каждый месяц перетягивает бюджет.",
      en: "A curated surprise box that steals a chunk of the monthly plan.",
    },
  },
  {
    id: "grooming_upgrade_set",
    emoji: "🪒",
    image:
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80",
    color: "#E9F8FF",
    categories: ["style", "lifestyle"],
    audience: ["male"],
    basePriceUSD: 70,
    priceUSD: 70,
    title: {
      ru: "Премиум-набор для ухода",
      en: "Premium grooming bundle",
    },
    description: {
      ru: "Бритва, масла и триммер, которые легко заменить прогрессом по целям.",
      en: "Razor, oils and trimmer that could become goal progress instead.",
    },
  },
  {
    id: "smart_band_upgrade",
    emoji: "📿",
    image:
      "https://images.unsplash.com/photo-1517148815974-413097f4a0c0?auto=format&fit=crop&w=900&q=80",
    color: "#E9F5FF",
    categories: ["tech", "wearable"],
    basePriceUSD: 90,
    priceUSD: 90,
    title: {
      ru: "Новый фитнес-браслет",
      en: "Fresh fitness band",
    },
    description: {
      ru: "Экран побольше, датчиков побольше и еще один повод отложить upgrade.",
      en: "Bigger screen, more sensors and one more reason to pause the upgrade.",
    },
  },
  {
    id: "weekend_brunch",
    emoji: "🥞",
    image:
      "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=900&q=80",
    color: "#FFF7EA",
    categories: ["food", "lifestyle"],
    basePriceUSD: 120,
    priceUSD: 120,
    title: {
      ru: "Бранч выходного дня",
      en: "Weekend brunch ritual",
    },
    description: {
      ru: "Слои панкейков и мимозы легко превращаются в прогресс по целям.",
      en: "Stacks of pancakes and mimosas that could have been goal progress.",
    },
  },
  {
    id: "studio_pass",
    emoji: "🧘",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
    color: "#E9FFF2",
    categories: ["health", "lifestyle"],
    basePriceUSD: 180,
    priceUSD: 180,
    title: {
      ru: "Пакет из 10 тренировок",
      en: "10-class studio pass",
    },
    description: {
      ru: "Красивая подписка, которая окупится, если копилка останется приоритетом.",
      en: "A shiny class pack that pays off only if the jar stays priority.",
    },
  },
  {
    id: "streetwear_capsule",
    emoji: "🧥",
    image:
      "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=900&q=80",
    color: "#EAF2FF",
    categories: ["style", "wow"],
    basePriceUSD: 220,
    priceUSD: 220,
    title: {
      ru: "Стритвир-капсула",
      en: "Streetwear capsule",
    },
    description: {
      ru: "Худи, кепка и аксессуары, которые легко превратить в вклад в большую мечту.",
      en: "Hoodie, cap and trinkets that could accelerate the bigger dream.",
    },
  },
  {
    id: "vacation",
    emoji: "🏝️",
    image:
      "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=600&q=80",
    color: "#E0F7FA",
    categories: ["travel", "dream"],
    basePriceUSD: 1800,
    priceUSD: 1800,
    title: {
      ru: "Экспресс-путешествие",
      en: "Flash vacation",
    },
    description: {
      ru: "Ловим билеты на море до зарплаты. Или копим заранее и летим без стресса.",
      en: "Spontaneous seaside flights before payday or a mindful trip later.",
    },
  },
  {
    id: "coffee",
    emoji: "☕️",
    image:
      "https://images.unsplash.com/photo-1481391032119-d89fee407e44?auto=format&fit=crop&w=600&q=80",
    color: "#FAF0E6",
    categories: ["home", "coffee"],
    basePriceUSD: 320,
    priceUSD: 320,
    title: {
      ru: "Домашняя кофемашина",
      en: "Home coffee setup",
    },
    description: {
      ru: "Бариста на кухне и минус десяток походов в кофейню каждую неделю.",
      en: "Barista on the countertop and fewer pricey coffee runs.",
    },
  },
  {
    id: "bag",
    emoji: "👜",
    image:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80",
    color: "#F8F1FF",
    categories: ["style", "gift"],
    audience: ["female"],
    basePriceUSD: 950,
    priceUSD: 950,
    title: {
      ru: "Дизайнерская сумка",
      en: "Designer bag",
    },
    description: {
      ru: "Вещь мечты, которая либо вдохновляет, либо возвращает к списку финансовых целей.",
      en: "Statement piece that either inspires or reminds you of bigger goals.",
    },
  },
  {
    id: "city_escape",
    emoji: "🌆",
    image:
      "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=600&q=80",
    color: "#E3E5FF",
    categories: ["travel", "dream"],
    basePriceUSD: 1200,
    priceUSD: 1200,
    title: {
      ru: "Уикенд в европейском городе",
      en: "Weekend city escape",
    },
    description: {
      ru: "Два дня архитектуры и кофе или месячный запас сбережений.",
      en: "Two days of architecture and espresso or a month of savings momentum.",
    },
  },
  {
    id: "road_trip",
    emoji: "🚐",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=900&q=80",
    color: "#E0FFF6",
    categories: ["travel", "wow"],
    basePriceUSD: 3200,
    priceUSD: 3200,
    title: {
      ru: "Путешествие на машине мечты",
      en: "Dream road trip",
    },
    description: {
      ru: "Бензин, дом на колёсах и свобода. Всё это может подождать до полного прогресса.",
      en: "Fuel, van life and freedom are all waiting once the progress bar hits max.",
    },
  },
  {
    id: "dream_car",
    emoji: "🚗",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80",
    color: "#FFE0E3",
    categories: ["dream", "travel"],
    basePriceUSD: 28000,
    priceUSD: 28000,
    title: {
      ru: "Автомобиль мечты",
      en: "Dream car",
    },
    description: {
      ru: "Каждый «сэкономить» переводит топливо из чата хотелок в гараж будущего.",
      en: "Every “save it” reroutes fuel from impulse chats into the future garage.",
    },
  },
  {
    id: "dream_home",
    emoji: "🏡",
    image:
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
    color: "#FFF1E6",
    categories: ["dream", "home"],
    basePriceUSD: 90000,
    priceUSD: 90000,
    title: {
      ru: "Взнос за квартиру",
      en: "Home down payment",
    },
    description: {
      ru: "Пусть отказ от доставок превращается в кирпичи твоего будущего адреса.",
      en: "Every skipped delivery becomes a brick in your future address.",
    },
  },
  {
    id: "private_jet",
    emoji: "🛩️",
    image:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    color: "#EDF7FF",
    categories: ["dream", "wow"],
    basePriceUSD: 250000,
    priceUSD: 250000,
    title: {
      ru: "Частный самолёт (мечта)",
      en: "Private jet (why not)",
    },
    description: {
      ru: "Чистая геймификация: уровень «самолёт» показывает безлимитную дисциплину.",
      en: "Pure gamification: the jet tier proves your discipline is first class.",
    },
  },
];

const findTemplateById = (id) => DEFAULT_TEMPTATIONS.find((item) => item.id === id);

const INITIAL_FREE_DAY_STATS = {
  total: 0,
  current: 0,
  best: 0,
  lastDate: null,
  achievements: [],
  blockedDate: null,
};

const FREE_DAY_MILESTONES = [3, 7, 30];
const HEALTH_PER_REWARD = ECONOMY_RULES.baseAchievementReward;
const FREE_DAY_RESCUE_COST = ECONOMY_RULES.freeDayRescueCost;
const FREE_DAY_LOGIN_BLUE_COINS = 2;

let activeCurrency = DEFAULT_PROFILE.currency;
const setActiveCurrency = (code) => {
  activeCurrency = CURRENCIES.includes(code) ? code : DEFAULT_PROFILE.currency;
};

const GOALS = [
  {
    id: "starter",
    target: 250,
    copy: {
      ru: { title: "Забронь 250$", desc: "меньше кофеен, больше резерва" },
      en: { title: "Lock $250", desc: "skip cafés, build reserves" },
    },
  },
  {
    id: "focus",
    target: 1000,
    copy: {
      ru: { title: "Сдержи 1000$", desc: "осознанные гаджеты вместо хаоса" },
      en: { title: "Hold $1000", desc: "mindful tech deals only" },
    },
  },
  {
    id: "pro",
    target: 5000,
    copy: {
      ru: { title: "Герой экономии", desc: "ты заменяешь траты привычкой" },
      en: { title: "Savings hero", desc: "deals became a habit" },
    },
  },
];

const SAVINGS_TIERS = [10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000, 50000, 100000, 250000];
const LEVEL_TWO_TARGET_RUB_USD = convertFromCurrency(1000, "RUB"); // level 2 at ₽1000 instead of default $10
const getTierTargetsUSD = (currencyCode = activeCurrency) => {
  const code = currencyCode || activeCurrency;
  if (code === "RUB") {
    return [LEVEL_TWO_TARGET_RUB_USD, ...SAVINGS_TIERS.slice(1)];
  }
  return SAVINGS_TIERS;
};

const formatCurrency = (value = 0, currency = activeCurrency) => {
  const locale = CURRENCY_LOCALES[currency] || "en-US";
  const displayPrecision = getCurrencyDisplayPrecision(currency);
  const normalized = roundCurrencyValue(Number(value) || 0, currency, displayPrecision);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: displayPrecision,
    }).format(normalized);
  } catch {
    const symbol = currency === "EUR" ? "€" : currency === "RUB" ? "₽" : "$";
    return `${symbol}${normalized.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: displayPrecision,
    })}`;
  }
};

const formatCurrencyWhole = (value = 0, currency = activeCurrency) => {
  const locale = CURRENCY_LOCALES[currency] || "en-US";
  const precision = getCurrencyDisplayPrecision(currency);
  const rounded = roundCurrencyValue(Number(value) || 0, currency, precision);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(rounded);
  } catch {
    const symbol = currency === "EUR" ? "€" : currency === "RUB" ? "₽" : "$";
    return `${symbol}${rounded.toLocaleString(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })}`;
  }
};

const getCopyForPurchase = (item, language, t) => {
  if (item.copy?.[language]) return item.copy[language];
  const product = DEFAULT_TEMPTATIONS.find((prod) => prod.id === item.productId);
  if (product) {
    return {
      title: product.title?.[language] || product.title?.en || product.id,
      desc: product.description?.[language] || product.description?.en || t("defaultDealDesc"),
    };
  }
  return {
    title: t("defaultDealTitle"),
    desc: t("defaultDealDesc"),
  };
};

const parseColor = (value) => {
  if (typeof value !== "string") return { r: 0, g: 0, b: 0 };
  if (value.startsWith("#")) {
    const full =
      value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
        : value;
    const num = parseInt(full.slice(1), 16);
    if (Number.isNaN(num)) return { r: 0, g: 0, b: 0 };
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  const rgbMatch = value.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (rgbMatch) {
    return { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) };
  }
  return { r: 0, g: 0, b: 0 };
};

const blendColors = (colorA, colorB, ratio = 0.5) => {
  const clamp = (num) => Math.max(0, Math.min(255, Math.round(num)));
  const t = Math.max(0, Math.min(1, ratio));
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  const r = clamp(a.r * (1 - t) + b.r * t);
  const g = clamp(a.g * (1 - t) + b.g * t);
  const bl = clamp(a.b * (1 - t) + b.b * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

const blendHexColors = (colorA, colorB, ratio = 0.5) => {
  const clamp = (num) => Math.max(0, Math.min(255, Math.round(num)));
  const toHex = (num) => clamp(num).toString(16).padStart(2, "0");
  const t = Math.max(0, Math.min(1, ratio));
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  const r = a.r * (1 - t) + b.r * t;
  const g = a.g * (1 - t) + b.g * t;
  const bl = a.b * (1 - t) + b.b * t;
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
};

const getTierProgress = (savedUSD = 0, currencyCode = activeCurrency) => {
  const tierTargets = getTierTargetsUSD(currencyCode);
  let previousTarget = 0;
  for (let i = 0; i < tierTargets.length; i += 1) {
    const target = tierTargets[i];
    if (savedUSD < target) {
      return {
        level: i + 1,
        prevTargetUSD: previousTarget,
        nextTargetUSD: target,
      };
    }
    previousTarget = target;
  }
  return {
    level: tierTargets.length + 1,
    prevTargetUSD: previousTarget,
    nextTargetUSD: null,
  };
};

function CategoryChip({ label, isActive, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.categoryChip,
        { backgroundColor: isActive ? colors.text : colors.card, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          styles.categoryChipText,
          { color: isActive ? colors.background : colors.muted },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const resolveTemptationTitle = (item, language, override) => {
  if (override) return override;
  if (item.titleOverride) return item.titleOverride;
  const source = item.title;
  if (typeof source === "string") return source;
  return (
    source?.[language] ||
    source?.en ||
    (typeof source === "object" ? Object.values(source)[0] : null) ||
    "Wish"
  );
};

const getTemptationPrice = (item) => {
  const price = typeof item?.priceUSD === "number" ? item.priceUSD : item?.basePriceUSD;
  if (typeof price === "number" && !Number.isNaN(price)) {
    return price;
  }
  return 0;
};

function TemptationCardComponent({
  item,
  language,
  colors,
  onAction,
  t,
  currency = activeCurrency,
  stats = {},
  feedback,
  titleOverride,
  descriptionOverride = null,
  goalLabel = null,
  isWishlistGoal = false,
  isFocusTarget = false,
  editCategoryValue = DEFAULT_IMPULSE_CATEGORY,
  onEditCategoryChange,
  onToggleEdit,
  isEditing = false,
  editTitleValue = "",
  editPriceValue = "",
  editGoalLabel = "",
  editEmojiValue = "",
  editDescriptionValue = "",
  onEditTitleChange,
  onEditPriceChange,
  onEditEmojiChange,
  onEditDescriptionChange,
  onEditSave,
  onEditCancel,
  onEditDelete,
  onEditGoalSelect,
  onSwipeDelete,
  onQuickGoalToggle,
  showEditorInline = false,
  cardStyle = null,
  isPrimaryTemptation = false,
}) {
  const title = resolveTemptationTitle(item, language, titleOverride);
  const isCustomCard =
    Array.isArray(item?.categories) && item.categories.some((category) => category === "custom");
  const descriptionString = typeof item.description === "string" ? item.description : null;
  const descriptionMap =
    item.description && typeof item.description === "object" && !Array.isArray(item.description)
      ? item.description
      : null;
  const customDescriptionFallback = isCustomCard
    ? buildCustomTemptationDescription(item?.gender || "none")
    : null;
  const customLanguageFallback =
    customDescriptionFallback?.[language] ||
    (language === "ru" ? customDescriptionFallback?.ru : customDescriptionFallback?.en) ||
    customDescriptionFallback?.en ||
    null;
  let resolvedDesc = descriptionOverride || null;
  if (!resolvedDesc) {
    if (isCustomCard) {
      resolvedDesc =
        (descriptionMap ? descriptionMap[language] : null) ||
        customLanguageFallback ||
        (language === "ru"
          ? descriptionMap?.ru || descriptionMap?.en || descriptionString
          : descriptionMap?.en || descriptionMap?.ru || descriptionString) ||
        descriptionString ||
        "";
    } else {
      resolvedDesc =
        (descriptionMap ? descriptionMap[language] : null) ||
        (language === "ru"
          ? descriptionMap?.ru || descriptionMap?.en || descriptionString
          : descriptionMap?.en || descriptionMap?.ru || descriptionString) ||
        descriptionString ||
        "";
    }
  }
  const desc = resolvedDesc || "";
  const priceUSD = item.priceUSD || item.basePriceUSD || 0;
  const priceLabel = formatCurrency(convertToCurrency(priceUSD, currency), currency);
  const highlight = true;
  const isDarkTheme = colors.background === THEMES.dark.background;
  const baseColor = item.color || colors.card;
  const focusActive = isFocusTarget && !showEditorInline;
  const darkCardPalette = highlight
    ? {
        background: blendColors(baseColor, "#2B1A00", 0.4),
        border: "#F6C16B",
        text: "#FFEED0",
        muted: "rgba(255,238,208,0.75)",
        badgeBg: "rgba(255,255,255,0.2)",
        badgeBorder: "rgba(255,255,255,0.32)",
        swipeBg: "rgba(255,255,255,0.08)",
        swipeBorder: "rgba(255,255,255,0.18)",
      }
    : {
        background: "#101526",
        border: "rgba(255,255,255,0.08)",
        text: colors.text,
        muted: colors.muted,
        badgeBg: "rgba(255,255,255,0.08)",
        badgeBorder: "rgba(255,255,255,0.18)",
        swipeBg: "rgba(255,255,255,0.04)",
        swipeBorder: "rgba(255,255,255,0.08)",
      };
  const baseCardBackground = isDarkTheme
    ? blendColors(colors.card, baseColor, 0.2)
    : baseColor;
  const cardBackground = baseCardBackground;
  const cardSurfaceColor = isDarkTheme
    ? blendColors(cardBackground, "#FFFFFF", 0.08)
    : lightenColor(cardBackground, 0.18);
  const primaryHighlightColor = Platform.OS === "ios" ? "#FF6F7D" : "#FF4D5A";
  const cardTextColor = isDarkTheme ? darkCardPalette.text : colors.text;
  const cardMutedColor = isDarkTheme ? darkCardPalette.muted : colors.muted;
  const resolvedGoalLabel =
    typeof goalLabel === "string" && goalLabel.trim().length ? goalLabel.trim() : "";
  const coinBurstColor = isDarkTheme ? "#FFD78B" : "#FFF4B3";
  const effectiveWishlistGoal = isWishlistGoal && !isPrimaryTemptation;
  const highlightPinned = effectiveWishlistGoal && !showEditorInline;
  const textureSeedSource = item.id || title || "";
  const textureSeed = textureSeedSource
    ? textureSeedSource.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;
  const textureVariant = textureSeed % CARD_TEXTURE_ACCENTS.length;
  const accentPaletteColor = CARD_TEXTURE_ACCENTS[textureVariant];
  const textureShift = (textureSeed % 7) * 0.02;
  const texturePrimaryColor = blendColors(
    cardBackground,
    isDarkTheme ? "#080808" : "#FFFFFF",
    isDarkTheme ? 0.12 + textureShift : 0.42 + textureShift * 0.5
  );
  const textureAccentColor = blendColors(
    cardBackground,
    isPrimaryTemptation ? "#FF6B8F" : highlightPinned ? "#FFD36E" : accentPaletteColor,
    isDarkTheme ? 0.25 + textureShift : 0.5 + textureShift * 0.5
  );
  const textureHighlightColor = blendColors(
    cardBackground,
    highlightPinned ? "#FFF6C8" : isPrimaryTemptation ? "#FF9FB0" : "#D9F2FF",
    isDarkTheme ? 0.18 : 0.32
  );
  const showCardTexture = false;
  const defaultShadowColor = isDarkTheme ? "rgba(255,255,255,0.55)" : "rgba(15,23,42,0.22)";
  const redShadowColor = Platform.OS === "ios" ? "rgba(244,37,78,0.6)" : "rgba(244,37,78,0.88)";
  const goldShadowColor = "rgba(255,198,110,0.75)";
  const focusShadowColor = "rgba(255,92,92,0.85)";
  const shadowColor = isPrimaryTemptation
    ? redShadowColor
    : focusActive
    ? focusShadowColor
    : highlightPinned
    ? goldShadowColor
    : defaultShadowColor;
  const shadowRadius = isPrimaryTemptation
    ? Platform.OS === "ios" ? 28 : 36
    : focusActive
    ? 34
    : highlightPinned
    ? 30
    : isDarkTheme
    ? 28
    : 22;
  const shadowOpacity = isPrimaryTemptation
    ? Platform.OS === "ios" ? 0.6 : 0.8
    : focusActive
    ? 0.75
    : highlightPinned
    ? 0.6
    : isDarkTheme
    ? 0.55
    : 0.3;
  const shadowElevation = isPrimaryTemptation ? 16 : focusActive ? 18 : highlightPinned ? 14 : isDarkTheme ? 12 : 8;
  const shadowOffsetHeight = isPrimaryTemptation
    ? Platform.OS === "ios" ? 12 : 18
    : focusActive
    ? 16
    : highlightPinned
    ? 16
    : isDarkTheme
    ? 14
    : 12;
  const cardShadowStyle = Platform.select({
    ios: {
      shadowColor,
      shadowOpacity,
      shadowRadius,
      shadowOffset: { width: 0, height: shadowOffsetHeight },
    },
    android: {
      elevation: shadowElevation,
      shadowColor,
    },
    default: {},
  });
  const defaultGoalBadgeBackground = isDarkTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const defaultGoalBadgeBorder = isDarkTheme ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.08)";
  const defaultGoalBadgeText = isDarkTheme ? "#FFF7E1" : colors.text;
  const canAssignGoal = !isPrimaryTemptation;
  const hasGoalAssigned = !!resolvedGoalLabel && canAssignGoal;
  const refuseCount = stats?.count || 0;
  const totalRefusedLabel = formatCurrency(
    convertToCurrency(stats?.totalUSD || 0, currency),
    currency
  );
  const actionConfig = [
    { type: "save", label: t("saveAction"), variant: "primary" },
    { type: "spend", label: t("spendAction"), variant: "ghost" },
    { type: "maybe", label: t("maybeAction"), variant: "outline" },
  ];
  const [coinBursts, setCoinBursts] = useState([]);
  const messageActive = feedback?.message;
  const burstKey = feedback?.burstKey;
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeActionRef = useRef(false);

  useEffect(() => {
    translateX.setValue(0);
  }, [item.id, translateX]);

  const handleSwipeRelease = useCallback(
    (dx = 0) => {
      if (!showEditorInline) {
        if (dx > GOAL_SWIPE_THRESHOLD && onQuickGoalToggle) {
          if (!canAssignGoal) {
            Alert.alert(language === "ru" ? "Алми" : "Almi", language === "ru"
              ? "Главное искушение нельзя сделать целью."
              : "The main temptation can’t be turned into a goal.");
          } else {
            swipeActionRef.current = true;
            onQuickGoalToggle(item);
          }
        } else if (dx < -DELETE_SWIPE_THRESHOLD && onSwipeDelete) {
          swipeActionRef.current = true;
          onSwipeDelete(item);
        }
      }
      Animated.timing(translateX, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [item, onQuickGoalToggle, onSwipeDelete, showEditorInline, translateX]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !showEditorInline &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 6,
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          if (showEditorInline) return;
          const dx = Math.max(Math.min(gestureState.dx, 150), -180);
          translateX.setValue(dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          handleSwipeRelease(gestureState.dx);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => handleSwipeRelease(0),
      }),
    [handleSwipeRelease, showEditorInline, translateX]
  );

  useEffect(() => {
  }, [messageActive]);

  useEffect(() => {
    if (!burstKey) return;
    const coins = Array.from({ length: 5 }).map((_, index) => ({
      id: `${burstKey}-${index}`,
      progress: new Animated.Value(0),
      offsetX: (Math.random() - 0.5) * 80,
      rotation: (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 160),
      delay: index * 80,
    }));
    setCoinBursts(coins);
    coins.forEach((coin) => {
      Animated.timing(coin.progress, {
        toValue: 1,
        duration: 900,
        delay: coin.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
    const timeout = setTimeout(() => setCoinBursts([]), 1100);
    return () => clearTimeout(timeout);
  }, [burstKey]);

  const handleCardPress = useCallback(() => {
    if (swipeActionRef.current) {
      swipeActionRef.current = false;
      return;
    }
    onToggleEdit?.(item);
  }, [item, onToggleEdit]);

  return (
    <View style={styles.temptationSwipeWrapper}>
      <View style={styles.temptationSwipeBackground} pointerEvents="none">
        <View
          style={[
            styles.swipeHint,
            styles.swipeHintLeft,
            {
              borderColor: isDarkTheme ? "rgba(255,255,255,0.12)" : colors.border,
              backgroundColor: isDarkTheme ? "rgba(246,193,107,0.2)" : "rgba(246,193,107,0.12)",
            },
          ]}
        >
          <Text style={[styles.swipeHintIcon, { color: GOAL_HIGHLIGHT_COLOR }]}>🎯</Text>
          <Text style={[styles.swipeHintText, { color: GOAL_HIGHLIGHT_COLOR }]}>
            {isWishlistGoal ? t("goalAssignClear") : t("goalSwipeAdd")}
          </Text>
        </View>
        <View
          style={[
            styles.swipeHint,
            styles.swipeHintRight,
            {
              borderColor: isDarkTheme ? "rgba(255,255,255,0.12)" : colors.border,
              backgroundColor: isDarkTheme ? "rgba(255,87,115,0.15)" : "rgba(233,61,87,0.12)",
            },
          ]}
        >
          <Text style={[styles.swipeHintIcon, { color: "#E15555" }]}>🗑️</Text>
          <Text style={[styles.swipeHintText, { color: "#E15555" }]}>{t("goalSwipeDelete")}</Text>
        </View>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.temptationCard,
          cardShadowStyle,
          cardStyle,
          {
            backgroundColor: cardSurfaceColor,
            transform: [{ translateX }],
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={handleCardPress}>
          <View>
            {showCardTexture && (
              <View pointerEvents="none" style={styles.temptationTextureContainer}>
                <View
                  style={[
                    styles.temptationTextureOverlay,
                    { backgroundColor: texturePrimaryColor, opacity: isDarkTheme ? 0.08 : 0.18 },
                  ]}
                />
                <View
                  style={[
                    styles.temptationTextureOverlay,
                    styles.temptationTextureAccent,
                    { backgroundColor: textureAccentColor },
                  ]}
                />
                <View
                  style={[
                    styles.temptationTextureOverlay,
                    styles.temptationTextureHighlight,
                    { backgroundColor: textureHighlightColor },
                  ]}
                />
              </View>
            )}
      <View
        style={[
          styles.temptationHeader,
          !showEditorInline && effectiveWishlistGoal && canAssignGoal ? { paddingRight: 64 } : null,
        ]}
      >
        {showEditorInline ? (
          <View style={styles.titleEditWrapper}>
            <View
              style={[
                styles.emojiEditWrapper,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <TextInput
                style={[styles.emojiEditInput, { color: colors.text }]}
                value={editEmojiValue ?? ""}
                onChangeText={onEditEmojiChange}
                placeholder={item.emoji || DEFAULT_TEMPTATION_EMOJI}
                placeholderTextColor={colors.muted}
                selectTextOnFocus
                maxLength={2}
              />
              <Text style={[styles.emojiEditIcon, { color: colors.muted }]}>✏️</Text>
            </View>
            <View style={styles.titleEditInputContainer}>
              <TextInput
                style={[
                  styles.titleEditInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.card,
                  },
                ]}
                value={editTitleValue}
                onChangeText={onEditTitleChange}
                placeholder={t("priceEditNameLabel")}
                placeholderTextColor={colors.muted}
              />
              <Text style={[styles.titleEditIcon, { color: colors.muted }]}>✏️</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.emojiDisplayWrapper}>
              <Text style={[styles.temptationEmoji, { color: cardTextColor }]}>{item.emoji || "✨"}</Text>
            </View>
            <Text style={[styles.temptationTitle, { color: cardTextColor }]}>{title}</Text>
          </>
        )}
      </View>
      {!showEditorInline && effectiveWishlistGoal && canAssignGoal && (
        <View style={styles.temptationBadgeStack} pointerEvents="none">
          {hasGoalAssigned && (
            <View
              style={[
                styles.temptationGoalBadge,
                styles.temptationGoalBadgeFloating,
                {
                  backgroundColor: isDarkTheme ? "#F6C16B22" : "#FFF2CC",
                  borderColor: isDarkTheme ? "#F6C16B55" : "#F6C16B",
                },
              ]}
            >
              <Text style={[styles.temptationGoalBadgeText, { color: isDarkTheme ? "#FEEAC4" : "#5C3A00" }]}>
                {t("goalPinnedBadge")}
              </Text>
            </View>
          )}
          {isWishlistGoal && (
            <View
              style={[
                styles.temptationPinnedBadge,
                {
                  borderColor: GOAL_HIGHLIGHT_COLOR,
                  backgroundColor: isDarkTheme ? "rgba(246,193,107,0.2)" : "rgba(246,193,107,0.12)",
                },
              ]}
            >
              <Text style={[styles.temptationPinnedBadgeText, { color: GOAL_HIGHLIGHT_COLOR }]}>
                {t("goalPinnedBadge")}
              </Text>
            </View>
          )}
        </View>
      )}
      {!showEditorInline && hasGoalAssigned && (
        <View
          style={[
            styles.temptationGoalBadge,
            {
              backgroundColor: isDarkTheme ? "rgba(246,193,107,0.18)" : "rgba(246,193,107,0.12)",
              borderColor: isDarkTheme ? "rgba(246,193,107,0.55)" : "rgba(246,193,107,0.65)",
            },
          ]}
        >
          <Text style={[styles.temptationGoalBadgeText, { color: isDarkTheme ? "#FEEAC4" : "#5C3A00" }]}>
            {t("goalDestinationLabel")}: {resolvedGoalLabel}
          </Text>
        </View>
      )}
      {focusActive && (
        <View
          style={[
            styles.temptationFocusBadge,
            {
              backgroundColor: isDarkTheme ? "rgba(255,92,92,0.15)" : "rgba(255,92,92,0.12)",
              borderColor: isDarkTheme ? "rgba(255,92,92,0.5)" : "rgba(255,92,92,0.45)",
            },
          ]}
        >
          <Text style={[styles.temptationFocusBadgeText, { color: isDarkTheme ? "#FFC0C0" : "#C2153B" }]}>
            {t("focusBadgeLabel")}
          </Text>
        </View>
      )}
      {showEditorInline ? (
        <TouchableOpacity
          style={[
            styles.temptationGoalBadge,
            styles.temptationGoalBadgeEditable,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          onPress={onEditGoalSelect}
        >
          <Text style={[styles.temptationGoalBadgeText, { color: colors.text }]}>
            {goalLabel || t("goalAssignFieldLabel")}
          </Text>
          <Text style={[styles.editorHintIcon, { color: colors.muted, marginLeft: 6 }]}>✏️</Text>
        </TouchableOpacity>
      ) : null}
      {showEditorInline ? (
        <View style={styles.descriptionEditWrapper}>
          <TextInput
            multiline
            style={[
              styles.descriptionEditInput,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.card,
              },
            ]}
            value={editDescriptionValue ?? ""}
            onChangeText={onEditDescriptionChange}
            placeholder={t("priceEditDescriptionLabel")}
            placeholderTextColor={colors.muted}
          />
          <Text style={[styles.editorHintIcon, { color: colors.muted }]}>✏️</Text>
        </View>
      ) : desc ? (
        <Text style={[styles.temptationDesc, { color: cardMutedColor }]}>
          {desc}
        </Text>
      ) : null}
      {refuseCount > 0 && (
        <Text style={[styles.temptationRefuseMeta, { color: cardMutedColor }]}>
          {t("tileRefuseCount", { count: refuseCount, amount: totalRefusedLabel })}
        </Text>
      )}
      <View style={styles.temptationPriceRow}>
        {showEditorInline ? (
          <View
            style={[
              styles.temptationPricePill,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <TextInput
              style={[
                styles.pricePillInput,
                { color: colors.text },
              ]}
              value={editPriceValue ?? ""}
              onChangeText={onEditPriceChange}
              keyboardType="decimal-pad"
              placeholder={t("priceEditAmountLabel", { currency })}
              placeholderTextColor={colors.muted}
            />
            <Text style={[styles.editorHintIcon, { color: colors.muted }]}>✏️</Text>
          </View>
        ) : (
          <Text
            style={[
              styles.temptationPrice,
              { color: cardTextColor },
            ]}
          >
            {priceLabel}
          </Text>
        )}
      </View>
      {showEditorInline && (
        <View style={styles.categoryEditSection}>
          <Text style={[styles.categoryEditLabel, { color: colors.muted }]}>
            {t("impulseCategoryLabel")}
          </Text>
          <ImpulseCategorySelector
            value={editCategoryValue || DEFAULT_IMPULSE_CATEGORY}
            onChange={onEditCategoryChange}
            colors={colors}
            language={language}
            compact
          />
        </View>
      )}
      {!showEditorInline && (
        <View style={styles.temptationActions}>
        {actionConfig.map((action) => {
          let buttonStyle;
          let textStyle;
          if (action.type === "save") {
            buttonStyle = [
              styles.temptationButtonPrimary,
              { backgroundColor: SAVE_ACTION_COLOR, opacity: action.disabled ? 0.4 : 1 },
            ];
            textStyle = [styles.temptationButtonPrimaryText, { color: "#FFFFFF" }];
          } else if (action.type === "spend") {
            buttonStyle = [
              styles.temptationButtonGhost,
              { borderColor: SPEND_ACTION_COLOR, opacity: action.disabled ? 0.4 : 1 },
            ];
            textStyle = [styles.temptationButtonGhostText, { color: SPEND_ACTION_COLOR }];
          } else if (action.variant === "primary") {
            buttonStyle = [
              styles.temptationButtonPrimary,
              { backgroundColor: colors.text, opacity: action.disabled ? 0.35 : 1 },
            ];
            textStyle = [styles.temptationButtonPrimaryText, { color: colors.background }];
          } else if (action.variant === "ghost") {
            buttonStyle = [styles.temptationButtonGhost, { borderColor: colors.text }];
            textStyle = [styles.temptationButtonGhostText, { color: colors.text }];
          } else {
            buttonStyle = [styles.temptationButtonOutline, { borderColor: colors.border }];
            textStyle = [styles.temptationButtonOutlineText, { color: colors.muted }];
          }
          return (
            <TouchableOpacity
              key={action.type}
              style={buttonStyle}
              onPress={() => onAction(action.type, item)}
            >
              <Text style={textStyle}>{action.label}</Text>
            </TouchableOpacity>
          );
        })}
        </View>
      )}
      {coinBursts.map((coin) => {
        const translateY = coin.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -140],
        });
        const translateXCoin = coin.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, coin.offsetX],
        });
        const rotate = coin.progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${coin.rotation}deg`],
        });
        const scale = coin.progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.3, 1, 0.6],
        });
        const opacity = coin.progress.interpolate({
          inputRange: [0, 0.6, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={coin.id}
            pointerEvents="none"
            style={[
              styles.coinBurst,
              {
                opacity,
                transform: [{ translateX: translateXCoin }, { translateY }, { rotate }, { scale }],
              },
            ]}
          >
            <View style={[styles.coinBurstInner, { backgroundColor: coinBurstColor }]} />
          </Animated.View>
        );
      })}
      {messageActive && null}
      {showEditorInline && isEditing && (
        <View style={[styles.temptationEditor, { borderTopColor: colors.border }]}>
          <View style={styles.temptationEditorActions}>
            <TouchableOpacity
              style={[styles.priceModalPrimary, { backgroundColor: colors.text }]}
              onPress={onEditSave}
            >
              <Text style={[styles.priceModalPrimaryText, { color: colors.background }]}>
                {t("priceEditSave")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onEditCancel}>
              <Text style={[styles.priceModalCancel, { color: colors.muted }]}>
                {t("priceEditCancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onEditDelete}>
              <Text style={[styles.priceModalDeleteText, { color: "#E15555" }]}>
                {t("priceEditDelete")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </View>
  );
}

const TemptationCard = React.memo(TemptationCardComponent);

function SavingsHeroCard({
  goldPalette,
  heroSpendCopy,
  heroEncouragementLine,
  levelLabel,
  totalSavedLabel,
  progressPercent,
  progressPercentLabel,
  goalProgressLabel,
  isGoalComplete = false,
  completionLabel,
  t,
  dailySavings = [],
  analyticsPreview = [],
  potentialSavedUSD = 0,
  actualSavedUSD = 0,
  currency,
  hasBaseline = false,
  onBaselineSetup = () => {},
  onPotentialDetailsOpen = null,
  levelHasNext = false,
  levelRemainingLabel = "",
  levelTargetLabel = "",
  levelProgressValue = 0,
  healthPoints = 0,
  onBreakdownPress = () => {},
}) {
  const [expanded, setExpanded] = useState(false);
  const [levelExpanded, setLevelExpanded] = useState(false);
  const maxAmount = Math.max(...dailySavings.map((day) => day.amountUSD), 0);
  const potentialLocal = formatCurrency(convertToCurrency(potentialSavedUSD || 0, currency), currency);
  const actualLocal = formatCurrency(convertToCurrency(actualSavedUSD || 0, currency), currency);
  const coinEntries = useMemo(() => buildHealthCoinEntries(healthPoints), [healthPoints]);
  const hasCoinInventory = coinEntries.some((entry) => entry.count > 0);
  const potentialRatio = potentialSavedUSD > 0 ? Math.min(actualSavedUSD / potentialSavedUSD, 1) : 0;
  const missedUSD = Math.max(0, potentialSavedUSD - actualSavedUSD);
  const statusKey =
    actualSavedUSD > potentialSavedUSD
      ? "potentialBlockStatusAhead"
      : actualSavedUSD <= 0
      ? "potentialBlockStatusStart"
      : potentialRatio >= 0.8
      ? "potentialBlockStatusOnTrack"
      : "potentialBlockStatusBehind";
  const handlePotentialDetailsOpen = useCallback(() => {
    if (!hasBaseline) return;
    if (typeof onPotentialDetailsOpen === "function") {
      onPotentialDetailsOpen();
    }
  }, [hasBaseline, onPotentialDetailsOpen]);
  return (
    <View
      style={[
        styles.progressHeroCard,
        styles.savedHeroCard,
        {
          backgroundColor: goldPalette.background,
          borderColor: goldPalette.border,
          shadowColor: goldPalette.shadow,
        },
      ]}
    >
      <View style={[styles.savedHeroGlow, { backgroundColor: goldPalette.glow }]} />
      <View
        style={[
          styles.savedHeroGlow,
          styles.savedHeroGlowBottom,
          { backgroundColor: goldPalette.glow },
        ]}
      />
      <View style={styles.savedHeroHeader}>
        <View style={styles.savedHeroTextBlock}>
          <Text style={[styles.progressHeroTitle, { color: goldPalette.text }]}>
            {t("progressHeroTitle")}
          </Text>
          <Text style={[styles.savedHeroSubtitle, { color: goldPalette.subtext }]}>
            {heroSpendCopy}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.savedHeroLevelButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.85}
          onPress={() => setLevelExpanded((prev) => !prev)}
        >
          <View
            style={[
              styles.savedHeroLevelBadge,
              {
                backgroundColor: goldPalette.badgeBg,
                borderColor: goldPalette.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.savedHeroLevelText, { color: goldPalette.badgeText }]}>
              {levelLabel}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      {levelExpanded && (
        <View
          style={[
            styles.heroLevelDetails,
            {
              backgroundColor: goldPalette.badgeBg,
              borderColor: goldPalette.badgeBorder,
            },
          ]}
        >
          <Text style={[styles.heroLevelTitle, { color: goldPalette.text }]}>
            {t("levelWidgetTitle")}
          </Text>
          <Text style={[styles.heroLevelSubtitle, { color: goldPalette.subtext }]}>
            {levelHasNext
              ? t("levelWidgetSubtitle", { amount: levelRemainingLabel })
              : t("levelWidgetMaxed")}
          </Text>
          <View style={[styles.levelWidgetBar, { backgroundColor: goldPalette.barBg }]}>
            <View
              style={[
                styles.levelWidgetFill,
                { backgroundColor: goldPalette.accent, width: `${Math.min(Math.max(levelProgressValue, 0), 1) * 100}%` },
              ]}
            />
          </View>
        </View>
      )}
      <View style={styles.savedHeroAmountWrap}>
        <Text style={[styles.progressHeroAmount, { color: goldPalette.text }]}>
          {totalSavedLabel}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.heroPotentialCard,
          {
            backgroundColor: goldPalette.badgeBg,
            borderColor: goldPalette.badgeBorder,
          },
        ]}
        activeOpacity={0.9}
        onPress={handlePotentialDetailsOpen}
      >
        {hasBaseline ? (
          <>
            <View style={styles.heroPotentialHeader}>
              <Text style={[styles.heroPotentialLabel, { color: goldPalette.text }]}>
                {t("potentialBlockTitle")}
              </Text>
              <Text style={[styles.heroPotentialValue, { color: goldPalette.text }]}>
                {potentialLocal}
              </Text>
            </View>
            <Text style={[styles.heroPotentialStatus, { color: goldPalette.subtext }]}>
              {t(statusKey)}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.heroPotentialLabel, { color: goldPalette.text }]}>
              {t("potentialBlockCta")}
            </Text>
            <TouchableOpacity
              style={[
                styles.heroPotentialButton,
                {
                  borderColor: goldPalette.text,
                },
              ]}
              onPress={onBaselineSetup}
            >
              <Text style={[styles.heroPotentialButtonText, { color: goldPalette.text }]}>
                {t("baselineCTA")}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
      <View style={styles.savedHeroProgressRow}>
        <View
          style={[
            styles.progressHeroBar,
            styles.savedHeroBar,
            { backgroundColor: goldPalette.barBg },
          ]}
        >
          <View
            style={[
              styles.progressHeroFill,
              { backgroundColor: goldPalette.accent, width: `${progressPercent * 100}%` },
            ]}
          />
        </View>
        <View
          style={[
            styles.savedHeroPercentTag,
            { backgroundColor: goldPalette.badgeBg, borderColor: goldPalette.border },
          ]}
        >
          <Text style={[styles.savedHeroPercentText, { color: goldPalette.text }]}>
            {progressPercentLabel}%
          </Text>
        </View>
      </View>
      <View style={styles.savedHeroGoalRow}>
        <Text style={[styles.goalLabel, { color: goldPalette.subtext }]}>{t("goalWidgetTitle")}</Text>
        <TouchableOpacity
          style={styles.savedHeroToggleButton}
          onPress={() => setExpanded((prev) => !prev)}
        >
          <Text style={[styles.savedHeroToggleText, { color: goldPalette.subtext }]}>
            {expanded ? t("heroCollapse") : t("heroExpand")}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.savedHeroGoalMetaRow}>
        <Text style={[styles.savedHeroGoalLabel, { color: goldPalette.subtext }]}>{goalProgressLabel}</Text>
        {isGoalComplete && (
          <View
            style={[
              styles.goalCompleteBadge,
              { backgroundColor: goldPalette.badgeBg, borderColor: goldPalette.badgeBorder },
            ]}
          >
            <Text style={[styles.goalCompleteBadgeText, { color: goldPalette.badgeText }]}>
              {completionLabel}
            </Text>
          </View>
        )}
      </View>
      {expanded && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onBreakdownPress}
          style={styles.savedHeroExpanded}
        >
          <View
            style={[
              styles.savedHeroCoinsCard,
              { backgroundColor: goldPalette.badgeBg, borderColor: goldPalette.badgeBorder },
            ]}
          >
            <View style={styles.savedHeroCoinsText}>
              <Text style={[styles.savedHeroCoinsLabel, { color: goldPalette.text }]}>
                {t("freeDayHealthTitle")}
              </Text>
              <Text style={[styles.savedHeroCoinsSubtitle, { color: goldPalette.subtext }]}>
                {t("freeDayHealthSubtitle")}
              </Text>
              {hasCoinInventory && (
                <View style={styles.freeDayCoinRow}>
                  {coinEntries.map((entry) =>
                    entry.count ? (
                      <View
                        key={entry.id}
                        style={[
                          styles.freeDayCoinBadge,
                          { borderColor: goldPalette.border, backgroundColor: goldPalette.background },
                        ]}
                      >
                        <Image source={entry.asset} style={styles.freeDayCoinImage} />
                        <Text style={[styles.freeDayCoinCount, { color: goldPalette.text }]}>×{entry.count}</Text>
                      </View>
                    ) : null
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.savedHeroCoinsValue, { color: goldPalette.accent }]}>
              {healthPoints}
            </Text>
          </View>

          <View style={styles.savedHeroDaily}>
            <Text style={[styles.savedHeroDailyTitle, { color: goldPalette.text }]}>
              {t("heroDailyTitle")}
            </Text>
            {maxAmount > 0 ? (
              <View style={styles.savedHeroBars}>
                {dailySavings.map((day) => (
                  <View key={day.key} style={styles.savedHeroBarItem}>
                    <View style={styles.savedHeroBarAmountWrap}>
                      <Text style={[styles.savedHeroBarAmount, { color: goldPalette.text }]}>
                        {day.amountUSD ? day.amountLabel : ""}
                      </Text>
                    </View>
                    <View style={styles.savedHeroBarTrack}>
                      <View
                        style={[
                          styles.savedHeroBarColumn,
                          {
                            height: `${day.percent}%`,
                            backgroundColor: goldPalette.accent,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.savedHeroBarLabel, { color: goldPalette.subtext }]}>
                      {day.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.savedHeroDailyEmpty, { color: goldPalette.subtext }]}>
                {t("heroDailyEmpty")}
              </Text>
            )}
            {analyticsPreview.length > 0 && (
              <View style={styles.savedHeroStatsRow}>
                {analyticsPreview.map((stat) => (
                  <View
                    key={stat.label}
                    style={[
                      styles.savedHeroStatsItem,
                      { backgroundColor: goldPalette.background, borderColor: goldPalette.border },
                    ]}
                  >
                    <Text style={[styles.savedHeroStatsValue, { color: goldPalette.text }]}>
                      {stat.value}
                    </Text>
                    <Text style={[styles.savedHeroStatsLabel, { color: goldPalette.subtext }]}>
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FreeDayCard({
  colors,
  t,
  canLog,
  onLog,
  freeDayStats = INITIAL_FREE_DAY_STATS,
  todayKey,
  weekDays = [],
  weekCount = 0,
  canRescue = false,
  needsRescue = false,
  rescueStatus = null,
  rescueCost = FREE_DAY_RESCUE_COST,
  onRescue = () => {},
  hasRescueHealth = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const streakActive = (freeDayStats.current || 0) > 0;
  const blockedToday = freeDayStats.blockedDate === todayKey;
  const palette = streakActive
    ? {
        background: "#E6F8EE",
        border: "#A8E5C5",
        accent: "#105B31",
      }
    : {
        background: colors.card,
        border: colors.border,
        accent: colors.text,
      };
  const buttonColor = streakActive ? palette.accent : "#20A36B";
  const statusLabel = canLog
    ? t("freeDayStatusAvailable")
    : freeDayStats.lastDate === todayKey
    ? t("freeDayStatusLogged")
    : blockedToday
    ? t("freeDayBlocked")
    : t("freeDayLocked");
  const stats = [
    { label: t("freeDayCurrentLabel"), value: `${freeDayStats.current || 0}` },
    { label: t("freeDayBestLabel"), value: `${freeDayStats.best || 0}` },
    { label: t("freeDayTotalShort"), value: `${freeDayStats.total || 0}` },
  ];
  const showRescueStatusAction = needsRescue && !canLog;
  const rescuePillDisabled = !hasRescueHealth;
  const rescuePillColor = "#FFD75E";
  const rescuePillTextColor = "#3C2A00";
  return (
    <View
      style={[
        styles.freeDayCard,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.freeDayHeader}>
        <View style={styles.freeDayTitleBlock}>
          <Text style={[styles.freeDayLabel, { color: colors.text }]}>{t("freeDayCardTitle")}</Text>
        </View>
        {showRescueStatusAction ? (
          <TouchableOpacity
            style={[
              styles.freeDayStatusPill,
              { backgroundColor: rescuePillColor, borderColor: rescuePillColor },
              rescuePillDisabled && styles.freeDayStatusPillDisabled,
            ]}
            onPress={onRescue}
            disabled={rescuePillDisabled}
            activeOpacity={0.85}
          >
            <Text style={[styles.freeDayStatusText, { color: rescuePillTextColor }]}>
              {t("freeDayRescuePillLabel", { count: "1" })}
            </Text>
            {BLUE_HEALTH_COIN_ASSET ? (
              <Image source={BLUE_HEALTH_COIN_ASSET} style={styles.freeDayStatusCoin} />
            ) : null}
          </TouchableOpacity>
        ) : canLog ? (
          <TouchableOpacity
            style={[
              styles.freeDayStatusPill,
              { backgroundColor: buttonColor, borderColor: buttonColor },
            ]}
            onPress={onLog}
            activeOpacity={0.85}
          >
            <Text style={[styles.freeDayStatusText, { color: "#fff" }]}>{statusLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.freeDayStatusPill,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Text style={[styles.freeDayStatusText, { color: colors.muted }]}>{statusLabel}</Text>
          </View>
        )}
      </View>
      <View style={styles.freeDaySummaryRow}>
        <View style={styles.freeDayChip}>
          <Text style={[styles.freeDayChipText, { color: palette.accent }]}>
            {t("freeDayWeekTitle")} · {weekCount}/7
          </Text>
        </View>
        <TouchableOpacity style={styles.freeDayToggle} onPress={() => setExpanded((prev) => !prev)}>
          <Text style={[styles.freeDayToggleText, { color: colors.muted }]}>
            {expanded ? t("freeDayCollapse") : t("freeDayExpand")}
          </Text>
        </TouchableOpacity>
      </View>
      {needsRescue && (
        <View
          style={[
            styles.freeDayRescueBanner,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.freeDayRescueTitle, { color: colors.text }]}>
              {t("freeDayRescueTitle")}
            </Text>
            <Text style={[styles.freeDayRescueSubtitle, { color: colors.muted }]}>
              {canRescue
                ? t("freeDayRescueSubtitle", { cost: rescueCost })
                : rescueStatus || t("freeDayRescueSubtitle", { cost: rescueCost })}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.freeDayRescueButton,
              { backgroundColor: palette.accent },
              !canRescue && styles.freeDayRescueButtonDisabled,
            ]}
            onPress={onRescue}
            disabled={!canRescue}
          >
            <Text
              style={[
                styles.freeDayRescueButtonText,
                !canRescue && { color: palette.accent, opacity: 0.6 },
              ]}
            >
              {t("freeDayRescueButton")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {expanded && (
        <>
          <View style={styles.freeDayStatsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.freeDayStat}>
                <Text style={[styles.freeDayStatLabel, { color: colors.muted }]}>{stat.label}</Text>
                <Text style={[styles.freeDayStatValue, { color: palette.accent }]}>
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>
          <View
            style={[
              styles.freeDayCalendar,
              { backgroundColor: streakActive ? "rgba(255,255,255,0.4)" : colors.card },
            ]}
          >
            <View style={styles.freeDayCalendarHeader}>
              <Text style={[styles.freeDayCalendarTitle, { color: colors.muted }]}>
                {t("freeDayWeekTitle")}
              </Text>
              <Text style={[styles.freeDayCalendarTitle, { color: colors.muted }]}>
                {weekCount}/7
              </Text>
            </View>
            <View style={styles.freeDayCalendarDays}>
              {weekDays.map((day) => (
                <View key={day.key} style={styles.freeDayCalendarDay}>
                  <Text style={[styles.freeDayCalendarLabel, { color: colors.muted }]}>
                    {day.label}
                  </Text>
                  <View
                    style={[
                      styles.freeDayCalendarDot,
                      day.active && styles.freeDayCalendarDotActive,
                      day.isToday && styles.freeDayCalendarDotToday,
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function SpendConfirmSheet({
  visible,
  item,
  currency = DEFAULT_PROFILE.currency,
  language = "ru",
  onCancel,
  onConfirm,
  colors,
  t,
}) {
  const priceUSD = item?.priceUSD || item?.basePriceUSD || 0;
  const priceLabel = formatCurrency(convertToCurrency(priceUSD, currency), currency);
  const displayTitle =
    item?.title?.[language] || item?.title?.en || item?.title || t("defaultDealTitle");
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.payBackdrop}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.payBackdropHit} />
        </TouchableWithoutFeedback>
        <View style={[styles.paySheet, { backgroundColor: colors.card }] }>
          <View style={styles.paySheetHandle} />
          <Text style={[styles.payBrand, { color: colors.text }]}>{t("spendSheetTitle")}</Text>
          <View style={[styles.payCard, { backgroundColor: colors.background }]}>
            <View style={styles.payCardIcon}>
              <Text style={styles.payCardEmoji}>{item?.emoji || "💳"}</Text>
            </View>
            <View style={styles.payCardTexts}>
              <Text style={[styles.payCardTitle, { color: colors.text }]}>{displayTitle}</Text>
            </View>
            <Text style={[styles.payCardAmount, { color: colors.text }]}>{priceLabel}</Text>
          </View>
          <Text style={[styles.paySheetSubtitle, { color: colors.muted }]}>
            {t("spendSheetSubtitle")}
          </Text>
          <View style={styles.paySheetHintRow}>
            <View style={styles.paySheetHintDot} />
            <Text style={[styles.paySheetHint, { color: colors.muted }]}>{t("spendSheetHint")}</Text>
          </View>
          <TouchableOpacity style={[styles.payConfirm, { backgroundColor: colors.text }]} onPress={onConfirm}>
            <Text style={[styles.payConfirmText, { color: colors.background }]}>
              {t("spendSheetConfirm")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.payCancel} onPress={onCancel}>
            <Text style={[styles.payCancelText, { color: colors.muted }]}>{t("spendSheetCancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function StormOverlay({ t }) {
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(flash, { toValue: 0.75, duration: 120, useNativeDriver: true }),
        Animated.timing(flash, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flash]);

  return (
    <View style={styles.stormOverlay} pointerEvents="auto">
      <RainOverlay colors={{ muted: "rgba(173,196,255,0.5)" }} />
      <Animated.View style={[styles.stormFlash, { opacity: flash }]} />
      <View style={styles.stormMessageWrap}>
        <Text style={styles.stormMessage}>{t("stormOverlayMessage")}</Text>
      </View>
    </View>
  );
}

const hasImpulseHistory = (insights) => {
  if (!insights?.categories) return false;
  if ((insights.eventCount || 0) < MIN_IMPULSE_EVENTS_FOR_MAP) return false;
  return IMPULSE_CATEGORY_ORDER.some((id) => {
    const entry = insights.categories[id];
    return (entry?.save || 0) + (entry?.spend || 0) > 0;
  });
};

function ImpulseMapCard({ insights, colors, t, language, expanded = false, onToggle }) {
  if (!insights) return null;
  const fallbackTime = t("impulseAnytimeLabel");
  const loseText = insights.hotLose
    ? t("impulseLoseCopy", {
        temptation: insights.hotLose.title,
        time: insights.hotLose.windowLabel || fallbackTime,
      })
    : t("impulseLoseEmpty");
  const winText = insights.hotWin
    ? t("impulseWinCopy", {
        temptation: insights.hotWin.title,
        time: insights.hotWin.windowLabel || fallbackTime,
      })
    : t("impulseWinEmpty");
  const trendText =
    insights.hottestCategory && insights.hottestCategory.delta > 0
      ? t("impulseTrendLabel", {
          category: getImpulseCategoryLabel(insights.hottestCategory.id, language),
        })
      : null;
  const isDarkMode = colors.background === THEMES.dark.background;
  const dangerBg = isDarkMode ? "rgba(255,108,108,0.25)" : "#FFE5E5";
  const dangerBorder = isDarkMode ? "rgba(255,108,108,0.5)" : "rgba(255,108,108,0.45)";
  const successBg = isDarkMode ? "rgba(33,209,160,0.22)" : "#E5F8EE";
  const successBorder = isDarkMode ? "rgba(33,209,160,0.45)" : "rgba(33,209,160,0.4)";
  const neutralBg = isDarkMode ? "rgba(250,204,21,0.22)" : "#FFF4D5";
  const neutralBorder = isDarkMode ? "rgba(250,204,21,0.4)" : "rgba(250,204,21,0.45)";
  const toggleLabel = expanded ? t("impulseCollapse") : t("impulseExpand");
  const categories = IMPULSE_CATEGORY_ORDER.map((id) => {
    const entry = insights.categories?.[id] || { save: 0, spend: 0 };
    return {
      id,
      label: getImpulseCategoryLabel(id, language),
      save: entry.save || 0,
      spend: entry.spend || 0,
    };
  });
  return (
    <View style={[styles.impulseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.impulseHeaderRow}>
        <View style={styles.impulseHeader}>
          <Text style={[styles.impulseCardTitle, { color: colors.text }]}>{t("impulseCardTitle")}</Text>
          <Text style={[styles.impulseCardSubtitle, { color: colors.muted }]}>
            {t("impulseCardSubtitle")}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onToggle}
          style={[
            styles.impulseToggle,
            { borderColor: colors.border, backgroundColor: lightenColor(colors.card, isDarkMode ? 0.1 : 0.25) },
          ]}
        >
          <Text style={[styles.impulseToggleText, { color: colors.text }]}>{toggleLabel}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.impulseSummaryGrid}>
        <View
          style={[
            styles.impulseBadge,
            { backgroundColor: dangerBg, borderColor: dangerBorder },
          ]}
        >
          <Text style={[styles.impulseSummaryLabel, { color: colors.text }]}>{t("impulseLoseLabel")}</Text>
          <Text style={[styles.impulseSummaryValue, { color: colors.text }]}>{loseText}</Text>
        </View>
        <View
          style={[
            styles.impulseBadge,
            { backgroundColor: successBg, borderColor: successBorder },
          ]}
        >
          <Text style={[styles.impulseSummaryLabel, { color: colors.text }]}>{t("impulseWinLabel")}</Text>
          <Text style={[styles.impulseSummaryValue, { color: colors.text }]}>{winText}</Text>
        </View>
      </View>
      {expanded && (
        <>
          {trendText ? (
            <View
              style={[
                styles.impulseTrendRow,
                { backgroundColor: neutralBg, borderColor: neutralBorder },
              ]}
            >
              <Text style={[styles.impulseTrendText, { color: colors.text }]}>{trendText}</Text>
            </View>
          ) : null}
          <View style={styles.impulseCategoryList}>
            {categories.map((category) => {
              const hasData = (category.save || 0) + (category.spend || 0) > 0;
              const isRisk = hasData && category.spend > category.save;
              const isWin = hasData && category.save > category.spend;
              let categoryBg = colors.card;
              let categoryBorder = colors.border;
              if (isRisk) {
                categoryBg = dangerBg;
                categoryBorder = dangerBorder;
              } else if (isWin) {
                categoryBg = successBg;
                categoryBorder = successBorder;
              }
              return (
                <View
                  key={category.id}
                  style={[
                    styles.impulseCategoryRow,
                    {
                      borderColor: categoryBorder,
                      backgroundColor: categoryBg,
                    },
                  ]}
                >
                  <Text style={[styles.impulseCategoryLabel, { color: colors.text }]}>
                    {category.label}
                  </Text>
                  <View style={styles.impulseCategoryStats}>
                    <Text style={[styles.impulseCategoryStat, { color: colors.text }]}>
                      {t("impulseCategorySave", { count: category.save })}
                    </Text>
                    <Text style={[styles.impulseCategoryStatSecondary, { color: colors.muted }]}>
                      {t("impulseCategorySpend", { count: category.spend })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const FeedScreen = React.memo(function FeedScreen({
  products,
  categories,
  activeCategory,
  onCategorySelect,
  savedTotalUSD,
  wishes = [],
  onTemptationAction,
  onTemptationEditToggle,
  onTemptationQuickGoalToggle,
  t,
  language,
  colors,
  currency,
  freeDayStats,
  onFreeDayLog,
  healthPoints = 0,
  onFreeDayRescue,
  freeDayRescueCost = FREE_DAY_RESCUE_COST,
  analyticsStats = [],
  refuseStats = {},
  cardFeedback = {},
  historyEvents = [],
  profile,
  titleOverrides = {},
  descriptionOverrides = {},
  onLevelCelebrate,
  onBaselineSetup,
  goalAssignments = {},
  impulseInsights = null,
  moodPreset = null,
  onMoodDetailsOpen = () => {},
  onPotentialDetailsOpen = null,
  heroGoalTargetUSD = 0,
  heroGoalSavedUSD = 0,
  editingTemptationId = null,
  editingTitleValue = "",
  editingPriceValue = "",
  editingGoalLabel = "",
  editingEmojiValue = "",
  editingDescriptionValue = "",
  editingCategoryValue = DEFAULT_IMPULSE_CATEGORY,
  onTemptationEditTitleChange,
  onTemptationEditPriceChange,
  onTemptationEditEmojiChange,
  onTemptationEditDescriptionChange,
  onTemptationEditCategoryChange,
  onTemptationEditSave,
  onTemptationEditCancel,
  onTemptationEditDelete,
  onTemptationGoalSelect,
  onTemptationSwipeDelete,
  onSavingsBreakdownPress = () => {},
  mascotOverride = null,
  onMascotAnimationComplete = () => {},
  hideMascot = false,
  onMascotPress = () => {},
  resolveTemplateTitle = () => null,
  tamagotchiMood = null,
  tamagotchiDesiredFood = null,
  primaryTemptationId = null,
  primaryTemptationDescription = "",
  focusTemplateId = null,
  tamagotchiAnimations = CLASSIC_TAMAGOTCHI_ANIMATIONS,
  lifetimeSavedUSD = 0,
  interactionStats = {},
}) {
  const resolvedHistoryEvents = Array.isArray(historyEvents) ? historyEvents : [];
  const [impulseExpanded, setImpulseExpanded] = useState(false);
  const handleBaselineSetup = onBaselineSetup || (() => {});
  const realSavedUSD = useRealSavedAmount();
  const totalSavedLabel = useMemo(
    () => formatCurrency(convertToCurrency(realSavedUSD || 0, currency), currency),
    [realSavedUSD, currency]
  );
  const heroGoalSavedLabel = useMemo(
    () => formatCurrency(convertToCurrency(heroGoalSavedUSD || 0, currency), currency),
    [heroGoalSavedUSD, currency]
  );
  const heroTargetLabel = useMemo(
    () => formatCurrency(convertToCurrency(heroGoalTargetUSD || 0, currency), currency),
    [heroGoalTargetUSD, currency]
  );
  const isGoalComplete = heroGoalTargetUSD > 0 && heroGoalSavedUSD >= heroGoalTargetUSD;
  const goalProgress = heroGoalTargetUSD > 0 ? heroGoalSavedUSD / heroGoalTargetUSD : 0;
  const remainingLocal = formatCurrency(
    convertToCurrency(Math.max(heroGoalTargetUSD - heroGoalSavedUSD, 0), currency),
    currency
  );
  const goalProgressLabel = heroGoalTargetUSD
    ? t("progressGoal", { current: heroGoalSavedLabel, goal: heroTargetLabel })
    : t("progressGoal", { current: heroGoalSavedLabel, goal: heroGoalSavedLabel });
  const personaPreset = useMemo(() => getPersonaPreset(profile?.persona), [profile?.persona]);
  const recentSavings = useMemo(
    () => resolvedHistoryEvents.filter((entry) => entry.kind === "refuse_spend").slice(0, 3),
    [resolvedHistoryEvents]
  );
  const heroSpendCopy = useMemo(() => {
    if (recentSavings.length > 0) {
      const lines = recentSavings.map((entry) => {
        const resolvedTitle =
          resolveTemplateTitle(entry?.meta?.templateId, entry?.meta?.title) ||
          entry?.title ||
          t("defaultDealTitle");
        const timestampLabel = formatLatestSavingTimestamp(entry?.timestamp, language);
        return `${resolvedTitle}${timestampLabel ? ` · ${timestampLabel}` : ""}`;
      });
      return [t("heroSpendRecentTitle"), ...lines].join("\n");
    }
    if (!realSavedUSD || realSavedUSD <= 0) {
      return t("heroSpendFallback");
    }
    const template = personaPreset?.tagline?.[language];
    if (template) {
      return template.replace("{{amount}}", totalSavedLabel);
    }
    return t("heroSpendFallback");
  }, [
    realSavedUSD,
    totalSavedLabel,
    personaPreset,
    language,
    t,
    recentSavings,
    resolveTemplateTitle,
  ]);
  const heroEncouragementLine = useMemo(() => {
    const heroLine = isGoalComplete
      ? moodPreset?.heroComplete || t("goalWidgetCompleteTagline")
      : moodPreset?.hero || t("heroEconomyContinues");
    if (moodPreset?.motivation) {
      return `${heroLine} ${moodPreset.motivation}`;
    }
    return heroLine;
  }, [isGoalComplete, moodPreset, t]);
  const isDarkMode = colors === THEMES.dark;
  const moodGradient = useMemo(
    () => applyThemeToMoodGradient(getMoodGradient(moodPreset?.id), isDarkMode ? "dark" : "light"),
    [moodPreset?.id, isDarkMode]
  );
  const mainTemptationId = primaryTemptationId;
  const goldPalette = useMemo(
    () =>
      isGoalComplete
        ? isDarkMode
          ? {
              background: "#07281C",
              border: "rgba(134,255,192,0.4)",
              glow: "rgba(46,182,125,0.35)",
              accent: "#7BFFB8",
              text: "#E9FFF5",
              subtext: "rgba(233,255,245,0.8)",
              badgeBg: "rgba(0,0,0,0.45)",
              badgeBorder: "rgba(123,255,184,0.5)",
              badgeText: "#9FFFCF",
              barBg: "rgba(0,0,0,0.3)",
              shadow: "#032015",
            }
          : {
              background: "#E7FFE8",
              border: "rgba(107,201,128,0.7)",
              glow: "rgba(185,255,210,0.6)",
              accent: "#1C8F4A",
              text: "#064321",
              subtext: "rgba(6,67,33,0.75)",
              badgeBg: "rgba(255,255,255,0.92)",
              badgeBorder: "rgba(6,67,33,0.12)",
              badgeText: "#0E5B30",
              barBg: "rgba(255,255,255,0.65)",
              shadow: "#B2F8C3",
            }
        : isDarkMode
        ? {
            background: "#2B1A00",
            border: "rgba(255,214,143,0.5)",
            glow: "rgba(255,184,0,0.25)",
            accent: "#FFCF6B",
            text: "#FFEED0",
            subtext: "rgba(255,238,208,0.8)",
            badgeBg: "rgba(0,0,0,0.35)",
            badgeBorder: "rgba(255,223,165,0.5)",
            badgeText: "#FFEED0",
            barBg: "rgba(0,0,0,0.3)",
            shadow: "#1B1100",
          }
        : {
            background: "#FFF6D5",
            border: "rgba(240,196,92,0.8)",
            glow: "rgba(255,255,255,0.8)",
            accent: "#D8960B",
            text: "#5C3300",
            subtext: "rgba(92,51,0,0.75)",
            badgeBg: "rgba(255,255,255,0.75)",
            badgeBorder: "rgba(255,255,255,0.9)",
            badgeText: "#7A4A00",
            barBg: "rgba(255,255,255,0.6)",
            shadow: "#F3C75A",
          },
    [isDarkMode, isGoalComplete]
  );
  const heroMoodBadgeStyle = useMemo(
    () =>
      isDarkMode
        ? { backgroundColor: "rgba(0,0,0,0.45)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }
        : null,
    [isDarkMode]
  );
  const heroMoodBadgeTextColor = isDarkMode ? colors.text : moodGradient.accent;
  const heroMascotWrapStyle = useMemo(
    () =>
      isDarkMode
        ? { backgroundColor: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.12)" }
        : null,
    [isDarkMode]
  );
  const showTamagotchiBubble = tamagotchiMood?.tone === "urgent";
  const tamagotchiBubbleTheme = useMemo(
    () =>
      isDarkMode
        ? {
            backgroundColor: "rgba(5,7,15,0.92)",
            borderColor: "rgba(255,255,255,0.25)",
            textColor: "#F7F9FF",
            shadowColor: "rgba(0,0,0,0.6)",
          }
        : {
            backgroundColor: "rgba(255,255,255,0.96)",
            borderColor: "rgba(28,26,42,0.12)",
            textColor: "#1C1A2A",
            shadowColor: "rgba(218,171,86,0.35)",
          },
    [isDarkMode]
  );
  const levelProgressUSD = Math.max(savedTotalUSD || 0, lifetimeSavedUSD || 0);
  const heroLevelCurrency = profile?.currency || DEFAULT_PROFILE.currency;
  const tierInfo = getTierProgress(levelProgressUSD || 0, heroLevelCurrency);
  const span = Math.max(
    (tierInfo.nextTargetUSD ?? tierInfo.prevTargetUSD ?? 1) -
      (tierInfo.prevTargetUSD ?? 0),
    1
  );
  const previousTierInfo = useRef(tierInfo.level);
  const tierProgress = tierInfo.nextTargetUSD
    ? (levelProgressUSD - tierInfo.prevTargetUSD) / span
    : 1;
  const heroLevelHasNext = !!tierInfo.nextTargetUSD;
  const heroLevelRemainingUSD = heroLevelHasNext
    ? Math.max(tierInfo.nextTargetUSD - levelProgressUSD, 0)
    : 0;
  const heroLevelRemainingLabel = heroLevelHasNext
    ? formatCurrency(convertToCurrency(heroLevelRemainingUSD, heroLevelCurrency), heroLevelCurrency)
    : "";
  const heroLevelTargetLabel = heroLevelHasNext
    ? formatCurrency(convertToCurrency(tierInfo.nextTargetUSD, heroLevelCurrency), heroLevelCurrency)
    : "";
  const heroLevelProgress = Math.min(Math.max(tierProgress, 0), 1);
  const previousSavedTotal = useRef(savedTotalUSD);
  useEffect(() => {
    if (savedTotalUSD > previousSavedTotal.current) {
      logEvent("savings_updated", {
        saved_usd_total: savedTotalUSD,
        tier_level: tierInfo.level,
        next_tier_usd: tierInfo.nextTargetUSD || null,
        profile_goal: profile.goal || "none",
      });
    }
    previousSavedTotal.current = savedTotalUSD;
  }, [savedTotalUSD, tierInfo.level, tierInfo.nextTargetUSD, profile.goal]);
  useEffect(() => {
    if (tierInfo.level > previousTierInfo.current) {
      const levelsEarned = tierInfo.level - previousTierInfo.current;
      logEvent("savings_level_up", {
        level: tierInfo.level,
        saved_usd_total: savedTotalUSD,
      });
      onLevelCelebrate?.(tierInfo.level, levelsEarned);
    }
    previousTierInfo.current = tierInfo.level;
  }, [tierInfo.level, onLevelCelebrate, savedTotalUSD]);
  const progressPercent = Math.min(Math.max(goalProgress, 0), 1);
  const progressPercentLabel = Math.round(progressPercent * 100);
  const levelLabel = t("progressHeroLevel", { level: tierInfo.level });
  const levelCurrency = profile?.currency || DEFAULT_PROFILE.currency;
  const levelProgress = Math.min(Math.max(tierProgress, 0), 1);
  const levelRemainingUSD = tierInfo.nextTargetUSD
    ? Math.max(tierInfo.nextTargetUSD - levelProgressUSD, 0)
    : 0;
  const levelRemainingLabel = formatCurrency(
    convertToCurrency(levelRemainingUSD, levelCurrency),
    levelCurrency
  );
  const levelTargetLabel = tierInfo.nextTargetUSD
    ? formatCurrency(convertToCurrency(tierInfo.nextTargetUSD, levelCurrency), levelCurrency)
    : "";
  const todayDate = new Date();
  const todayTimestamp = todayDate.getTime();
  const todayKey = getDayKey(todayDate);
  const dayBeforeYesterdayKey = getDayKey(new Date(todayDate.getTime() - DAY_MS * 2));
  const freeDayBlockedToday = freeDayStats.blockedDate === todayKey;
  const isEvening = new Date().getHours() >= 18;
  const canLogFreeDay = isEvening && freeDayStats.lastDate !== todayKey && !freeDayBlockedToday;
  const streakNeedsRescue =
    freeDayStats.current > 0 &&
    freeDayStats.lastDate === dayBeforeYesterdayKey &&
    freeDayStats.lastDate !== todayKey;
  const hasRescueHealth = healthPoints >= freeDayRescueCost;
  const canRescueFreeDay = streakNeedsRescue && hasRescueHealth;
  const rescueStatus = !streakNeedsRescue
    ? null
    : !hasRescueHealth
    ? t("freeDayRescueNeedHealth", { cost: freeDayRescueCost })
    : null;
  const potentialSavedUSD = useSavingsSimulation(
    profile?.spendingProfile?.baselineMonthlyWasteUSD || 0,
    profile?.spendingProfile?.baselineStartAt || null
  );
  const hasBaseline = !!(
    profile?.spendingProfile?.baselineMonthlyWasteUSD && profile?.spendingProfile?.baselineStartAt
  );
  const potentialDescription = useMemo(() => {
    const currencyCode = profile?.currency || DEFAULT_PROFILE.currency;
    const formatLocal = (valueUSD = 0) =>
      formatCurrency(convertToCurrency(Math.max(valueUSD, 0), currencyCode), currencyCode);
    const potentialLocal = formatLocal(potentialSavedUSD);
    const actualLocal = formatLocal(realSavedUSD);
    const deltaLocal = formatLocal(Math.max(potentialSavedUSD - realSavedUSD, 0));
    return t("potentialBlockDetails", {
      potential: potentialLocal,
      actual: actualLocal,
      delta: deltaLocal,
    });
  }, [profile?.currency, potentialSavedUSD, realSavedUSD, t]);
  const handlePotentialDetailsOpen = useCallback(() => {
    if (typeof onPotentialDetailsOpen === "function") {
      onPotentialDetailsOpen(potentialDescription);
    }
  }, [onPotentialDetailsOpen, potentialDescription]);

  const orderedProducts = useMemo(() => {
    const entries = Array.isArray(products) ? [...products] : [];
    if (!entries.length) return entries;
    let primaryCard = null;
    if (mainTemptationId) {
      const primaryIndex = entries.findIndex((item) => item.id === mainTemptationId);
      if (primaryIndex >= 0) {
        primaryCard = entries.splice(primaryIndex, 1)[0];
      }
    }
    const sortedEntries = entries
      .sort((a, b) => {
        const priceDiff = getTemptationPrice(a) - getTemptationPrice(b);
        if (priceDiff !== 0) {
          return priceDiff;
        }
        return (a.id || "").localeCompare(b.id || "");
      })
      .map((item, index) => ({ item, baseIndex: index }));
    const statsMap = interactionStats || {};
    const frequentEntries = sortedEntries
      .map((entry) => {
        const stats = statsMap[entry.item.id];
        if (!stats) return null;
        const total = (stats.saveCount || 0) + (stats.spendCount || 0);
        if (!total) return null;
        return {
          ...entry,
          total,
          lastInteractionAt: stats.lastInteractionAt || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.lastInteractionAt !== a.lastInteractionAt) {
          return (b.lastInteractionAt || 0) - (a.lastInteractionAt || 0);
        }
        return a.baseIndex - b.baseIndex;
      })
      .slice(0, FEED_FREQUENT_PIN_LIMIT);
    const pinnedIds = new Set(frequentEntries.map((entry) => entry.item.id));
    const ordered = [];
    if (primaryCard) {
      ordered.push(primaryCard);
    }
    frequentEntries.forEach((entry) => ordered.push(entry.item));
    sortedEntries
      .filter((entry) => !pinnedIds.has(entry.item.id))
      .forEach((entry) => ordered.push(entry.item));
    return ordered;
  }, [products, mainTemptationId, interactionStats]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return orderedProducts;
    return orderedProducts.filter((product) => product.categories?.includes(activeCategory));
  }, [activeCategory, orderedProducts]);
  const feedKeyExtractor = useCallback((item) => item.id, []);
  const renderTemptationItem = useCallback(
    ({ item }) => {
      const assignedGoalId = goalAssignments?.[item.id];
      const assignedGoal = assignedGoalId ? wishesById[assignedGoalId] : null;
      const wishlistEntry = swipePinnedByTemplate[item.id];
      const isWishlistGoal = !!wishlistEntry;
      const overrideDescription =
        (descriptionOverrides && descriptionOverrides[item.id]) || null;
      const resolvedDescriptionOverride =
        overrideDescription ||
        (item.id === mainTemptationId ? primaryTemptationDescription : null);
      return (
        <TemptationCard
          item={item}
          language={language}
          colors={colors}
          t={t}
          descriptionOverride={resolvedDescriptionOverride}
          isFocusTarget={item.id === focusTemplateId}
          onToggleEdit={() => onTemptationEditToggle?.(item)}
          currency={currency}
          stats={refuseStats[item.id]}
          feedback={cardFeedback[item.id]}
          titleOverride={titleOverrides[item.id]}
          goalLabel={assignedGoal ? getWishTitleWithoutEmoji(assignedGoal) : null}
          isWishlistGoal={isWishlistGoal}
          isEditing={editingTemptationId === item.id}
          editTitleValue={editingTemptationId === item.id ? editingTitleValue : ""}
          editPriceValue={editingTemptationId === item.id ? editingPriceValue : ""}
          editGoalLabel={editingTemptationId === item.id ? editingGoalLabel : ""}
          editEmojiValue={editingTemptationId === item.id ? editingEmojiValue : ""}
          editDescriptionValue={editingTemptationId === item.id ? editingDescriptionValue : ""}
          editCategoryValue={
            editingTemptationId === item.id ? editingCategoryValue : DEFAULT_IMPULSE_CATEGORY
          }
          onEditTitleChange={onTemptationEditTitleChange}
          onEditPriceChange={onTemptationEditPriceChange}
          onEditEmojiChange={onTemptationEditEmojiChange}
          onEditDescriptionChange={onTemptationEditDescriptionChange}
          onEditCategoryChange={onTemptationEditCategoryChange}
          onEditSave={onTemptationEditSave}
          onEditCancel={onTemptationEditCancel}
          onEditDelete={() => onTemptationEditDelete?.(item)}
          onEditGoalSelect={() => onTemptationGoalSelect?.(item)}
          onSwipeDelete={() => onTemptationSwipeDelete?.(item)}
          onQuickGoalToggle={() => onTemptationQuickGoalToggle?.(item)}
          isPrimaryTemptation={item.id === mainTemptationId}
          onAction={async (type) => {
            await onTemptationAction(type, item);
          }}
        />
      );
    },
    [
      cardFeedback,
      colors,
      currency,
      descriptionOverrides,
      editingCategoryValue,
      editingDescriptionValue,
      editingEmojiValue,
      editingGoalLabel,
      editingPriceValue,
      editingTemptationId,
      editingTitleValue,
      focusTemplateId,
      goalAssignments,
      language,
      mainTemptationId,
      onTemptationAction,
      onTemptationEditCancel,
      onTemptationEditDelete,
      onTemptationEditDescriptionChange,
      onTemptationEditEmojiChange,
      onTemptationEditPriceChange,
      onTemptationEditSave,
      onTemptationEditTitleChange,
      onTemptationEditToggle,
      onTemptationGoalSelect,
      onTemptationQuickGoalToggle,
      onTemptationSwipeDelete,
      primaryTemptationDescription,
      refuseStats,
      swipePinnedByTemplate,
      t,
      titleOverrides,
      wishesById,
    ]
  );
  const analyticsPreview = analyticsStats.slice(0, 3);
  const freeDayEventKeys = useMemo(() => {
    const keys = new Set();
    resolvedHistoryEvents.forEach((entry) => {
      if (entry.kind === "free_day") {
        keys.add(getDayKey(entry.timestamp));
      }
    });
    return keys;
  }, [resolvedHistoryEvents]);
  const weekLabels = WEEKDAY_LABELS_MONDAY_FIRST[language] || WEEKDAY_LABELS_MONDAY_FIRST.en;
  const weekDays = useMemo(() => {
    const today = new Date(todayTimestamp);
    const start = new Date(today);
    const weekday = (today.getDay() + 6) % 7;
    start.setDate(today.getDate() - weekday);
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = getDayKey(date);
      return {
        key,
        label: weekLabels[index],
        active: freeDayEventKeys.has(key),
        isToday: key === todayKey,
      };
    });
  }, [freeDayEventKeys, todayTimestamp, todayKey, weekLabels]);
  const weekSuccessCount = useMemo(
    () => weekDays.filter((day) => day.active).length,
    [weekDays]
  );
  const savingsDaily = useMemo(() => {
    const today = new Date(todayTimestamp);
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    const minTimestamp = start.getTime();
    const map = new Map();
    resolvedHistoryEvents.forEach((entry) => {
      if (entry.kind !== "refuse_spend") return;
      if (!entry.timestamp || entry.timestamp < minTimestamp) return;
      const key = getDayKey(entry.timestamp);
      const amount = entry.meta?.amountUSD || 0;
      map.set(key, (map.get(key) || 0) + amount);
    });
    let max = 0;
    const result = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = getDayKey(date);
      const amountUSD = map.get(key) || 0;
      if (amountUSD > max) max = amountUSD;
      const weekdayIndex = (date.getDay() + 6) % 7;
      const label =
        WEEKDAY_LABELS_MONDAY_FIRST[language]?.[weekdayIndex] ||
        WEEKDAY_LABELS_MONDAY_FIRST.en[weekdayIndex];
      const amountLocal = convertToCurrency(amountUSD, currency);
      return {
        key,
        amountUSD,
        label,
        amountLabel: amountUSD ? formatCurrency(amountLocal, currency) : "",
      };
    });
    const maxValue = Math.max(max, 0.01);
    return result.map((item) => ({
      ...item,
      percent: item.amountUSD > 0 ? Math.max((item.amountUSD / maxValue) * 100, 8) : 0,
    }));
  }, [currency, resolvedHistoryEvents, language, todayTimestamp]);
  const showImpulseCard = useMemo(() => hasImpulseHistory(impulseInsights), [impulseInsights]);
  const { wishesById, swipePinnedByTemplate } = useMemo(() => {
    const byId = {};
    const swipePinned = {};
    (wishes || []).forEach((wish) => {
      if (wish?.id) {
        byId[wish.id] = wish;
      }
      if (wish?.templateId && wish?.pinnedSource === "swipe") {
        swipePinned[wish.templateId] = wish;
      }
    });
    return { wishesById: byId, swipePinnedByTemplate: swipePinned };
  }, [wishes]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }] }>
      <FlatList
        style={styles.feedList}
        data={filteredProducts}
        keyExtractor={feedKeyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedListContent}
        renderItem={renderTemptationItem}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === "android"}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{t("feedEmptyTitle")}</Text>
            <Text style={[styles.emptyStateText, { color: colors.muted }]}>{t("feedEmptySubtitle")}</Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.feedHero}>
            <View style={styles.feedHeroTop}>
              <MoodGradientBlock colors={moodGradient} style={styles.heroMoodGradient}>
                <View style={styles.heroMascotRow}>
                  <View style={styles.heroTextWrap}>
                    <Text style={[styles.appName, { color: colors.text }]}>Almost</Text>
                    <Text style={[styles.heroTagline, { color: colors.muted }]}>
                      {t("appTagline")}
                    </Text>
                  {moodPreset?.label && (
                    <TouchableOpacity
                      style={[styles.moodBadge, heroMoodBadgeStyle]}
                      onPress={onMoodDetailsOpen}
                    >
                      <Text style={[styles.moodBadgeText, { color: heroMoodBadgeTextColor }]}>
                        {moodPreset.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!hideMascot && (
                  <View style={styles.heroMascotContainer}>
                    {showTamagotchiBubble && (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.mascotBubble,
                          {
                            backgroundColor: tamagotchiBubbleTheme.backgroundColor,
                            borderColor: tamagotchiBubbleTheme.borderColor,
                            shadowColor: tamagotchiBubbleTheme.shadowColor,
                          },
                        ]}
                      >
                        <Text style={[styles.mascotBubbleText, { color: tamagotchiBubbleTheme.textColor }]}>
                          {tamagotchiDesiredFood?.emoji || t("tamagotchiHungryBubble")}
                        </Text>
                        <View
                          style={[
                            styles.mascotBubbleTail,
                            {
                              left: "50%",
                              marginLeft: -6,
                              backgroundColor: tamagotchiBubbleTheme.backgroundColor,
                              borderLeftWidth: 1,
                              borderBottomWidth: 1,
                              borderLeftColor: tamagotchiBubbleTheme.borderColor,
                              borderBottomColor: tamagotchiBubbleTheme.borderColor,
                            },
                          ]}
                        />
                      </View>
                    )}
                    <TouchableOpacity onPress={onMascotPress} activeOpacity={0.9}>
                    <AlmiTamagotchi
                      style={heroMascotWrapStyle}
                      override={mascotOverride}
                      onOverrideComplete={onMascotAnimationComplete}
                      isStarving={tamagotchiMood?.tone === "urgent"}
                      animations={tamagotchiAnimations}
                    />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </MoodGradientBlock>
          </View>
          <SavingsHeroCard
            goldPalette={goldPalette}
            heroSpendCopy={heroSpendCopy}
            heroEncouragementLine={heroEncouragementLine}
            levelLabel={levelLabel}
              totalSavedLabel={totalSavedLabel}
              progressPercent={progressPercent}
              progressPercentLabel={progressPercentLabel}
              goalProgressLabel={goalProgressLabel}
              isGoalComplete={isGoalComplete}
              completionLabel={t("goalWidgetComplete")}
              t={t}
              dailySavings={savingsDaily}
            analyticsPreview={analyticsPreview}
            potentialSavedUSD={potentialSavedUSD}
            actualSavedUSD={realSavedUSD}
            currency={currency}
            hasBaseline={hasBaseline}
            onBaselineSetup={handleBaselineSetup}
            onPotentialDetailsOpen={handlePotentialDetailsOpen}
            levelHasNext={heroLevelHasNext}
            levelRemainingLabel={heroLevelRemainingLabel}
            levelTargetLabel={heroLevelTargetLabel}
            levelProgressValue={heroLevelProgress}
            healthPoints={healthPoints}
            onBreakdownPress={onSavingsBreakdownPress}
            />
            <FreeDayCard
              colors={colors}
              t={t}
              canLog={canLogFreeDay}
              onLog={onFreeDayLog}
              freeDayStats={freeDayStats}
              todayKey={todayKey}
              weekDays={weekDays}
              weekCount={weekSuccessCount}
              canRescue={canRescueFreeDay}
              needsRescue={streakNeedsRescue}
              rescueStatus={rescueStatus}
              rescueCost={freeDayRescueCost}
              onRescue={onFreeDayRescue}
              hasRescueHealth={hasRescueHealth}
            />
            {showImpulseCard && (
              <ImpulseMapCard
                insights={impulseInsights}
                colors={colors}
                t={t}
                language={language}
                expanded={impulseExpanded}
                onToggle={() => setImpulseExpanded((prev) => !prev)}
              />
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {categories.map((cat) => (
                <CategoryChip
                  key={cat}
                  label={resolveCategoryLabel(cat, language)}
                  isActive={cat === activeCategory}
                  onPress={() => onCategorySelect(cat)}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>
        }
      />
    </SafeAreaView>
  );
});

const SwipeableGoalRow = ({
  children,
  colors,
  t,
  onEdit,
  onDelete,
  onSwipeOpen,
  onSwipeClose,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const ACTION_WIDTH = 160;
  const gestureStartOffset = useRef(0);
  const externalCloserRef = useRef(null);

  const closeRow = useCallback(
    (notify = true) => {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (notify) {
          onSwipeClose?.(externalCloserRef.current);
          externalCloserRef.current = null;
        }
      });
    },
    [onSwipeClose, translateX]
  );

  const notifyOpen = useCallback(() => {
    const closer = () => closeRow();
    externalCloserRef.current = closer;
    onSwipeOpen?.(closer);
  }, [closeRow, onSwipeOpen]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 6,
        onPanResponderGrant: () => {
          translateX.stopAnimation((value) => {
            gestureStartOffset.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const base = gestureStartOffset.current || 0;
          const next = Math.max(0, Math.min(base + gestureState.dx, ACTION_WIDTH));
          translateX.setValue(next);
        },
        onPanResponderRelease: () => {
          translateX.stopAnimation((value) => {
            const shouldOpen = value > ACTION_WIDTH * 0.35;
            Animated.timing(translateX, {
              toValue: shouldOpen ? ACTION_WIDTH : 0,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => {
              if (shouldOpen) {
                notifyOpen();
              } else {
                closeRow();
              }
            });
          });
        },
        onPanResponderTerminate: () => {
          closeRow();
        },
      }),
    [ACTION_WIDTH, closeRow, notifyOpen, translateX]
  );

  const handleEdit = () => {
    closeRow();
    onEdit?.();
  };

  const handleDelete = () => {
    closeRow();
    onDelete?.();
  };

  return (
    <View style={[styles.goalSwipeRow, { backgroundColor: colors.background }]}>
      <View style={[styles.goalSwipeActions, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.goalSwipeButton, !onEdit && styles.goalSwipeButtonDisabled]}
          onPress={handleEdit}
          disabled={!onEdit}
        >
          <Text style={[styles.goalSwipeButtonText, { color: colors.text }]}>{t("goalEditAction")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.goalSwipeButton, !onDelete && styles.goalSwipeButtonDisabled]}
          onPress={handleDelete}
          disabled={!onDelete}
        >
          <Text style={[styles.goalSwipeButtonText, { color: colors.text }]}>{t("goalDeleteAction")}</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[styles.goalSwipeContent, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

const resolveWishEmoji = (wish) => {
  if (wish?.emoji) return wish.emoji;
  const title = (wish?.title || "").trim();
  if (title) {
    const firstChar = Array.from(title)[0];
    if (firstChar && !/[A-Za-zА-Яа-я0-9]/.test(firstChar)) {
      return firstChar;
    }
  }
  return DEFAULT_GOAL_EMOJI;
};

const getWishTitleWithoutEmoji = (wish) => {
  const title = typeof wish?.title === "string" ? wish.title : "";
  if (!title) return "";
  const trimmed = title.trimStart();
  if (!trimmed) return "";
  const wishEmoji = resolveWishEmoji(wish);
  if (wishEmoji) {
    const emojiToken = wishEmoji.trim();
    if (emojiToken && trimmed.startsWith(emojiToken)) {
      return trimmed.slice(emojiToken.length).trimStart();
    }
  }
  const firstChar = Array.from(trimmed)[0];
  if (!firstChar) return trimmed;
  const isSymbol = !/[A-Za-zА-Яа-я0-9]/.test(firstChar);
  if (isSymbol && wishEmoji) {
    const rest = Array.from(trimmed).slice(1).join("").trimStart();
    return rest || trimmed;
  }
  return trimmed;
};

const selectMainGoalWish = (wishes = [], activeGoalId = null) => {
  const list = Array.isArray(wishes) ? wishes : [];
  if (activeGoalId) {
    const pinned = list.find(
      (wish) =>
        wish?.goalId === activeGoalId ||
        wish?.id === activeGoalId
    );
    if (pinned) return pinned;
  }
  const primaryActive = list.find(
    (wish) => wish?.kind === PRIMARY_GOAL_KIND && wish.status !== "done"
  );
  if (primaryActive) return primaryActive;
  return list.find((wish) => wish?.status !== "done") || null;
};

const WishListScreen = React.memo(function WishListScreen({
  wishes,
  currency = DEFAULT_PROFILE.currency,
  t,
  colors,
  onRemoveWish,
  primaryGoals = [],
  onGoalLongPress = null,
  onGoalEdit = null,
  activeGoalId = null,
  onSetActiveGoal = null,
  language = "ru",
  catCuriousSource,
}) {
  const curiousImage = catCuriousSource || CLASSIC_TAMAGOTCHI_ANIMATIONS.curious;
  const isDarkTheme = colors.background === THEMES.dark.background;
  const primaryGoalIds = Array.isArray(primaryGoals)
    ? primaryGoals.map((goal) => goal?.id).filter(Boolean)
    : [];
  const listData = useMemo(() => {
    if (!Array.isArray(wishes)) return [];
    return wishes
      .map((wish, index) => ({ wish, index }))
      .sort((a, b) => {
        const aDone = a.wish?.status === "done";
        const bDone = b.wish?.status === "done";
        if (aDone === bDone) {
          return a.index - b.index;
        }
        return aDone ? 1 : -1;
      })
      .map((entry) => entry.wish);
  }, [wishes]);
  const swipeCloserRef = useRef(null);
  const handleSwipeOpen = useCallback((closeFn) => {
    if (swipeCloserRef.current && swipeCloserRef.current !== closeFn) {
      swipeCloserRef.current();
    }
    swipeCloserRef.current = closeFn;
  }, []);
  const handleSwipeClose = useCallback((closeFn) => {
    if (!closeFn || swipeCloserRef.current === closeFn) {
      swipeCloserRef.current = null;
    }
  }, []);
  if (listData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }] }>
        <Text style={[styles.header, { color: colors.text }]}>{t("wishlistTitle")}</Text>
        <View style={styles.cartEmptyState}>
          <Image source={curiousImage} style={[styles.catImage, styles.catImageLarge]} />
          <Text style={[styles.cartEmptyTitle, { color: colors.text }]}>{t("wishlistEmptyTitle")}</Text>
          <Text style={[styles.cartEmptySubtitle, { color: colors.muted }]}>
            {t("wishlistEmptySubtitle")}
          </Text>
        </View>
      </View>
    );
  }

  const totalTarget = formatCurrency(
    convertToCurrency(listData.reduce((sum, wish) => sum + (wish.targetUSD || 0), 0), currency),
    currency
  );

  const renderWithLongPress = useCallback(
    (wish, content) => {
      if (typeof onGoalLongPress === "function") {
        return (
          <TouchableOpacity
            activeOpacity={0.96}
            delayLongPress={320}
            onLongPress={() => onGoalLongPress(wish)}
          >
            {content}
          </TouchableOpacity>
        );
      }
      return content;
    },
    [onGoalLongPress]
  );

  const renderWishRow = useCallback(
    ({ item: wish }) => {
        const targetLocal = formatCurrency(
          convertToCurrency(wish.targetUSD || 0, currency),
          currency
        );
        const progress = Math.min((wish.savedUSD || 0) / (wish.targetUSD || 1), 1);
        const progressLabel = t("wishlistProgress", {
          current: formatCurrency(convertToCurrency(wish.savedUSD || 0, currency), currency),
          target: targetLocal,
        });
        const isPrimaryGoal = wish.kind === PRIMARY_GOAL_KIND;
        const goalId = wish.goalId || wish.id;
        const isActiveGoal = !!activeGoalId && activeGoalId === goalId;
        const badgeText = isPrimaryGoal
          ? isActiveGoal
            ? t("goalPrimaryBadge")
            : t("goalPrimaryBadge")
          : wish.status === "done"
          ? t("wishlistDoneLabel")
          : `${Math.round(progress * 100)}%`;
        const remainingUSD = Math.max((wish.targetUSD || 0) - (wish.savedUSD || 0), 0);
        const remainingLabel = formatCurrency(convertToCurrency(remainingUSD, currency), currency);
        const displayTitle = getWishTitleWithoutEmoji(wish);
        if (isPrimaryGoal) {
          const preset = getGoalPreset(wish.goalId || primaryGoalIds[0]);
          const emblem = wish.emoji || resolveWishEmoji(wish) || preset?.emoji || "🎯";
          const secondaryColor = isDarkTheme
            ? "rgba(14,15,22,0.65)"
            : "rgba(246,247,251,0.8)";
          const badgeStyle = isDarkTheme
            ? {
                borderColor: "rgba(14,15,22,0.25)",
                backgroundColor: "rgba(14,15,22,0.08)",
              }
            : {
                borderColor: "rgba(246,247,251,0.35)",
                backgroundColor: "rgba(246,247,251,0.15)",
              };
          const trackColor = isDarkTheme
            ? "rgba(14,15,22,0.15)"
            : "rgba(246,247,251,0.2)";
          const fillColor = isDarkTheme
            ? "rgba(14,15,22,0.85)"
            : "rgba(246,247,251,0.95)";
          const auraColor = isDarkTheme
            ? "rgba(0,0,0,0.06)"
            : "rgba(255,255,255,0.18)";
          const cardContent = (
            <View
              style={[
                styles.primaryGoalCard,
                {
                  backgroundColor: colors.text,
                  borderColor: isActiveGoal ? GOAL_HIGHLIGHT_COLOR : colors.text,
                  borderWidth: isActiveGoal ? 2 : 0,
                },
              ]}
            >
              <View style={styles.primaryGoalTop}>
                <View style={{ flex: 1, gap: 8 }}>
                  <View
                    style={[
                      styles.primaryGoalBadge,
                      badgeStyle,
                    ]}
                  >
                    <Text style={[styles.primaryGoalBadgeText, { color: colors.background }]}>
                      {t("goalPrimaryBadge")}
                    </Text>
                  </View>
                  <Text style={[styles.primaryGoalTitle, { color: colors.background }]}>
                    {displayTitle}
                  </Text>
                </View>
                <View
                  style={[
                    styles.primaryGoalEmblem,
                    {
                      borderColor: badgeStyle.borderColor,
                      backgroundColor: badgeStyle.backgroundColor,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 30 }}>{emblem}</Text>
                </View>
              </View>
              <Text style={[styles.primaryGoalSubtitle, { color: secondaryColor }]}>
                {t("primaryGoalRemaining", { amount: remainingLabel })}
              </Text>
              <Text style={[styles.primaryGoalSubtitle, { color: secondaryColor }]}>
                {progressLabel}
              </Text>
              <View style={styles.primaryGoalProgressRow}>
                <View
                  style={[
                    styles.primaryGoalProgressTrack,
                    {
                      backgroundColor: trackColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.primaryGoalProgressFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: fillColor,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.primaryGoalPercent, { color: colors.background }]}>
                  {`${Math.round(progress * 100)}%`}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.goalSelectButton,
                  {
                    borderColor: isActiveGoal ? GOAL_HIGHLIGHT_COLOR : colors.border,
                    backgroundColor: isActiveGoal ? "rgba(246,193,107,0.15)" : colors.card,
                  },
                ]}
                activeOpacity={0.9}
                onPress={() => onSetActiveGoal?.(goalId)}
              >
                <Text
                  style={[
                    styles.goalSelectText,
                    { color: isActiveGoal ? GOAL_HIGHLIGHT_COLOR : colors.text },
                  ]}
                >
                  {isActiveGoal
                    ? (language || "ru") === "ru"
                      ? "Активная цель"
                      : "Active goal"
                    : (language || "ru") === "ru"
                    ? "Сделать активной"
                    : "Set active"}
                </Text>
              </TouchableOpacity>
            </View>
          );
          return (
            <SwipeableGoalRow
              colors={colors}
              t={t}
              onEdit={onGoalEdit ? () => onGoalEdit(wish) : undefined}
              onDelete={() => onRemoveWish(wish.id)}
              onSwipeOpen={handleSwipeOpen}
              onSwipeClose={handleSwipeClose}
            >
              {renderWithLongPress(wish, cardContent)}
            </SwipeableGoalRow>
          );
        }
        const wishEmoji = resolveWishEmoji(wish);
        const wishTitle = displayTitle;
        const cardContent = (
          <View
            style={[
              styles.wishCard,
              {
                backgroundColor: colors.card,
                borderColor: isActiveGoal ? GOAL_HIGHLIGHT_COLOR : colors.border,
                borderWidth: isActiveGoal ? 2 : 1,
              },
            ]}
          >
            <View style={styles.wishHeader}>
              <View style={styles.wishTitleWrap}>
                <Text style={[styles.wishEmoji, { color: colors.text }]}>{wishEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.wishTitle, { color: colors.text }]}>{wishTitle}</Text>
                  <Text style={[styles.wishSavedHint, { color: colors.muted }]}>
                    {t("wishlistSavedHint")}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.wishBadge,
                  {
                    borderColor: isDarkTheme ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.08)",
                    backgroundColor: isDarkTheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                  },
                ]}
              >
                <Text style={[styles.wishBadgeText, { color: colors.text }]}>{badgeText}</Text>
              </View>
            </View>
            <Text style={[styles.pendingPrice, { color: colors.text }]}>{targetLocal}</Text>
            <View style={styles.wishProgressRow}>
              <View style={[styles.wishProgressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.wishProgressFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: colors.text,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.wishProgressLabel, { color: colors.muted }]}>{progressLabel}</Text>
            </View>
            <View style={styles.pendingButtons}>
              <TouchableOpacity
                style={[styles.pendingButtonPrimary, { backgroundColor: colors.text }]}
                onPress={() => {
                  if (!isActiveGoal) {
                    onSetActiveGoal?.(goalId);
                  }
                }}
                disabled={isActiveGoal}
              >
                <Text style={[styles.pendingButtonPrimaryText, { color: colors.background }]}>
                  {isActiveGoal ? t("wishlistActive") : t("wishlistSetActive")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pendingButtonSecondary, { borderColor: colors.border }]}
                onPress={() => onRemoveWish(wish.id)}
              >
                <Text style={{ color: colors.muted }}>{t("wishlistRemove")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
        return (
          <SwipeableGoalRow
            colors={colors}
            t={t}
            onEdit={onGoalEdit ? () => onGoalEdit(wish) : undefined}
            onDelete={() => onRemoveWish(wish.id)}
            onSwipeOpen={handleSwipeOpen}
            onSwipeClose={handleSwipeClose}
          >
            {renderWithLongPress(wish, cardContent)}
          </SwipeableGoalRow>
        );
      },
      [
        colors,
        currency,
        handleSwipeClose,
        handleSwipeOpen,
        isDarkTheme,
        onGoalEdit,
        onGoalLongPress,
        onRemoveWish,
        primaryGoalIds,
        renderWithLongPress,
        t,
      ]
    );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderWishRow}
        contentContainerStyle={{ paddingBottom: 200 }}
        ListHeaderComponent={
          <>
            <Text style={[styles.header, { color: colors.text }]}>{t("wishlistTitle")}</Text>
            <Text style={[styles.purchasesSubtitle, { color: colors.muted }]}>
              {t("wishlistSummary", { amount: totalTarget })}
            </Text>
          </>
        }
      />
    </View>
  );
});

function SwipeablePendingCard({ children, colors, t, onDelete, itemId }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isDarkTheme = colors.background === THEMES.dark.background;

  const handleSwipeRelease = useCallback(
    (dx = 0) => {
      if (dx < -DELETE_SWIPE_THRESHOLD && onDelete) {
        onDelete();
      }
      Animated.timing(translateX, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [onDelete, translateX]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 6,
        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          const dx = Math.max(Math.min(gestureState.dx, 60), -180);
          translateX.setValue(dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          handleSwipeRelease(gestureState.dx);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderTerminate: () => handleSwipeRelease(0),
      }),
    [handleSwipeRelease, translateX]
  );

  useEffect(() => {
    translateX.setValue(0);
  }, [itemId, translateX]);

  return (
    <View style={styles.pendingSwipeWrapper}>
      <View style={styles.pendingSwipeBackground} pointerEvents="none">
        <View
          style={[
            styles.swipeHint,
            styles.swipeHintRight,
            {
              borderColor: isDarkTheme ? "rgba(255,255,255,0.12)" : colors.border,
              backgroundColor: isDarkTheme ? "rgba(255,87,115,0.15)" : "rgba(233,61,87,0.12)",
            },
          ]}
        >
          <Text style={[styles.swipeHintIcon, { color: "#E15555" }]}>🗑️</Text>
          <Text style={[styles.swipeHintText, { color: "#E15555" }]}>{t("goalSwipeDelete")}</Text>
        </View>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const PendingScreen = React.memo(function PendingScreen({
  items,
  currency,
  t,
  colors,
  onResolve,
  onDelete,
  language,
  catCuriousSource,
}) {
  const curiousImage = catCuriousSource || CLASSIC_TAMAGOTCHI_ANIMATIONS.curious;
  const [nowTick, setNowTick] = useState(Date.now());
  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.decisionDue || 0) - (b.decisionDue || 0)),
    [items]
  );
  useEffect(() => {
    if (!sorted.length) return undefined;
    let timeoutId;
    const scheduleTick = () => {
      const now = Date.now();
      const soonestDue = sorted[0]?.decisionDue || 0;
      const msUntilSoonest = soonestDue
        ? Math.max(soonestDue - now, 0)
        : Number.MAX_SAFE_INTEGER;
      const interval =
        msUntilSoonest <= PENDING_COUNTDOWN_FAST_THRESHOLD_MS
          ? PENDING_COUNTDOWN_FAST_MS
          : PENDING_COUNTDOWN_SLOW_MS;
      timeoutId = setTimeout(() => {
        setNowTick(Date.now());
        scheduleTick();
      }, interval);
    };
    scheduleTick();
    return () => clearTimeout(timeoutId);
  }, [sorted]);

  const formatCountdown = useCallback(
    (ms) => {
      if (ms <= 0) return t("pendingExpired");
      const totalSeconds = Math.floor(ms / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const hh = String(hours).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");
      const ss = String(seconds).padStart(2, "0");
      const daySuffix = language === "ru" ? "д" : "d";
      return days > 0 ? `${days}${daySuffix} ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
    },
    [language, t]
  );

  if (!sorted.length) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }] }>
        <Text style={[styles.header, { color: colors.text }]}>{t("pendingTitle")}</Text>
        <View style={styles.cartEmptyState}>
          <Image source={curiousImage} style={[styles.catImage, styles.catImageLarge]} />
          <Text style={[styles.cartEmptyTitle, { color: colors.text }]}>{t("pendingEmptyTitle")}</Text>
          <Text style={[styles.cartEmptySubtitle, { color: colors.muted }]}>
            {t("pendingEmptySubtitle")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }] }
      contentContainerStyle={{ paddingBottom: 160, gap: 16 }}
    >
      <Text style={[styles.header, { color: colors.text }]}>{t("pendingTitle")}</Text>
      {sorted.map((item) => {
        const diff = (item.decisionDue || 0) - nowTick;
        const countdownLabel = formatCountdown(diff);
        const overdue = diff <= 0;
        const priceLabel = formatCurrency(convertToCurrency(item.priceUSD || 0, currency), currency);
        return (
          <SwipeablePendingCard
            key={item.id}
            colors={colors}
            t={t}
            onDelete={onDelete ? () => onDelete(item) : undefined}
            itemId={item.id}
          >
            <View
              style={[
                styles.pendingCard,
                {
                  backgroundColor: "rgba(210,230,255,0.9)",
                  borderColor: "rgba(120,170,255,0.65)",
                  borderWidth: 1,
                  shadowColor: "rgba(120,170,255,0.45)",
                  shadowOpacity: 0.12,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 3,
                },
              ]}
            >
              <View style={styles.pendingHeader}>
                <Text style={[styles.pendingTitle, { color: colors.text }]}>{item.title}</Text>
              </View>
              <Text
                style={[
                  styles.pendingCountdown,
                  { color: overdue ? "#D9534F" : colors.text, textAlign: "center", fontSize: 20 },
                ]}
              >
                {countdownLabel}
              </Text>
              <Text style={[styles.pendingPrice, { color: colors.text }]}>{priceLabel}</Text>
              <View style={styles.pendingButtons}>
                <TouchableOpacity
                  style={[styles.pendingButtonPrimary, { backgroundColor: colors.text }]}
                  onPress={() => onResolve(item, "want")}
                >
                  <Text style={[styles.pendingButtonPrimaryText, { color: colors.background }]}>
                    {t("pendingActionWant")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pendingButtonSecondary, { borderColor: colors.border }]}
                  onPress={() => onResolve(item, "decline")}
                >
                  <Text style={{ color: colors.muted }}>{t("pendingActionDecline")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SwipeablePendingCard>
        );
      })}
    </ScrollView>
  );
});

const ACHIEVEMENT_METRIC_TYPES = {
  SAVED_AMOUNT: "SAVED_AMOUNT",
  FREE_DAYS_TOTAL: "FREE_DAYS_TOTAL",
  FREE_DAYS_STREAK: "FREE_DAYS_STREAK",
  REFUSE_COUNT: "REFUSE_COUNT",
  FRIDGE_ITEMS_COUNT: "FRIDGE_ITEMS_COUNT",
  FRIDGE_DECISIONS: "FRIDGE_DECISIONS",
};
const ACHIEVEMENT_CONDITION_MAP = {
  [ACHIEVEMENT_METRIC_TYPES.SAVED_AMOUNT]: "amount_saved",
  [ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_TOTAL]: "streak_days",
  [ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_STREAK]: "streak_days",
  [ACHIEVEMENT_METRIC_TYPES.REFUSE_COUNT]: "saves_count",
  [ACHIEVEMENT_METRIC_TYPES.FRIDGE_ITEMS_COUNT]: "pending_items",
  [ACHIEVEMENT_METRIC_TYPES.FRIDGE_DECISIONS]: "decisions_logged",
};

const ACHIEVEMENT_DEFS = [
  {
    id: "saved_50",
    metricType: ACHIEVEMENT_METRIC_TYPES.SAVED_AMOUNT,
    targetValue: convertFromCurrency(5000, "RUB"),
    emoji: "💾",
    rewardHealth: 50,
    copy: {
      ru: { title: "Первые {{amount}}", desc: "Отложено {{amount}} на мини-подарок." },
      en: { title: "First {{amount}}", desc: "Already banked {{amount}} for a mini gift." },
    },
  },
  {
    id: "saved_500",
    metricType: ACHIEVEMENT_METRIC_TYPES.SAVED_AMOUNT,
    targetValue: 500,
    emoji: "💎",
    rewardHealth: 200,
    copy: {
      ru: { title: "В копилке уже {{amount}}", desc: "Можно строить планы на крупную цель." },
      en: { title: "{{amount}} saved already", desc: "Time to plan for a bigger goal." },
    },
  },
  {
    id: "refuse_10",
    metricType: ACHIEVEMENT_METRIC_TYPES.REFUSE_COUNT,
    targetValue: 10,
    emoji: "🧠",
    rewardHealth: 70,
    copy: {
      ru: { title: "Осознанный герой", desc: "10 осознанных отказов подряд, дисциплина на месте." },
      en: { title: "Mindful hero", desc: "10 deliberate skips keep savings safe." },
    },
  },
  {
    id: "free_total_14",
    metricType: ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_STREAK,
    targetValue: 14,
    emoji: "🗓️",
    rewardHealth: 70,
    copy: {
      ru: { title: "14 дней без импульсов", desc: "Две бесплатных недели и кошелёк доволен." },
      en: { title: "14 impulse-free days", desc: "Two solid weeks of mindful focus." },
    },
  },
  {
    id: "free_streak_7",
    metricType: ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_STREAK,
    targetValue: 7,
    emoji: "⚡️",
    rewardHealth: 90,
    copy: {
      ru: { title: "Серия из 7 дней", desc: "Неделя без трат, ты в потоке." },
      en: { title: "7-day streak", desc: "A full week in the mindful zone." },
    },
  },
  {
    id: "fridge_items_10",
    metricType: ACHIEVEMENT_METRIC_TYPES.FRIDGE_ITEMS_COUNT,
    targetValue: 10,
    emoji: "🧊",
    rewardHealth: 40,
    copy: {
      ru: { title: "10 хотелок в «думаем»", desc: "10 хотелок в «думаем»." },
      en: { title: "Thinking stash", desc: "10 temptations parked in Thinking." },
    },
  },
  {
    id: "fridge_decisions_5",
    metricType: ACHIEVEMENT_METRIC_TYPES.FRIDGE_DECISIONS,
    targetValue: 5,
    emoji: "🥶",
    rewardHealth: 70,
    copy: {
      ru: { title: "Взвешенный выбор", desc: "Разобрался с 5 хотелками из «думаем»." },
      en: { title: "Clear-headed", desc: "Closed out 5 Thinking decisions with intent." },
    },
  },
];

const CHALLENGE_METRIC_TYPES = {
  SAVE_COUNT: "SAVE_COUNT",
  SAVE_AMOUNT: "SAVE_AMOUNT",
  FREE_DAY_STREAK: "FREE_DAY_STREAK",
  REFUSE_DAY_STREAK: "REFUSE_DAY_STREAK",
  PENDING_DECISIONS: "PENDING_DECISIONS",
  WISH_ADDED: "WISH_ADDED",
  PENDING_ADDED: "PENDING_ADDED",
  WEEKEND_SAVES: "WEEKEND_SAVES",
  MORNING_FREE_DAY: "MORNING_FREE_DAY",
  HIGH_VALUE_SAVE: "HIGH_VALUE_SAVE",
};

const CHALLENGE_STATUS = {
  IDLE: "idle",
  ACTIVE: "active",
  COMPLETED: "completed",
  CLAIMED: "claimed",
  EXPIRED: "expired",
};

const CHALLENGE_STATUS_ORDER = {
  [CHALLENGE_STATUS.COMPLETED]: 0,
  [CHALLENGE_STATUS.ACTIVE]: 1,
  [CHALLENGE_STATUS.IDLE]: 2,
  [CHALLENGE_STATUS.EXPIRED]: 3,
  [CHALLENGE_STATUS.CLAIMED]: 4,
};

const CHALLENGE_DEFS = [
  {
    id: "coffee_free_week",
    emoji: "🛡️",
    metricType: CHALLENGE_METRIC_TYPES.REFUSE_DAY_STREAK,
    targetValue: 7,
    durationDays: 12,
    rewardHealth: 140,
    reminderOffsetsHours: [24, 96, 168],
    copy: {
      ru: {
        title: "Неделя привычки",
        desc: "Каждый день в течение недели отметь хотя бы один отказ.",
      },
      en: {
        title: "Habit week",
        desc: "Log at least one refusal every day for a full week.",
      },
    },
  },
  {
    id: "micro_detox",
    emoji: "🌀",
    metricType: CHALLENGE_METRIC_TYPES.FREE_DAY_STREAK,
    targetValue: 3,
    durationDays: 5,
    rewardHealth: 80,
    reminderOffsetsHours: [24, 72],
    copy: {
      ru: {
        title: "Три дня ясности",
        desc: "Собери {{count}} бесплатных дня подряд и встряхни бюджет.",
      },
      en: {
        title: "Clarity streak",
        desc: "Log {{count}} impulse-free days in a row for a quick reset.",
      },
    },
  },
  {
    id: "refuse_sprint",
    emoji: "⚔️",
    metricType: CHALLENGE_METRIC_TYPES.SAVE_COUNT,
    targetValue: 6,
    durationDays: 4,
    rewardHealth: 60,
    reminderOffsetsHours: [24, 72],
    copy: {
      ru: {
        title: "Спринт отказов",
        desc: "Зафиксируй {{count}} осознанных «нет» подряд и укрепи привычку.",
      },
      en: {
        title: "Decline sprint",
        desc: "Record {{count}} mindful refusals in a row to lock the habit.",
      },
    },
  },
  {
    id: "health_boost",
    emoji: "💰",
    metricType: CHALLENGE_METRIC_TYPES.SAVE_AMOUNT,
    targetValue: 80,
    durationDays: 7,
    rewardHealth: 120,
    reminderOffsetsHours: [24, 96],
    copy: {
      ru: {
        title: "Ускоритель накоплений",
        desc: "Направь в копилку {{amount}} отказами всего за неделю.",
      },
      en: {
        title: "Savings boost",
        desc: "Route {{amount}} into savings through refusals this week.",
      },
    },
  },
  {
    id: "fridge_cleaner",
    emoji: "🧊",
    metricType: CHALLENGE_METRIC_TYPES.PENDING_DECISIONS,
    targetValue: 3,
    durationDays: 6,
    rewardHealth: 80,
    reminderOffsetsHours: [24, 72, 120],
    copy: {
      ru: {
        title: "Разгрузи «думаем»",
        desc: "Разрули {{count}} отложенных решений и освободи голову.",
      },
      en: {
        title: "Clear the shelf",
        desc: "Resolve {{count}} items from the thinking list and free up focus.",
      },
    },
  },
  {
    id: "goal_creator",
    emoji: "🧭",
    metricType: CHALLENGE_METRIC_TYPES.WISH_ADDED,
    targetValue: 2,
    durationDays: 4,
    rewardHealth: 60,
    reminderOffsetsHours: [24, 48],
    copy: {
      ru: {
        title: "Новая карта целей",
        desc: "Добавь {{count}} свежих целей и напомни себе, ради чего экономишь.",
      },
      en: {
        title: "Goal-mapping",
        desc: "Add {{count}} new wishes to remember why you save.",
      },
    },
  },
  {
    id: "weekend_focus",
    emoji: "🛡️",
    metricType: CHALLENGE_METRIC_TYPES.WEEKEND_SAVES,
    targetValue: 3,
    durationDays: 8,
    rewardHealth: 90,
    reminderOffsetsHours: [48, 96],
    copy: {
      ru: {
        title: "Выходные под защитой",
        desc: "Сделай {{count}} отказа именно в выходные и сохрани спокойствие.",
      },
      en: {
        title: "Weekend shield",
        desc: "Log {{count}} refusals during the weekend rush.",
      },
    },
  },
  {
    id: "morning_free",
    emoji: "🌅",
    metricType: CHALLENGE_METRIC_TYPES.MORNING_FREE_DAY,
    targetValue: 2,
    durationDays: 5,
    rewardHealth: 70,
    reminderOffsetsHours: [12, 48],
    copy: {
      ru: {
        title: "Утренний фокус",
        desc: "Отмечай бесплатный день до полудня {{count}} раза - начни день с победы.",
      },
      en: {
        title: "Morning focus",
        desc: "Log a free day before noon {{count}} times.",
      },
    },
  },
  {
    id: "high_roller_shield",
    emoji: "💎",
    metricType: CHALLENGE_METRIC_TYPES.HIGH_VALUE_SAVE,
    targetValue: 2,
    durationDays: 7,
    rewardHealth: 140,
    minAmountUSD: 35,
    reminderOffsetsHours: [48, 120],
    copy: {
      ru: {
        title: "Щит от больших трат",
        desc: "Откажись от {{count}} крупных покупок (от {{limit}}) и держи курс.",
      },
      en: {
        title: "High-roller shield",
        desc: "Decline {{count}} big spends (over {{limit}}) to stay on track.",
      },
    },
  },
  {
    id: "fridge_collector",
    emoji: "📥",
    metricType: CHALLENGE_METRIC_TYPES.PENDING_ADDED,
    targetValue: 3,
    durationDays: 5,
    rewardHealth: 60,
    reminderOffsetsHours: [24, 72],
    copy: {
      ru: {
        title: "Коллекционер пауз",
        desc: "Отправь {{count}} импульсов в «подумать позже», чтобы выиграть время.",
      },
      en: {
        title: "Pause collector",
        desc: "Park {{count}} temptations into “decide later” to buy yourself time.",
      },
    },
  },
];

const CHALLENGE_DEF_MAP = CHALLENGE_DEFS.reduce((acc, def) => {
  acc[def.id] = def;
  return acc;
}, {});
const CHALLENGE_TYPE_LABELS = {
  [CHALLENGE_METRIC_TYPES.REFUSE_DAY_STREAK]: "no_spend_day",
  [CHALLENGE_METRIC_TYPES.FREE_DAY_STREAK]: "no_spend_day",
  [CHALLENGE_METRIC_TYPES.SAVE_COUNT]: "decline_count",
  [CHALLENGE_METRIC_TYPES.SAVE_AMOUNT]: "savings_amount",
};

const CHALLENGE_STATUS_LABELS = {
  [CHALLENGE_STATUS.IDLE]: "challengeStatusAvailable",
  [CHALLENGE_STATUS.ACTIVE]: "challengeStatusActive",
  [CHALLENGE_STATUS.COMPLETED]: "challengeStatusCompleted",
  [CHALLENGE_STATUS.EXPIRED]: "challengeStatusExpired",
  [CHALLENGE_STATUS.CLAIMED]: "challengeStatusClaimed",
};

const createChallengeEntry = (id) => ({
  id,
  status: CHALLENGE_STATUS.IDLE,
  progress: 0,
  startedAt: null,
  expiresAt: null,
  completedAt: null,
  claimedAt: null,
  reminderNotificationIds: [],
  extra: {},
});

const createInitialChallengesState = () => {
  const base = {};
  CHALLENGE_DEFS.forEach((def) => {
    base[def.id] = createChallengeEntry(def.id);
  });
  return base;
};

const normalizeChallengesState = (rawState) => {
  const base = createInitialChallengesState();
  if (!rawState || typeof rawState !== "object") return base;
  Object.keys(base).forEach((id) => {
    const entry = rawState[id];
    if (!entry || typeof entry !== "object") return;
    base[id] = {
      ...base[id],
      ...entry,
      id,
      status: entry.status || CHALLENGE_STATUS.IDLE,
      progress: Number(entry.progress) || 0,
      extra: entry.extra && typeof entry.extra === "object" ? entry.extra : {},
      reminderNotificationIds: Array.isArray(entry.reminderNotificationIds)
        ? entry.reminderNotificationIds
        : [],
    };
  });
  return base;
};

const getChallengeCopy = (def, language = "ru") => {
  const locale = language === "ru" ? "ru" : "en";
  return def.copy?.[locale] || def.copy?.en || {};
};

const isSaveEvent = (kind) => kind === "refuse_spend" || kind === "pending_to_decline";

const getDayIndexFromTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / DAY_MS);
};

const isWeekendTimestamp = (timestamp) => {
  const day = new Date(timestamp).getDay();
  return day === 0 || day === 6;
};

const isMorningTimestamp = (timestamp) => {
  const hours = new Date(timestamp).getHours();
  return hours < 12;
};

const finalizeChallengeEntry = (entry, def, timestamp) => {
  if ((entry.progress || 0) >= def.targetValue) {
    return {
      ...entry,
      progress: def.targetValue,
      status: CHALLENGE_STATUS.COMPLETED,
      completedAt: timestamp,
    };
  }
  return entry;
};

const applyChallengeEvent = (state = createInitialChallengesState(), event) => {
  if (!event) return state;
  let changed = false;
  const now = event.timestamp || Date.now();
  const nextState = { ...state };
  Object.keys(nextState).forEach((id) => {
    const entry = state[id] || createChallengeEntry(id);
    const def = CHALLENGE_DEF_MAP[id];
    if (!def || entry.status !== CHALLENGE_STATUS.ACTIVE) return;
    if (entry.expiresAt && now > entry.expiresAt) return;
    const updated = processChallengeEvent(entry, def, event, now);
    if (updated !== entry) {
      nextState[id] = updated;
      changed = true;
    }
  });
  return changed ? nextState : state;
};

const processChallengeEvent = (entry, def, event, now) => {
  const timestamp = event.timestamp || now;
  const meta = event.meta || {};
  let delta = 0;
  switch (def.metricType) {
    case CHALLENGE_METRIC_TYPES.SAVE_COUNT:
      if (isSaveEvent(event.kind)) {
        delta = 1;
      }
      break;
    case CHALLENGE_METRIC_TYPES.SAVE_AMOUNT:
      if (isSaveEvent(event.kind)) {
        const amount = Number(meta.amountUSD) || 0;
        if (amount > 0) {
          delta = amount;
        }
      }
      break;
    case CHALLENGE_METRIC_TYPES.PENDING_DECISIONS:
      if (event.kind === "pending_to_decline") {
        delta = 1;
      }
      break;
    case CHALLENGE_METRIC_TYPES.WISH_ADDED:
      if (event.kind === "wish_added") {
        delta = 1;
      }
      break;
    case CHALLENGE_METRIC_TYPES.PENDING_ADDED:
      if (event.kind === "pending_added") {
        delta = 1;
      }
      break;
    case CHALLENGE_METRIC_TYPES.WEEKEND_SAVES:
      if (isSaveEvent(event.kind) && isWeekendTimestamp(timestamp)) {
        delta = 1;
      }
      break;
    case CHALLENGE_METRIC_TYPES.HIGH_VALUE_SAVE:
      if (isSaveEvent(event.kind)) {
        const highAmount = Number(meta.amountUSD) || 0;
        if (highAmount >= (def.minAmountUSD || 0)) {
          delta = 1;
        }
      }
      break;
    case CHALLENGE_METRIC_TYPES.FREE_DAY_STREAK:
      if (event.kind === "free_day") {
        const dayIndex = getDayIndexFromTimestamp(timestamp);
        const lastDay =
          typeof entry.extra?.lastDayIndex === "number" ? entry.extra.lastDayIndex : null;
        const prevStreak = entry.extra?.currentStreak || 0;
        let nextStreak = 1;
        if (lastDay === dayIndex) {
          nextStreak = prevStreak;
        } else if (lastDay === dayIndex - 1) {
          nextStreak = prevStreak + 1;
        }
        const nextExtra = { ...entry.extra, lastDayIndex: dayIndex, currentStreak: nextStreak };
        if (nextStreak === prevStreak && lastDay === dayIndex) {
          return entry;
        }
        return finalizeChallengeEntry(
          {
            ...entry,
            progress: Math.min(def.targetValue, nextStreak),
            extra: nextExtra,
          },
          def,
          now
        );
      }
      break;
    case CHALLENGE_METRIC_TYPES.REFUSE_DAY_STREAK:
      if (isSaveEvent(event.kind)) {
        const dayIndex = getDayIndexFromTimestamp(timestamp);
        const lastDay =
          typeof entry.extra?.lastRefuseDayIndex === "number"
            ? entry.extra.lastRefuseDayIndex
            : null;
        const prevStreak = entry.extra?.refuseStreak ?? 0;
        let nextStreak = 1;
        if (lastDay === dayIndex) {
          nextStreak = prevStreak;
        } else if (lastDay === dayIndex - 1) {
          nextStreak = prevStreak + 1;
        }
        const nextExtra = {
          ...entry.extra,
          lastRefuseDayIndex: dayIndex,
          refuseStreak: nextStreak,
        };
        if (nextStreak === prevStreak && lastDay === dayIndex) {
          return entry;
        }
        return finalizeChallengeEntry(
          {
            ...entry,
            progress: Math.min(def.targetValue, nextStreak),
            extra: nextExtra,
          },
          def,
          now
        );
      }
      break;
    case CHALLENGE_METRIC_TYPES.MORNING_FREE_DAY:
      if (event.kind === "free_day" && isMorningTimestamp(timestamp)) {
        const dayIndex = getDayIndexFromTimestamp(timestamp);
        const seenDays = Array.isArray(entry.extra?.morningDays) ? entry.extra.morningDays : [];
        if (seenDays.includes(dayIndex)) {
          return entry;
        }
        const updatedDays = [...seenDays, dayIndex];
        return finalizeChallengeEntry(
          {
            ...entry,
            progress: Math.min(def.targetValue, (entry.progress || 0) + 1),
            extra: { ...entry.extra, morningDays: updatedDays },
          },
          def,
          now
        );
      }
      break;
    default:
      break;
  }
  if (!delta) return entry;
  return finalizeChallengeEntry(
    {
      ...entry,
      progress: Math.min(def.targetValue, (entry.progress || 0) + delta),
    },
    def,
    now
  );
};

const expireChallenges = (state = createInitialChallengesState(), now = Date.now()) => {
  let changed = false;
  const next = { ...state };
  Object.keys(next).forEach((id) => {
    const entry = next[id];
    if (
      entry?.status === CHALLENGE_STATUS.ACTIVE &&
      entry.expiresAt &&
      now > entry.expiresAt
    ) {
      next[id] = {
        ...entry,
        status: CHALLENGE_STATUS.EXPIRED,
      };
      changed = true;
    }
  });
  return changed ? next : state;
};

const rebuildChallengeProgressFromHistory = (history = [], state = createInitialChallengesState()) => {
  if (!Array.isArray(history) || !state) return state;
  const sortedEvents = history
    .filter((event) => event && typeof event.timestamp === "number")
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  if (!sortedEvents.length) return state;
  let changed = false;
  const nextState = { ...state };
  Object.keys(nextState).forEach((id) => {
    const entry = nextState[id];
    const def = CHALLENGE_DEF_MAP[id];
    if (
      !entry ||
      !def ||
      !entry.startedAt ||
      (entry.status !== CHALLENGE_STATUS.ACTIVE && entry.status !== CHALLENGE_STATUS.COMPLETED)
    ) {
      return;
    }
    let rebuilt = {
      ...entry,
      progress: 0,
      completedAt: null,
      status: CHALLENGE_STATUS.ACTIVE,
      extra: {},
    };
    sortedEvents.forEach((event) => {
      if (!event) return;
      const ts = event.timestamp || 0;
      if (ts < entry.startedAt) return;
      if (entry.expiresAt && ts > entry.expiresAt) return;
      rebuilt = processChallengeEvent(rebuilt, def, event, ts);
    });
    const extraChanged =
      JSON.stringify(rebuilt.extra || {}) !== JSON.stringify(entry.extra || {});
    if (
      rebuilt.progress !== entry.progress ||
      rebuilt.status !== entry.status ||
      (rebuilt.completedAt || null) !== (entry.completedAt || null) ||
      extraChanged
    ) {
      nextState[id] = {
        ...entry,
        progress: rebuilt.progress,
        status: rebuilt.status,
        completedAt: rebuilt.completedAt,
        extra: rebuilt.extra,
        claimedAt: rebuilt.status === CHALLENGE_STATUS.COMPLETED ? entry.claimedAt : null,
      };
      changed = true;
    }
  });
  return changed ? nextState : state;
};

const formatChallengeTimeLeft = (ms, t) => {
  if (ms <= 0) return t("challengeTimeExpired");
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) {
    return `${days}${t("challengeTimeDayShort")}${hours > 0 ? ` ${hours}${t("challengeTimeHourShort")}` : ""}`.trim();
  }
  if (hours > 0) {
    return `${hours}${t("challengeTimeHourShort")}${
      minutes > 0 ? ` ${minutes}${t("challengeTimeMinuteShort")}` : ""
    }`.trim();
  }
  return `${Math.max(minutes, 1)}${t("challengeTimeMinuteShort")}`;
};

const buildChallengesDisplay = ({ state, currency, language, t }) => {
  const currencyCode = currency || DEFAULT_PROFILE.currency;
  const now = Date.now();
  const list = CHALLENGE_DEFS.map((def) => {
    const entry = state?.[def.id] || createChallengeEntry(def.id);
    const progressValue = entry.progress || 0;
    const percent = def.targetValue > 0 ? Math.min(1, progressValue / def.targetValue) : 0;
    const copy = getChallengeCopy(def, language);
    const targetLabel =
      def.metricType === CHALLENGE_METRIC_TYPES.SAVE_AMOUNT
        ? formatCurrency(convertToCurrency(def.targetValue, currencyCode), currencyCode)
        : `${def.targetValue}`;
    const progressLabelValue =
      def.metricType === CHALLENGE_METRIC_TYPES.SAVE_AMOUNT
        ? formatCurrency(convertToCurrency(progressValue, currencyCode), currencyCode)
        : `${Math.floor(progressValue)}`;
    const amountLabel =
      def.metricType === CHALLENGE_METRIC_TYPES.SAVE_AMOUNT
        ? targetLabel
        : "";
    const limitLabel = def.minAmountUSD
      ? formatCurrency(convertToCurrency(def.minAmountUSD, currencyCode), currencyCode)
      : "";
    const description =
      copy.desc && copy.desc.length
        ? renderTemplateString(copy.desc, {
            count: def.targetValue,
            days: def.durationDays,
            amount: amountLabel,
            limit: limitLabel,
          })
        : "";
    let timerLabel = t("challengeDurationLabel", { days: def.durationDays });
    if (entry.status === CHALLENGE_STATUS.ACTIVE && entry.expiresAt) {
      timerLabel = t("challengeTimeLeftLabel", {
        time: formatChallengeTimeLeft(Math.max(0, entry.expiresAt - now), t),
      });
    } else if (entry.status === CHALLENGE_STATUS.COMPLETED) {
      timerLabel = t("challengeReadyToClaim");
    } else if (entry.status === CHALLENGE_STATUS.CLAIMED) {
      timerLabel = t("challengeRestartHint", { days: def.durationDays });
    }
    const canStart =
      entry.status === CHALLENGE_STATUS.IDLE ||
      entry.status === CHALLENGE_STATUS.EXPIRED ||
      entry.status === CHALLENGE_STATUS.CLAIMED;
    const canClaim = entry.status === CHALLENGE_STATUS.COMPLETED;
    let actionLabel = t("challengeActiveCta");
    if (canClaim) {
      actionLabel = t("challengeClaimCta");
    } else if (canStart) {
      actionLabel = t("challengeStartCta");
    }
    const scaledReward = getScaledChallengeReward(def.rewardHealth);
    return {
      id: def.id,
      emoji: def.emoji,
      title: copy.title || "",
      description,
      rewardHealth: scaledReward,
      rewardLabel: formatHealthRewardLabel(scaledReward, language),
      status: entry.status,
      statusLabel: t(CHALLENGE_STATUS_LABELS[entry.status] || CHALLENGE_STATUS_LABELS[CHALLENGE_STATUS.IDLE]),
      progressPercent: percent,
      progressLabel: t("challengeProgressLabel", {
        current: progressLabelValue,
        target: targetLabel,
      }),
      timerLabel,
      canStart,
      canClaim,
      actionLabel,
    };
  });
  return list.sort(
    (a, b) => (CHALLENGE_STATUS_ORDER[a.status] || 99) - (CHALLENGE_STATUS_ORDER[b.status] || 99)
  );
};

const getAchievementRemainingLabel = (metricType, remaining, currency, t) => {
  if (!remaining || remaining <= 0) return "";
  const count = Math.max(1, Math.ceil(remaining));
  switch (metricType) {
    case ACHIEVEMENT_METRIC_TYPES.SAVED_AMOUNT:
      return t("rewardRemainingAmount", {
        amount: formatCurrency(convertToCurrency(remaining, currency), currency),
      });
    case ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_TOTAL:
    case ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_STREAK:
      return t("rewardRemainingDays", { count });
    case ACHIEVEMENT_METRIC_TYPES.REFUSE_COUNT:
      return t("rewardRemainingRefuse", { count });
    case ACHIEVEMENT_METRIC_TYPES.FRIDGE_ITEMS_COUNT:
      return t("rewardRemainingFridge", { count });
    case ACHIEVEMENT_METRIC_TYPES.FRIDGE_DECISIONS:
      return t("rewardRemainingDecisions", { count });
    default:
      return t("rewardLockedGeneric", { count });
  }
};

const buildAchievements = ({
  savedTotalUSD,
  declineCount,
  freeDayStats,
  declineStreak = 0,
  pendingCount,
  decisionStats,
  currency,
  t,
  language,
}) => {
  const fridgeDecisionsResolved =
    (decisionStats?.resolvedToDeclines || 0) + (decisionStats?.resolvedToWishes || 0);
  const metricValues = {
    [ACHIEVEMENT_METRIC_TYPES.SAVED_AMOUNT]: savedTotalUSD,
    [ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_TOTAL]: freeDayStats?.total || 0,
    [ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_STREAK]: freeDayStats?.current || 0,
    [ACHIEVEMENT_METRIC_TYPES.REFUSE_COUNT]: declineStreak || 0,
    [ACHIEVEMENT_METRIC_TYPES.FRIDGE_ITEMS_COUNT]: pendingCount,
    [ACHIEVEMENT_METRIC_TYPES.FRIDGE_DECISIONS]: fridgeDecisionsResolved,
  };

  return ACHIEVEMENT_DEFS.map((def) => {
    const value = metricValues[def.metricType] || 0;
    const target = def.targetValue || 0;
    const unlocked = target ? value >= target : true;
    const progress = target ? Math.min(value / target, 1) : 1;
    const remaining = target ? Math.max(target - value, 0) : 0;
    const amountLabel =
      def.metricType === ACHIEVEMENT_METRIC_TYPES.SAVED_AMOUNT
        ? formatCurrency(convertToCurrency(def.targetValue || 0, currency), currency)
        : null;
    const copySource = def.copy[language] || def.copy.en;
    const applyAmount = (text) =>
      typeof text === "string" && amountLabel ? text.replace("{{amount}}", amountLabel) : text || "";
    const remainingLabel = getAchievementRemainingLabel(def.metricType, remaining, currency, t);
    return {
      id: def.id,
      emoji: def.emoji,
      title: applyAmount(copySource.title),
      desc: applyAmount(copySource.desc),
      unlocked,
      progress,
      currentValue: value,
      targetValue: target,
      metricType: def.metricType,
      remainingLabel,
      rewardHealth: def.rewardHealth || HEALTH_PER_REWARD,
    };
  });
};

const RewardsScreen = React.memo(function RewardsScreen({
  achievements = [],
  challenges = [],
  activePane = "challenges",
  onPaneChange = () => {},
  onChallengeAccept = () => {},
  onChallengeClaim = () => {},
  onChallengeCancel = () => {},
  t,
  colors,
  savedTotalUSD = 0,
  currency = DEFAULT_PROFILE.currency,
  onRewardClaim = () => {},
  healthRewardAmount = HEALTH_PER_REWARD,
  language = "ru",
  dailyChallenge = null,
}) {
  const isDarkTheme = colors.background === THEMES.dark.background;
  const pane = activePane === "rewards" ? "rewards" : "challenges";
  const challengeSwipeCloserRef = useRef(null);
  const handleChallengeSwipeOpen = useCallback((closer) => {
    if (challengeSwipeCloserRef.current && challengeSwipeCloserRef.current !== closer) {
      challengeSwipeCloserRef.current();
    }
    challengeSwipeCloserRef.current = closer;
  }, []);
  const handleChallengeSwipeClose = useCallback((closer) => {
    if (!closer || challengeSwipeCloserRef.current === closer) {
      challengeSwipeCloserRef.current = null;
    }
  }, []);

  const renderChallengeCard = (challenge) => {
    const actionPalette = challenge.canClaim
      ? { background: SAVE_ACTION_COLOR, text: "#fff" }
      : challenge.canStart
      ? { background: colors.text, text: colors.background }
      : { background: colors.border, text: colors.muted };
    const confirmAccept = () => {
      Alert.alert(
        t("challengeAcceptConfirmTitle"),
        t("challengeAcceptConfirmMessage", { title: challenge.title }),
        [
          { text: t("challengeAcceptConfirmNo"), style: "cancel" },
          {
            text: t("challengeAcceptConfirmYes"),
            style: "default",
            onPress: () => onChallengeAccept?.(challenge.id),
          },
        ]
      );
    };
    const confirmCancel = () => {
      Alert.alert(
        t("challengeCancelConfirmTitle"),
        t("challengeCancelConfirmMessage", { title: challenge.title }),
        [
          { text: t("challengeCancelConfirmNo"), style: "cancel" },
          {
            text: t("challengeCancelConfirmYes"),
            style: "destructive",
            onPress: () => onChallengeCancel?.(challenge.id),
          },
        ]
      );
    };
    const handleActionPress = () => {
      if (challenge.canClaim) {
        onChallengeClaim?.(challenge.id);
      } else if (challenge.canStart) {
        confirmAccept();
      }
    };
    const isActionEnabled = challenge.canClaim || challenge.canStart;
    const isSwipeEnabled = challenge.status === CHALLENGE_STATUS.ACTIVE;
    const cardBody = (
      <View style={[styles.challengeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View
          style={[
            styles.challengeRewardChip,
            styles.challengeRewardChipFloating,
            { backgroundColor: colors.text },
          ]}
        >
          <HealthRewardTokens
            amount={challenge.rewardHealth}
            color={colors.background}
            iconSize={12}
            maxItems={2}
            textSize={10}
            rowStyle={styles.healthRewardTokenRowCompact}
          />
        </View>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={[styles.challengeTitle, { color: colors.text }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.9}
            >
              {challenge.title}
            </Text>
            <Text style={[styles.challengeDesc, { color: colors.muted }]} numberOfLines={3}>
              {challenge.description}
            </Text>
          </View>
        </View>
        <View style={styles.challengeMetaRow}>
          <Text style={[styles.challengeStatus, { color: colors.muted }]}>{challenge.statusLabel}</Text>
          <Text style={[styles.challengeTimer, { color: colors.muted }]}>{challenge.timerLabel}</Text>
        </View>
        <View style={[styles.challengeProgressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.challengeProgressFill,
              { width: `${challenge.progressPercent * 100}%`, backgroundColor: colors.text },
            ]}
          />
        </View>
        <Text style={[styles.challengeProgressLabel, { color: colors.muted }]}>{challenge.progressLabel}</Text>
        <TouchableOpacity
          style={[styles.challengeActionButton, { backgroundColor: actionPalette.background }]}
          activeOpacity={0.9}
          disabled={!isActionEnabled}
          onPress={handleActionPress}
        >
          <Text style={[styles.challengeActionText, { color: actionPalette.text }]}>
            {challenge.actionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
    if (isSwipeEnabled) {
      return (
        <SwipeableChallengeCard
          key={challenge.id}
          colors={colors}
          cancelLabel={t("challengeCancelAction")}
          onCancel={confirmCancel}
          onSwipeOpen={handleChallengeSwipeOpen}
          onSwipeClose={handleChallengeSwipeClose}
        >
          {cardBody}
        </SwipeableChallengeCard>
      );
    }
    return (
      <View key={challenge.id}>
        {cardBody}
      </View>
    );
  };

  const renderRewardCard = (reward) => {
    const rewardPayout = reward.rewardHealth || healthRewardAmount;
    const rewardPalette = reward.unlocked
      ? isDarkTheme
        ? {
            background: "rgba(8,48,30,0.9)",
            border: "rgba(74,221,152,0.6)",
            text: "#D6FFE8",
            badgeBg: "rgba(74,221,152,0.2)",
            badgeText: "#82FFC6",
          }
        : {
            background: "#E6F9EE",
            border: "rgba(58,174,120,0.45)",
            text: "#0E512F",
            badgeBg: "rgba(58,174,120,0.15)",
            badgeText: "#0F5C35",
          }
      : {
          background: colors.card,
          border: colors.border,
          text: colors.text,
          badgeBg: colors.text,
          badgeText: colors.background,
        };
    const cardContent = (
      <View
        style={[
          styles.goalCard,
          {
            backgroundColor: rewardPalette.background,
            borderColor: rewardPalette.border,
            borderWidth: reward.unlocked ? 2 : 1,
            shadowOpacity: reward.unlocked ? 0.15 : 0,
            shadowColor: rewardPalette.border,
            shadowOffset: { width: 0, height: reward.unlocked ? 6 : 0 },
            shadowRadius: reward.unlocked ? 12 : 0,
            elevation: reward.unlocked ? 4 : 0,
          },
        ]}
      >
        <View style={styles.rewardHeader}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 28 }}>{reward.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalTitle, { color: rewardPalette.text }]}>{reward.title}</Text>
              <Text style={[styles.goalDesc, { color: colors.muted }]}>{reward.desc}</Text>
            </View>
          </View>
        {reward.unlocked && (
          <View style={styles.rewardBadgeContainer}>
            <View
              style={[
                styles.rewardBadge,
                styles.rewardBadgeFloating,
                { backgroundColor: rewardPalette.badgeBg },
              ]}
            >
              {reward.claimed ? (
                <Text style={[styles.rewardBadgeText, { color: rewardPalette.badgeText }]}>
                  {t("rewardBadgeClaimed")}
                </Text>
              ) : (
                <HealthRewardTokens
                  amount={rewardPayout}
                  color={rewardPalette.badgeText}
                  iconSize={18}
                  maxItems={3}
                />
              )}
            </View>
          </View>
        )}
        </View>
        <View style={[styles.goalProgressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.goalProgressFill,
              {
                width: `${reward.progress * 100}%`,
                backgroundColor: reward.unlocked ? rewardPalette.badgeText : colors.muted,
              },
            ]}
          />
        </View>
        <Text style={[styles.goalDesc, { color: colors.muted }]}>
          {reward.unlocked
            ? reward.claimed
              ? t("rewardClaimedStatus")
              : t("rewardClaimHint", { amount: rewardPayout })
            : reward.remainingLabel || t("rewardLockedGeneric", { count: 1 })}
        </Text>
        {reward.unlocked && !reward.claimed && (
          <TouchableOpacity
            style={[styles.rewardClaimButton, { backgroundColor: rewardPalette.badgeText }]}
            onPress={(event) => {
              event?.stopPropagation?.();
              onRewardClaim?.(reward);
            }}
          >
            <Text style={[styles.rewardClaimButtonText, { color: rewardPalette.background }]}>
              {t("rewardClaimCta")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
    const isClaimable = reward.unlocked && !reward.claimed;
    return (
      <TouchableOpacity
        key={reward.id}
        activeOpacity={isClaimable ? 0.85 : 1}
        onPress={() => (isClaimable ? onRewardClaim?.(reward) : undefined)}
        disabled={!isClaimable}
      >
        {cardContent}
      </TouchableOpacity>
    );
  };
  const renderDailyChallengeWidget = () => {
    if (!dailyChallenge) return null;
    const progress = Math.min(
      Math.max(Number(dailyChallenge.progress) || 0, 0),
      Number(dailyChallenge.target) || 1
    );
    const target = Math.max(Number(dailyChallenge.target) || 1, 1);
    const percent = Math.min(Math.max(progress / target, 0), 1);
    const widgetBackground = colors.background === THEMES.dark.background ? "rgba(255,255,255,0.05)" : "#FFF7EA";
    const widgetBorder = colors.background === THEMES.dark.background ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)";
    return (
      <View
        style={[
          styles.dailyChallengeWidget,
          { backgroundColor: widgetBackground, borderColor: widgetBorder },
        ]}
      >
        <View style={styles.dailyChallengeWidgetHeader}>
          <View style={[styles.dailyChallengeBadge, { borderColor: widgetBorder }]}>
            <Text style={[styles.dailyChallengeBadgeText, { color: colors.text }]}>
              {t("dailyChallengeWidgetBadge")}
            </Text>
          </View>
          <HealthRewardTokens amount={dailyChallenge.rewardBonus} color={colors.text} iconSize={16} />
        </View>
        <View style={styles.dailyChallengeWidgetBody}>
          <View style={styles.dailyChallengeEmojiPill}>
            <Text style={styles.dailyChallengeEmojiText}>{dailyChallenge.emoji || "✨"}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.dailyChallengeWidgetTitle, { color: colors.text }]}>
              {t("dailyChallengeWidgetTitle")}
            </Text>
            <Text style={[styles.dailyChallengeWidgetDesc, { color: colors.muted }]}>
              {t("dailyChallengeWidgetDesc", { temptation: dailyChallenge.title })}
            </Text>
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <View style={[styles.dailyChallengeProgressBar, { backgroundColor: widgetBorder }]}>
            <View
              style={[
                styles.dailyChallengeProgressFill,
                { width: `${percent * 100}%`, backgroundColor: colors.text },
              ]}
            />
          </View>
          <View style={styles.dailyChallengeWidgetFooter}>
            <Text style={[styles.dailyChallengeProgressLabel, { color: colors.muted }]}>
              {t("dailyChallengeWidgetProgress", { current: `${progress}`, target: `${target}` })}
            </Text>
            <Text style={[styles.dailyChallengeRewardLabel, { color: colors.text }]}>
              {t("dailyChallengeWidgetReward", { amount: dailyChallenge.rewardBonus })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const tabItems = [
    { id: "challenges", label: t("challengeTabTitle") },
    { id: "rewards", label: t("challengeRewardsTabTitle") },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 200, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text style={[styles.header, { color: colors.text }]}>{t("purchasesTitle")}</Text>
        <Text style={[styles.purchasesSubtitle, { color: colors.muted }]}>
          {t("purchasesSubtitle")}
        </Text>
      </View>
      <View style={styles.rewardsTabs}>
        {tabItems.map((tab) => {
          const isActive = pane === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.rewardsTabButton,
                {
                  backgroundColor: isActive ? colors.text : "transparent",
                  borderColor: isActive ? colors.text : colors.border,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => {
                if (tab.id !== pane) {
                  onPaneChange?.(tab.id);
                }
              }}
            >
              <Text
                style={[
                  styles.rewardsTabText,
                  { color: isActive ? colors.background : colors.text },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {pane === "challenges" ? (
        <View style={{ gap: 16 }}>
          {renderDailyChallengeWidget()}
          {challenges.map(renderChallengeCard)}
          {!challenges.length && (
            <Text style={[styles.historyEmpty, { color: colors.muted }]}>
              {t("rewardsEmpty")}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {achievements.map(renderRewardCard)}
          {!achievements.some((item) => item.unlocked) && (
            <Text style={[styles.historyEmpty, { color: colors.muted }]}>{t("rewardsEmpty")}</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
});

const ProfileScreen = React.memo(function ProfileScreen({
  profile,
  stats,
  isEditing,
  onFieldChange,
  onEditPress,
  onCancelEdit,
  onSaveEdit,
  onThemeToggle,
  onLanguageChange,
  onCurrencyChange,
  onGoalChange,
  onResetData,
  onPickImage,
  onHistoryDelete = () => {},
  theme,
  language,
  currencyValue,
  history = [],
  freeDayStats = INITIAL_FREE_DAY_STATS,
  rewardBadges = [],
  analyticsOptOut = false,
  onAnalyticsToggle = () => {},
  t,
  colors,
  moodPreset = null,
  mascotImageSource,
}) {
  const fallbackAvatar = mascotImageSource || CLASSIC_TAMAGOTCHI_ANIMATIONS.idle;
  const currentCurrency = currencyValue || profile.currency || DEFAULT_PROFILE.currency;
  const isDarkTheme = theme === "dark";
  const activeGoalId = profile.goal || DEFAULT_PROFILE.goal;
  const primaryGoalsList =
    Array.isArray(profile.primaryGoals) && profile.primaryGoals.length
      ? profile.primaryGoals
      : [
          {
            id: activeGoalId,
            targetUSD: getGoalDefaultTargetUSD(activeGoalId),
          },
        ];
  const historyEntries = Array.isArray(history) ? history : [];
  const locale = language === "ru" ? "ru-RU" : "en-US";
  const formatLocalAmount = (valueUSD = 0) =>
    formatCurrency(convertToCurrency(valueUSD || 0, currentCurrency), currentCurrency);
  const [baselineInput, setBaselineInput] = useState("");
  const [customSpendInputs, setCustomSpendInputs] = useState({
    title: "",
    amount: "",
    frequency: "",
  });
  const profileEditingRef = useRef(isEditing);
  const profileCurrencyRef = useRef(currentCurrency);
  useEffect(() => {
    const editingJustOpened = isEditing && !profileEditingRef.current;
    const currencyChanged = isEditing && profileCurrencyRef.current !== currentCurrency;
    profileEditingRef.current = isEditing;
    profileCurrencyRef.current = currentCurrency;
    if (!editingJustOpened && !currencyChanged) return;
    const baselineUSD = profile.spendingProfile?.baselineMonthlyWasteUSD || 0;
    setBaselineInput(
      baselineUSD > 0 ? formatNumberInputValue(convertToCurrency(baselineUSD, currentCurrency)) : ""
    );
    const customAmountUSD = resolveCustomPriceUSD(
      profile.customSpend,
      profile.currency || DEFAULT_PROFILE.currency
    );
    setCustomSpendInputs({
      title: profile.customSpend?.title || "",
      amount:
        customAmountUSD > 0
          ? formatNumberInputValue(convertToCurrency(customAmountUSD, currentCurrency))
          : "",
      frequency: profile.customSpend?.frequencyPerWeek
        ? `${profile.customSpend.frequencyPerWeek}`
        : "",
    });
  }, [
    currentCurrency,
    isEditing,
    profile.currency,
    profile.customSpend,
    profile.spendingProfile?.baselineMonthlyWasteUSD,
  ]);
  const baselineDisplayUSD = profile.spendingProfile?.baselineMonthlyWasteUSD || 0;
  const baselineLocalDisplay = baselineDisplayUSD
    ? formatCurrency(convertToCurrency(baselineDisplayUSD, currentCurrency), currentCurrency)
    : null;
  const customSpendAmountUSD = resolveCustomPriceUSD(
    profile.customSpend,
    profile.currency || DEFAULT_PROFILE.currency
  );
  const customSpendAmountDisplay =
    customSpendAmountUSD > 0
      ? formatCurrency(convertToCurrency(customSpendAmountUSD, currentCurrency), currentCurrency)
      : null;
  const customSpendFrequency = profile.customSpend?.frequencyPerWeek || null;
  const customSpendPlaceholderLabel = formatSampleAmount(CUSTOM_SPEND_SAMPLE_USD, currentCurrency);
  const baselinePlaceholderLabel = formatSampleAmount(BASELINE_SAMPLE_USD, currentCurrency);
  const avatarEditBadgeColors = useMemo(
    () => {
      const dark = theme === "dark";
      return {
        background: dark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.92)",
        border: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)",
        icon: dark ? colors.card : colors.text,
      };
    },
    [theme, colors.card, colors.text]
  );
  const handleBaselineInputChange = useCallback(
    (text) => {
      setBaselineInput(text);
      const trimmed = text.trim();
      const baseProfile = profile.spendingProfile || { ...DEFAULT_PROFILE.spendingProfile };
      if (!trimmed) {
        onFieldChange?.("spendingProfile", {
          ...baseProfile,
          baselineMonthlyWasteUSD: 0,
          baselineStartAt: null,
        });
        return;
      }
      const parsed = parseNumberInputValue(text);
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      onFieldChange?.("spendingProfile", {
        ...baseProfile,
        baselineMonthlyWasteUSD: convertFromCurrency(parsed, currentCurrency),
        baselineStartAt: new Date().toISOString(),
      });
    },
    [currentCurrency, onFieldChange, profile.spendingProfile]
  );
  const applyCustomSpendDraft = useCallback(
    (nextState) => {
      const trimmedTitle = nextState.title.trim();
      const parsedAmount = parseNumberInputValue(nextState.amount);
      const frequencyValue = parseFloat((nextState.frequency || "").replace(",", "."));
      const hasAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
      const hasFrequency = Number.isFinite(frequencyValue) && frequencyValue > 0;
      if (!trimmedTitle && !hasAmount && !hasFrequency) {
        onFieldChange?.("customSpend", null);
        return;
      }
      const existing = profile.customSpend || {};
      const next = {
        ...existing,
      };
      next.id = next.id || existing.id || "custom_habit";
      if (trimmedTitle) {
        next.title = trimmedTitle;
      } else {
        delete next.title;
      }
      if (hasAmount) {
        next.amountUSD = convertFromCurrency(parsedAmount, currentCurrency);
        next.currency = currentCurrency;
      } else {
        delete next.amountUSD;
        delete next.currency;
      }
      if (hasFrequency) {
        next.frequencyPerWeek = Math.max(1, Math.round(frequencyValue));
      } else {
        delete next.frequencyPerWeek;
      }
      if (!next.title && !next.amountUSD && !next.frequencyPerWeek) {
        onFieldChange?.("customSpend", null);
        return;
      }
      onFieldChange?.("customSpend", next);
    },
    [currentCurrency, onFieldChange, profile.customSpend]
  );
  const handleCustomSpendInputChange = useCallback(
    (field, value) => {
      setCustomSpendInputs((prev) => {
        const nextState = { ...prev, [field]: value };
        applyCustomSpendDraft(nextState);
        return nextState;
      });
    },
    [applyCustomSpendDraft]
  );
  const describeHistory = (entry) => {
    if (!entry) return t("historyUnknown");
    const { kind, meta = {} } = entry;
    const title = meta.title || t("historyUnknown");
    switch (kind) {
      case "wish_added":
        return t("historyWishAdded", { title });
      case "wish_progress":
        return t("historyWishProgress", {
          title,
          amount: formatLocalAmount(meta.savedUSD),
          target: formatLocalAmount(meta.targetUSD),
        });
      case "wish_completed":
        return t("historyWishDone", { title });
      case "decline":
        return t("historyDecline", { title, amount: formatLocalAmount(meta.amountUSD) });
      case "refuse_spend":
        return t("historyRefuseSpend", { title, amount: formatLocalAmount(meta.amountUSD) });
      case "pending_added":
        return t("historyPendingAdded", { title });
      case "pending_to_wish":
        return t("historyPendingWant", { title });
      case "pending_to_decline":
        return t("historyPendingDecline", { title, amount: formatLocalAmount(meta.amountUSD) });
      case "pending_removed":
        return t("historyPendingRemoved", { title });
      case "free_day":
        return t("historyFreeDay", { total: meta.total || 0 });
      case "spend":
        return t("historySpend", { title, amount: formatLocalAmount(meta.amountUSD) });
      case "wish_removed":
        return t("historyWishRemoved", { title });
      case "goal_started":
        return t("historyGoalStarted", { title });
      case "goal_cancelled":
        return t("historyGoalCancelled", { title });
      case "reward_claimed":
        return t("historyRewardClaimed", { title: title || meta.rewardId || t("historyUnknown") });
      default:
        return t("historyUnknown");
    }
  };
  const formatHistoryMeta = (entry) => {
    if (!entry?.timestamp) return "";
    try {
      const date = new Date(entry.timestamp);
      const dateLabel = date.toLocaleDateString(locale, { day: "numeric", month: "short" });
      const timeLabel = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
      return t("historyTimestamp", { date: dateLabel, time: timeLabel });
    } catch {
      return "";
    }
  };
  const joinDateLabel = useMemo(() => {
    const stamp = profile.joinedAt || profile.spendingProfile?.baselineStartAt;
    if (!stamp) return null;
    try {
      const joinedDate = new Date(stamp);
      const dateLabel = joinedDate.toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return t("profileJoinDate", { date: dateLabel });
    } catch {
      return null;
    }
  }, [profile.joinedAt, profile.spendingProfile?.baselineStartAt, locale, t]);
  const profileMoodGradient = useMemo(
    () =>
      applyThemeToMoodGradient(getMoodGradient(moodPreset?.id), isDarkTheme ? "dark" : "light"),
    [moodPreset?.id, isDarkTheme]
  );
  const handlePrivacyPolicyOpen = useCallback(() => {
    const url = PRIVACY_LINKS[language] || PRIVACY_LINKS.en;
    if (!url) return;
    triggerHaptic();
    Linking.openURL(url).catch((error) => console.warn("privacy policy", error));
  }, [language]);
  const handleSupportPress = useCallback(() => {
    triggerHaptic();
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch((error) => console.warn("support mail", error));
  }, []);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.profileScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card }] }>
          <View style={styles.profileMoodAura}>
            <MoodGradientBlock colors={profileMoodGradient} style={styles.profileMoodGradient}>
              <TouchableOpacity
                style={styles.profileAvatarWrap}
                activeOpacity={isEditing ? 0.85 : 1}
                onPress={() => isEditing && onPickImage?.()}
              >
                <Image
                  source={profile.avatar ? { uri: profile.avatar } : fallbackAvatar}
                  style={styles.profileAvatar}
                  resizeMode="cover"
                />
                {isEditing && (
                  <View
                    style={[
                      styles.profileAvatarEditBadge,
                      { backgroundColor: avatarEditBadgeColors.background, borderColor: avatarEditBadgeColors.border },
                    ]}
                  >
                    <Text style={[styles.profileAvatarEditIcon, { color: avatarEditBadgeColors.icon }]}>✏︎</Text>
                  </View>
                )}
              </TouchableOpacity>
            </MoodGradientBlock>
            {isEditing && (
              <Text style={[styles.profileAvatarHint, { color: colors.muted }]}>{t("photoTapHint")}</Text>
            )}
            {moodPreset?.label && (
              <Text style={[styles.profileMoodStatus, { color: profileMoodGradient.accent }]}>
                {moodPreset.label}
              </Text>
            )}
          </View>
          {isEditing ? (
            <>
              <TextInput
                style={[
                  styles.profileInput,
                  { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                ]}
                value={profile.name}
                onChangeText={(text) => onFieldChange("name", text)}
                placeholder="Name"
                placeholderTextColor={colors.muted}
              />
              <TextInput
                style={[
                  styles.profileInput,
                  styles.profileBioInput,
                  { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                ]}
                value={profile.bio}
                onChangeText={(text) => onFieldChange("bio", text)}
                placeholder="About you"
                multiline
                placeholderTextColor={colors.muted}
              />
            </>
          ) : (
            <>
            <View style={styles.profileNameRow}>
              <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
              {!!rewardBadges.length && (
                <View style={[styles.rewardBadgeSmall, { backgroundColor: colors.text }]}>
                  <Text style={[styles.rewardBadgeSmallText, { color: colors.background }]}>
                    {t("rewardBadgeLabel")}
                    {rewardBadges.length > 1 ? ` ×${rewardBadges.length}` : ""}
                  </Text>
                </View>
              )}
            </View>
            {joinDateLabel && (
              <Text style={[styles.profileSubtitle, { color: colors.muted }]} numberOfLines={2}>
                {joinDateLabel}
              </Text>
            )}
            <Text style={[styles.profileBio, { color: colors.muted }]}>{profile.bio}</Text>
          </>
        )}

          <View style={styles.profileStatsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.profileStat}>
                <View style={styles.profileStatValueRow}>
                  <Text style={[styles.profileStatValue, { color: colors.text }]}>{stat.value}</Text>
                  {!!stat.suffix && (
                    <Text style={[styles.profileStatValueSuffix, { color: colors.text }]}>
                      {stat.suffix}
                    </Text>
                  )}
                </View>
                <Text style={[styles.profileStatLabel, { color: colors.muted }]} numberOfLines={1}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.profileActions}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.profileActionPrimary, { backgroundColor: colors.text }]}
                  onPress={onSaveEdit}
                >
                  <Text style={[styles.profileActionPrimaryText, { color: colors.background }]}>
                    {t("profileSave")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.profileActionSecondary, { borderColor: colors.border }]}
                  onPress={onCancelEdit}
                >
                  <Text style={[styles.profileActionSecondaryText, { color: colors.muted }]}>
                    {t("profileCancel")}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.profileActionPrimary, { backgroundColor: colors.text }]}
                onPress={onEditPress}
              >
                <Text style={[styles.profileActionPrimaryText, { color: colors.background }]}>
                  {t("profileEdit")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: colors.card }] }>
          <View style={styles.profileSection}>
            <Text style={[styles.settingLabel, { color: colors.muted }]}>{t("primaryGoalLabel")}</Text>
            <View style={styles.profileGoalGrid}>
              {GOAL_PRESETS.map((goal) => {
                const active = activeGoalId === goal.id;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.profileGoalOption,
                      {
                        borderColor: colors.border,
                        backgroundColor: active ? colors.text : "transparent",
                      },
                    ]}
                    onPress={() => onGoalChange?.(goal.id)}
                  >
                    <Text style={styles.profileGoalEmoji}>{goal.emoji}</Text>
                    <Text
                      style={[
                        styles.profileGoalText,
                        { color: active ? colors.background : colors.text },
                      ]}
                    >
                      {goal[language] || goal.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.profileSection}>
            <Text style={[styles.settingLabel, { color: colors.muted }]}>{t("customSpendTitle")}</Text>
            {isEditing ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  style={[
                    styles.profileInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  value={customSpendInputs.title}
                  onChangeText={(text) => handleCustomSpendInputChange("title", text)}
                  placeholder={t("customSpendNamePlaceholder")}
                  placeholderTextColor={colors.muted}
                />
                <TextInput
                  style={[
                    styles.profileInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  value={customSpendInputs.amount}
                  onChangeText={(text) => handleCustomSpendInputChange("amount", text)}
                  placeholder={t("customSpendAmountPlaceholder", { amount: customSpendPlaceholderLabel })}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.muted}
                />
                <TextInput
                  style={[
                    styles.profileInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  value={customSpendInputs.frequency}
                  onChangeText={(text) => handleCustomSpendInputChange("frequency", text)}
                  placeholder={t("customSpendFrequencyPlaceholder")}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.muted}
                />
              </View>
            ) : profile.customSpend ? (
              <View style={{ gap: 4 }}>
                <Text style={[styles.profileSettingValue, { color: colors.text }]}>
                  {profile.customSpend.title}
                </Text>
                {customSpendAmountDisplay && (
                  <Text style={[styles.profileHintText, { color: colors.muted }]}>
                    {t("customSpendAmountLabel")}: {customSpendAmountDisplay}
                  </Text>
                )}
                {customSpendFrequency ? (
                  <Text style={[styles.profileHintText, { color: colors.muted }]}>
                    {t("customSpendFrequencyLabel")}: {customSpendFrequency}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.profileHintText, { color: colors.muted }]}>{t("customSpendHint")}</Text>
            )}
          </View>
          <View style={styles.profileSection}>
            <Text style={[styles.settingLabel, { color: colors.muted }]}>{t("baselineTitle")}</Text>
            {isEditing ? (
              <View style={{ gap: 10 }}>
                <TextInput
                  style={[
                    styles.profileInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  value={baselineInput}
                  onChangeText={handleBaselineInputChange}
                  placeholder={t("baselinePlaceholder", { amount: baselinePlaceholderLabel })}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.muted}
                />
              </View>
            ) : baselineLocalDisplay ? (
              <Text style={[styles.profileSettingValue, { color: colors.text }]}>
                {baselineLocalDisplay}
              </Text>
            ) : (
              <Text style={[styles.profileHintText, { color: colors.muted }]}>{t("baselineHint")}</Text>
            )}
          </View>

          <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />

          <Text style={[styles.settingsTitle, { color: colors.text }]}>{t("settingsTitle")}</Text>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.muted }]}>{t("themeLabel")}</Text>
          <View style={styles.settingChoices}>
            {(["light", "dark"]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.settingChip,
                  {
                    backgroundColor: theme === mode ? colors.text : "transparent",
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onThemeToggle(mode)}
              >
                <Text
                  style={{
                    color: theme === mode ? colors.background : colors.muted,
                    fontWeight: "600",
                  }}
                >
                  {mode === "light" ? t("themeLight") : t("themeDark")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.muted }]}>{t("languageLabel")}</Text>
          <View style={styles.settingChoices}>
            {(["ru", "en"]).map((lng) => (
              <TouchableOpacity
                key={lng}
                style={[
                  styles.settingChip,
                  {
                    backgroundColor: language === lng ? colors.text : "transparent",
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onLanguageChange(lng)}
              >
                <Text
                  style={{
                    color: language === lng ? colors.background : colors.muted,
                    fontWeight: "600",
                  }}
                >
                  {lng === "ru" ? t("languageRussian") : t("languageEnglish")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.muted }]}>{t("currencyLabel")}</Text>
          <View style={styles.settingChoices}>
            {CURRENCIES.map((code) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.settingChip,
                  {
                    backgroundColor: currentCurrency === code ? colors.text : "transparent",
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onCurrencyChange?.(code)}
              >
                <Text
                  style={{
                    color: currentCurrency === code ? colors.background : colors.muted,
                    fontWeight: "600",
                  }}
                >
                  {code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={[styles.settingRow, { alignItems: "center", justifyContent: "space-between" }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{t("analyticsOptInLabel")}</Text>
            <Text style={{ color: colors.muted }}>{t("analyticsOptInHint")}</Text>
          </View>
          <Switch
            style={styles.analyticsSwitch}
            value={!analyticsOptOut}
            onValueChange={onAnalyticsToggle}
            trackColor={{ false: colors.border, true: colors.text }}
            thumbColor={colors.card}
          />
        </View>
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={onResetData}
        >
          <Text style={[styles.resetButtonText, { color: colors.muted }]}>
            {t("developerReset")}
          </Text>
        </TouchableOpacity>
        </View>

        <View style={[styles.historyCard, { backgroundColor: colors.card }] }>
          <Text style={[styles.historyTitle, { color: colors.text }]}>{t("historyTitle")}</Text>
          {historyEntries.length === 0 ? (
            <Text style={[styles.historyEmpty, { color: colors.muted }]}>{t("historyEmpty")}</Text>
          ) : (
            <ScrollView
              style={[
                styles.historyList,
                {
                  borderColor: colors.border,
                  height: HISTORY_VIEWPORT_HEIGHT,
                },
              ]}
              contentContainerStyle={styles.historyListContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              scrollEventThrottle={16}
            >
              {historyEntries.map((entry, index) => (
                <View
                  key={entry.id}
                  style={[
                    styles.historyItem,
                    {
                      borderColor: colors.border,
                      borderBottomWidth:
                        index === historyEntries.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyItemTitle, { color: colors.text }]}>
                        {describeHistory(entry)}
                      </Text>
                      <Text style={[styles.historyItemMeta, { color: colors.muted }]}>
                        {formatHistoryMeta(entry)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.historyDeleteBtn, { borderColor: colors.border }]}
                      onPress={() => onHistoryDelete?.(entry)}
                    >
                      <Text style={[styles.historyDeleteText, { color: colors.muted }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.profileLinkButton,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          activeOpacity={0.85}
          onPress={handlePrivacyPolicyOpen}
        >
          <Text style={[styles.profileLinkText, { color: colors.text }]}>{t("privacyPolicyLink")}</Text>
          <Text style={[styles.profileLinkHint, { color: colors.muted }]}>{t("privacyPolicyHint")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.profileLinkButton,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
          activeOpacity={0.85}
          onPress={handleSupportPress}
        >
          <Text style={[styles.profileLinkText, { color: colors.text }]}>{t("supportLink")}</Text>
          <Text style={[styles.profileLinkHint, { color: colors.muted }]}>{t("supportHint")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
});

function AppContent() {
  const [fontsLoaded, fontsError] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });
  const [wishes, setWishes] = useState([]);
  const [wishesHydrated, setWishesHydrated] = useState(false);
  const [freeDayHydrated, setFreeDayHydrated] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("feed");
  const [catalogOverrides, setCatalogOverrides] = useState({});
  const [catalogHydrated, setCatalogHydrated] = useState(false);
  const [titleOverrides, setTitleOverrides] = useState({});
  const [titleOverridesHydrated, setTitleOverridesHydrated] = useState(false);
  const [emojiOverrides, setEmojiOverrides] = useState({});
  const [emojiOverridesHydrated, setEmojiOverridesHydrated] = useState(false);
  const [categoryOverrides, setCategoryOverrides] = useState({});
  const [categoryOverridesHydrated, setCategoryOverridesHydrated] = useState(false);
  const [descriptionOverrides, setDescriptionOverrides] = useState({});
  const [descriptionOverridesHydrated, setDescriptionOverridesHydrated] = useState(false);
  const [temptations, setTemptations] = useState(DEFAULT_TEMPTATIONS);
  const [quickTemptations, setQuickTemptations] = useState([]);
  const [hiddenTemptations, setHiddenTemptations] = useState([]);
  const [priceEditor, setPriceEditor] = useState({
    item: null,
    value: "",
    title: "",
    emoji: "",
    category: DEFAULT_IMPULSE_CATEGORY,
    description: "",
  });
  const [customReminderId, setCustomReminderId] = useState(null);
  const [customReminderHydrated, setCustomReminderHydrated] = useState(false);
  const [smartReminders, setSmartReminders] = useState([]);
  const [smartRemindersHydrated, setSmartRemindersHydrated] = useState(false);
  const [potentialPushProgress, setPotentialPushProgress] = useState({
    ...DEFAULT_POTENTIAL_PUSH_STATE,
  });
  const [potentialPushHydrated, setPotentialPushHydrated] = useState(false);
  const [dailyNudgeNotificationIds, setDailyNudgeNotificationIds] = useState({});
  const [dailyNudgesHydrated, setDailyNudgesHydrated] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState(() => createInitialDailyChallengeState());
  const [dailyChallengeHydrated, setDailyChallengeHydrated] = useState(false);
  const [savedTotalUSD, setSavedTotalUSD] = useState(0);
  const [savedTotalHydrated, setSavedTotalHydrated] = useState(false);
  const [lifetimeSavedUSD, setLifetimeSavedUSD] = useState(0);
  const [lifetimeSavedHydrated, setLifetimeSavedHydrated] = useState(false);
  const [declineCount, setDeclineCount] = useState(0);
  const [pendingList, setPendingList] = useState([]);
  const [freeDayStats, setFreeDayStats] = useState({ ...INITIAL_FREE_DAY_STATS });
  const [healthPoints, setHealthPoints] = useState(0);
  const [healthHydrated, setHealthHydrated] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState({});
  const [challengesState, setChallengesState] = useState(() => createInitialChallengesState());
  const [rewardsPane, setRewardsPane] = useState("challenges");
  const [decisionStats, setDecisionStats] = useState({ ...INITIAL_DECISION_STATS });
  const [historyEvents, setHistoryEvents] = useState([]);
  const resolvedHistoryEvents = Array.isArray(historyEvents) ? historyEvents : [];
  const declineStreak = useMemo(() => computeRefuseStreak(resolvedHistoryEvents), [resolvedHistoryEvents]);
  const [coinEntryVisible, setCoinEntryVisible] = useState(false);
  const coinEntryContextRef = useRef({ source: null, openedAt: 0, submitted: false });
  const [coinSliderMaxUSD, setCoinSliderMaxUSD] = useState(DEFAULT_COIN_SLIDER_MAX_USD);
  const [coinSliderHydrated, setCoinSliderHydrated] = useState(false);
  const [pendingGoalTargets, setPendingGoalTargets] = useState(null);
  const [savingsBreakdownVisible, setSavingsBreakdownVisible] = useState(false);
  const products = temptations;
  const [activeCategory, setActiveCategory] = useState("all");
  const [profile, setProfile] = useState(() => ({
    ...DEFAULT_PROFILE_PLACEHOLDER,
    joinedAt: new Date().toISOString(),
  }));
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [profileDraft, setProfileDraft] = useState(() => ({
    ...DEFAULT_PROFILE_PLACEHOLDER,
    joinedAt: new Date().toISOString(),
  }));
  const [northStarLogged, setNorthStarLogged] = useState(false);
  const [northStarHydrated, setNorthStarHydrated] = useState(false);
  const northStarLoggedRef = useRef(false);
  const potentialSavedUSD = useSavingsSimulation(
    profile?.spendingProfile?.baselineMonthlyWasteUSD || 0,
    profile?.spendingProfile?.baselineStartAt || null
  );
  const baselineMonthlyWasteUSD = Math.max(
    0,
    Number(profile?.spendingProfile?.baselineMonthlyWasteUSD) || 0
  );
  const baselineStartAt = profile?.spendingProfile?.baselineStartAt || null;
  const profileJoinedAt = profile?.joinedAt || null;
  const potentialBaselineKey =
    baselineMonthlyWasteUSD > 0 && baselineStartAt
      ? `${baselineStartAt}:${baselineMonthlyWasteUSD}`
      : null;
  const [language, setLanguage] = useState("ru");
  const [homeLayoutReady, setHomeLayoutReady] = useState(false);
  const primaryTemptationId = profile.customSpend ? profile.customSpend.id || "custom_habit" : null;
  const primaryTemptationDescription = useMemo(() => {
    const gender = profile?.gender || "none";
    const description = buildCustomTemptationDescription(gender);
    return description?.[language] || description?.en || "";
  }, [language, profile?.gender]);
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [activeGoalHydrated, setActiveGoalHydrated] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [theme, setTheme] = useState("light");
  const isAndroid = Platform.OS === "android";
  const androidVersion = isAndroid ? Number(Platform.Version) : null;
  const canToggleNavVisibility =
    isAndroid && typeof androidVersion === "number" && !Number.isNaN(androidVersion) && androidVersion < 35;
  const resolveTemplateCard = useCallback(
    (templateId) => {
      if (!templateId) return null;
      const findInList = (list) => (list || []).find((card) => card?.id === templateId);
      return findInList(quickTemptations) || findInList(temptations) || findTemplateById(templateId) || null;
    },
    [quickTemptations, temptations]
  );
  const resolveTemplateTitle = useCallback(
    (templateId, fallback = null) => {
      if (!templateId) return fallback;
      const source = resolveTemplateCard(templateId);
      if (!source) return fallback;
      const rawTitle =
        source.titleOverride ||
        (typeof source.title === "string"
          ? source.title
          : source.title?.[language] || source.title?.en || source.title?.ru || source.title) ||
        fallback;
      const decorated = `${source.emoji || ""} ${rawTitle || ""}`.trim();
      return decorated || fallback;
    },
    [language, resolveTemplateCard]
  );
  const [overlay, setOverlay] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const overlayTimer = useRef(null);

  useEffect(() => {
    if (!FacebookSettings || typeof FacebookSettings.initializeSDK !== "function") return;
    try {
      if (typeof FacebookSettings.setAppID === "function") {
        FacebookSettings.setAppID(FACEBOOK_APP_ID);
      }
      FacebookSettings.initializeSDK();
      if (typeof FacebookSettings.setAdvertiserTrackingEnabled === "function") {
        const trackingPromise = FacebookSettings.setAdvertiserTrackingEnabled(true);
        if (trackingPromise?.catch) {
          trackingPromise.catch(() => {});
        }
      }
    } catch (error) {
      console.warn("facebook sdk init", error);
    }
  }, []);
  const overlayQueueRef = useRef([]);
  const overlayActiveRef = useRef(false);
  const [dailySummaryVisible, setDailySummaryVisible] = useState(false);
  const [dailySummaryData, setDailySummaryData] = useState(null);
  const [dailySummarySeenKey, setDailySummarySeenKey] = useState(null);
  const [focusTemplateId, setFocusTemplateId] = useState(null);
  const [focusStateHydrated, setFocusStateHydrated] = useState(false);
  const [focusDigestSeenKey, setFocusDigestSeenKey] = useState(null);
  const [focusDigestHydrated, setFocusDigestHydrated] = useState(false);
  const [pendingFocusDigest, setPendingFocusDigest] = useState(null);
  const [focusDigestPromptShown, setFocusDigestPromptShown] = useState(false);
  const [focusSaveCount, setFocusSaveCount] = useState(0);
  const appStateRef = useRef(AppState.currentState || "active");
  const focusLossCountersRef = useRef({});
  const focusPromptActiveRef = useRef(false);
  const homeSessionRef = useRef({
    dateKey: getDayKey(Date.now()),
    sessionCount: 0,
    pendingIndex: null,
  });
  const dailyChallengePromptVisible =
    dailyChallenge.status === DAILY_CHALLENGE_STATUS.OFFER && !dailyChallenge.offerDismissed;
  const dailyNudgeIdsRef = useRef({});
  const smartRemindersRef = useRef([]);
  const handleDailySummaryContinue = useCallback(() => {
    setDailySummaryVisible(false);
    const todayKey = dailySummaryData?.todayKey || getDayKey(Date.now());
    if (!todayKey) return;
    setDailySummarySeenKey(todayKey);
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_SUMMARY, todayKey).catch(() => {});
  }, [dailySummaryData]);
  const [tutorialSeen, setTutorialSeen] = useState(true);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [ratingPromptState, setRatingPromptState] = useState(() => createInitialRatingPromptState());
  const [ratingPromptHydrated, setRatingPromptHydrated] = useState(false);
  const [ratingPromptVisible, setRatingPromptVisible] = useState(false);
  const ratingPromptCompleted = ratingPromptState.completed;
  const ratingPromptFirstOpenAt = ratingPromptState.firstOpenAt;
  const [levelShareModal, setLevelShareModal] = useState({ visible: false, level: 1 });
  const [levelShareSharing, setLevelShareSharing] = useState(false);
  const levelShareCardRef = useRef(null);
  const [tabHintsSeen, setTabHintsSeen] = useState(DEFAULT_TAB_HINTS_STATE);
  const [tabHintsHydrated, setTabHintsHydrated] = useState(false);
  const [tabHintVisible, setTabHintVisible] = useState(null);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const [fabTutorialState, setFabTutorialState] = useState(FAB_TUTORIAL_STATUS.DONE);
  const [fabTutorialVisible, setFabTutorialVisible] = useState(false);
  const fabTutorialStateRef = useRef(FAB_TUTORIAL_STATUS.DONE);
  const fabTutorialLoggedRef = useRef(false);
  const fabButtonWrapperRef = useRef(null);
  const [fabTutorialAnchor, setFabTutorialAnchor] = useState(null);
  const [fabTutorialEligible, setFabTutorialEligible] = useState(false);
  const finishTutorial = useCallback(() => {
    setTutorialVisible(false);
    setTutorialSeen(true);
    setTutorialStepIndex(0);
    AsyncStorage.setItem(STORAGE_KEYS.TUTORIAL, "done").catch(() => {});
  }, []);
  const handleTutorialNext = useCallback(() => {
    if (tutorialStepIndex < APP_TUTORIAL_STEPS.length - 1) {
      setTutorialStepIndex((prev) => Math.min(prev + 1, APP_TUTORIAL_STEPS.length - 1));
      return;
    }
    finishTutorial();
  }, [tutorialStepIndex, finishTutorial]);
  const handleTutorialSkip = useCallback(() => {
    finishTutorial();
  }, [finishTutorial]);
  const dismissTabHint = useCallback(() => {
    setTabHintVisible(null);
  }, []);
  const markTabHintSeen = useCallback(
    (tabId) => {
      if (!tabId) return;
      setTabHintsSeen((prev) => {
        if (prev[tabId]) return prev;
        const nextState = { ...prev, [tabId]: true };
        if (tabHintsHydrated) {
          AsyncStorage.setItem(STORAGE_KEYS.TAB_HINTS, JSON.stringify(nextState)).catch(() => {});
        }
        return nextState;
      });
    },
    [tabHintsHydrated]
  );
  const updateFabAnchor = useCallback(() => {
    const node = fabButtonWrapperRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;
    node.measureInWindow((x, y, width, height) => {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      setFabTutorialAnchor((prev) => {
        if (prev && Math.abs(prev.x - centerX) < 0.5 && Math.abs(prev.y - centerY) < 0.5) {
          return prev;
        }
        return { x: centerX, y: centerY };
      });
    });
  }, []);
  const handleFabWrapperLayout = useCallback(() => {
    updateFabAnchor();
  }, [updateFabAnchor]);
  const handleTabBarLayout = useCallback((event) => {
    const height = event?.nativeEvent?.layout?.height;
    if (!height || height <= 0) return;
    setTabBarHeight((prev) => (Math.abs(prev - height) < 1 ? prev : height));
  }, []);
  const handleHomeLayout = useCallback(() => {
    setHomeLayoutReady((ready) => (ready ? ready : true));
  }, []);
  const setFabTutorialStateAndPersist = useCallback((nextState) => {
    fabTutorialStateRef.current = nextState;
    setFabTutorialState(nextState);
    AsyncStorage.setItem(STORAGE_KEYS.FAB_TUTORIAL, nextState).catch(() => {});
  }, []);
  const handleFabTutorialDismiss = useCallback(
    (source = "dismiss") => {
      if (fabTutorialStateRef.current !== FAB_TUTORIAL_STATUS.SHOWING) {
        setFabTutorialVisible(false);
        return;
      }
      setFabTutorialVisible(false);
      setFabTutorialStateAndPersist(FAB_TUTORIAL_STATUS.DONE);
      logEvent("fab_tutorial_completed", { source });
    },
    [logEvent, setFabTutorialStateAndPersist]
  );
  const updateRatingPromptState = useCallback((updater) => {
    setRatingPromptState((prev) => {
      const nextState = typeof updater === "function" ? updater(prev) : updater;
      AsyncStorage.setItem(STORAGE_KEYS.RATING_PROMPT, JSON.stringify(nextState)).catch(() => {});
      return nextState;
    });
  }, []);
  const triggerStoreReview = useCallback(async () => {
    try {
      if (StoreReview && typeof StoreReview.isAvailableAsync === "function") {
        const available = await StoreReview.isAvailableAsync();
        if (available && typeof StoreReview.requestReview === "function") {
          StoreReview.requestReview();
          return;
        }
      }
    } catch (error) {
      console.warn("store review prompt", error);
    }
    if (Platform.OS !== "android") return;
    try {
      const canOpen = await Linking.canOpenURL(ANDROID_REVIEW_URL);
      if (canOpen) {
        await Linking.openURL(ANDROID_REVIEW_URL);
        return;
      }
    } catch (error) {
      console.warn("android review intent", error);
    }
    Linking.openURL(ANDROID_REVIEW_WEB_URL).catch(() => {});
  }, []);
  const handleRatingPromptLater = useCallback(() => {
    setRatingPromptVisible(false);
    const respondedAt = new Date().toISOString();
    updateRatingPromptState((prev) => ({
      ...prev,
      completed: true,
      lastAction: "later",
      respondedAt,
    }));
    logEvent("rating_prompt_action", { action: "later" });
  }, [logEvent, updateRatingPromptState]);
  const handleRatingPromptConfirm = useCallback(() => {
    setRatingPromptVisible(false);
    const respondedAt = new Date().toISOString();
    updateRatingPromptState((prev) => ({
      ...prev,
      completed: true,
      lastAction: "rate",
      respondedAt,
    }));
    logEvent("rating_prompt_action", { action: "rate" });
    triggerStoreReview();
  }, [logEvent, triggerStoreReview, updateRatingPromptState]);
  const openLevelShareModal = useCallback(
    (level = 1) => {
      setLevelShareModal({ visible: true, level });
      logEvent("level_share_opened", { level });
    },
    [logEvent]
  );
  const closeLevelShareModal = useCallback(() => {
    setLevelShareModal((prev) => ({ ...prev, visible: false }));
  }, []);
  const handleLevelSharePress = useCallback(
    (level) => {
      dismissOverlay();
      openLevelShareModal(level);
    },
    [dismissOverlay, openLevelShareModal]
  );
  const handleLevelShareConfirm = useCallback(async () => {
    if (!levelShareCardRef.current || levelShareSharing) return;
    let cleanupUri = null;
    try {
      setLevelShareSharing(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      let sharingAvailable = false;
      if (Sharing && typeof Sharing.isAvailableAsync === "function" && typeof Sharing.shareAsync === "function") {
        try {
          sharingAvailable = await Sharing.isAvailableAsync();
        } catch (availabilityError) {
          console.warn("sharing availability", availabilityError);
          sharingAvailable = false;
        }
      }
      const captureOptions = sharingAvailable
        ? { format: "png", quality: 0.96, result: "tmpfile" }
        : { format: "png", quality: 0.96, result: "base64" };
      const captureResult = await captureViewShotRef(levelShareCardRef, captureOptions);
      if (!captureResult) {
        throw new Error("capture_failed");
      }
      let normalizedUri = captureResult;
      if (captureOptions.result === "base64") {
        const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
        const targetUri = `${baseDir}almost-level-share-${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(targetUri, captureResult, {
          encoding: FileSystem.EncodingType.Base64,
        });
        normalizedUri = targetUri.startsWith("file://") ? targetUri : `file://${targetUri}`;
      } else if (!normalizedUri.startsWith("file://")) {
        normalizedUri = `file://${normalizedUri}`;
      }
      cleanupUri = normalizedUri;
      const shareTitle = `${t("levelShareModalTitle")} · ${t("levelShareFooterBrand")}`;
      const message = t("levelShareShareMessage", { level: levelShareModal.level });
      let sharedSuccessfully = false;
      if (sharingAvailable) {
        try {
          await Sharing.shareAsync(normalizedUri, {
            dialogTitle: shareTitle,
            mimeType: "image/png",
            UTI: "public.png",
          });
          sharedSuccessfully = true;
        } catch (sharingError) {
          console.warn("expo sharing failed", sharingError);
        }
      }
      if (!sharedSuccessfully) {
        if (Platform.OS === "ios" && ActionSheetIOS && typeof ActionSheetIOS.showShareActionSheetWithOptions === "function") {
          await new Promise((resolve, reject) => {
            ActionSheetIOS.showShareActionSheetWithOptions(
              {
                url: normalizedUri,
                subject: shareTitle,
              },
              (error) => {
                if (error) {
                  reject(error);
                } else {
                  resolve();
                }
              },
              () => resolve()
            );
          });
        } else {
          let fallbackUri = normalizedUri;
          if (Platform.OS === "android" && typeof FileSystem.getContentUriAsync === "function") {
            fallbackUri = await FileSystem.getContentUriAsync(normalizedUri);
          }
          await Share.share({
            url: fallbackUri,
            message,
            subject: Platform.OS === "ios" ? shareTitle : undefined,
          });
        }
      }
      logEvent("level_share_sent", { level: levelShareModal.level });
      closeLevelShareModal();
    } catch (error) {
      console.warn("level share", error);
      Alert.alert(t("levelShareModalTitle"), t("levelShareError") || "Не удалось поделиться. Попробуй позже.");
    } finally {
      if (cleanupUri) {
        setTimeout(() => {
          FileSystem.deleteAsync(cleanupUri, { idempotent: true }).catch(() => {});
        }, 3500);
      }
      setLevelShareSharing(false);
    }
  }, [closeLevelShareModal, levelShareModal.level, levelShareSharing, logEvent, t]);
  const clearCompletedPrimaryGoal = useCallback(
    (goalId) => {
      if (!goalId) return;
      setWishes((prev) =>
        prev.filter(
          (w) => !(w.kind === PRIMARY_GOAL_KIND && (w.goalId || w.id) === goalId && w.status === "done")
        )
      );
    },
    [setWishes]
  );
  const ensureActiveGoalForNewWish = useCallback(
    (newWish) => {
      if (!newWish) return;
      if (!(mainGoalWish?.status === "done" || profile.goalCelebrated)) return;
      const targetUSD =
        Number.isFinite(newWish.targetUSD) && newWish.targetUSD > 0
          ? newWish.targetUSD
          : getGoalDefaultTargetUSD(newWish.goalId || newWish.id);
      const previousGoalId = activeGoalId || profile.goal;
      clearCompletedPrimaryGoal(previousGoalId);
      setActiveGoalId(newWish.id);
      setProfile((prev) => ({
        ...prev,
        goal: newWish.id,
        goalTargetUSD: targetUSD,
        goalCelebrated: false,
        goalRenewalPending: false,
      }));
      setProfileDraft((prev) => ({
        ...prev,
        goal: newWish.id,
        goalTargetUSD: targetUSD,
        goalCelebrated: false,
        goalRenewalPending: false,
      }));
      dismissGoalRenewalPrompt();
    },
    [
      activeGoalId,
      clearCompletedPrimaryGoal,
      dismissGoalRenewalPrompt,
      mainGoalWish?.status,
      profile.goal,
      profile.goalCelebrated,
    ]
  );
  const ensureGoalManualTracking = useCallback((wishId) => {
    if (!wishId) return;
    setWishes((prev) => {
      let changed = false;
      const next = prev.map((wish) => {
        if (wish.id === wishId && wish.autoManaged !== false) {
          changed = true;
          return { ...wish, autoManaged: false };
        }
        return wish;
      });
      return changed ? next : prev;
    });
  }, []);
  const [mascotOverride, setMascotOverride] = useState(null);
  const mascotQueueRef = useRef([]);
  const mascotBusyRef = useRef(false);
  const [tamagotchiState, setTamagotchiState] = useState({ ...TAMAGOTCHI_START_STATE });
  const [tamagotchiVisible, setTamagotchiVisible] = useState(false);
  const [tamagotchiSkinId, setTamagotchiSkinId] = useState(DEFAULT_TAMAGOTCHI_SKIN);
  const [tamagotchiSkinHydrated, setTamagotchiSkinHydrated] = useState(false);
  const [tamagotchiSkinsUnlocked, setTamagotchiSkinsUnlocked] = useState(false);
  const [tamagotchiSkinsUnlockHydrated, setTamagotchiSkinsUnlockHydrated] = useState(false);
  const [skinPickerVisible, setSkinPickerVisible] = useState(false);
  const tamagotchiSkin =
    TAMAGOTCHI_SKINS[tamagotchiSkinId] || TAMAGOTCHI_SKINS[DEFAULT_TAMAGOTCHI_SKIN];
  const tamagotchiAnimations = tamagotchiSkin.animations;
  const tamagotchiAvatarSource = tamagotchiSkin.avatar;
  const tamagotchiSkinsLocked = !tamagotchiSkinsUnlocked;
  const tamagotchiHydratedRef = useRef(false);
  const tamagotchiHungerPrevRef = useRef(
    Math.min(TAMAGOTCHI_MAX_HUNGER, Math.max(0, TAMAGOTCHI_START_STATE.hunger))
  );
  const tamagotchiModalAnim = useRef(new Animated.Value(0)).current;
  const partyGlow = useRef(new Animated.Value(0)).current;
  const [partyActive, setPartyActive] = useState(false);
  const [partyBurstKey, setPartyBurstKey] = useState(0);
  const partyGlowAnimRef = useRef(null);
  const processTamagotchiDecay = useCallback(
    (timestamp = Date.now()) => {
      setTamagotchiState((prev) => {
        const { state: nextState } = computeTamagotchiDecay(prev, timestamp);
        return nextState;
      });
    },
    [setTamagotchiState]
  );
  const saveActionLogRef = useRef([]);
  const cartBadgeScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(4200),
        Animated.timing(cartBadgeScale, {
          toValue: 1.08,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cartBadgeScale, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [cartBadgeScale]);
  const openSkinPicker = useCallback(() => {
    triggerHaptic();
    setTamagotchiVisible(false);
    setSkinPickerVisible(true);
  }, []);
  const closeSkinPicker = useCallback(() => setSkinPickerVisible(false), []);
  const handleSkinSelect = useCallback(
    (skinId) => {
      if (!skinId || !TAMAGOTCHI_SKINS[skinId]) return;
      if (!tamagotchiSkinsUnlocked && skinId !== DEFAULT_TAMAGOTCHI_SKIN) {
        triggerHaptic();
        return;
      }
      setTamagotchiSkinId(skinId);
      setSkinPickerVisible(false);
      logEvent("tamagotchi_skin_selected", { skin_id: skinId });
    },
    [logEvent, tamagotchiSkinsUnlocked]
  );
  const handleUnlockSkinsPress = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const subject = language === "ru" ? "Отзыв для Almost" : "Feedback for Almost";
    const body =
      language === "ru"
        ? "Привет, Almost! Делюсь своими впечатлениями об приложении:\n\n"
        : "Hi Almost team! Sharing my thoughts about the app:\n\n";
    const mailLink = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      body
    )}`;
    Linking.openURL(mailLink).catch((error) => console.warn("tamagotchi skin unlock mail", error));
    setTamagotchiSkinsUnlocked(true);
    logEvent("tamagotchi_skin_unlock_feedback", { method: "support_mail" });
  }, [language, logEvent]);
  const [onboardingStep, setOnboardingStep] = useState("logo");
  const onboardingStepRef = useRef("logo");
  const onboardingHistoryRef = useRef([]);
  const [canGoBackOnboarding, setCanGoBackOnboarding] = useState(false);
  const [registrationData, setRegistrationData] = useState(INITIAL_REGISTRATION);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsContinuePending, setTermsContinuePending] = useState(false);
  const [showImageSourceSheet, setShowImageSourceSheet] = useState(false);
  const [showCustomSpend, setShowCustomSpend] = useState(false);
  const [quickSpendDraft, setQuickSpendDraft] = useState({
    title: "",
    amount: "",
    emoji: DEFAULT_TEMPTATION_EMOJI,
    category: DEFAULT_IMPULSE_CATEGORY,
  });
  useEffect(() => {
    onboardingStepRef.current = onboardingStep;
  }, [onboardingStep]);
  useEffect(() => {
    if (fontsLoaded) {
      ensureGlobalInterTypography();
    }
  }, [fontsLoaded]);
  useEffect(() => {
    if (fontsError) {
      console.warn("Inter font load error", fontsError);
    }
  }, [fontsError]);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEYS.TAB_HINTS)
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              const { __disabled: _legacyDisabled, ...rest } = parsed;
              setTabHintsSeen({ ...DEFAULT_TAB_HINTS_STATE, ...(rest || {}) });
            } else {
              setTabHintsSeen(DEFAULT_TAB_HINTS_STATE);
            }
          } catch (error) {
            console.warn("tab hints parse", error);
            setTabHintsSeen(DEFAULT_TAB_HINTS_STATE);
          }
        } else {
          setTabHintsSeen(DEFAULT_TAB_HINTS_STATE);
        }
      })
      .catch(() => {
        setTabHintsSeen(DEFAULT_TAB_HINTS_STATE);
      })
      .finally(() => {
        if (mounted) setTabHintsHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEYS.RATING_PROMPT)
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const fallback = createInitialRatingPromptState();
            const normalized = {
              firstOpenAt: typeof parsed?.firstOpenAt === "string" ? parsed.firstOpenAt : fallback.firstOpenAt,
              completed: Boolean(parsed?.completed),
              lastShownAt: typeof parsed?.lastShownAt === "string" ? parsed.lastShownAt : null,
              lastAction: typeof parsed?.lastAction === "string" ? parsed.lastAction : null,
              respondedAt: typeof parsed?.respondedAt === "string" ? parsed.respondedAt : null,
            };
            setRatingPromptState(normalized);
            const needsRewrite =
              normalized.firstOpenAt !== parsed?.firstOpenAt ||
              normalized.lastShownAt !== parsed?.lastShownAt ||
              normalized.lastAction !== parsed?.lastAction ||
              normalized.respondedAt !== parsed?.respondedAt ||
              normalized.completed !== Boolean(parsed?.completed);
            if (needsRewrite) {
              AsyncStorage.setItem(STORAGE_KEYS.RATING_PROMPT, JSON.stringify(normalized)).catch(() => {});
            }
            return;
          } catch (error) {
            console.warn("rating prompt hydrate", error);
          }
        }
        const initial = createInitialRatingPromptState();
        setRatingPromptState(initial);
        AsyncStorage.setItem(STORAGE_KEYS.RATING_PROMPT, JSON.stringify(initial)).catch(() => {});
      })
      .catch((error) => {
        console.warn("rating prompt hydrate", error);
      })
      .finally(() => {
        if (mounted) setRatingPromptHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!tabHintsHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.TAB_HINTS, JSON.stringify(tabHintsSeen)).catch(() => {});
  }, [tabHintsSeen, tabHintsHydrated]);
  useEffect(() => {
    if (!coinSliderHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.COIN_SLIDER_MAX, String(coinSliderMaxUSD)).catch(() => {});
  }, [coinSliderHydrated, coinSliderMaxUSD]);
  useEffect(() => {
    beginHomeSession();
  }, [beginHomeSession]);
  useEffect(() => {
    tryLogHomeOpened();
  }, [tryLogHomeOpened]);
  useEffect(() => {
    if (!fabTutorialVisible) return;
    const timer = setTimeout(updateFabAnchor, 100);
    return () => clearTimeout(timer);
  }, [fabTutorialVisible, updateFabAnchor]);
  useEffect(() => {
    if (
      fabTutorialState !== FAB_TUTORIAL_STATUS.SHOWING ||
      onboardingStep !== "done" ||
      tutorialVisible ||
      !homeLayoutReady ||
      startupLogoVisible
    ) {
      fabTutorialLoggedRef.current = false;
      if (fabTutorialVisible) {
        setFabTutorialVisible(false);
      }
      return;
    }
    const shouldShow = activeTab === "feed";
    if (fabTutorialVisible !== shouldShow) {
      setFabTutorialVisible(shouldShow);
    }
    if (shouldShow && !fabTutorialLoggedRef.current) {
      logEvent("fab_tutorial_shown");
      fabTutorialLoggedRef.current = true;
    }
  }, [
    activeTab,
    fabTutorialState,
    fabTutorialVisible,
    homeLayoutReady,
    logEvent,
    onboardingStep,
    startupLogoVisible,
    tutorialVisible,
  ]);
  useEffect(() => {
    const handleAppStateChange = (nextState) => {
      const previousState = appStateRef.current;
      const wasBackground =
        typeof previousState === "string" && /inactive|background/.test(previousState);
      appStateRef.current = nextState;
      if (nextState !== "active") {
        setFabTutorialVisible(false);
        return;
      }
      if (wasBackground && nextState === "active") {
        processTamagotchiDecay();
        beginHomeSession();
        tryLogHomeOpened();
        if (pendingFocusDigest) {
          setFocusDigestPromptShown(false);
        }
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [
    beginHomeSession,
    pendingFocusDigest,
    processTamagotchiDecay,
    tryLogHomeOpened,
    setFabTutorialVisible,
  ]);
  useEffect(() => {
    if (!ratingPromptHydrated) return;
    if (ratingPromptCompleted) return;
    if (ratingPromptVisible) return;
    if (onboardingStep !== "done") return;
    const firstOpenDate = new Date(ratingPromptFirstOpenAt || "");
    if (Number.isNaN(firstOpenDate.getTime())) return;
    const daysElapsed = Math.floor((Date.now() - firstOpenDate.getTime()) / DAY_MS);
    if (daysElapsed < RATING_PROMPT_DELAY_DAYS) return;
    setRatingPromptVisible(true);
    updateRatingPromptState((prev) => ({
      ...prev,
      lastShownAt: new Date().toISOString(),
    }));
  }, [
    onboardingStep,
    ratingPromptHydrated,
    ratingPromptCompleted,
    ratingPromptFirstOpenAt,
    ratingPromptVisible,
    updateRatingPromptState,
  ]);
  useEffect(() => {
    if (!ratingPromptVisible) return;
    logEvent("rating_prompt_shown");
  }, [logEvent, ratingPromptVisible]);
  useEffect(() => {
    if (!focusStateHydrated) return;
    if (!focusTemplateId) {
      AsyncStorage.removeItem(STORAGE_KEYS.FOCUS_TARGET).catch(() => {});
      return;
    }
    AsyncStorage.setItem(
      STORAGE_KEYS.FOCUS_TARGET,
      JSON.stringify({ templateId: focusTemplateId, saveCount: focusSaveCount, updatedAt: Date.now() })
    ).catch(() => {});
  }, [focusSaveCount, focusStateHydrated, focusTemplateId]);
  useEffect(() => {
    if (!focusDigestHydrated) return;
    if (!focusDigestSeenKey) {
      AsyncStorage.removeItem(STORAGE_KEYS.FOCUS_DIGEST).catch(() => {});
      return;
    }
    AsyncStorage.setItem(STORAGE_KEYS.FOCUS_DIGEST, focusDigestSeenKey).catch(() => {});
  }, [focusDigestSeenKey, focusDigestHydrated]);
  useEffect(() => {
    if (!focusDigestHydrated) return;
    if (!pendingFocusDigest) {
      AsyncStorage.removeItem(STORAGE_KEYS.FOCUS_DIGEST_PENDING).catch(() => {});
      return;
    }
    AsyncStorage.setItem(STORAGE_KEYS.FOCUS_DIGEST_PENDING, JSON.stringify(pendingFocusDigest)).catch(() => {});
  }, [pendingFocusDigest, focusDigestHydrated]);
  const openTamagotchiOverlay = useCallback(() => setTamagotchiVisible(true), []);
  const closeTamagotchiOverlay = useCallback(() => setTamagotchiVisible(false), []);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const fabMenuAnim = useRef(new Animated.Value(0)).current;
  const tamagotchiMood = useMemo(
    () => getTamagotchiMood(tamagotchiState.hunger, language),
    [tamagotchiState.hunger, language]
  );
  const beginHomeSession = useCallback(() => {
    const todayKey = getDayKey(Date.now());
    if (homeSessionRef.current.dateKey !== todayKey) {
      homeSessionRef.current.dateKey = todayKey;
      homeSessionRef.current.sessionCount = 0;
    }
    homeSessionRef.current.sessionCount += 1;
    const sessionCount = homeSessionRef.current.sessionCount;
    setFabTutorialEligible((prev) => {
      if (prev) return prev;
      return sessionCount >= FAB_TUTORIAL_MIN_SESSIONS;
    });
    homeSessionRef.current.pendingIndex = homeSessionRef.current.sessionCount;
    if (
      onboardingStepRef.current === "done" &&
      fabTutorialStateRef.current === FAB_TUTORIAL_STATUS.PENDING
    ) {
      setFabTutorialStateAndPersist(FAB_TUTORIAL_STATUS.SHOWING);
    }
  }, [setFabTutorialStateAndPersist]);
  const tryLogHomeOpened = useCallback(() => {
    if (activeTab !== "feed") return;
    const pendingIndex = homeSessionRef.current.pendingIndex;
    if (!pendingIndex) return;
    logEvent("home_opened", { session_index: pendingIndex });
    homeSessionRef.current.pendingIndex = null;
  }, [activeTab, logEvent]);
  const isFabTutorialEnvironmentReady = useMemo(
    () =>
      onboardingStep === "done" &&
      homeLayoutReady &&
      !tutorialVisible &&
      !startupLogoVisible,
    [homeLayoutReady, onboardingStep, startupLogoVisible, tutorialVisible]
  );
  useEffect(() => {
    if (
      fabTutorialState === FAB_TUTORIAL_STATUS.PENDING &&
      fabTutorialEligible &&
      isFabTutorialEnvironmentReady
    ) {
      setFabTutorialStateAndPersist(FAB_TUTORIAL_STATUS.SHOWING);
    }
  }, [
    fabTutorialEligible,
    fabTutorialState,
    isFabTutorialEnvironmentReady,
    setFabTutorialStateAndPersist,
  ]);
  const tamagotchiHungerPercent = useMemo(
    () => Math.min(TAMAGOTCHI_MAX_HUNGER, Math.max(0, tamagotchiState.hunger)),
    [tamagotchiState.hunger]
  );
  const tamagotchiIsFull = tamagotchiHungerPercent >= TAMAGOTCHI_MAX_HUNGER;
  const tamagotchiCoins = healthPoints;
  const tamagotchiDesiredFood =
    TAMAGOTCHI_FOOD_MAP[tamagotchiState.desiredFoodId] ||
    TAMAGOTCHI_FOOD_MAP[TAMAGOTCHI_DEFAULT_FOOD_ID];
  const [newPendingModal, setNewPendingModal] = useState({
    visible: false,
    title: "",
    amount: "",
    emoji: DEFAULT_TEMPTATION_EMOJI,
  });
  const [newGoalModal, setNewGoalModal] = useState({
    visible: false,
    name: "",
    target: "",
    emoji: DEFAULT_GOAL_EMOJI,
    makePrimary: false,
    source: "unknown",
  });
  const openNewPendingModal = useCallback(
    () =>
      setNewPendingModal({
        visible: true,
        title: "",
        amount: "",
        emoji: DEFAULT_TEMPTATION_EMOJI,
      }),
    []
  );
  const openNewGoalModal = useCallback(
    (makePrimary = false, source = "unknown") => {
      setNewGoalModal({
        visible: true,
        name: "",
        target: "",
        emoji: DEFAULT_GOAL_EMOJI,
        makePrimary,
        source,
      });
      logEvent("goal_creator_opened", {
        source,
        make_primary: makePrimary ? 1 : 0,
      });
    },
    [logEvent]
  );
  const handleNewPendingChange = useCallback((field, value) => {
    setNewPendingModal((prev) => ({
      ...prev,
      [field]: field === "emoji" ? limitEmojiInput(value) : value,
    }));
  }, []);
  const handleNewPendingCancel = useCallback(() => {
    setNewPendingModal({ visible: false, title: "", amount: "", emoji: DEFAULT_TEMPTATION_EMOJI });
  }, []);
  const [onboardingGoalModal, setOnboardingGoalModal] = useState({
    visible: false,
    name: "",
    target: "",
    emoji: DEFAULT_GOAL_EMOJI,
  });
  const openFabMenu = useCallback(() => {
    if (fabMenuVisible) return;
    setFabMenuVisible(true);
    Animated.spring(fabMenuAnim, {
      toValue: 1,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [fabMenuAnim, fabMenuVisible]);
  const closeFabMenu = useCallback(() => {
    Animated.timing(fabMenuAnim, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => setFabMenuVisible(false));
  }, [fabMenuAnim]);
  const handleFabPress = useCallback(() => {
    Keyboard.dismiss();
    handleFabTutorialDismiss("tap");
    triggerHaptic();
    if (fabMenuVisible) {
      closeFabMenu();
    }
    if (activeTab === "cart") {
      openNewGoalModal(false, "fab_cart");
    } else if (activeTab === "pending") {
      openNewPendingModal();
    } else {
      openCoinEntry(activeTab || "unknown");
    }
  }, [
    activeTab,
    closeFabMenu,
    fabMenuVisible,
    handleFabTutorialDismiss,
    openCoinEntry,
    openNewGoalModal,
    openNewPendingModal,
    triggerHaptic,
  ]);
  const handleFabLongPress = useCallback(() => {
    Keyboard.dismiss();
    handleFabTutorialDismiss("hold");
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    if (fabMenuVisible) {
      closeFabMenu();
    } else {
      openFabMenu();
    }
  }, [closeFabMenu, fabMenuVisible, handleFabTutorialDismiss, openFabMenu, triggerHaptic]);
  useEffect(() => {
    if (activeTab === "profile" && fabMenuVisible) {
      closeFabMenu();
    }
  }, [activeTab, closeFabMenu, fabMenuVisible]);
  const imagePickerResolver = useRef(null);
  const [refuseStats, setRefuseStats] = useState({});
  const [temptationInteractions, setTemptationInteractions] = useState({});
  const [temptationInteractionsHydrated, setTemptationInteractionsHydrated] = useState(false);
  const [impulseTracker, setImpulseTracker] = useState({ ...INITIAL_IMPULSE_TRACKER });
  const [moodState, setMoodState] = useState(() => createMoodStateForToday());
  const [cardFeedback, setCardFeedback] = useState({});
  const [moodHydrated, setMoodHydrated] = useState(false);
  const editOverlayAnim = useRef(new Animated.Value(0)).current;
  const [editOverlayVisible, setEditOverlayVisible] = useState(false);
  const cardFeedbackTimers = useRef({});
  const impulseAlertCooldownRef = useRef({});
  const lastInstantNotificationRef = useRef(0);
  const [spendPrompt, setSpendPrompt] = useState({ visible: false, item: null });
  const [stormActive, setStormActive] = useState(false);
  const safeAreaInsets = useSafeAreaInsets();
  const iosTabInset = Platform.OS === "ios" ? Math.max((safeAreaInsets.bottom || 0) - 8, 0) : 0;
  const tabBarBottomInset = iosTabInset;
  const resolvedTabBarHeight = tabBarHeight || tabBarBottomInset + TAB_BAR_BASE_HEIGHT;
  const tutorialOverlayInset = resolvedTabBarHeight;
  const tutorialCardOffset = resolvedTabBarHeight + (Platform.OS === "ios" ? 64 : 72);
  const topSafeInset = Platform.OS === "android" ? RNStatusBar.currentHeight || 24 : 0;
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const handleKeyboardShow = (event = {}) => {
      const keyboardHeight = event.endCoordinates?.height || 0;
      const safeGap = Math.max(0, keyboardHeight - tabBarBottomInset);
      const buffer = Platform.OS === "ios" ? 12 : 0;
      setKeyboardInset(safeGap ? safeGap + buffer : buffer);
      setKeyboardVisible(true);
    };
    const handleKeyboardHide = () => {
      setKeyboardInset(0);
      setKeyboardVisible(false);
    };
    const showSub = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, handleKeyboardHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [tabBarBottomInset]);
  const screenKeyboardAdjustmentStyle = useMemo(() => {
    if (Platform.OS === "ios") return null;
    return keyboardInset ? { paddingBottom: keyboardInset } : null;
  }, [keyboardInset]);

  const keyboardModalOffset = useMemo(() => {
    if (!keyboardInset) return 0;
    const effectiveInset =
      Platform.OS === "ios" ? keyboardInset * 0.6 : keyboardInset;
    return Math.min(effectiveInset, MAX_MODAL_KEYBOARD_OFFSET);
  }, [keyboardInset]);

  const modalKeyboardPaddingStyle = useMemo(
    () => (keyboardModalOffset ? { paddingBottom: keyboardModalOffset } : null),
    [keyboardModalOffset]
  );

  const fabTutorialCutout = useMemo(() => {
    const radius = FAB_TUTORIAL_HALO_SIZE / 2;
    const fallbackCenterX = SCREEN_WIDTH / 2;
    const fallbackCenterY =
      SCREEN_HEIGHT - (tabBarBottomInset + FAB_CONTAINER_BOTTOM + FAB_BUTTON_SIZE / 2);
    const centerX = fabTutorialAnchor?.x ?? fallbackCenterX;
    const centerY = fabTutorialAnchor?.y ?? fallbackCenterY;
    const top = Math.max(0, centerY - radius);
    const bottom = Math.min(SCREEN_HEIGHT, centerY + radius);
    const left = Math.max(0, centerX - radius);
    const right = Math.min(SCREEN_WIDTH, centerX + radius);
    return {
      top,
      bottom,
      left,
      right,
      height: Math.max(0, bottom - top),
      width: Math.max(0, right - left),
      centerX,
      centerY,
    };
  }, [fabTutorialAnchor, tabBarBottomInset]);
  const [analyticsOptOut, setAnalyticsOptOutState] = useState(null);
  const [startupLogoVisible, setStartupLogoVisible] = useState(false);
  const startupLogoDismissedRef = useRef(false);

  const goToOnboardingStep = useCallback(
    (nextStep, { recordHistory = true, resetHistory = false } = {}) => {
      if (resetHistory) {
        onboardingHistoryRef.current = [];
        setCanGoBackOnboarding(false);
      }
      setOnboardingStep((prev) => {
        if (recordHistory && prev && prev !== nextStep) {
          const nextHistory = [...onboardingHistoryRef.current, prev];
          onboardingHistoryRef.current = nextHistory;
          setCanGoBackOnboarding(nextHistory.length > 0);
        }
        return nextStep;
      });
    },
    []
  );

  const handleOnboardingBack = useCallback(() => {
    if (!onboardingHistoryRef.current.length) return;
    const history = [...onboardingHistoryRef.current];
    const prevStep = history.pop();
    onboardingHistoryRef.current = history;
    setCanGoBackOnboarding(history.length > 0);
    setOnboardingStep(prevStep);
  }, []);
  const stormTimerRef = useRef(null);
  const [rewardCelebratedMap, setRewardCelebratedMap] = useState({});
  const [rewardCelebratedHydrated, setRewardCelebratedHydrated] = useState(false);
  const [rewardsReady, setRewardsReady] = useState(false);
  const challengesPrevRef = useRef(challengesState);
  const [temptationGoalMap, setTemptationGoalMap] = useState({});
  const [goalLinkPrompt, setGoalLinkPrompt] = useState({ visible: false, item: null, intent: null });
  const [goalTemptationPrompt, setGoalTemptationPrompt] = useState({ visible: false, wish: null });
  const [goalEditorPrompt, setGoalEditorPrompt] = useState({
    visible: false,
    wish: null,
    name: "",
    target: "",
    emoji: DEFAULT_GOAL_EMOJI,
  });
  const [goalRenewalPromptVisible, setGoalRenewalPromptVisible] = useState(false);
  const goalRenewalPromptPendingRef = useRef(false);
  const dismissGoalRenewalPrompt = useCallback(() => {
    goalRenewalPromptPendingRef.current = false;
    setGoalRenewalPromptVisible(false);
  }, []);
  const requestGoalRenewalPrompt = useCallback(() => {
    if (goalRenewalPromptVisible) return;
    if (overlay) {
      goalRenewalPromptPendingRef.current = true;
      return;
    }
    goalRenewalPromptPendingRef.current = false;
    setGoalRenewalPromptVisible(true);
  }, [goalRenewalPromptVisible, overlay]);
  const [moodDetailsVisible, setMoodDetailsVisible] = useState(false);
  const [potentialDetailsVisible, setPotentialDetailsVisible] = useState(false);
  const [potentialDetailsText, setPotentialDetailsText] = useState("");
  const openMoodDetails = useCallback(() => setMoodDetailsVisible(true), []);
  const closeMoodDetails = useCallback(() => setMoodDetailsVisible(false), []);
  const openPotentialDetails = useCallback((description) => {
    setPotentialDetailsText(description);
    setPotentialDetailsVisible(true);
  }, []);
  const closePotentialDetails = useCallback(() => setPotentialDetailsVisible(false), []);
  const openSavingsBreakdown = useCallback(() => setSavingsBreakdownVisible(true), []);
  const closeSavingsBreakdown = useCallback(() => setSavingsBreakdownVisible(false), []);
  const openGoalLinkPrompt = useCallback((item, intent = "edit") => {
    if (!item) return;
    setGoalLinkPrompt({ visible: true, item, intent });
  }, []);
  const [moodGradient, setMoodGradient] = useState(() =>
    applyThemeToMoodGradient(getMoodGradient(), theme)
  );
  const mainGoalWish = useMemo(
    () => selectMainGoalWish(wishes, activeGoalId || profile.goal),
    [wishes, activeGoalId, profile.goal]
  );
  useEffect(() => {
    if (mainGoalWish?.id) {
      ensureGoalManualTracking(mainGoalWish.id);
    }
  }, [mainGoalWish?.id, ensureGoalManualTracking]);
  const savingsBreakdown = useMemo(
    () =>
      buildSavingsBreakdown(
        resolvedHistoryEvents,
        profile.currency || DEFAULT_PROFILE.currency,
        resolveTemplateTitle,
        language
      ),
    [resolvedHistoryEvents, profile.currency, resolveTemplateTitle, language]
  );
  const fallbackGoalTargetUSD = useMemo(() => {
    if (Number.isFinite(profile?.goalTargetUSD) && profile.goalTargetUSD > 0) {
      return profile.goalTargetUSD;
    }
    return getGoalDefaultTargetUSD(profile?.goal || DEFAULT_PROFILE.goal);
  }, [profile?.goalTargetUSD, profile?.goal]);
  const heroGoalTargetUSD = mainGoalWish?.targetUSD || fallbackGoalTargetUSD;
  const heroGoalSavedUSD = mainGoalWish?.savedUSD ?? 0;
  const activeGender = profile.gender || registrationData.gender || DEFAULT_PROFILE.gender || "none";
  const analyticsOptOutValue = analyticsOptOut ?? false;
  const activeTutorialStep =
    APP_TUTORIAL_STEPS[tutorialStepIndex] ||
    APP_TUTORIAL_STEPS[APP_TUTORIAL_STEPS.length - 1] ||
    null;
  const tutorialHighlightTabs = useMemo(() => {
    if (!tutorialVisible || !activeTutorialStep?.tabs?.length) return null;
    return new Set(activeTutorialStep.tabs);
  }, [tutorialVisible, activeTutorialStep]);
  const fabOverlayColor = theme === "dark" ? "rgba(5,7,13,0.78)" : "rgba(5,7,13,0.55)";
  const resolveTranslationValue = useCallback((key) => {
    let raw = TRANSLATIONS[language][key];
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const genderValue = raw[activeGender];
      if (typeof genderValue === "string") {
        raw = genderValue;
      } else if (typeof raw.none === "string") {
        raw = raw.none;
      } else {
        const fallbackValue = Object.values(raw).find((value) => typeof value === "string");
        raw = fallbackValue !== undefined ? fallbackValue : undefined;
      }
    }
    return raw;
  }, [activeGender, language]);

  const formatTranslationText = useCallback((value, replacements = {}) => {
    let text = value;
    if (text === undefined || text === null) {
      text = "";
    }
    text = String(text);
    Object.entries(replacements).forEach(([token, tokenValue]) => {
      text = text.replace(`{{${token}}}`, tokenValue);
    });
    return text;
  }, []);

  const t = useCallback(
    (key, replacements = {}) => {
      const resolved = resolveTranslationValue(key);
      const base = Array.isArray(resolved) ? resolved[0] : resolved;
      const fallback = base === undefined || base === null ? key : base;
      return formatTranslationText(fallback, replacements);
    },
    [formatTranslationText, resolveTranslationValue]
  );

  const tVariant = useCallback(
    (key, replacements = {}) => {
      const resolved = resolveTranslationValue(key);
      const pool = Array.isArray(resolved)
        ? resolved.filter((value) => typeof value === "string" && value.trim().length > 0)
        : typeof resolved === "string"
        ? [resolved]
        : [];
      const pickSource = pool.length ? pool : [resolved ?? key];
      const choice = pickSource[Math.floor(Math.random() * pickSource.length)] ?? key;
      const fallback = choice === undefined || choice === null ? key : choice;
      return formatTranslationText(fallback, replacements);
    },
    [formatTranslationText, resolveTranslationValue]
  );
  const dailyChallengeDisplayTitle = useMemo(
    () =>
      dailyChallenge.templateLabel ||
      dailyChallenge.templateTitle ||
      t("defaultDealTitle"),
    [dailyChallenge.templateLabel, dailyChallenge.templateTitle, t]
  );
  const currentMood = useMemo(
    () => deriveMoodFromState(moodState, pendingList.length),
    [moodState.events, moodState.lastInteractionAt, moodState.lastVisitAt, pendingList.length]
  );
  const moodPreset = useMemo(() => getMoodPreset(currentMood, language), [currentMood, language]);
  useEffect(() => {
    setMoodGradient(applyThemeToMoodGradient(getMoodGradient(moodPreset?.id), theme));
  }, [moodPreset?.id, theme]);
  const moodGoalInfo = useMemo(() => {
    const aggregatedTargetUSD = heroGoalTargetUSD || 0;
    const savedUSD = heroGoalSavedUSD || 0;
    const isComplete = aggregatedTargetUSD > 0 && savedUSD >= aggregatedTargetUSD;
    return { aggregatedTargetUSD, savedUSD, isComplete };
  }, [heroGoalTargetUSD, heroGoalSavedUSD]);
  const moodDescription = useMemo(() => {
    if (!moodPreset) return "";
    const baseLine = moodGoalInfo.isComplete
      ? moodPreset.heroComplete || t("goalWidgetCompleteTagline")
      : moodPreset.hero || t("heroEconomyContinues");
    return moodPreset.motivation ? `${baseLine} ${moodPreset.motivation}` : baseLine;
  }, [moodGoalInfo.isComplete, moodPreset, t]);
  const moodSessionRecordedRef = useRef(false);
  useEffect(() => {
    if (moodSessionRecordedRef.current) return;
    moodSessionRecordedRef.current = true;
    const now = Date.now();
    setMoodState((prev) =>
      evaluateMoodState(
        {
          ...prev,
          lastVisitAt: now,
        },
        { now, pendingCount: pendingList.length }
      )
    );
  }, [pendingList.length]);
  useEffect(() => {
    if (!moodHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.MOOD_STATE, JSON.stringify(moodState)).catch(() => {});
  }, [moodState, moodHydrated]);

  useEffect(() => {
    const now = Date.now();
    const mappedEvents = mapHistoryEventsToMoodEvents(resolvedHistoryEvents, now);
    const latestTimestamp = mappedEvents[0]?.timestamp || null;
    setMoodState((prev) =>
      evaluateMoodState(
        {
          ...prev,
          events: mappedEvents,
          lastInteractionAt: latestTimestamp || prev.lastInteractionAt,
        },
        { now, pendingCount: pendingList.length }
      )
    );
  }, [resolvedHistoryEvents, pendingList.length]);

  useEffect(() => {
    setMoodState((prev) =>
      evaluateMoodState(
        { ...prev, pendingSnapshot: pendingList.length },
        { pendingCount: pendingList.length }
      )
    );
  }, [pendingList.length]);

  const refreshMoodForToday = useCallback(() => {
    const todayKey = getDayKey(Date.now());
    setMoodState((prev) => {
      if (prev.dayKey === todayKey) return prev;
      const refreshed = evaluateMoodState(
        createMoodStateForToday({
          pendingSnapshot: pendingList.length,
          lastVisitAt: Date.now(),
          dayKey: todayKey,
        }),
        { pendingCount: pendingList.length }
      );
      return refreshed;
    });
  }, [pendingList.length]);

  useEffect(() => {
    let timer = null;
    const scheduleNextUpdate = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const delay = Math.max(nextMidnight.getTime() - now.getTime() + 1000, 60 * 1000);
      timer = setTimeout(() => {
        refreshMoodForToday();
        scheduleNextUpdate();
      }, delay);
    };
    refreshMoodForToday();
    scheduleNextUpdate();
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [refreshMoodForToday]);
  const ensureNotificationPermission = useCallback(async () => {
    try {
      let settings = await Notifications.getPermissionsAsync();
      let granted =
        settings.granted ||
        settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!granted) {
        settings = await Notifications.requestPermissionsAsync();
        granted =
          settings.granted ||
          settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      }
      return granted;
    } catch (error) {
      console.warn("notifications", error);
      return false;
    }
  }, []);

  useEffect(() => {
    ensureNotificationPermission();
  }, [ensureNotificationPermission]);

  const sendImmediateNotification = useCallback(
    async (content) => {
      if (!content) return false;
      const now = Date.now();
      if (now - lastInstantNotificationRef.current < PUSH_NOTIFICATION_COOLDOWN_MS) {
        return false;
      }
      const allowed = await ensureNotificationPermission();
      if (!allowed) return false;
      try {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: null,
        });
        lastInstantNotificationRef.current = now;
        return true;
      } catch (error) {
        console.warn("immediate notification", error);
        return false;
      }
    },
    [ensureNotificationPermission]
  );

  useEffect(() => {
    if (Platform.OS !== "android") return;
    Notifications.setNotificationChannelAsync(ANDROID_DAILY_NUDGE_CHANNEL_ID, {
      name: "Daily nudges",
      importance: Notifications.AndroidImportance.HIGH,
      sound: true,
      vibrationPattern: [250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    dailyNudgeIdsRef.current = dailyNudgeNotificationIds || {};
  }, [dailyNudgeNotificationIds]);

  useEffect(() => {
    smartRemindersRef.current = smartReminders || [];
  }, [smartReminders]);

  useEffect(() => {
    if (!potentialPushHydrated) return;
    const currencyForStep = profile?.currency || DEFAULT_PROFILE.currency;
    const stepUSD = resolvePotentialPushStepUSD(currencyForStep);
    if (!Number.isFinite(stepUSD) || stepUSD <= 0) return;
    if (!potentialBaselineKey) {
      if (
        potentialPushProgress.baselineKey ||
        potentialPushProgress.lastStep ||
        potentialPushProgress.lastStatus ||
        potentialPushProgress.stepMultiplier !== 1 ||
        potentialPushProgress.lastNotifiedAt
      ) {
        setPotentialPushProgress({ ...DEFAULT_POTENTIAL_PUSH_STATE });
      }
      return;
    }
    const resolvedPotential = Number.isFinite(potentialSavedUSD) ? potentialSavedUSD : 0;
    const currentStep = Math.max(0, Math.floor(resolvedPotential / stepUSD));
    const lastStep = Math.max(0, Number(potentialPushProgress.lastStep) || 0);
    const now = Date.now();
    const lastNotifiedAt = Number(potentialPushProgress.lastNotifiedAt) || 0;
    const rawMultiplier = Math.max(1, Number(potentialPushProgress.stepMultiplier) || 1);
    const cooledDown =
      rawMultiplier > 1 &&
      lastNotifiedAt > 0 &&
      now - lastNotifiedAt > POTENTIAL_PUSH_COOLDOWN_WINDOW_MS;
    const stepMultiplier = cooledDown
      ? 1
      : Math.min(rawMultiplier, POTENTIAL_PUSH_MAX_MULTIPLIER);
    if (cooledDown) {
      setPotentialPushProgress((prev) => {
        if (prev.baselineKey !== potentialBaselineKey || prev.stepMultiplier <= 1) return prev;
        return { ...prev, stepMultiplier: 1 };
      });
    }
    if (potentialPushProgress.baselineKey !== potentialBaselineKey) {
      setPotentialPushProgress({
        ...DEFAULT_POTENTIAL_PUSH_STATE,
        lastStep: currentStep,
        baselineKey: potentialBaselineKey,
      });
      return;
    }
    if (currentStep < lastStep) {
      setPotentialPushProgress((prev) => ({
        ...prev,
        lastStep: currentStep,
      }));
      return;
    }
    if (!profileHydrated || !savedTotalHydrated) return;
    if (currentStep <= 0 || currentStep <= lastStep) return;
    const stepGap = currentStep - lastStep;
    const requiredGap = stepMultiplier;
    if (stepGap < requiredGap) return;
    const fastGain =
      lastNotifiedAt > 0 && now - lastNotifiedAt < POTENTIAL_PUSH_FAST_GAIN_WINDOW_MS;
    if (fastGain && stepMultiplier < POTENTIAL_PUSH_MAX_MULTIPLIER) {
      setPotentialPushProgress((prev) => {
        if (prev.baselineKey !== potentialBaselineKey) return prev;
        if (prev.stepMultiplier >= POTENTIAL_PUSH_MAX_MULTIPLIER) return prev;
        return { ...prev, stepMultiplier: POTENTIAL_PUSH_MAX_MULTIPLIER };
      });
      return;
    }
    let cancelled = false;
    const notify = async () => {
      const ahead = savedTotalUSD >= resolvedPotential && savedTotalUSD > 0;
      const status = ahead ? "ahead" : "behind";
      const formatLocal = (valueUSD = 0) =>
        formatCurrency(convertToCurrency(Math.max(valueUSD, 0), currencyForStep), currencyForStep);
      const replacements = {
        potential: formatLocal(resolvedPotential),
        actual: formatLocal(savedTotalUSD),
        shortfall: formatLocal(Math.max(resolvedPotential - savedTotalUSD, 0)),
      };
      await sendImmediateNotification({
        title: t(
          status === "ahead" ? "potentialPushAheadTitle" : "potentialPushBehindTitle",
          replacements
        ),
        body: t(
          status === "ahead" ? "potentialPushAheadBody" : "potentialPushBehindBody",
          replacements
        ),
      });
      if (cancelled) return;
      setPotentialPushProgress({
        lastStep: currentStep,
        lastStatus: status,
        baselineKey: potentialBaselineKey,
        stepMultiplier,
        lastNotifiedAt: now,
      });
    };
    notify().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    potentialBaselineKey,
    potentialPushHydrated,
    potentialPushProgress.baselineKey,
    potentialPushProgress.lastNotifiedAt,
    potentialPushProgress.lastStatus,
    potentialPushProgress.lastStep,
    potentialPushProgress.stepMultiplier,
    potentialSavedUSD,
    profile?.currency,
    profileHydrated,
    savedTotalHydrated,
    savedTotalUSD,
    sendImmediateNotification,
    t,
  ]);

  useEffect(() => {
    if (!profileHydrated || !customReminderHydrated) return;
    schedulePersonalTemptationReminder(profile.customSpend);
  }, [customReminderHydrated, profile.customSpend, profileHydrated, schedulePersonalTemptationReminder]);

  useEffect(() => {
    const tick = () => {
      setChallengesState((prev) => expireChallenges(prev));
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const staleEntries = Object.values(challengesState).filter(
      (entry) => entry?.reminderNotificationIds?.length && entry.status !== CHALLENGE_STATUS.ACTIVE
    );
    if (!staleEntries.length) return;
    staleEntries.forEach((entry) => {
      entry.reminderNotificationIds.forEach((id) => {
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      });
    });
    setChallengesState((prev) => {
      let changed = false;
      const next = { ...prev };
      staleEntries.forEach((entry) => {
        if (next[entry.id]?.reminderNotificationIds?.length) {
          next[entry.id] = { ...next[entry.id], reminderNotificationIds: [] };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [challengesState]);

  useEffect(() => {
    const prev = challengesPrevRef.current || {};
    const completedIds = [];
    const expiredIds = [];
    Object.keys(challengesState).forEach((id) => {
      const previousStatus = prev[id]?.status;
      const nextStatus = challengesState[id]?.status;
      if (nextStatus === CHALLENGE_STATUS.COMPLETED && previousStatus !== CHALLENGE_STATUS.COMPLETED) {
        completedIds.push(id);
      } else if (
        nextStatus === CHALLENGE_STATUS.EXPIRED &&
        previousStatus === CHALLENGE_STATUS.ACTIVE
      ) {
        expiredIds.push(id);
      }
    });
    completedIds.forEach((challengeId) => {
      const def = CHALLENGE_DEF_MAP[challengeId];
      if (!def) return;
      const copy = getChallengeCopy(def, language);
      const title = copy.title || challengeId;
      triggerOverlayState("reward", t("challengeCompletedOverlay", { title }));
      logEvent("challenge_completed", { challenge_id: challengeId, success: true });
    });
    expiredIds.forEach((challengeId) => {
      logEvent("challenge_completed", { challenge_id: challengeId, success: false });
    });
    challengesPrevRef.current = challengesState;
  }, [challengesState, language, logEvent, t, triggerOverlayState]);

  useEffect(() => {
    impulseAlertCooldownRef.current = impulseTracker.lastAlerts || {};
  }, [impulseTracker.lastAlerts]);


  useEffect(() => {
    return () => {
      if (stormTimerRef.current) {
        clearTimeout(stormTimerRef.current);
      }
    };
  }, []);

  const schedulePendingReminder = useCallback(
    async (title, dueDate) => {
      try {
        const allowed = await ensureNotificationPermission();
        if (!allowed) return null;
        const trigger = new Date(dueDate);
        const pendingTitle =
          moodPreset?.pushPendingTitle && moodPreset.pushPendingTitle.trim()
            ? renderTemplateString(moodPreset.pushPendingTitle, { title })
            : t("pendingNotificationTitle");
        const pendingBody =
          moodPreset?.pushPendingBody && moodPreset.pushPendingBody.trim()
            ? renderTemplateString(moodPreset.pushPendingBody, { title })
            : t("pendingNotificationBody", { title });
        return await Notifications.scheduleNotificationAsync({
          content: {
            title: pendingTitle,
            body: pendingBody,
          },
          trigger,
        });
      } catch (error) {
        console.warn("pending reminder", error);
        return null;
      }
    },
    [ensureNotificationPermission, t, moodPreset]
  );

  const scheduleChallengeReminders = useCallback(
    async (challengeId, def, startAt, expiresAt) => {
      if (!def?.reminderOffsetsHours?.length) return [];
      const permitted = await ensureNotificationPermission();
      if (!permitted) return [];
      const copy = getChallengeCopy(def, language);
      const title = t("challengeReminderTitle", { title: copy.title || challengeId });
      const body = t("challengeReminderBody", { title: copy.title || challengeId });
      const scheduled = [];
      for (const offsetHours of def.reminderOffsetsHours) {
        const triggerTime = startAt + offsetHours * 60 * 60 * 1000;
        if (!Number.isFinite(triggerTime) || triggerTime <= Date.now()) continue;
        if (expiresAt && triggerTime >= expiresAt) continue;
        try {
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: { title, body },
            trigger: new Date(triggerTime),
          });
          scheduled.push(notificationId);
        } catch (error) {
          console.warn("challenge reminder", error);
        }
      }
      return scheduled;
    },
    [ensureNotificationPermission, language, t]
  );

  const categories = useMemo(() => {
    const set = new Set(["all"]);
    products.forEach((product) => product.categories?.forEach((c) => set.add(c)));
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((product) => product.categories?.includes(activeCategory));
  }, [products, activeCategory]);
  const customGoalMap = useMemo(() => {
    const entries = registrationData.customGoals || [];
    return entries.reduce((acc, goal) => {
      acc[goal.id] = goal;
      return acc;
    }, {});
  }, [registrationData.customGoals]);

  const colors = THEMES[theme];
  const isDarkTheme = theme === "dark";
  const overlayDimColor = isDarkTheme ? "rgba(0,0,0,0.65)" : "rgba(5,6,15,0.2)";
  const overlaySystemColor = useMemo(
    () => blendHexColors(colors.background, isDarkTheme ? "#000000" : "#05060F", isDarkTheme ? 0.5 : 0.15),
    [colors.background, isDarkTheme]
  );
  const overlayCardBackground = isDarkTheme ? lightenColor(colors.card, 0.18) : colors.card;
  const overlayBorderColor = isDarkTheme ? lightenColor(colors.border, 0.25) : colors.border;
  const impulseAlertPayload = useMemo(() => {
    if (overlay?.type !== "impulse_alert") return null;
    if (overlay?.message && typeof overlay.message === "object") {
      return overlay.message;
    }
    if (!overlay?.message) return null;
    return { body: overlay.message };
  }, [overlay]);
  const systemOverlayActive = Boolean(overlay || fabMenuVisible);

  useEffect(() => {
    if (!isAndroid) return;
    const targetNavColor = systemOverlayActive ? overlaySystemColor : colors.card;
    const targetButtonStyle = systemOverlayActive ? "light" : isDarkTheme ? "light" : "dark";
    const targetStatusColor = systemOverlayActive ? overlaySystemColor : colors.background;
    const targetNavVisibility = systemOverlayActive ? "hidden" : "visible";
    const applyNav = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(targetNavColor);
        await NavigationBar.setButtonStyleAsync(targetButtonStyle);
        if (canToggleNavVisibility) {
          await NavigationBar.setVisibilityAsync(targetNavVisibility);
        }
      } catch (err) {
        console.warn("navigation bar color", err);
      }
    };
    applyNav();
    RNStatusBar.setBackgroundColor(targetStatusColor, true);
  }, [canToggleNavVisibility, colors.card, colors.background, isAndroid, isDarkTheme, overlayDimColor, overlaySystemColor, systemOverlayActive]);
  const saveOverlayPayload =
    overlay?.type === "save"
      ? typeof overlay.message === "object" && overlay.message !== null
        ? overlay.message
        : { title: overlay.message }
      : null;
  const saveGlowAnim = useRef(new Animated.Value(0)).current;
  const assignableGoals = useMemo(
    () => (wishes || []).filter((wish) => wish.status !== "done"),
    [wishes]
  );
  const hasPendingGoals = assignableGoals.length > 0;
  const resolveTemptationGoalId = useCallback(
    (templateId) => {
      if (!templateId) return null;
      const assigned = temptationGoalMap[templateId];
      if (!assigned) return null;
      const assignedWish = wishes.find((wish) => wish.id === assigned);
      if (assignedWish && assignedWish.status !== "done") {
        return assignedWish.id;
      }
      return null;
    },
    [temptationGoalMap, wishes]
  );
  const getFallbackGoalId = useCallback(() => {
    if (assignableGoals.length > 0) return assignableGoals[0].id;
    return wishes[0]?.id || null;
  }, [assignableGoals, wishes]);
  useEffect(() => {
    const activeGoalIds = new Set(
      (wishes || [])
        .filter((wish) => wish.status !== "done")
        .map((wish) => wish.id)
    );
    let changed = false;
    const nextMap = {};
    Object.entries(temptationGoalMap || {}).forEach(([templateId, goalId]) => {
      if (goalId && activeGoalIds.has(goalId)) {
        nextMap[templateId] = goalId;
      } else {
        changed = true;
      }
    });
    if (changed) {
      setTemptationGoalMap(nextMap);
    }
  }, [temptationGoalMap, wishes]);
  const syncPrimaryGoalProgress = useCallback(
    (goalId, savedUSD, status = "active") => {
      if (!goalId) return;
      const normalizedSaved = Number.isFinite(savedUSD) ? Math.max(savedUSD, 0) : 0;
      const updateEntry = (profileState = {}) => {
        const goals = Array.isArray(profileState.primaryGoals) ? profileState.primaryGoals : [];
        let changed = false;
        const nextGoals = goals.map((entry) => {
          if (entry.id !== goalId) return entry;
          const nextEntry = { ...entry };
          if (nextEntry.savedUSD !== normalizedSaved) {
            nextEntry.savedUSD = normalizedSaved;
            changed = true;
          }
          if (status && nextEntry.status !== status) {
            nextEntry.status = status;
            changed = true;
          }
          return nextEntry;
        });
        return changed ? { ...profileState, primaryGoals: nextGoals } : profileState;
      };
      setProfile((prev) => updateEntry(prev));
      setProfileDraft((prev) => updateEntry(prev));
    },
    [setProfile, setProfileDraft]
  );

  const resetWishProgress = useCallback(
    (wishId) => {
      if (!wishId) return;
      let goalMeta = null;
      setWishes((prev) => {
        let changed = false;
        const next = prev.map((wish) => {
          if (wish.id !== wishId) return wish;
          const wasSaved = Number.isFinite(wish.savedUSD) ? wish.savedUSD : 0;
          const wasStatus = wish.status || "active";
          if (wish.kind === PRIMARY_GOAL_KIND && wish.goalId) {
            goalMeta = { goalId: wish.goalId };
          }
          if (wasSaved === 0 && wasStatus === "active") {
            return wish;
          }
          changed = true;
          return {
            ...wish,
            savedUSD: 0,
            status: "active",
          };
        });
        return changed ? next : prev;
      });
      if (goalMeta) {
        syncPrimaryGoalProgress(goalMeta.goalId, 0, "active");
      }
    },
    [setWishes, syncPrimaryGoalProgress]
  );

  const assignTemptationGoal = useCallback(
    (templateId, wishId = null) => {
      if (!templateId) return;
      let previousAssignedId = null;
      setTemptationGoalMap((prev) => {
        previousAssignedId = prev[templateId] || null;
        const next = { ...prev };
        if (wishId) {
          next[templateId] = wishId;
        } else {
          delete next[templateId];
        }
        return next;
      });
      if (wishId && previousAssignedId !== wishId) {
        resetWishProgress(wishId);
      }
    },
    [resetWishProgress]
  );

  const applySavingsToWish = useCallback(
    (wishId, amountUSD) => {
      if (!wishId || !Number.isFinite(amountUSD) || amountUSD <= 0) return 0;
      let applied = 0;
      let goalSyncMeta = null;
      let completedGoalMeta = null;
      setWishes((prev) => {
        let changed = false;
        const next = prev.map((wish) => {
          if (wish.id !== wishId) return wish;
          const current = wish.savedUSD || 0;
          const target = wish.targetUSD || 0;
          const desired = current + amountUSD;
          const nextSaved = Math.min(desired, target);
          applied = nextSaved - current;
          const status = nextSaved >= target ? "done" : "active";
          const becameDone = status === "done" && wish.status !== "done" && target > 0;
          if (
            nextSaved !== current ||
            wish.status !== status ||
            wish.autoManaged !== false
          ) {
            changed = true;
            if (wish.kind === PRIMARY_GOAL_KIND && wish.goalId) {
              goalSyncMeta = { goalId: wish.goalId, savedUSD: nextSaved, status };
            }
          if (becameDone) {
            completedGoalMeta = {
              goalId: wish.goalId || wish.id,
              wishId: wish.id,
              templateId: wish.templateId || null,
              targetUSD: target,
              createdAt: wish.createdAt || wish.metaCreatedAt || null,
            };
          }
            return {
              ...wish,
              savedUSD: nextSaved,
              status,
              autoManaged: false,
            };
          }
          return wish;
        });
        return changed ? next : prev;
      });
      if (goalSyncMeta) {
        syncPrimaryGoalProgress(goalSyncMeta.goalId, goalSyncMeta.savedUSD, goalSyncMeta.status);
      }
      if (completedGoalMeta) {
        const targetAmountLocal = convertToCurrency(
          completedGoalMeta.targetUSD || 0,
          profile.currency || DEFAULT_PROFILE.currency
        );
        let daysToComplete = null;
        if (completedGoalMeta.createdAt) {
          const createdAtTs = new Date(completedGoalMeta.createdAt).getTime();
          if (Number.isFinite(createdAtTs)) {
            daysToComplete = Math.max(1, Math.round((Date.now() - createdAtTs) / DAY_MS));
          }
        }
        logEvent("goal_completed", {
          goal_id: completedGoalMeta.goalId,
          target_amount: targetAmountLocal,
          days_to_complete: daysToComplete,
        });
      }
      return applied;
    },
    [syncPrimaryGoalProgress, logEvent, profile.currency]
  );
  const getWishTitleById = useCallback(
    (wishId) => wishes.find((wish) => wish.id === wishId)?.title || "",
    [wishes]
  );
  const goalSelectionList = useMemo(
    () => (assignableGoals.length > 0 ? assignableGoals : wishes),
    [assignableGoals, wishes]
  );
  const priceEditorAssignedGoalId = priceEditor.item
    ? resolveTemptationGoalId(priceEditor.item.id)
    : null;
  const priceEditorAssignedGoal =
    priceEditorAssignedGoalId &&
    (wishes || []).find((wish) => wish.id === priceEditorAssignedGoalId);
  const priceEditorAssignedGoalTitle = priceEditorAssignedGoal
    ? getWishTitleWithoutEmoji(priceEditorAssignedGoal)
    : "";
  const goalLinkCurrentGoalId = goalLinkPrompt.item
    ? resolveTemptationGoalId(goalLinkPrompt.item.id)
    : null;

  useEffect(() => {
    if (overlay?.type !== "save") {
      saveGlowAnim.stopAnimation?.();
      return;
    }
    saveGlowAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(saveGlowAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(saveGlowAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [overlay?.type, saveGlowAnim]);

  const saveGlowHighlight = useMemo(
    () => blendColors(overlayCardBackground, isDarkTheme ? "#F5C978" : "#FFE8BA", isDarkTheme ? 0.45 : 0.35),
    [overlayCardBackground, isDarkTheme]
  );
  const saveGlowBorderHighlight = useMemo(
    () => blendColors(overlayBorderColor, "#F2A93B", 0.6),
    [overlayBorderColor]
  );

  const saveOverlayGoalText =
    saveOverlayPayload && saveOverlayPayload.goalTitle
      ? saveOverlayPayload.goalComplete
        ? t("saveGoalComplete", { goal: saveOverlayPayload.goalTitle })
        : Number.isFinite(saveOverlayPayload.remainingTemptations)
        ? t("saveGoalRemaining", {
            goal: saveOverlayPayload.goalTitle,
            count: saveOverlayPayload.remainingTemptations,
          })
        : null
      : null;
  const saveCardBackgroundStyle =
    overlay?.type === "save"
      ? {
          backgroundColor: saveGlowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [overlayCardBackground, saveGlowHighlight],
          }),
          borderColor: saveGlowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [overlayBorderColor, saveGlowBorderHighlight],
          }),
        }
      : { backgroundColor: overlayCardBackground, borderColor: overlayBorderColor };

  const achievements = useMemo(() => {
    const built = buildAchievements({
      savedTotalUSD,
      declineCount,
      freeDayStats,
      declineStreak,
      pendingCount: pendingList.length,
      decisionStats,
      currency: profile.currency || DEFAULT_PROFILE.currency,
      t,
      language,
    });
    return built.map((reward) => ({
      ...reward,
      claimed: !!claimedRewards[reward.id],
    }));
  }, [
    savedTotalUSD,
    declineCount,
    freeDayStats,
    pendingList.length,
    decisionStats,
    profile.currency,
    t,
    language,
    claimedRewards,
  ]);

  const unlockedRewards = useMemo(
    () => achievements.filter((item) => item.unlocked),
    [achievements]
  );

  const challengeList = useMemo(
    () =>
      buildChallengesDisplay({
        state: challengesState,
        currency: profile.currency || DEFAULT_PROFILE.currency,
        language,
        t,
      }),
    [challengesState, profile.currency, language, t]
  );
  const rewardsBadgeCount = useMemo(() => {
    if (!rewardsReady) return 0;
    const claimableRewards = achievements.filter((reward) => reward.unlocked && !reward.claimed).length;
    const claimableChallenges = challengeList.filter((challenge) => challenge.canClaim).length;
    return claimableRewards + claimableChallenges;
  }, [achievements, challengeList, rewardsReady]);
  const activeDailyChallenge = useMemo(() => {
    if (dailyChallenge.status !== DAILY_CHALLENGE_STATUS.ACTIVE) return null;
    const targetValue = dailyChallenge.target || 1;
    return {
      id: dailyChallenge.id,
      emoji: dailyChallenge.emoji || "✨",
      title: dailyChallenge.templateLabel || dailyChallenge.templateTitle || t("defaultDealTitle"),
      rewardBonus: dailyChallenge.rewardBonus || ECONOMY_RULES.minSaveReward,
      progress: Math.min(dailyChallenge.progress || 0, targetValue),
      target: targetValue,
    };
  }, [dailyChallenge, t]);

  const profileStats = useMemo(() => {
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const totalSavedConverted = formatCurrency(
      convertToCurrency(savedTotalUSD, currencyCode),
      currencyCode
    );
    const spendCount = purchases.length;
    return [
      { label: t("statsSaved"), value: totalSavedConverted },
      { label: t("statsDeclines"), value: `${declineCount}` },
      { label: t("statsSpends"), value: `${spendCount}` },
      { label: t("statsFreeDays"), value: `${freeDayStats.current}`, suffix: "🔥" },
    ];
  }, [savedTotalUSD, declineCount, freeDayStats.current, purchases.length, t, profile.currency]);

  const analyticsStats = useMemo(
    () => [
      { label: t("analyticsPendingToBuy"), value: `${wishes.length}` },
      { label: t("analyticsPendingToDecline"), value: `${declineCount}` },
      { label: t("analyticsFridgeCount"), value: `${pendingList.length}` },
    ],
    [wishes.length, declineCount, pendingList.length, t]
  );
  const impulseInsights = useMemo(
    () => buildImpulseInsights(impulseTracker.events),
    [impulseTracker.events]
  );
  const temptationPressure = useMemo(
    () => buildTemptationPressureMap(impulseTracker.events),
    [impulseTracker.events]
  );

  useEffect(() => {
    if (!impulseInsights.activeRisk) return;
    notifyImpulseRisk(impulseInsights.activeRisk);
  }, [impulseInsights.activeRisk, notifyImpulseRisk]);
  useEffect(() => {
    if (!focusDigestHydrated) return;
    const todayKey = getDayKey(Date.now());
    if (focusDigestSeenKey === todayKey) return;
    if (pendingFocusDigest?.dateKey === todayKey) return;
    if (!impulseInsights || (impulseInsights.eventCount || 0) < 4) return;
    const strong = impulseInsights.hotWin || null;
    const weak = impulseInsights.hotLose || null;
    if (!strong && !weak) return;
    const positive = (impulseInsights.totalSpendCount || 0) <= (impulseInsights.totalSaveCount || 0);
    const strongTitle = strong?.title || t("focusDigestMissing");
    const weakTitle = weak?.title || t("focusDigestMissing");
    const payload = {
      title: positive ? t("focusDigestPositiveTitle") : t("focusDigestNegativeTitle"),
      body: positive
        ? t("focusDigestPositiveBody", { strong: strongTitle, weak: weakTitle })
        : t("focusDigestNegativeBody", { weak: weakTitle }),
      strong,
      weak,
      positive,
      targetId: weak?.templateId || strong?.templateId || null,
    };
    setPendingFocusDigest({ dateKey: todayKey, payload });
    setFocusDigestPromptShown(false);
  }, [
    focusDigestHydrated,
    focusDigestSeenKey,
    impulseInsights,
    pendingFocusDigest,
    t,
  ]);

  useEffect(() => {
    if (!pendingFocusDigest) return;
    if (focusDigestPromptShown) return;
    if (dailyChallengePromptVisible || overlay) return;
    triggerOverlayState("focus_digest", pendingFocusDigest.payload);
    setFocusDigestPromptShown(true);
  }, [pendingFocusDigest, focusDigestPromptShown, dailyChallengePromptVisible, overlay, triggerOverlayState]);
  useEffect(() => {
    if (!dailyChallengeHydrated) return;
    const todayKey = getDayKey(Date.now());
    if (dailyChallenge.dateKey === todayKey && dailyChallenge.templateId) return;
    const targetId = resolveDailyChallengeTemplateId(temptationPressure);
    if (!targetId) {
      setDailyChallenge((prev) => ({
        ...createInitialDailyChallengeState(),
        dateKey: todayKey,
        status: DAILY_CHALLENGE_STATUS.IDLE,
      }));
      return;
    }
    const template = resolveTemplateCard(targetId);
    const priceUSD = template?.priceUSD || template?.basePriceUSD || 0;
    const templateLabel =
      (typeof template?.title === "string"
        ? template.title
        : template?.title?.[language] || template?.title?.en || template?.title?.ru || "") || "";
    const templateTitle = resolveTemplateTitle(targetId, templateLabel) || templateLabel;
    const baseReward = computeRefuseCoinReward(priceUSD, profile.currency || DEFAULT_PROFILE.currency);
    const rewardBonus = computeDailyChallengeBonus(priceUSD, profile.currency || DEFAULT_PROFILE.currency);
    setDailyChallenge({
      ...createInitialDailyChallengeState(),
      id: `daily-${todayKey}-${targetId}`,
      dateKey: todayKey,
      templateId: targetId,
      templateTitle,
      templateLabel,
      emoji: template?.emoji || "✨",
      priceUSD,
      baseReward,
      rewardBonus,
      status: DAILY_CHALLENGE_STATUS.OFFER,
      offerDismissed: false,
    });
  }, [
    dailyChallenge.dateKey,
    dailyChallenge.templateId,
    dailyChallengeHydrated,
    language,
    temptationPressure,
    profile.currency,
    resolveTemplateCard,
    resolveTemplateTitle,
  ]);
  const handleDailyChallengeAccept = useCallback(() => {
    if (!dailyChallenge.templateId) return;
    setDailyChallenge((prev) => {
      if (!prev || prev.status !== DAILY_CHALLENGE_STATUS.OFFER) return prev;
      return {
        ...prev,
        status: DAILY_CHALLENGE_STATUS.ACTIVE,
        acceptedAt: Date.now(),
        offerDismissed: true,
      };
    });
    logEvent("daily_challenge_accepted", { template_id: dailyChallenge.templateId });
  }, [dailyChallenge.templateId, logEvent]);
  const handleDailyChallengeLater = useCallback(() => {
    setDailyChallenge((prev) => {
      if (!prev || prev.offerDismissed) return prev || createInitialDailyChallengeState();
      return { ...prev, offerDismissed: true };
    });
  }, []);
  const completeDailyChallenge = useCallback(() => {
    if (!dailyChallenge.templateId) return;
    setDailyChallenge((prev) => {
      if (!prev || prev.status !== DAILY_CHALLENGE_STATUS.ACTIVE) return prev;
      return {
        ...prev,
        status: DAILY_CHALLENGE_STATUS.COMPLETED,
        progress: prev.target,
        completedAt: Date.now(),
        rewardGranted: true,
      };
    });
    if (dailyChallenge.rewardBonus > 0) {
      setHealthPoints((coins) => coins + dailyChallenge.rewardBonus);
      triggerOverlayState("health", {
        amount: dailyChallenge.rewardBonus,
        reason: t("dailyChallengeRewardReason", {
          temptation: dailyChallenge.templateLabel || dailyChallenge.templateTitle,
        }),
      });
    }
    sendImmediateNotification({
      title: t("dailyChallengeRewardNotificationTitle"),
      body: t("dailyChallengeRewardNotificationBody", {
        temptation: dailyChallenge.templateLabel || dailyChallenge.templateTitle || t("defaultDealTitle"),
        amount: `${dailyChallenge.rewardBonus}`,
      }),
    });
    logEvent("daily_challenge_completed", {
      template_id: dailyChallenge.templateId,
      reward_bonus: dailyChallenge.rewardBonus,
    });
  }, [
    dailyChallenge.rewardBonus,
    dailyChallenge.templateId,
    dailyChallenge.templateTitle,
    sendImmediateNotification,
    logEvent,
    setHealthPoints,
    t,
    triggerOverlayState,
  ]);
  const failDailyChallenge = useCallback(() => {
    if (!dailyChallenge.templateId) return;
    setDailyChallenge((prev) => {
      if (!prev || prev.status !== DAILY_CHALLENGE_STATUS.ACTIVE) return prev;
      return {
        ...prev,
        status: DAILY_CHALLENGE_STATUS.FAILED,
        failedAt: Date.now(),
      };
    });
    triggerOverlayState(
      "cancel",
      t("dailyChallengeFailedText", { temptation: dailyChallenge.templateLabel || dailyChallenge.templateTitle })
    );
    logEvent("daily_challenge_failed", { template_id: dailyChallenge.templateId });
  }, [dailyChallenge.templateId, dailyChallenge.templateTitle, logEvent, t, triggerOverlayState]);
  useEffect(() => {
    if (!dailyChallengeHydrated) return;
    if (dailyChallenge.status !== DAILY_CHALLENGE_STATUS.ACTIVE) return;
    if (!dailyChallenge.templateId || !dailyChallenge.dateKey) return;
    const acceptedAt = dailyChallenge.acceptedAt || 0;
    const hasRefuse = resolvedHistoryEvents.some((entry) => {
      if (entry.kind !== "refuse_spend") return false;
      if (entry.meta?.templateId !== dailyChallenge.templateId) return false;
      if (getDayKey(entry.timestamp) !== dailyChallenge.dateKey) return false;
      if (acceptedAt && entry.timestamp < acceptedAt) return false;
      return true;
    });
    if (hasRefuse) {
      completeDailyChallenge();
    }
  }, [
    completeDailyChallenge,
    dailyChallenge.acceptedAt,
    dailyChallenge.dateKey,
    dailyChallenge.status,
    dailyChallenge.templateId,
    dailyChallengeHydrated,
    resolvedHistoryEvents,
  ]);
  useEffect(() => {
    if (!dailyChallengeHydrated) return;
    if (dailyChallenge.status !== DAILY_CHALLENGE_STATUS.ACTIVE) return;
    if (!dailyChallenge.templateId || !dailyChallenge.dateKey) return;
    const acceptedAt = dailyChallenge.acceptedAt || 0;
    const lost = (impulseTracker.events || []).some((event) => {
      if (event.action !== "spend") return false;
      if (event.templateId !== dailyChallenge.templateId) return false;
      if (getDayKey(event.timestamp) !== dailyChallenge.dateKey) return false;
      if (acceptedAt && event.timestamp < acceptedAt) return false;
      return true;
    });
    if (lost) {
      failDailyChallenge();
    }
  }, [
    dailyChallenge.acceptedAt,
    dailyChallenge.dateKey,
    dailyChallenge.status,
    dailyChallenge.templateId,
    dailyChallengeHydrated,
    failDailyChallenge,
    impulseTracker.events,
  ]);

  const persistCustomReminderId = useCallback(
    (id) => {
      setCustomReminderId(id);
      if (id) {
        AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_REMINDER, id).catch(() => {});
      } else {
        AsyncStorage.removeItem(STORAGE_KEYS.CUSTOM_REMINDER).catch(() => {});
      }
    },
    []
  );

  const schedulePersonalTemptationReminder = useCallback(
    async (customSpend) => {
      if (
        !customSpend?.title ||
        !Number.isFinite(customSpend.frequencyPerWeek) ||
        customSpend.frequencyPerWeek <= 0
      ) {
        if (customReminderId) {
          Notifications.cancelScheduledNotificationAsync(customReminderId).catch(() => {});
          persistCustomReminderId(null);
        }
        return;
      }
      const permitted = await ensureNotificationPermission();
      if (!permitted) return;
      if (customReminderId) {
        await Notifications.cancelScheduledNotificationAsync(customReminderId).catch(() => {});
      }
      const frequency = Math.max(1, customSpend.frequencyPerWeek);
      const intervalDays = Math.max(1, Math.round(7 / frequency));
      const seconds = Math.max(6 * 60 * 60, intervalDays * 24 * 60 * 60);
      const title = tVariant("smartReminderTitle", { temptation: customSpend.title });
      const body = tVariant("smartReminderBody", { temptation: customSpend.title });
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title, body },
          trigger: { seconds, repeats: true },
        });
        persistCustomReminderId(id);
      } catch (error) {
        console.warn("custom reminder", error);
        persistCustomReminderId(null);
      }
    },
    [customReminderId, ensureNotificationPermission, persistCustomReminderId, tVariant]
  );
  const clearLegacyDailyNudges = useCallback(async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      if (!Array.isArray(scheduled) || !scheduled.length) return;
      const identifiers = scheduled
        .filter((entry) => isKnownDailyNudgeNotification(entry?.content))
        .map((entry) => entry?.identifier)
        .filter(Boolean);
      if (!identifiers.length) return;
      await Promise.all(
        identifiers.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
        )
      );
    } catch (error) {
      console.warn("daily nudge cleanup", error);
    }
  }, []);

  const rescheduleDailyNudgeNotifications = useCallback(async () => {
    if (!dailyNudgesHydrated || !DAILY_NUDGE_REMINDERS.length) return;
    const permitted = await ensureNotificationPermission();
    if (!permitted) return;
    const existing = Object.values(dailyNudgeIdsRef.current || {});
    if (existing.length) {
      await Promise.all(
        existing.map((notificationId) =>
          Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {})
        )
      );
    }
    await clearLegacyDailyNudges();
    const nextMap = {};
    for (const def of DAILY_NUDGE_REMINDERS) {
      try {
        const trigger = buildDailyNudgeTrigger(def.hour, def.minute);
        if (!trigger) continue;
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: tVariant(def.titleKey),
            body: tVariant(def.bodyKey),
            data: { type: DAILY_NUDGE_NOTIFICATION_TAG, locale: language },
            ...(Platform.OS === "android" ? { channelId: ANDROID_DAILY_NUDGE_CHANNEL_ID } : null),
          },
          trigger,
        });
        nextMap[def.id] = notificationId;
      } catch (error) {
        console.warn("daily nudge schedule", error);
      }
    }
    setDailyNudgeNotificationIds(nextMap);
  }, [clearLegacyDailyNudges, dailyNudgesHydrated, ensureNotificationPermission, language, tVariant]);

  useEffect(() => {
    if (!dailyNudgesHydrated) return;
    rescheduleDailyNudgeNotifications();
  }, [dailyNudgesHydrated, language, rescheduleDailyNudgeNotifications, tVariant]);

  const loadStoredData = async () => {
    let resolvedHealthPoints = null;
    try {
      const [
        wishesRaw,
        pendingRaw,
        purchasesRaw,
        profileRaw,
        themeRaw,
        languageRaw,
        onboardingRaw,
        catalogRaw,
        titleRaw,
        emojiOverridesRaw,
        categoryOverridesRaw,
        descriptionOverridesRaw,
        savedTotalRaw,
        declinesRaw,
        freeDayRaw,
        decisionStatsRaw,
        historyRaw,
        refuseStatsRaw,
        temptationInteractionsRaw,
        rewardsCelebratedRaw,
        analyticsOptOutRaw,
        goalMapRaw,
        customTemptationsRaw,
        hiddenTemptationsRaw,
        healthRaw,
        claimedRewardsRaw,
        impulseTrackerRaw,
        moodRaw,
        challengesRaw,
        customReminderRaw,
        dailyNudgesRaw,
        smartRemindersRaw,
        potentialPushProgressRaw,
        tamagotchiRaw,
        dailyChallengeRaw,
        dailySummaryRaw,
        tutorialRaw,
        termsAcceptedRaw,
        focusTargetRaw,
        focusDigestRaw,
        focusDigestPendingRaw,
        tamagotchiSkinRaw,
        tamagotchiSkinsUnlockedRaw,
        savedPeakRaw,
        activeGoalRaw,
        coinSliderMaxRaw,
        fabTutorialRaw,
        northStarMetricRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.WISHES),
        AsyncStorage.getItem(STORAGE_KEYS.PENDING),
        AsyncStorage.getItem(STORAGE_KEYS.PURCHASES),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
        AsyncStorage.getItem(STORAGE_KEYS.CATALOG),
        AsyncStorage.getItem(STORAGE_KEYS.TITLE_OVERRIDES),
        AsyncStorage.getItem(STORAGE_KEYS.EMOJI_OVERRIDES),
        AsyncStorage.getItem(STORAGE_KEYS.CATEGORY_OVERRIDES),
        AsyncStorage.getItem(STORAGE_KEYS.DESCRIPTION_OVERRIDES),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_TOTAL),
        AsyncStorage.getItem(STORAGE_KEYS.DECLINES),
        AsyncStorage.getItem(STORAGE_KEYS.FREE_DAY),
        AsyncStorage.getItem(STORAGE_KEYS.DECISION_STATS),
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.REFUSE_STATS),
        AsyncStorage.getItem(STORAGE_KEYS.TEMPTATION_INTERACTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.REWARDS_CELEBRATED),
        AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_OPT_OUT),
        AsyncStorage.getItem(STORAGE_KEYS.TEMPTATION_GOALS),
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPTATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.HIDDEN_TEMPTATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.HEALTH),
        AsyncStorage.getItem(STORAGE_KEYS.CLAIMED_REWARDS),
        AsyncStorage.getItem(STORAGE_KEYS.IMPULSE_TRACKER),
        AsyncStorage.getItem(STORAGE_KEYS.MOOD_STATE),
        AsyncStorage.getItem(STORAGE_KEYS.CHALLENGES),
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_REMINDER),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_NUDGES),
        AsyncStorage.getItem(STORAGE_KEYS.SMART_REMINDERS),
        AsyncStorage.getItem(STORAGE_KEYS.POTENTIAL_PUSH_PROGRESS),
        AsyncStorage.getItem(STORAGE_KEYS.TAMAGOTCHI),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGE),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_SUMMARY),
        AsyncStorage.getItem(STORAGE_KEYS.TUTORIAL),
        AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED),
        AsyncStorage.getItem(STORAGE_KEYS.FOCUS_TARGET),
        AsyncStorage.getItem(STORAGE_KEYS.FOCUS_DIGEST),
        AsyncStorage.getItem(STORAGE_KEYS.FOCUS_DIGEST_PENDING),
        AsyncStorage.getItem(STORAGE_KEYS.TAMAGOTCHI_SKIN),
        AsyncStorage.getItem(STORAGE_KEYS.TAMAGOTCHI_SKINS_UNLOCKED),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_TOTAL_PEAK),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_GOAL),
        AsyncStorage.getItem(STORAGE_KEYS.COIN_SLIDER_MAX),
        AsyncStorage.getItem(STORAGE_KEYS.FAB_TUTORIAL),
        AsyncStorage.getItem(STORAGE_KEYS.NORTH_STAR_METRIC),
      ]);
      if (wishesRaw) {
        setWishes(JSON.parse(wishesRaw));
      } else {
        setWishes([]);
      }
      setWishesHydrated(true);
      if (pendingRaw) setPendingList(JSON.parse(pendingRaw));
      if (purchasesRaw) setPurchases(JSON.parse(purchasesRaw));
      let parsedProfile = null;
      let hydratedGoalId = DEFAULT_PROFILE.goal;
      if (activeGoalRaw) {
        hydratedGoalId = activeGoalRaw;
      }
      if (profileRaw) {
        parsedProfile = { ...DEFAULT_PROFILE, ...JSON.parse(profileRaw) };
        const normalizedPrimaryGoals = Array.isArray(parsedProfile.primaryGoals)
          ? parsedProfile.primaryGoals
              .map((entry) => {
                const goalId = entry?.id || parsedProfile.goal || DEFAULT_PROFILE.goal;
                if (!goalId) return null;
                const targetUSD =
                  Number.isFinite(entry?.targetUSD) && entry.targetUSD > 0
                    ? entry.targetUSD
                    : getGoalDefaultTargetUSD(goalId);
                const normalized = {
                  id: goalId,
                  targetUSD,
                  savedUSD: Number.isFinite(entry?.savedUSD) ? entry.savedUSD : 0,
                  status: entry?.status && entry.status !== "done" ? entry.status : "active",
                  createdAt: entry?.createdAt || null,
                };
                const customTitle =
                  typeof entry?.customTitle === "string" ? entry.customTitle.trim() : "";
                if (customTitle) {
                  normalized.customTitle = customTitle;
                }
                if (entry?.customEmoji) {
                  normalized.customEmoji = normalizeEmojiValue(entry.customEmoji, DEFAULT_GOAL_EMOJI);
                }
                return normalized;
              })
              .filter((entry) => entry?.id)
          : [];
        if (!normalizedPrimaryGoals.length) {
          const fallbackId = parsedProfile.goal || DEFAULT_PROFILE.goal;
          normalizedPrimaryGoals.push({
            id: fallbackId,
            targetUSD:
              Number.isFinite(parsedProfile.goalTargetUSD) && parsedProfile.goalTargetUSD > 0
                ? parsedProfile.goalTargetUSD
                : getGoalDefaultTargetUSD(fallbackId),
            savedUSD: 0,
            status: "active",
            createdAt: null,
          });
        }
        const storedGoalId = activeGoalRaw || parsedProfile.goal || null;
        const activeGoalEntry =
          storedGoalId && normalizedPrimaryGoals.find((goal) => goal.id === storedGoalId);
        const orderedPrimaryGoals = activeGoalEntry
          ? [activeGoalEntry, ...normalizedPrimaryGoals.filter((goal) => goal.id !== activeGoalEntry.id)]
          : normalizedPrimaryGoals;
        const profileGoalId =
          (activeGoalEntry && activeGoalEntry.id) ||
          parsedProfile.goal ||
          orderedPrimaryGoals[0]?.id ||
          DEFAULT_PROFILE.goal;
        hydratedGoalId = profileGoalId;
        parsedProfile.primaryGoals = orderedPrimaryGoals;
        parsedProfile.goal = profileGoalId;
        const activeTargetEntry =
          orderedPrimaryGoals.find((goal) => goal.id === profileGoalId) || orderedPrimaryGoals[0];
        const activeTargetUSD =
          Number.isFinite(activeTargetEntry?.targetUSD) && activeTargetEntry.targetUSD > 0
            ? activeTargetEntry.targetUSD
            : parsedProfile.goalTargetUSD ||
              getGoalDefaultTargetUSD(profileGoalId || activeTargetEntry?.id || DEFAULT_PROFILE.goal);
        parsedProfile.goalTargetUSD = activeTargetUSD;
        parsedProfile.goalCelebrated = !!parsedProfile.goalCelebrated;
        parsedProfile.spendingProfile = {
          baselineMonthlyWasteUSD: Math.max(
            0,
            Number(parsedProfile.spendingProfile?.baselineMonthlyWasteUSD) || 0
          ),
          baselineStartAt: parsedProfile.spendingProfile?.baselineStartAt || null,
        };
        if (!parsedProfile.joinedAt) {
          parsedProfile.joinedAt =
            parsedProfile.spendingProfile?.baselineStartAt || new Date().toISOString();
        }
        setProfile(parsedProfile);
        setProfileDraft(parsedProfile);
        setRegistrationData((prev) => ({
          ...prev,
          firstName: parsedProfile.firstName || prev.firstName,
          lastName: parsedProfile.lastName || prev.lastName,
          motto: parsedProfile.motto || parsedProfile.subtitle || prev.motto,
          avatar: parsedProfile.avatar || prev.avatar,
          currency: parsedProfile.currency || prev.currency,
          gender: parsedProfile.gender || prev.gender,
          persona: parsedProfile.persona || prev.persona,
        }));
        setActiveCurrency(parsedProfile.currency || DEFAULT_PROFILE.currency);
      } else {
        const freshProfile = { ...DEFAULT_PROFILE, joinedAt: new Date().toISOString() };
        setProfile(freshProfile);
        setProfileDraft(freshProfile);
        setActiveCurrency(DEFAULT_PROFILE.currency);
      }
      if (customReminderRaw) {
        setCustomReminderId(customReminderRaw);
      } else {
        setCustomReminderId(null);
      }
      setCustomReminderHydrated(true);
      if (dailyNudgesRaw) {
        try {
          const parsed = JSON.parse(dailyNudgesRaw);
          if (parsed && typeof parsed === "object") {
            setDailyNudgeNotificationIds(parsed);
            dailyNudgeIdsRef.current = parsed;
          } else {
            setDailyNudgeNotificationIds({});
            dailyNudgeIdsRef.current = {};
          }
        } catch (err) {
          console.warn("daily nudges parse", err);
          setDailyNudgeNotificationIds({});
          dailyNudgeIdsRef.current = {};
        }
      } else {
        setDailyNudgeNotificationIds({});
        dailyNudgeIdsRef.current = {};
      }
      if (smartRemindersRaw) {
        try {
          const parsed = JSON.parse(smartRemindersRaw);
          setSmartReminders((prev) =>
            normalizeSmartReminderEntries([
              ...(Array.isArray(parsed) ? parsed : []),
              ...prev,
            ])
          );
        } catch (err) {
          console.warn("smart reminders parse", err);
          setSmartReminders((prev) => normalizeSmartReminderEntries(prev));
        }
      }
      if (potentialPushProgressRaw) {
        try {
          const parsed = JSON.parse(potentialPushProgressRaw);
          setPotentialPushProgress({
            lastStep: Math.max(0, Number(parsed?.lastStep) || 0),
            lastStatus:
              parsed?.lastStatus === "ahead" || parsed?.lastStatus === "behind"
                ? parsed.lastStatus
                : null,
            baselineKey:
              typeof parsed?.baselineKey === "string" && parsed.baselineKey.trim()
                ? parsed.baselineKey
                : null,
            stepMultiplier: Math.min(
              POTENTIAL_PUSH_MAX_MULTIPLIER,
              Math.max(1, Number(parsed?.stepMultiplier) || 1)
            ),
            lastNotifiedAt:
              Number.isFinite(Number(parsed?.lastNotifiedAt)) && Number(parsed?.lastNotifiedAt) > 0
                ? Number(parsed.lastNotifiedAt)
                : 0,
          });
        } catch (err) {
          console.warn("potential push progress parse", err);
          setPotentialPushProgress({ ...DEFAULT_POTENTIAL_PUSH_STATE });
        }
      } else {
        setPotentialPushProgress({ ...DEFAULT_POTENTIAL_PUSH_STATE });
      }
      setPotentialPushHydrated(true);
      if (tamagotchiRaw) {
        try {
          const parsed = JSON.parse(tamagotchiRaw);
          const parsedHunger = Math.min(
            TAMAGOTCHI_MAX_HUNGER,
            Math.max(0, Number(parsed?.hunger) || 0)
          );
          const parsedCoins = Math.max(
            0,
            Math.floor(Number(parsed?.coins) || TAMAGOTCHI_START_STATE.coins)
          );
          const baseState = {
            ...TAMAGOTCHI_START_STATE,
            ...parsed,
            hunger: parsedHunger,
            coins: parsedCoins,
            lastDecayAt:
              typeof parsed?.lastDecayAt === "number" && Number.isFinite(parsed.lastDecayAt)
                ? parsed.lastDecayAt
                : Number(parsed?.lastDecayAt) || Date.now(),
            coinTick: Math.max(0, Number(parsed?.coinTick) || 0),
          };
          const { state: hydratedState } = computeTamagotchiDecay(baseState);
          setTamagotchiState(hydratedState);
          tamagotchiHungerPrevRef.current = hydratedState.hunger;
          tamagotchiHydratedRef.current = true;
          if (!healthRaw && resolvedHealthPoints === null) {
            resolvedHealthPoints = hydratedState.coins;
          }
        } catch (err) {
          setTamagotchiState({ ...TAMAGOTCHI_START_STATE });
          tamagotchiHungerPrevRef.current = TAMAGOTCHI_START_STATE.hunger;
          tamagotchiHydratedRef.current = true;
        }
      } else {
        tamagotchiHungerPrevRef.current = TAMAGOTCHI_START_STATE.hunger;
        tamagotchiHydratedRef.current = true;
      }
      if (dailyChallengeRaw) {
        try {
          const parsed = JSON.parse(dailyChallengeRaw);
          setDailyChallenge({
            ...createInitialDailyChallengeState(),
            ...(parsed && typeof parsed === "object" ? parsed : {}),
          });
        } catch (err) {
          console.warn("daily challenge parse", err);
          setDailyChallenge(createInitialDailyChallengeState());
        }
      } else {
        setDailyChallenge(createInitialDailyChallengeState());
      }
      setDailyChallengeHydrated(true);
      if (themeRaw) setTheme(themeRaw);
      if (languageRaw) setLanguage(languageRaw);
      if (coinSliderMaxRaw) {
        const parsedSliderMax = parseFloat(coinSliderMaxRaw);
        if (Number.isFinite(parsedSliderMax) && parsedSliderMax > 0) {
          setCoinSliderMaxUSD(parsedSliderMax);
        }
      } else {
        setCoinSliderMaxUSD(DEFAULT_COIN_SLIDER_MAX_USD);
      }
      setCoinSliderHydrated(true);
      if (
        fabTutorialRaw === FAB_TUTORIAL_STATUS.PENDING ||
        fabTutorialRaw === FAB_TUTORIAL_STATUS.SHOWING
      ) {
        setFabTutorialState(fabTutorialRaw);
        fabTutorialStateRef.current = fabTutorialRaw;
      } else {
        setFabTutorialState(FAB_TUTORIAL_STATUS.DONE);
        fabTutorialStateRef.current = FAB_TUTORIAL_STATUS.DONE;
      }
      if (northStarMetricRaw) {
        let logged = false;
        try {
          const parsedNorthStar = JSON.parse(northStarMetricRaw);
          logged = !!parsedNorthStar?.logged;
        } catch (error) {
          logged = northStarMetricRaw === "1";
        }
        setNorthStarLogged(logged);
        northStarLoggedRef.current = logged;
      } else {
        setNorthStarLogged(false);
        northStarLoggedRef.current = false;
      }
      setNorthStarHydrated(true);
      if (dailySummaryRaw) setDailySummarySeenKey(dailySummaryRaw);
      setTutorialSeen(tutorialRaw === "pending" ? false : true);
      if (termsAcceptedRaw === "1") {
        setTermsAccepted(true);
      }
      if (focusTargetRaw) {
        try {
          const parsedFocus = JSON.parse(focusTargetRaw);
          if (parsedFocus && typeof parsedFocus === "object" && typeof parsedFocus.templateId === "string") {
            setFocusTemplateId(parsedFocus.templateId);
            setFocusSaveCount(Math.max(0, Number(parsedFocus.saveCount) || 0));
          } else {
            setFocusTemplateId(null);
            setFocusSaveCount(0);
          }
        } catch (error) {
          setFocusTemplateId(null);
          setFocusSaveCount(0);
        }
      } else {
        setFocusTemplateId(null);
        setFocusSaveCount(0);
      }
      setFocusStateHydrated(true);
      if (focusDigestRaw) {
        setFocusDigestSeenKey(focusDigestRaw || null);
      } else {
        setFocusDigestSeenKey(null);
      }
      setFocusDigestHydrated(true);
      if (focusDigestPendingRaw) {
        try {
          const parsedPending = JSON.parse(focusDigestPendingRaw);
          if (parsedPending && typeof parsedPending === "object" && parsedPending.payload) {
            setPendingFocusDigest(parsedPending);
          } else {
            setPendingFocusDigest(null);
          }
        } catch (error) {
          setPendingFocusDigest(null);
        }
      } else {
        setPendingFocusDigest(null);
      }
      const skinsUnlocked = tamagotchiSkinsUnlockedRaw === "1";
      setTamagotchiSkinsUnlocked(skinsUnlocked);
      setTamagotchiSkinsUnlockHydrated(true);
      if (
        tamagotchiSkinRaw &&
        TAMAGOTCHI_SKINS[tamagotchiSkinRaw] &&
        (skinsUnlocked || tamagotchiSkinRaw === DEFAULT_TAMAGOTCHI_SKIN)
      ) {
        setTamagotchiSkinId(tamagotchiSkinRaw);
      } else {
        setTamagotchiSkinId(DEFAULT_TAMAGOTCHI_SKIN);
      }
      setTamagotchiSkinHydrated(true);
      setActiveGoalId(hydratedGoalId || DEFAULT_PROFILE.goal);
      setActiveGoalHydrated(true);
      if (catalogRaw) {
        try {
          setCatalogOverrides(JSON.parse(catalogRaw));
        } catch (error) {
          console.warn("catalog overrides parse", error);
          setCatalogOverrides({});
        }
      } else {
        setCatalogOverrides({});
      }
      setCatalogHydrated(true);
      if (titleRaw) {
        try {
          setTitleOverrides(JSON.parse(titleRaw));
        } catch (error) {
          console.warn("title overrides parse", error);
          setTitleOverrides({});
        }
      } else {
        setTitleOverrides({});
      }
      setTitleOverridesHydrated(true);
      if (emojiOverridesRaw) {
        try {
          setEmojiOverrides(JSON.parse(emojiOverridesRaw));
        } catch (error) {
          console.warn("emoji overrides parse", error);
          setEmojiOverrides({});
        }
      } else {
        setEmojiOverrides({});
      }
      setEmojiOverridesHydrated(true);
      if (categoryOverridesRaw) {
        try {
          setCategoryOverrides(JSON.parse(categoryOverridesRaw));
        } catch (error) {
          console.warn("category overrides parse", error);
          setCategoryOverrides({});
        }
      } else {
        setCategoryOverrides({});
      }
      setCategoryOverridesHydrated(true);
      if (descriptionOverridesRaw) {
        try {
          setDescriptionOverrides(JSON.parse(descriptionOverridesRaw));
        } catch (error) {
          console.warn("description overrides parse", error);
          setDescriptionOverrides({});
        }
      } else {
        setDescriptionOverrides({});
      }
      setDescriptionOverridesHydrated(true);
      let resolvedSavedTotal = 0;
      if (savedTotalRaw) {
        resolvedSavedTotal = Number(savedTotalRaw) || 0;
        setSavedTotalUSD(resolvedSavedTotal);
      } else {
        setSavedTotalUSD(0);
      }
      setSavedTotalHydrated(true);
      if (savedPeakRaw) {
        const parsedPeak = Number(savedPeakRaw) || 0;
        setLifetimeSavedUSD(Math.max(parsedPeak, resolvedSavedTotal));
      } else {
        setLifetimeSavedUSD(Math.max(0, resolvedSavedTotal));
      }
      setLifetimeSavedHydrated(true);
      if (declinesRaw) setDeclineCount(Number(declinesRaw) || 0);
      if (freeDayRaw) {
        setFreeDayStats({ ...INITIAL_FREE_DAY_STATS, ...JSON.parse(freeDayRaw) });
      }
      if (decisionStatsRaw) {
        setDecisionStats({ ...INITIAL_DECISION_STATS, ...JSON.parse(decisionStatsRaw) });
      }
      if (historyRaw) {
        try {
          const parsedHistory = JSON.parse(historyRaw);
          const now = Date.now();
          const filteredHistory = (Array.isArray(parsedHistory) ? parsedHistory : [])
            .filter((entry) => entry?.timestamp && now - entry.timestamp <= HISTORY_RETENTION_MS)
            .slice(0, MAX_HISTORY_EVENTS);
          setHistoryEvents(filteredHistory);
        } catch (err) {
          console.warn("history parse", err);
          setHistoryEvents([]);
        }
      }
      if (refuseStatsRaw) {
        setRefuseStats(JSON.parse(refuseStatsRaw));
      }
      if (temptationInteractionsRaw) {
        try {
          const parsedInteractions = JSON.parse(temptationInteractionsRaw);
          setTemptationInteractions((prev) =>
            mergeInteractionStatMaps(parsedInteractions || {}, prev || {})
          );
        } catch (err) {
          console.warn("temptation interactions parse", err);
        }
      }
      setTemptationInteractionsHydrated(true);
      if (rewardsCelebratedRaw) {
        try {
          const parsedCelebrated = JSON.parse(rewardsCelebratedRaw);
          setRewardCelebratedMap(parsedCelebrated && typeof parsedCelebrated === "object" ? parsedCelebrated : {});
        } catch (err) {
          console.warn("rewards celebrated parse", err);
          setRewardCelebratedMap({});
        }
      } else {
        setRewardCelebratedMap({});
      }
      setRewardCelebratedHydrated(true);
      if (analyticsOptOutRaw) {
        setAnalyticsOptOutState(analyticsOptOutRaw === "1");
      } else {
        setAnalyticsOptOutState(false);
      }
      if (goalMapRaw) {
        try {
          setTemptationGoalMap(JSON.parse(goalMapRaw));
        } catch (err) {
          console.warn("goal map parse", err);
        }
      }
      if (customTemptationsRaw) {
        try {
          const parsedCustom = JSON.parse(customTemptationsRaw);
          const fallbackCurrency = parsedProfile?.currency || DEFAULT_PROFILE.currency;
          const normalizedCustom = (Array.isArray(parsedCustom) ? parsedCustom : [parsedCustom])
            .map((entry) => normalizeCustomTemptationEntry(entry, fallbackCurrency))
            .filter(Boolean);
          setQuickTemptations(normalizedCustom);
        } catch (err) {
          console.warn("custom temptations parse", err);
        }
      }
      if (hiddenTemptationsRaw) {
        try {
          setHiddenTemptations(JSON.parse(hiddenTemptationsRaw));
        } catch (err) {
          console.warn("hidden temptations parse", err);
        }
      }
      if (healthRaw) {
        const parsedHealth = Number(healthRaw) || 0;
        resolvedHealthPoints = Math.max(0, parsedHealth);
      } else if (resolvedHealthPoints === null) {
        resolvedHealthPoints = 0;
      }
      if (claimedRewardsRaw) {
        try {
          setClaimedRewards(JSON.parse(claimedRewardsRaw));
        } catch (err) {
          console.warn("claimed rewards parse", err);
          setClaimedRewards({});
        }
      } else {
        setClaimedRewards({});
      }
      if (impulseTrackerRaw) {
        try {
          const parsed = JSON.parse(impulseTrackerRaw);
          setImpulseTracker({
            ...INITIAL_IMPULSE_TRACKER,
            ...parsed,
            events: Array.isArray(parsed?.events) ? parsed.events.slice(0, MAX_IMPULSE_EVENTS) : [],
            lastAlerts: parsed?.lastAlerts || {},
          });
        } catch (err) {
          console.warn("impulse tracker parse", err);
        }
      }
      if (challengesRaw) {
        try {
          const parsed = JSON.parse(challengesRaw);
          const normalized = normalizeChallengesState(parsed);
          challengesPrevRef.current = normalized;
          setChallengesState(normalized);
        } catch (err) {
          console.warn("challenges parse", err);
          const fallback = createInitialChallengesState();
          challengesPrevRef.current = fallback;
          setChallengesState(fallback);
        }
      } else {
        const fallback = createInitialChallengesState();
        challengesPrevRef.current = fallback;
        setChallengesState(fallback);
      }
      if (moodRaw) {
        try {
          const parsed = JSON.parse(moodRaw);
          const normalizedEvents = Array.isArray(parsed?.events)
            ? parsed.events.slice(0, MOOD_MAX_EVENTS)
            : [];
          const todayKey = getDayKey(Date.now());
          if (parsed?.dayKey === todayKey) {
            setMoodState({
              ...parsed,
              dayKey: todayKey,
              events: normalizedEvents,
              current: parsed.current || MOOD_IDS.NEUTRAL,
              pendingSnapshot:
                typeof parsed.pendingSnapshot === "number" ? parsed.pendingSnapshot : pendingList.length,
            });
          } else {
            setMoodState(createMoodStateForToday());
          }
        } catch (err) {
          console.warn("mood state parse", err);
        }
      }
      if (onboardingRaw === "done") {
        goToOnboardingStep("done", { recordHistory: false, resetHistory: true });
      } else {
        const placeholderProfile = { ...DEFAULT_PROFILE_PLACEHOLDER, joinedAt: new Date().toISOString() };
        setProfile(placeholderProfile);
        setProfileDraft(placeholderProfile);
        setActiveGoalId(DEFAULT_PROFILE.goal);
        setRegistrationData((prev) => ({
          ...prev,
          firstName: "",
          lastName: "",
          motto: "",
          avatar: "",
          currency: placeholderProfile.currency,
          gender: placeholderProfile.gender,
        }));
        setActiveCurrency(DEFAULT_PROFILE.currency);
        goToOnboardingStep("logo", { recordHistory: false, resetHistory: true });
        setOnboardingStep("logo");
        setActiveGoalHydrated(true);
      }
      setProfileHydrated(true);
    } catch (error) {
      console.warn("load error", error);
      setAnalyticsOptOutState((prev) => (prev === null ? false : prev));
    } finally {
      const safeHealthPoints =
        typeof resolvedHealthPoints === "number" && !Number.isNaN(resolvedHealthPoints)
          ? resolvedHealthPoints
          : 0;
      setHealthPoints((prev) => prev + safeHealthPoints);
      setHealthHydrated(true);
      setNorthStarHydrated(true);
      setWishesHydrated(true);
      setSavedTotalHydrated(true);
      setRewardsReady(true);
      setMoodHydrated(true);
      setFreeDayHydrated(true);
      setCustomReminderHydrated(true);
      setPotentialPushHydrated(true);
      setSmartRemindersHydrated(true);
      setDailyNudgesHydrated(true);
      setCatalogHydrated(true);
      setTitleOverridesHydrated(true);
      setEmojiOverridesHydrated(true);
      setCategoryOverridesHydrated(true);
      setDescriptionOverridesHydrated(true);
      setTamagotchiSkinHydrated(true);
      setLifetimeSavedHydrated(true);
      setProfileHydrated(true);
    }
  };

  useEffect(() => {
    loadStoredData();
  }, []);
  useEffect(() => {
    northStarLoggedRef.current = northStarLogged;
  }, [northStarLogged]);
  useEffect(() => {
    if (onboardingStep !== "done") {
      setHomeLayoutReady(false);
      setTutorialVisible(false);
    }
  }, [onboardingStep]);

  useEffect(() => {
    if (onboardingStep === "done" && !startupLogoDismissedRef.current) {
      setStartupLogoVisible(true);
    }
  }, [onboardingStep]);

  const handleStartupLogoComplete = useCallback(() => {
    startupLogoDismissedRef.current = true;
    setStartupLogoVisible(false);
  }, []);

  const sendTamagotchiHungerNotification = useCallback(
    async (kind) => {
      const copy = TAMAGOTCHI_NOTIFICATION_COPY[language] || TAMAGOTCHI_NOTIFICATION_COPY.ru;
      const body = copy[kind];
      if (!body) return;
      await sendImmediateNotification({
        title: language === "ru" ? "Алми" : "Almi",
        body,
      });
    },
    [language, sendImmediateNotification]
  );

  useEffect(() => {
    const currentHunger = Math.min(
      TAMAGOTCHI_MAX_HUNGER,
      Math.max(0, Number(tamagotchiState.hunger) || 0)
    );
    if (!tamagotchiHydratedRef.current) {
      tamagotchiHungerPrevRef.current = currentHunger;
      return;
    }
    const previousHunger = Math.min(
      TAMAGOTCHI_MAX_HUNGER,
      Math.max(0, Number(tamagotchiHungerPrevRef.current) || 0)
    );
    if (currentHunger <= 0 && previousHunger > 0) {
      sendTamagotchiHungerNotification("starving");
    } else if (
      currentHunger < TAMAGOTCHI_HUNGER_LOW_THRESHOLD &&
      previousHunger >= TAMAGOTCHI_HUNGER_LOW_THRESHOLD
    ) {
      sendTamagotchiHungerNotification("low");
    }
    tamagotchiHungerPrevRef.current = currentHunger;
  }, [sendTamagotchiHungerNotification, tamagotchiState.hunger]);

  const shouldShowTutorial = onboardingStep === "done" && !tutorialSeen && !tutorialVisible;

  useEffect(() => {
    if (!shouldShowTutorial) return;
    if (!APP_TUTORIAL_STEPS.length) return;
    if (!homeLayoutReady) return;
    if (startupLogoVisible) return;
    setTutorialStepIndex(0);
    setTutorialVisible(true);
  }, [homeLayoutReady, shouldShowTutorial, startupLogoVisible]);

  useEffect(() => {
    if (!shouldShowTutorial) return;
    if (!APP_TUTORIAL_STEPS.length) return;
    const fallbackTimer = setTimeout(() => {
      setTutorialStepIndex(0);
      setTutorialVisible(true);
    }, 1600);
    return () => clearTimeout(fallbackTimer);
  }, [shouldShowTutorial]);

  useEffect(() => {
    if (onboardingStep !== "done") return;
    const hour = new Date().getHours();
    if (hour < 20) return;
    const todayKey = getDayKey(Date.now());
    if (dailySummarySeenKey === todayKey) return;
    const todayEvents = resolvedHistoryEvents.filter((e) => getDayKey(e.timestamp) === todayKey);
    if (!todayEvents.length) return;
    const saves = todayEvents.filter((e) => e.kind === "refuse_spend");
    const spends = todayEvents.filter((e) => e.kind === "spend");
    const savedUSD = saves.reduce((sum, e) => sum + (Number(e.meta?.amountUSD) || 0), 0);
    const declines = saves.length;
    const spendCount = spends.length;
    setDailySummaryData({ savedUSD, declines, spends: spendCount, todayKey });
    setDailySummaryVisible(true);
    setDailySummarySeenKey(todayKey);
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_SUMMARY, todayKey).catch(() => {});
  }, [dailySummarySeenKey, resolvedHistoryEvents, onboardingStep]);

  useEffect(() => {
    processTamagotchiDecay();
    const interval = setInterval(() => {
      processTamagotchiDecay();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [processTamagotchiDecay]);

  useEffect(() => {
    setTamagotchiState((prev) =>
      prev.coins === healthPoints ? prev : { ...prev, coins: healthPoints }
    );
  }, [healthPoints]);

  useEffect(() => {
    if (tamagotchiVisible) {
      Animated.timing(tamagotchiModalAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(tamagotchiModalAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [tamagotchiVisible, tamagotchiModalAnim]);

  useEffect(() => {
    if (onboardingStep === "done" && (profile.primaryGoals || []).length) {
      ensurePrimaryGoalWish(profile.primaryGoals, language, activeGoalId || profile.goal);
    }
  }, [ensurePrimaryGoalWish, onboardingStep, profile.primaryGoals, activeGoalId, profile.goal, language]);

  useEffect(() => {
    const targetUSD = heroGoalTargetUSD > 0 ? heroGoalTargetUSD : 0;
    const hasMetGoal = targetUSD > 0 && heroGoalSavedUSD >= targetUSD;
    if (hasMetGoal && !profile.goalCelebrated) {
      const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
      const targetLabel = formatCurrency(convertToCurrency(targetUSD, currencyCode), currencyCode);
      setProfile((prev) => ({
        ...prev,
        goalCelebrated: true,
        goalRenewalPending: true,
      }));
      setProfileDraft((prev) => ({
        ...prev,
        goalCelebrated: true,
        goalRenewalPending: true,
      }));
      triggerOverlayState(
        "goal_complete",
        {
          title: t("goalCelebrationTitle"),
          subtitle: t("goalCelebrationSubtitle"),
          targetLabel: t("goalCelebrationTarget", { amount: targetLabel }),
        },
        5200
      );
      if (!hasPendingGoals) {
        goalRenewalPromptPendingRef.current = true;
      }
    }
  }, [
    heroGoalTargetUSD,
    profile.goalCelebrated,
    profile.currency,
    heroGoalSavedUSD,
    hasPendingGoals,
    triggerOverlayState,
    t,
  ]);

  useEffect(() => {
    const targetUSD = heroGoalTargetUSD > 0 ? heroGoalTargetUSD : 0;
    const hasMetGoal = targetUSD > 0 && heroGoalSavedUSD >= targetUSD;
    if (profile.goalCelebrated && !hasMetGoal) {
      setProfile((prev) => ({ ...prev, goalCelebrated: false, goalRenewalPending: false }));
      setProfileDraft((prev) => ({ ...prev, goalCelebrated: false, goalRenewalPending: false }));
      goalRenewalPromptPendingRef.current = false;
    }
  }, [heroGoalTargetUSD, profile.goalCelebrated, heroGoalSavedUSD, setProfile]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(wishes)).catch(() => {});
  }, [wishes]);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEYS.TEMPTATION_GOALS,
      JSON.stringify(temptationGoalMap)
    ).catch(() => {});
  }, [temptationGoalMap]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases)).catch(() => {});
  }, [purchases]);

  useEffect(() => {
    if (!profileHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)).catch(() => {});
  }, [profile, profileHydrated]);

  useEffect(() => {
    if (!activeGoalHydrated) return;
    const value = activeGoalId || "";
    AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_GOAL, value).catch(() => {});
  }, [activeGoalHydrated, activeGoalId]);

  useEffect(() => {
    if (!overlay && goalRenewalPromptPendingRef.current) {
      goalRenewalPromptPendingRef.current = false;
      if (!goalRenewalPromptVisible) {
        setGoalRenewalPromptVisible(true);
      }
    }
  }, [overlay, goalRenewalPromptVisible]);

  useEffect(() => {
    if (!profile.goalRenewalPending) {
      goalRenewalPromptPendingRef.current = false;
      return;
    }
    if (hasPendingGoals) return;
    requestGoalRenewalPrompt();
  }, [profile.goalRenewalPending, hasPendingGoals, requestGoalRenewalPrompt]);

  useEffect(() => {
    setActiveCurrency(profile.currency || DEFAULT_PROFILE.currency);
  }, [profile.currency]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.THEME, theme).catch(() => {});
  }, [theme]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language).catch(() => {});
  }, [language]);

  useEffect(() => {
    if (!healthHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.HEALTH, String(healthPoints)).catch(() => {});
  }, [healthHydrated, healthPoints]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CLAIMED_REWARDS, JSON.stringify(claimedRewards)).catch(() => {});
  }, [claimedRewards]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(challengesState)).catch(() => {});
  }, [challengesState]);
  useEffect(() => {
    if (!dailyChallengeHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGE, JSON.stringify(dailyChallenge)).catch(() => {});
  }, [dailyChallenge, dailyChallengeHydrated]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.TAMAGOTCHI, JSON.stringify(tamagotchiState)).catch(() => {});
  }, [tamagotchiState]);

  useEffect(() => {
    if (!tamagotchiSkinHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.TAMAGOTCHI_SKIN, tamagotchiSkinId).catch(() => {});
  }, [tamagotchiSkinHydrated, tamagotchiSkinId]);
  useEffect(() => {
    if (!tamagotchiSkinsUnlockHydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.TAMAGOTCHI_SKINS_UNLOCKED,
      tamagotchiSkinsUnlocked ? "1" : "0"
    ).catch(() => {});
  }, [tamagotchiSkinsUnlockHydrated, tamagotchiSkinsUnlocked]);

  useEffect(() => {
    if (!catalogHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalogOverrides)).catch(() => {});
  }, [catalogOverrides, catalogHydrated]);

  useEffect(() => {
    if (!titleOverridesHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.TITLE_OVERRIDES, JSON.stringify(titleOverrides)).catch(() => {});
  }, [titleOverrides, titleOverridesHydrated]);

  useEffect(() => {
    if (!emojiOverridesHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.EMOJI_OVERRIDES, JSON.stringify(emojiOverrides)).catch(() => {});
  }, [emojiOverrides, emojiOverridesHydrated]);
  useEffect(() => {
    if (!categoryOverridesHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.CATEGORY_OVERRIDES, JSON.stringify(categoryOverrides)).catch(
      () => {}
    );
  }, [categoryOverrides, categoryOverridesHydrated]);

  useEffect(() => {
    if (!descriptionOverridesHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.DESCRIPTION_OVERRIDES, JSON.stringify(descriptionOverrides)).catch(
      () => {}
    );
  }, [descriptionOverrides, descriptionOverridesHydrated]);

  useEffect(() => {
    if (!savedTotalHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.SAVED_TOTAL, String(savedTotalUSD)).catch(() => {});
  }, [savedTotalUSD, savedTotalHydrated]);

  useEffect(() => {
    if (!savedTotalHydrated || !lifetimeSavedHydrated) return;
    setLifetimeSavedUSD((prev) => (savedTotalUSD > prev ? savedTotalUSD : prev));
  }, [savedTotalUSD, savedTotalHydrated, lifetimeSavedHydrated]);

  useEffect(() => {
    if (!lifetimeSavedHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.SAVED_TOTAL_PEAK, String(lifetimeSavedUSD)).catch(() => {});
  }, [lifetimeSavedUSD, lifetimeSavedHydrated]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.DECLINES, String(declineCount)).catch(() => {});
  }, [declineCount]);

  useEffect(() => {
    if (!dailyNudgesHydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.DAILY_NUDGES,
      JSON.stringify(dailyNudgeNotificationIds)
    ).catch(() => {});
  }, [dailyNudgeNotificationIds, dailyNudgesHydrated]);

  useEffect(() => {
    if (!smartRemindersHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.SMART_REMINDERS, JSON.stringify(smartReminders)).catch(() => {});
  }, [smartReminders, smartRemindersHydrated]);
  useEffect(() => {
    if (!potentialPushHydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.POTENTIAL_PUSH_PROGRESS,
      JSON.stringify({
        lastStep: Math.max(0, Number(potentialPushProgress.lastStep) || 0),
        lastStatus:
          potentialPushProgress.lastStatus === "ahead" || potentialPushProgress.lastStatus === "behind"
            ? potentialPushProgress.lastStatus
            : null,
        baselineKey: potentialPushProgress.baselineKey || null,
        stepMultiplier: Math.min(
          POTENTIAL_PUSH_MAX_MULTIPLIER,
          Math.max(1, Number(potentialPushProgress.stepMultiplier) || 1)
        ),
        lastNotifiedAt:
          Number.isFinite(Number(potentialPushProgress.lastNotifiedAt)) &&
          Number(potentialPushProgress.lastNotifiedAt) > 0
            ? Number(potentialPushProgress.lastNotifiedAt)
            : 0,
      })
    ).catch(() => {});
  }, [potentialPushHydrated, potentialPushProgress]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(pendingList)).catch(() => {});
  }, [pendingList]);

  useEffect(() => {
    if (!freeDayHydrated) return;
    AsyncStorage.setItem(STORAGE_KEYS.FREE_DAY, JSON.stringify(freeDayStats)).catch(() => {});
  }, [freeDayStats, freeDayHydrated]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.REFUSE_STATS, JSON.stringify(refuseStats)).catch(() => {});
  }, [refuseStats]);

  useEffect(() => {
    if (!temptationInteractionsHydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEYS.TEMPTATION_INTERACTIONS,
      JSON.stringify(temptationInteractions)
    ).catch(() => {});
  }, [temptationInteractions, temptationInteractionsHydrated]);

  useEffect(() => {
    if (analyticsOptOut === null) return;
    setAnalyticsOptOutFlag(analyticsOptOut);
    AsyncStorage.setItem(
      STORAGE_KEYS.ANALYTICS_OPT_OUT,
      analyticsOptOut ? "1" : "0"
    ).catch(() => {});
  }, [analyticsOptOut]);

  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEYS.REWARDS_CELEBRATED,
      JSON.stringify(rewardCelebratedMap)
    ).catch(() => {});
  }, [rewardCelebratedMap]);
  useEffect(() => {
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const hasGoalProperty =
      (Array.isArray(profile.primaryGoals) && profile.primaryGoals.length > 0) ||
      (wishes || []).some((wish) => wish.kind === PRIMARY_GOAL_KIND);
    const totalDecisions =
      (decisionStats?.resolvedToDeclines || 0) + (decisionStats?.resolvedToWishes || 0);
    let savingStyle = "balanced";
    if (totalDecisions > 0) {
      const declineShare = (decisionStats.resolvedToDeclines || 0) / totalDecisions;
      if (declineShare >= 0.7) {
        savingStyle = "aggressive";
      } else if (declineShare <= 0.4) {
        savingStyle = "relaxed";
      }
    }
    setUserProperties({
      has_goal: !!hasGoalProperty,
      preferred_currency: currencyCode,
      saving_style: savingStyle,
      locale: language,
      is_premium: false,
    });
  }, [
    decisionStats?.resolvedToDeclines,
    decisionStats?.resolvedToWishes,
    language,
    profile.currency,
    profile.primaryGoals,
    wishes,
  ]);

  useEffect(() => {
    if (!rewardsReady || !rewardCelebratedHydrated || !achievements.length) return;
    const newlyUnlocked = achievements.filter(
      (reward) => reward.unlocked && !rewardCelebratedMap[reward.id]
    );
    if (!newlyUnlocked.length) return;
    newlyUnlocked.forEach((reward) => {
      logEvent("reward_unlocked", {
        reward_id: reward.id,
        type: "badge",
        condition: ACHIEVEMENT_CONDITION_MAP[reward.metricType] || reward.metricType || "unknown",
      });
    });
    setRewardCelebratedMap((prev) => {
      const next = { ...prev };
      newlyUnlocked.forEach((reward) => {
        next[reward.id] = true;
      });
      return next;
    });
    triggerOverlayState("reward", newlyUnlocked[0].title);
  }, [achievements, logEvent, rewardCelebratedHydrated, rewardCelebratedMap, rewardsReady]);

  useEffect(() => {
    if (!wishesHydrated || !savedTotalHydrated) return;
    setWishes((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.slice();
      let manualReserved = 0;
      const manualEntries = [];
      prev.forEach((wish, index) => {
        const isManualWish = wish.autoManaged === false || wish.kind === PRIMARY_GOAL_KIND;
        if (isManualWish) {
          const saved = Math.max(0, wish.savedUSD || 0);
          manualReserved += saved;
          manualEntries.push({ index, saved });
        }
      });
      if (manualReserved > savedTotalUSD) {
        let deficit = manualReserved - savedTotalUSD;
        for (let i = manualEntries.length - 1; i >= 0 && deficit > 0; i--) {
          const entry = manualEntries[i];
          const currentWish = next[entry.index];
          const savedValue = currentWish.savedUSD || 0;
          if (savedValue <= 0) continue;
          const deduction = Math.min(savedValue, deficit);
          if (deduction > 0) {
            const newSaved = savedValue - deduction;
            const status = newSaved >= (currentWish.targetUSD || 0) ? "done" : "active";
            next[entry.index] = { ...currentWish, savedUSD: newSaved, status };
            changed = true;
            deficit -= deduction;
          }
        }
        manualReserved = Math.min(manualReserved, savedTotalUSD);
      }
      let remaining = Math.max(0, savedTotalUSD - manualReserved);
      for (let i = 0; i < next.length; i++) {
        const wish = next[i];
        const isManualWish = wish.autoManaged === false || wish.kind === PRIMARY_GOAL_KIND;
        if (isManualWish) {
          const status = (wish.savedUSD || 0) >= (wish.targetUSD || 0) ? "done" : "active";
          if (wish.status !== status) {
            next[i] = { ...wish, status };
            changed = true;
          }
          continue;
        }
        const target = wish.targetUSD || 0;
        const newSaved = Math.min(target, Math.max(remaining, 0));
        remaining = Math.max(0, remaining - newSaved);
        const status = newSaved >= target ? "done" : "active";
        if (newSaved !== (wish.savedUSD || 0) || status !== wish.status) {
          next[i] = { ...wish, savedUSD: newSaved, status };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [savedTotalUSD, wishes, savedTotalHydrated, wishesHydrated]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.DECISION_STATS, JSON.stringify(decisionStats)).catch(() => {});
  }, [decisionStats]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(resolvedHistoryEvents)).catch(() => {});
  }, [resolvedHistoryEvents]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPTATIONS, JSON.stringify(quickTemptations)).catch(
      () => {}
    );
  }, [quickTemptations]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.HIDDEN_TEMPTATIONS, JSON.stringify(hiddenTemptations)).catch(
      () => {}
    );
  }, [hiddenTemptations]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.IMPULSE_TRACKER, JSON.stringify(impulseTracker)).catch(
      () => {}
    );
  }, [impulseTracker]);

  useEffect(() => {
    const nextList = DEFAULT_TEMPTATIONS.map((item) => {
      const overrideCategory = categoryOverrides[item.id];
      const normalizedCategory =
        overrideCategory && IMPULSE_CATEGORY_DEFS[overrideCategory] ? overrideCategory : null;
      return {
        ...item,
        priceUSD: catalogOverrides[item.id] ?? item.basePriceUSD,
        titleOverride: titleOverrides[item.id] || null,
        emoji: emojiOverrides[item.id] || item.emoji,
        impulseCategoryOverride: normalizedCategory || item.impulseCategoryOverride || null,
        descriptionOverride: descriptionOverrides[item.id] || item.descriptionOverride || null,
      };
    }).sort(
      (a, b) =>
        (a.priceUSD ?? a.basePriceUSD ?? 0) - (b.priceUSD ?? b.basePriceUSD ?? 0)
    );
    const personalized = buildPersonalizedTemptations(profile, nextList).map((card) => {
      const overrideCategory = categoryOverrides[card.id];
      const normalizedCategory =
        overrideCategory && IMPULSE_CATEGORY_DEFS[overrideCategory] ? overrideCategory : null;
      return {
        ...card,
        priceUSD: catalogOverrides[card.id] ?? card.priceUSD ?? card.basePriceUSD,
        titleOverride: titleOverrides[card.id] ?? card.titleOverride ?? null,
        emoji: emojiOverrides[card.id] || card.emoji,
        impulseCategoryOverride: normalizedCategory || card.impulseCategoryOverride || null,
        descriptionOverride:
          descriptionOverrides[card.id] ?? card.descriptionOverride ?? null,
      };
    });
    const hiddenSet = new Set(hiddenTemptations);
    const personalizedVisible = personalized.filter((card) => !hiddenSet.has(card.id));
    const personalizedIds = new Set(personalizedVisible.map((c) => c.id));
    const quickAdjusted = quickTemptations
      .filter((card) => card && !hiddenSet.has(card.id) && !personalizedIds.has(card.id))
      .map((card) => {
        const overrideCategory = categoryOverrides[card.id];
        const normalizedCategory =
          overrideCategory && IMPULSE_CATEGORY_DEFS[overrideCategory] ? overrideCategory : null;
        return {
          ...card,
          priceUSD: catalogOverrides[card.id] ?? card.priceUSD ?? card.basePriceUSD,
          titleOverride: titleOverrides[card.id] ?? card.titleOverride ?? null,
          emoji: emojiOverrides[card.id] || card.emoji,
          impulseCategoryOverride: normalizedCategory || card.impulseCategoryOverride || null,
          descriptionOverride:
            descriptionOverrides[card.id] ?? card.descriptionOverride ?? null,
        };
      });
    // Быстрая кастомная карта всегда рендерится первой, затем идёт персонализированный порядок.
    const combined = [...quickAdjusted, ...personalizedVisible];

    setTemptations(combined);
  }, [
    catalogOverrides,
    profile,
    titleOverrides,
    emojiOverrides,
    categoryOverrides,
    descriptionOverrides,
    quickTemptations,
    hiddenTemptations,
    onboardingStep,
  ]);

  useEffect(() => {
    return () => {
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
      Object.values(cardFeedbackTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!focusTemplateId) return;
    const exists =
      [...quickTemptations, ...temptations].some((card) => card?.id === focusTemplateId) ||
      focusTemplateId === primaryTemptationId;
    if (!exists) {
      setFocusTemplateId(null);
      setFocusSaveCount(0);
    }
  }, [focusTemplateId, primaryTemptationId, quickTemptations, temptations]);

  const handleCategorySelect = useCallback((category) => {
    triggerHaptic();
    setActiveCategory(category);
  }, []);

  const handleTabChange = (tabKey) => {
    triggerHaptic();
    setActiveTab(tabKey);
  };

  const handleThemeToggle = (mode) => {
    triggerHaptic();
    setTheme(mode);
  };

  const handleLanguageChange = (lng) => {
    triggerHaptic();
    setLanguage(lng);
    if (onboardingStep !== "done") {
      logEvent("onboarding_language_chosen", { language: lng });
    }
  };

  const handleTermsOpen = () => {
    triggerHaptic();
    setTermsContinuePending(false);
    setTermsModalVisible(true);
  };

  const handleTermsCancel = () => {
    triggerHaptic();
    setTermsContinuePending(false);
    setTermsModalVisible(false);
  };

  const handleTermsLinkOpen = () => {
    const url = TERMS_LINKS[language] || TERMS_LINKS.en;
    if (!url) return;
    triggerHaptic();
    Linking.openURL(url).catch((error) => console.warn("terms link", error));
  };

  const handleTermsAccept = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const shouldAdvance = termsContinuePending;
    setTermsAccepted(true);
    setTermsModalVisible(false);
    setTermsContinuePending(false);
    AsyncStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, "1").catch(() => {});
    logEvent("onboarding_terms_accepted", { language });
    logEvent("consent_terms_accepted", { language });
    if (shouldAdvance) {
      goToOnboardingStep("guide");
    }
  };

  const handleProfileCurrencyChange = (code) => {
    if (!CURRENCIES.includes(code) || profile.currency === code) return;
    triggerHaptic();
    setProfile((prev) => ({ ...prev, currency: code }));
    setProfileDraft((prev) => ({ ...prev, currency: code }));
    setRegistrationData((prev) => ({ ...prev, currency: code }));
    setActiveCurrency(code);
  };

  const handleAnalyticsToggle = (enabled) => {
    if (analyticsOptOut === null) return;
    triggerHaptic();
    setAnalyticsOptOutState(!enabled);
    logEvent("consent_analytics_enabled", { enabled, source: "settings" });
  };

  const handleActiveGoalSelect = useCallback(
    (goalId) => {
      if (!goalId) return;
      triggerHaptic();
      const previousGoalId = activeGoalId || profile.goal;
      clearCompletedPrimaryGoal(previousGoalId);
      setActiveGoalId(goalId);
      setProfile((prev) => ({
        ...prev,
        goal: goalId,
        goalCelebrated: false,
        goalRenewalPending: false,
      }));
      setProfileDraft((prev) => ({
        ...prev,
        goal: goalId,
        goalCelebrated: false,
        goalRenewalPending: false,
      }));
      dismissGoalRenewalPrompt();
    },
    [dismissGoalRenewalPrompt, triggerHaptic, activeGoalId, profile.goal, clearCompletedPrimaryGoal]
  );

  const handleProfileGoalChange = (goalId) => {
    if (!goalId) return;
    triggerHaptic();
    const rawGoals = Array.isArray(profile.primaryGoals) ? profile.primaryGoals : [];
    const normalizedGoals = [];
    const dedupe = new Set();
    rawGoals.forEach((entry) => {
      const id = entry?.id;
      if (!id || dedupe.has(id)) return;
      dedupe.add(id);
      const targetUSD =
        Number.isFinite(entry?.targetUSD) && entry.targetUSD > 0
          ? entry.targetUSD
          : getGoalDefaultTargetUSD(id);
      const normalized = {
        ...entry,
        id,
        targetUSD,
        savedUSD: Number.isFinite(entry?.savedUSD) ? entry.savedUSD : 0,
        status: entry?.status || "active",
        createdAt: entry?.createdAt || Date.now(),
      };
      normalizedGoals.push(normalized);
    });
    const previousGoalId = profile.goal || normalizedGoals[0]?.id || DEFAULT_PROFILE.goal;
    if (previousGoalId === goalId) return;
    const previousWish = wishes.find(
      (wish) =>
        wish.kind === PRIMARY_GOAL_KIND &&
        (wish.goalId === previousGoalId || wish.id === previousGoalId)
    );
    if (!normalizedGoals.some((goal) => goal.id === previousGoalId)) {
      const fallbackTarget = getGoalDefaultTargetUSD(previousGoalId);
      normalizedGoals.unshift({
        id: previousGoalId,
        targetUSD: fallbackTarget,
        savedUSD: Number(previousWish?.savedUSD) || 0,
        status: previousWish?.status || "active",
        createdAt: previousWish?.createdAt || Date.now(),
      });
    } else if (previousWish) {
      const prevIndex = normalizedGoals.findIndex((goal) => goal.id === previousGoalId);
      if (prevIndex !== -1) {
        normalizedGoals[prevIndex] = {
          ...normalizedGoals[prevIndex],
          savedUSD: Number.isFinite(previousWish.savedUSD)
            ? previousWish.savedUSD
            : normalizedGoals[prevIndex].savedUSD || 0,
          status: previousWish.status || normalizedGoals[prevIndex].status || "active",
          createdAt: previousWish.createdAt || normalizedGoals[prevIndex].createdAt || Date.now(),
        };
      }
    }
    const formatGoalLabel = (id, entry = null) => {
      if (!id) return "";
      const preset = getGoalPreset(id);
      const customTitle = typeof entry?.customTitle === "string" ? entry.customTitle.trim() : "";
      const hasCustomTitle = !!customTitle;
      const customEmoji = entry?.customEmoji
        ? normalizeEmojiValue(entry.customEmoji, DEFAULT_GOAL_EMOJI)
        : null;
      const resolvedEmoji = hasCustomTitle
        ? customEmoji || DEFAULT_GOAL_EMOJI
        : preset?.emoji || DEFAULT_GOAL_EMOJI;
      const resolvedLabel = hasCustomTitle ? customTitle : preset?.[language] || preset?.en || id;
      return `${resolvedEmoji} ${resolvedLabel || id}`.trim();
    };
    const existingEntry = normalizedGoals.find((goal) => goal.id === goalId) || null;
    const nextGoalEntry = existingEntry
      ? { ...existingEntry }
      : {
          id: goalId,
          targetUSD: getGoalDefaultTargetUSD(goalId),
          savedUSD: 0,
          status: "active",
          createdAt: Date.now(),
        };
    const filteredGoals = normalizedGoals.filter((goal) => goal.id !== goalId);
    const nextPrimaryGoals = [nextGoalEntry, ...filteredGoals];
    const activeGoal = nextGoalEntry.id || DEFAULT_PROFILE.goal;
    const activeTargetUSD =
      Number.isFinite(nextGoalEntry.targetUSD) && nextGoalEntry.targetUSD > 0
        ? nextGoalEntry.targetUSD
        : getGoalDefaultTargetUSD(activeGoal);
    setActiveGoalId(activeGoal);
    setProfile((prev) => ({
      ...prev,
      primaryGoals: nextPrimaryGoals,
      goal: activeGoal,
      goalTargetUSD: activeTargetUSD,
      goalCelebrated: false,
      goalRenewalPending: false,
    }));
    setProfileDraft((prev) => ({
      ...prev,
      primaryGoals: nextPrimaryGoals,
      goal: activeGoal,
      goalTargetUSD: activeTargetUSD,
      goalCelebrated: false,
      goalRenewalPending: false,
    }));
    ensurePrimaryGoalWish(nextPrimaryGoals, language, activeGoal);
    if (previousGoalId && previousGoalId !== activeGoal) {
      const previousEntry = normalizedGoals.find((goal) => goal.id === previousGoalId) || null;
      logHistoryEvent("goal_cancelled", {
        goalId: previousGoalId,
        title: formatGoalLabel(previousGoalId, previousEntry),
      });
    }
    logHistoryEvent("goal_started", {
      goalId: activeGoal,
      title: formatGoalLabel(activeGoal, nextGoalEntry),
    });
  };

  const handleLanguageContinue = () => {
    triggerHaptic();
    if (!termsAccepted) {
      setTermsModalVisible(true);
      setTermsContinuePending(true);
      return;
    }
    goToOnboardingStep("guide");
  };

  const handleGuideContinue = () => {
    triggerHaptic();
    goToOnboardingStep("register");
  };

  const updateRegistrationData = (field, value) => {
    if (field === "currency") {
      setActiveCurrency(value);
      if (onboardingStep !== "done") {
        logEvent("onboarding_currency_chosen", { currency: value });
      }
    }
    if (field === "persona" && onboardingStep !== "done") {
      const habitType = PERSONA_HABIT_TYPES[value] || "custom";
      logEvent("onboarding_persona_chosen", { persona_id: value, habit_type: habitType });
    }
    setRegistrationData((prev) => ({ ...prev, [field]: value }));
  };

  const ensurePrimaryGoalWish = useCallback(
    (goalEntries = [], lng, activeGoal = null) => {
      const entries = Array.isArray(goalEntries) ? goalEntries : [];
      const targetEntry =
        (activeGoal && entries.find((entry) => entry?.id === activeGoal)) || entries[0] || null;
      const firstEntry = targetEntry ? [targetEntry] : [];
      setWishes((prev) => {
        const existingMap = new Map();
        prev.forEach((wish) => {
          if (
            wish.kind === PRIMARY_GOAL_KIND ||
            wish.id === PRIMARY_GOAL_WISH_ID_LEGACY ||
            (typeof wish.id === "string" && wish.id.startsWith("wish_primary_goal_"))
          ) {
            const key = wish.goalId || wish.id.replace("wish_primary_goal_", "") || "legacy";
            existingMap.set(key, wish);
          }
        });
        const nonPrimary = prev.filter(
          (wish) =>
            wish.kind !== PRIMARY_GOAL_KIND &&
            wish.id !== PRIMARY_GOAL_WISH_ID_LEGACY &&
            !(typeof wish.id === "string" && wish.id.startsWith("wish_primary_goal_"))
        );
        const languageKey = lng || "en";
        const nextPrimary = firstEntry
          .filter((entry) => entry?.id)
          .map((entry) => {
            const goalPreset = getGoalPreset(entry.id);
            const customTitle = typeof entry?.customTitle === "string" ? entry.customTitle.trim() : "";
            const hasCustomTitle = !!customTitle;
            const customEmoji = entry?.customEmoji
              ? normalizeEmojiValue(entry.customEmoji, DEFAULT_GOAL_EMOJI)
              : null;
            const resolvedEmoji = hasCustomTitle
              ? customEmoji || DEFAULT_GOAL_EMOJI
              : goalPreset?.emoji || DEFAULT_GOAL_EMOJI;
        const presetLabel = goalPreset?.[languageKey] || goalPreset?.en || entry.id;
        const resolvedLabel = hasCustomTitle ? customTitle : presetLabel || entry.id;
        const title = `${resolvedEmoji} ${resolvedLabel}`.trim();
        const targetUSD =
          Number.isFinite(entry.targetUSD) && entry.targetUSD > 0
            ? entry.targetUSD
            : getGoalDefaultTargetUSD(entry.id);
        const existing = existingMap.get(entry.id);
        const canReuseExisting = existing && existing.status !== "done";
        const fallbackSavedUSD = Number.isFinite(entry.savedUSD) ? entry.savedUSD : 0;
        const fallbackStatus = entry?.status && entry.status !== "done" ? entry.status : "active";
        const fallbackCreatedAt = entry?.createdAt || Date.now();
        return {
          id: getPrimaryGoalWishId(entry.id),
          templateId: `goal_${entry.id}`,
          title,
          emoji: resolvedEmoji,
          targetUSD,
          savedUSD: canReuseExisting ? existing.savedUSD || 0 : fallbackSavedUSD,
          status: canReuseExisting ? existing.status || "active" : fallbackStatus,
          createdAt: canReuseExisting ? existing.createdAt || Date.now() : fallbackCreatedAt,
              autoManaged: true,
              kind: PRIMARY_GOAL_KIND,
              goalId: entry.id,
            };
          });
        return [...nextPrimary, ...nonPrimary];
      });
    },
    [setWishes]
  );

  const openImagePickerSheet = (resolver) => {
    imagePickerResolver.current = resolver;
    setShowImageSourceSheet(true);
  };

  const closeImagePickerSheet = () => {
    setShowImageSourceSheet(false);
    imagePickerResolver.current = null;
  };

  const handleImageSourceChoice = async (source) => {
    const resolver = imagePickerResolver.current;
    closeImagePickerSheet();
    if (!resolver) return;
    await pickImage(source, (uri) => {
      if (!uri) return;
      resolver(uri);
    });
  };

  const handlePickImage = () => {
    openImagePickerSheet((uri) =>
      setProfileDraft((prev) => ({
        ...prev,
        avatar: uri,
      }))
    );
  };

  const handleRegistrationPickImage = () => {
    openImagePickerSheet((uri) =>
      setRegistrationData((prev) => ({
        ...prev,
        avatar: uri,
      }))
    );
  };

  const handleRegistrationSubmit = () => {
    if (!registrationData.firstName.trim()) {
      Alert.alert("Almost", t("inputFirstName"));
      return;
    }
    if (!registrationData.currency) {
      Alert.alert("Almost", t("currencyLabel"));
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    goToOnboardingStep("persona");
  };

  const handleCoinSliderMaxUpdate = useCallback((nextUSD) => {
    if (!Number.isFinite(nextUSD) || nextUSD <= 0) return;
    setCoinSliderMaxUSD(nextUSD);
  }, []);
  const openCoinEntry = useCallback(
    (source = "unknown") => {
      coinEntryContextRef.current = {
        source,
        openedAt: Date.now(),
        submitted: false,
      };
      setCoinEntryVisible(true);
      logEvent("coin_entry_opened", { source });
    },
    [logEvent]
  );
  const handleCoinEntryClose = useCallback(() => {
    const context = coinEntryContextRef.current;
    if (context?.source) {
      logEvent("coin_entry_closed", {
        source: context.source,
        result: context.submitted ? "submitted" : "dismissed",
        duration_ms: Math.max(0, Date.now() - (context.openedAt || 0)),
      });
    }
    coinEntryContextRef.current = { source: null, openedAt: 0, submitted: false };
    setCoinEntryVisible(false);
  }, [logEvent]);

  const handleQuickCustomChange = (field, value) => {
    setQuickSpendDraft((prev) => ({
      ...prev,
      [field]:
        field === "emoji"
          ? limitEmojiInput(value)
          : field === "category"
          ? (IMPULSE_CATEGORY_DEFS[value] ? value : prev.category)
          : value,
    }));
  };

  const resolveTemptationCategory = useCallback(
    (item) => {
      if (!item) return DEFAULT_IMPULSE_CATEGORY;
      const override = categoryOverrides[item.id];
      if (override && IMPULSE_CATEGORY_DEFS[override]) {
        return override;
      }
      if (item.impulseCategoryOverride && IMPULSE_CATEGORY_DEFS[item.impulseCategoryOverride]) {
        return item.impulseCategoryOverride;
      }
      if (Array.isArray(item.categories)) {
        const match = IMPULSE_CATEGORY_ORDER.find((slug) => item.categories.includes(slug));
        if (match) return match;
      }
      const inferred = resolveImpulseCategory(item);
      return IMPULSE_CATEGORY_DEFS[inferred] ? inferred : DEFAULT_IMPULSE_CATEGORY;
    },
    [categoryOverrides]
  );

  const handleQuickCustomSubmit = (customData) => {
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const parsedAmount = parseFloat((customData.amount || "").replace(",", "."));
    if (!customData.title?.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Almost", t("customSpendTitle"));
      return;
    }
    const amountUSD = convertFromCurrency(parsedAmount, currencyCode);
    const ownerGender = profile.gender || "none";
    const emojiValue = normalizeEmojiValue(customData.emoji, DEFAULT_TEMPTATION_EMOJI);
    const category =
      customData.category && IMPULSE_CATEGORY_DEFS[customData.category]
        ? customData.category
        : DEFAULT_IMPULSE_CATEGORY;
    const newCustom = {
      title: customData.title.trim(),
      amountUSD,
      currency: currencyCode,
      emoji: emojiValue,
      id: customData.id || `custom_habit_${Date.now()}`,
      gender: ownerGender,
      impulseCategory: category,
    };
    const card = createCustomHabitTemptation(newCustom, currencyCode, ownerGender);
    if (card) {
      card.gender = ownerGender;
      setQuickTemptations((prev) => [card, ...prev]);
    }
    setCategoryOverrides((prev) => ({ ...prev, [newCustom.id]: category }));
    logEvent("temptation_created", {
      temptation_id: newCustom.id,
      is_custom: true,
      category,
      price: convertToCurrency(amountUSD, currencyCode),
    });
    setQuickSpendDraft({ title: "", amount: "", emoji: DEFAULT_TEMPTATION_EMOJI, category: DEFAULT_IMPULSE_CATEGORY });
    setShowCustomSpend(false);
    triggerOverlayState("custom_temptation", newCustom.title);
  };

  const handleQuickCustomCancel = () => {
    setQuickSpendDraft({ title: "", amount: "", emoji: DEFAULT_TEMPTATION_EMOJI, category: DEFAULT_IMPULSE_CATEGORY });
    setShowCustomSpend(false);
  };

  const handleCoinEntrySubmit = useCallback(
    async ({ amountUSD, category, direction }) => {
      if (!Number.isFinite(amountUSD) || amountUSD <= 0) return;
      if (!category || !IMPULSE_CATEGORY_DEFS[category]) return;
      const action = direction === "save" ? "save" : "spend";
      const entryId = `coin_entry_${Date.now()}`;
      const categoryDef = IMPULSE_CATEGORY_DEFS[category];
      const title =
        language === "ru"
          ? action === "save"
            ? t("coinEntrySaveLabel")
            : t("coinEntrySpendLabel")
          : action === "save"
          ? t("coinEntrySaveLabel")
          : t("coinEntrySpendLabel");
      const virtualItem = {
        id: entryId,
        title,
        emoji: categoryDef.emoji || "✨",
        priceUSD: amountUSD,
        basePriceUSD: amountUSD,
        categories: [category],
        impulseCategoryOverride: category,
      };
      const entryContext = coinEntryContextRef.current || {};
      const entrySource = entryContext.source || "unknown";
      logEvent("coin_entry_submit", {
        source: entrySource,
        direction: action,
        amount_usd: amountUSD,
        category,
      });
      coinEntryContextRef.current = {
        source: entrySource,
        openedAt: entryContext.openedAt || Date.now(),
        submitted: true,
      };
      if (action === "save") {
        const fallbackGoal = activeGoalId || profile.goal || getFallbackGoalId();
        await handleTemptationAction("save", virtualItem, {
          skipPrompt: true,
          goalId: fallbackGoal,
          shouldAssign: false,
        });
      } else {
        await handleTemptationAction("spend", virtualItem, {
          bypassSpendPrompt: true,
        });
      }
      handleCoinEntryClose();
    },
    [activeGoalId, getFallbackGoalId, handleCoinEntryClose, handleTemptationAction, language, logEvent, profile.goal, t]
  );

  const handleFabNewTemptation = useCallback(() => {
    triggerHaptic();
    closeFabMenu();
    setQuickSpendDraft({ title: "", amount: "", emoji: DEFAULT_TEMPTATION_EMOJI, category: DEFAULT_IMPULSE_CATEGORY });
    setShowCustomSpend(true);
  }, [closeFabMenu, triggerHaptic]);

  const handleFabNewGoal = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    closeFabMenu();
    openNewGoalModal(false, "fab_menu");
  }, [closeFabMenu, openNewGoalModal, triggerHaptic]);

  const handleNewGoalChange = useCallback((field, value) => {
    setNewGoalModal((prev) => ({
      ...prev,
      [field]: field === "emoji" ? limitEmojiInput(value) : value,
    }));
  }, []);

  const handleNewGoalCancel = useCallback(() => {
    if (newGoalModal.visible) {
      logEvent("goal_creator_cancelled", {
        source: newGoalModal.source || "unknown",
        make_primary: newGoalModal.makePrimary ? 1 : 0,
      });
    }
    setNewGoalModal({
      visible: false,
      name: "",
      target: "",
      emoji: DEFAULT_GOAL_EMOJI,
      makePrimary: false,
      source: "unknown",
    });
  }, [logEvent, newGoalModal]);

  const handleNewGoalSubmit = useCallback(() => {
    const trimmedName = (newGoalModal.name || "").trim();
    if (!trimmedName) {
      Alert.alert("Almost", t("goalEditNameError"));
      return;
    }
    const parsedLocal = parseNumberInputValue(newGoalModal.target);
    if (!Number.isFinite(parsedLocal) || parsedLocal <= 0) {
      Alert.alert("Almost", t("goalEditTargetError"));
      return;
    }
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const targetUSD = convertFromCurrency(parsedLocal, currencyCode);
    const emoji = normalizeEmojiValue(newGoalModal.emoji, DEFAULT_GOAL_EMOJI);
    if (newGoalModal.makePrimary) {
      const goalId = `custom_goal_${Date.now()}`;
      const goalEntry = {
        id: goalId,
        targetUSD,
        customTitle: trimmedName,
        customEmoji: emoji,
        savedUSD: 0,
        status: "active",
        createdAt: Date.now(),
      };
      const existingGoals = Array.isArray(profile.primaryGoals) ? profile.primaryGoals : [];
      const nextPrimaryGoals = [
        goalEntry,
        ...existingGoals.filter((entry) => entry?.id && entry.id !== goalId),
      ];
      const activeTargetUSD = targetUSD > 0 ? targetUSD : getGoalDefaultTargetUSD(goalId);
      setProfile((prev) => ({
        ...prev,
        primaryGoals: nextPrimaryGoals,
        goal: goalId,
        goalTargetUSD: activeTargetUSD,
        goalCelebrated: false,
        goalRenewalPending: false,
      }));
      setProfileDraft((prev) => ({
        ...prev,
        primaryGoals: nextPrimaryGoals,
        goal: goalId,
        goalTargetUSD: activeTargetUSD,
        goalCelebrated: false,
        goalRenewalPending: false,
      }));
      setActiveGoalId(goalId);
      ensurePrimaryGoalWish(nextPrimaryGoals, language, goalId);
      logHistoryEvent("wish_added", {
        title: trimmedName,
        targetUSD,
        templateId: "manual_primary_goal",
        wishId: getPrimaryGoalWishId(goalId),
      });
      logEvent("goal_manual_created", {
        title: trimmedName,
        target_usd: targetUSD,
        currency: currencyCode,
        is_primary: 1,
      });
      logEvent("goal_created", {
        goal_id: goalId,
        goal_type: resolveGoalTypeFromTarget(targetUSD),
        target_amount: convertToCurrency(targetUSD, currencyCode),
      });
    } else {
      const newWish = {
        id: `wish-manual-${Date.now()}`,
        templateId: null,
        title: trimmedName,
        targetUSD,
        savedUSD: 0,
        status: "active",
        createdAt: Date.now(),
        autoManaged: false,
        emoji,
      };
      setWishes((prev) => insertWishAfterPrimary(prev, newWish));
      ensureActiveGoalForNewWish(newWish);
      logHistoryEvent("wish_added", { title: trimmedName, targetUSD, templateId: "manual_goal", wishId: newWish.id });
      logEvent("goal_manual_created", {
        title: trimmedName,
        target_usd: targetUSD,
        currency: currencyCode,
      });
      logEvent("goal_created", {
        goal_id: newWish.id,
        goal_type: resolveGoalTypeFromTarget(targetUSD),
        target_amount: convertToCurrency(targetUSD, currencyCode),
      });
    }
    triggerOverlayState("purchase", t("wishAdded", { title: trimmedName }));
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    dismissGoalRenewalPrompt();
    setNewGoalModal({
      visible: false,
      name: "",
      target: "",
      emoji: DEFAULT_GOAL_EMOJI,
      makePrimary: false,
      source: "unknown",
    });
  }, [
    dismissGoalRenewalPrompt,
    ensureActiveGoalForNewWish,
    ensurePrimaryGoalWish,
    language,
    logEvent,
    logHistoryEvent,
    newGoalModal,
    profile.primaryGoals,
    profile.currency,
    setProfile,
    setProfileDraft,
    setWishes,
    t,
    triggerHaptic,
    triggerOverlayState,
  ]);

  const openOnboardingGoalModal = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setOnboardingGoalModal({ visible: true, name: "", target: "", emoji: DEFAULT_GOAL_EMOJI });
  }, [triggerHaptic]);

  const handleOnboardingGoalChange = useCallback((field, value) => {
    setOnboardingGoalModal((prev) => ({
      ...prev,
      [field]: field === "emoji" ? limitEmojiInput(value) : value,
    }));
  }, []);

  const handleOnboardingGoalCancel = useCallback(() => {
    setOnboardingGoalModal({ visible: false, name: "", target: "", emoji: DEFAULT_GOAL_EMOJI });
  }, []);

  const handleOnboardingGoalSubmit = useCallback(() => {
    const trimmedName = (onboardingGoalModal.name || "").trim();
    if (!trimmedName) {
      Alert.alert("Almost", t("goalEditNameError"));
      return;
    }
    const parsedLocal = parseNumberInputValue(onboardingGoalModal.target);
    if (!Number.isFinite(parsedLocal) || parsedLocal <= 0) {
      Alert.alert("Almost", t("goalEditTargetError"));
      return;
    }
    const currencyCode = registrationData.currency || DEFAULT_PROFILE.currency;
    const targetUSD = convertFromCurrency(parsedLocal, currencyCode);
    const emoji = normalizeEmojiValue(onboardingGoalModal.emoji, DEFAULT_GOAL_EMOJI);
    const id = `custom_goal_${Date.now()}`;
    const formattedLocal = formatNumberInputValue(parsedLocal);
    setRegistrationData((prev) => {
      const selections = prev.goalSelections || [];
      const nextSelections = selections.includes(id) ? selections : [...selections, id];
      return {
        ...prev,
        customGoals: [
          ...(prev.customGoals || []),
          { id, title: trimmedName, emoji, targetUSD, targetLocal: formattedLocal },
        ],
        goalSelections: nextSelections,
        goalTargetMap: {
          ...(prev.goalTargetMap || {}),
          [id]: formattedLocal,
        },
      };
    });
    logEvent("onboarding_goal_custom_created", {
      title: trimmedName,
      target_usd: targetUSD,
      currency: currencyCode,
    });
    logEvent("goal_created", {
      goal_id: id,
      goal_type: resolveGoalTypeFromTarget(targetUSD),
      target_amount: convertToCurrency(targetUSD, currencyCode),
    });
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setOnboardingGoalModal({ visible: false, name: "", target: "", emoji: DEFAULT_GOAL_EMOJI });
  }, [onboardingGoalModal, registrationData.currency, setRegistrationData, t, triggerHaptic]);

  const handlePersonaSubmit = () => {
    if (!registrationData.persona) {
      Alert.alert("Almost", t("personaHabitLabel"));
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    goToOnboardingStep("habit");
  };

  const handleHabitSubmit = (skip = false) => {
    let sanitizedFrequency = null;
    if (!skip) {
      if (!registrationData.customSpendTitle.trim()) {
        Alert.alert("Almost", t("customSpendTitle"));
        return;
      }
      const parsed = parseFloat((registrationData.customSpendAmount || "").replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert("Almost", t("customSpendAmountLabel"));
        return;
      }
      const frequencyValue = parseFloat(
        (registrationData.customSpendFrequency || "").replace(",", ".")
      );
      if (!Number.isFinite(frequencyValue) || frequencyValue <= 0) {
        Alert.alert("Almost", t("customSpendFrequencyLabel"));
        return;
      }
      sanitizedFrequency = Math.max(1, Math.round(frequencyValue));
      setRegistrationData((prev) => ({
        ...prev,
        customSpendFrequency: `${sanitizedFrequency}`,
      }));
    } else {
      setRegistrationData((prev) => ({
        ...prev,
        customSpendTitle: "",
        customSpendAmount: "",
        customSpendFrequency: "",
        customSpendCategory: DEFAULT_IMPULSE_CATEGORY,
      }));
    }
    const customAmountLocal = parseFloat((registrationData.customSpendAmount || "").replace(",", "."));
    const hasCustom =
      !skip &&
      registrationData.customSpendTitle.trim() &&
      Number.isFinite(customAmountLocal) &&
      customAmountLocal > 0;
    const customAmountUSD = hasCustom
      ? convertFromCurrency(customAmountLocal, registrationData.currency || DEFAULT_PROFILE.currency)
      : 0;
    const frequencyPerWeek = hasCustom ? sanitizedFrequency || 0 : 0;
    logEvent("onboarding_custom_spend", {
      has_custom: !!hasCustom,
      price_usd: customAmountUSD || 0,
      frequency_per_week: frequencyPerWeek,
    });
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    goToOnboardingStep("baseline");
  };

  const handleBaselineSubmit = () => {
    const currencyCode =
      registrationData.currency || profile.currency || DEFAULT_PROFILE.currency;
    const parsedLocal = parseNumberInputValue(registrationData.baselineMonthlyWaste || "");
    if (!Number.isFinite(parsedLocal) || parsedLocal <= 0) {
      Alert.alert("Almost", t("baselineInputError"));
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const timestamp = new Date().toISOString();
    setRegistrationData((prev) => ({
      ...prev,
      baselineMonthlyWaste: formatNumberInputValue(parsedLocal),
      baselineCapturedAt: timestamp,
    }));
    goToOnboardingStep("goal");
  };

  const handleBaselineSetupPrompt = () => {
    triggerHaptic();
    setRegistrationData((prev) => ({
      ...prev,
      currency: profile.currency || prev.currency || DEFAULT_PROFILE.currency,
      baselineMonthlyWaste: "",
      baselineCapturedAt: null,
    }));
    goToOnboardingStep("baseline");
  };

  const handleGoalToggle = (goalId) => {
    triggerHaptic();
    const currentSelections = registrationData.goalSelections || [];
    const wasSelected = currentSelections.includes(goalId);
    const preset = getGoalPreset(goalId);
    const customGoal = customGoalMap[goalId];
    setRegistrationData((prev) => {
      const selections = prev.goalSelections || [];
      const nextSelections = selections.includes(goalId)
        ? selections.filter((id) => id !== goalId)
        : [...selections, goalId];
      const currencyCode = prev.currency || DEFAULT_PROFILE.currency;
      const nextTargetMap = { ...(prev.goalTargetMap || {}) };
      if (selections.includes(goalId)) {
        delete nextTargetMap[goalId];
      } else {
        const defaultLocal = customGoal?.targetLocal
          ? customGoal.targetLocal
          : formatNumberInputValue(
              convertToCurrency(
                preset?.targetUSD || customGoal?.targetUSD || getGoalDefaultTargetUSD(goalId),
                currencyCode
              )
            );
        nextTargetMap[goalId] = nextTargetMap[goalId] || defaultLocal;
      }
      const confirmed = (prev.goalTargetConfirmed || []).filter((id) => id !== goalId);
      return {
        ...prev,
        goalSelections: nextSelections,
        goalTargetMap: nextTargetMap,
        goalTargetConfirmed: confirmed,
      };
    });
    if (!wasSelected && onboardingStep !== "done") {
      logEvent("onboarding_goal_chosen", {
        goal_id: goalId,
        target_usd: customGoal?.targetUSD || preset?.targetUSD || 0,
      });
    }
  };

  const handleGoalTargetSubmit = async () => {
    const selections = registrationData.goalSelections || [];
    if (!selections.length) {
      Alert.alert("Almost", t("goalTitle"));
      return;
    }
    const currencyCode = registrationData.currency || DEFAULT_PROFILE.currency;
    const targets = [];
    for (const goalId of selections) {
      const draftValue = registrationData.goalTargetMap?.[goalId];
      const parsedLocal = parseNumberInputValue(draftValue || "");
      if (!Number.isFinite(parsedLocal) || parsedLocal <= 0) {
        Alert.alert("Almost", t("goalTargetError"));
        return;
      }
      targets.push({
        id: goalId,
        usd: convertFromCurrency(parsedLocal, currencyCode),
      });
    }
    setPendingGoalTargets(targets);
    setRegistrationData((prev) => ({
      ...prev,
      goalTargetConfirmed: selections.slice(),
    }));
    goToOnboardingStep("analytics_consent");
  };

  const handleGoalTargetDraftChange = (goalId, value) => {
    setRegistrationData((prev) => ({
      ...prev,
      goalTargetMap: {
        ...(prev.goalTargetMap || {}),
        [goalId]: value,
      },
    }));
  };

  const handleGoalStageContinue = async () => {
    const selections = registrationData.goalSelections || [];
    if (!selections.length) {
      Alert.alert("Almost", t("goalTitle"));
      return;
    }
    const currentMap = registrationData.goalTargetMap || {};
    let patchedMap = null;
    let needsTargetStep = false;
    const confirmedSet = new Set(registrationData.goalTargetConfirmed || []);
    for (const goalId of selections) {
      const workingMap = patchedMap || currentMap;
      const draftValue = workingMap[goalId];
      let parsedValue = parseNumberInputValue(draftValue || "");
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        const customGoal = customGoalMap[goalId];
        const fallbackValue = customGoal?.targetLocal || "";
        const fallbackParsed = parseNumberInputValue(fallbackValue || "");
        if (Number.isFinite(fallbackParsed) && fallbackParsed > 0) {
          if (!patchedMap) {
            patchedMap = { ...currentMap };
          }
          patchedMap[goalId] = fallbackValue;
          parsedValue = fallbackParsed;
        }
      }
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        needsTargetStep = true;
      }
      if (!customGoalMap[goalId] && !confirmedSet.has(goalId)) {
        needsTargetStep = true;
      }
    }
    if (patchedMap) {
      const mapToPersist = patchedMap;
      setRegistrationData((prev) => ({
        ...prev,
        goalTargetMap: {
          ...(prev.goalTargetMap || {}),
          ...mapToPersist,
        },
      }));
    }
    triggerHaptic();
    if (needsTargetStep) {
      goToOnboardingStep("goal_target");
      return;
    }
    await handleGoalTargetSubmit();
  };

  const handleGoalComplete = async (targetsOverride = null) => {
    const selections = registrationData.goalSelections || [];
    if (!selections.length) {
      Alert.alert("Almost", t("goalTitle"));
      return;
    }
    const currencyCode = registrationData.currency || DEFAULT_PROFILE.currency;
    const targets =
      targetsOverride && targetsOverride.length
        ? targetsOverride
        : selections.map((goalId) => {
            const draftValue = registrationData.goalTargetMap?.[goalId];
            const parsedLocal = parseNumberInputValue(draftValue || "");
            const usd = Number.isFinite(parsedLocal) && parsedLocal > 0
              ? convertFromCurrency(parsedLocal, currencyCode)
              : getGoalDefaultTargetUSD(goalId);
            return { id: goalId, usd };
          });
    const primaryGoals = targets.map((entry) => {
      const goalId = entry.id;
      const targetUSD = entry.usd > 0 ? entry.usd : getGoalDefaultTargetUSD(goalId);
      const customGoal = customGoalMap[goalId];
      const customTitle = typeof customGoal?.title === "string" ? customGoal.title.trim() : "";
      const base = {
        id: goalId,
        targetUSD,
        savedUSD: 0,
        status: "active",
        createdAt: Date.now(),
      };
      if (customTitle) {
        base.customTitle = customTitle;
      }
      if (customGoal?.emoji) {
        base.customEmoji = normalizeEmojiValue(customGoal.emoji, DEFAULT_GOAL_EMOJI);
      }
      return base;
    });
    const activeGoalTargetUSD =
      Number.isFinite(primaryGoals[0]?.targetUSD) && primaryGoals[0].targetUSD > 0
        ? primaryGoals[0].targetUSD
        : getGoalDefaultTargetUSD(primaryGoals[0]?.id || selections[0] || DEFAULT_PROFILE.goal);
    const displayName = `${registrationData.firstName} ${registrationData.lastName}`.trim()
      || registrationData.firstName.trim()
      || DEFAULT_PROFILE.name;
    const personaId = registrationData.persona || DEFAULT_PERSONA_ID;
    const gender = registrationData.gender || "none";
    let customSpend = null;
    const customName = registrationData.customSpendTitle?.trim();
    const customAmount = parseFloat((registrationData.customSpendAmount || "").replace(",", "."));
    const customFrequency = parseFloat(
      (registrationData.customSpendFrequency || "").replace(",", ".")
    );
    if (customName && Number.isFinite(customAmount) && customAmount > 0) {
      const amountUSD = convertFromCurrency(customAmount, registrationData.currency);
      const categoryValue =
        registrationData.customSpendCategory && IMPULSE_CATEGORY_DEFS[registrationData.customSpendCategory]
          ? registrationData.customSpendCategory
          : DEFAULT_IMPULSE_CATEGORY;
      customSpend = {
        title: customName,
        amountUSD,
        currency: registrationData.currency,
        frequencyPerWeek:
          Number.isFinite(customFrequency) && customFrequency > 0
            ? Math.round(customFrequency)
            : 0,
        impulseCategory: categoryValue,
      };
      logEvent("temptation_created", {
        temptation_id: profile.customSpend?.id || "custom_habit",
        is_custom: true,
        category: categoryValue,
        price: customAmount,
      });
    }
    let spendingProfile = profile.spendingProfile || { ...DEFAULT_PROFILE.spendingProfile };
    const baselineLocal = parseNumberInputValue(registrationData.baselineMonthlyWaste || "");
    if (Number.isFinite(baselineLocal) && baselineLocal > 0) {
      spendingProfile = {
        baselineMonthlyWasteUSD: convertFromCurrency(baselineLocal, currencyCode),
        baselineStartAt: registrationData.baselineCapturedAt || new Date().toISOString(),
      };
    }
    const updatedProfile = {
      ...profile,
      name: displayName,
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      subtitle: registrationData.motto || profile.subtitle,
      motto: registrationData.motto || profile.motto,
      avatar: registrationData.avatar || profile.avatar,
      currency: registrationData.currency,
      goal: primaryGoals[0]?.id || DEFAULT_PROFILE.goal,
      primaryGoals,
      goalTargetUSD: activeGoalTargetUSD,
      goalCelebrated: false,
      persona: personaId,
      gender,
      customSpend,
      spendingProfile,
      joinedAt: profile.joinedAt || new Date().toISOString(),
      goalRenewalPending: false,
    };
    setProfile(updatedProfile);
    setProfileDraft(updatedProfile);
    setActiveGoalId(updatedProfile.goal);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile)).catch(() => {});
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, "done").catch(() => {});
    await AsyncStorage.setItem(STORAGE_KEYS.TUTORIAL, "pending").catch(() => {});
    setTutorialSeen(false);
    setFabTutorialVisible(false);
    setFabTutorialStateAndPersist(FAB_TUTORIAL_STATUS.PENDING);
    setFabTutorialEligible(false);
    homeSessionRef.current.sessionCount = 0;
    homeSessionRef.current.pendingIndex = null;
    homeSessionRef.current.dateKey = getDayKey(Date.now());
    setActiveCurrency(updatedProfile.currency);
    ensurePrimaryGoalWish(primaryGoals, language, updatedProfile.goal);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const hasPrimaryGoal = primaryGoals.length > 0;
    const startBalanceLocal = convertToCurrency(
      savedTotalUSD || 0,
      updatedProfile.currency || DEFAULT_PROFILE.currency
    );
    logEvent("onboarding_completed", {
      persona_id: personaId,
      goal_id: primaryGoals[0]?.id || selections[0] || DEFAULT_PROFILE.goal,
      has_goal: hasPrimaryGoal,
      start_balance: startBalanceLocal,
    });
    setTimeout(() => {
      goToOnboardingStep("done", { recordHistory: false, resetHistory: true });
      setRegistrationData(INITIAL_REGISTRATION);
    }, 500);
  };

  const handleAnalyticsConsentComplete = async (allowAnalytics) => {
    const optOut = !allowAnalytics;
    setAnalyticsOptOutState(optOut);
    setAnalyticsOptOutFlag(optOut);
    logEvent("consent_analytics_enabled", { enabled: allowAnalytics, source: "onboarding" });
    const targets = pendingGoalTargets;
    setPendingGoalTargets(null);
    await handleGoalComplete(targets && targets.length ? targets : null);
  };

  const ensureMediaPermission = async (type) => {
    if (type === "library" && Platform.OS === "android") {
      return true;
    }
    const getter =
      type === "camera"
        ? ImagePicker.getCameraPermissionsAsync
        : ImagePicker.getMediaLibraryPermissionsAsync;
    const requester =
      type === "camera"
        ? ImagePicker.requestCameraPermissionsAsync
        : ImagePicker.requestMediaLibraryPermissionsAsync;

    const current = await getter();
    if (current?.granted) return true;
    const requestResult = await requester();
    if (requestResult?.granted) return true;

    Alert.alert(
      "Almost",
      requestResult?.canAskAgain ? t("photoPermissionDenied") : t("photoPermissionSettings"),
      [
        {
          text: t("profileCancel"),
          style: "cancel",
        },
        !requestResult?.canAskAgain
          ? {
              text: t("openSettings"),
              onPress: () => Linking.openSettings?.(),
            }
          : null,
      ].filter(Boolean)
    );
    return false;
  };

  const pickImage = async (source = "library", onPicked) => {
    try {
      triggerHaptic();
      const type = source === "camera" ? "camera" : "library";
      const permitted = await ensureMediaPermission(type);
      if (!permitted) return;
      const pickerOptions = {
        mediaTypes: ["images"],
        quality: 0.8,
        ...(SHOULD_USE_ANDROID_LEGACY_MEDIA_PICKER ? { legacy: true } : {}),
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (!result.canceled && result.assets?.length) {
        const uri = result.assets[0].uri;
        onPicked?.(uri);
      }
    } catch (error) {
      const errorMessage =
        error?.message && error.message.includes("canceled")
          ? null
          : `${t("photoPickerError")}\n${error?.message || ""}`.trim();
      if (errorMessage) {
        Alert.alert("Almost", errorMessage);
      }
      console.warn("image picker", error);
    }
  };

  const registerSmartReminder = useCallback(
    async (entry) => {
      if (!entry) return;
      if (!["refuse_spend", "pending_to_decline", "spend"].includes(entry.kind)) return;
      const timestamp = Number(entry.timestamp) || Date.now();
      const now = Date.now();
      const baseTriggerTime = timestamp + SMART_REMINDER_DELAY_MS;
      if (!Number.isFinite(baseTriggerTime) || baseTriggerTime <= now) return;
      // Space reminders so Android does not deliver multiple notifications at once.
      const futureReminders = (smartRemindersRef.current || []).filter((reminder) => {
        const scheduledAt = Number(reminder?.scheduledAt);
        return Number.isFinite(scheduledAt) && scheduledAt > now;
      });
      const lastScheduledAt = futureReminders.reduce(
        (latest, reminder) => Math.max(latest, Number(reminder.scheduledAt) || 0),
        0
      );
      const triggerTime =
        lastScheduledAt > 0
          ? Math.max(baseTriggerTime, lastScheduledAt + SMART_REMINDER_MIN_INTERVAL_MS)
          : baseTriggerTime;
      const permitted = await ensureNotificationPermission();
      if (!permitted) return;
      const templateId = entry.meta?.templateId || entry.meta?.id || entry.meta?.template_id;
      const metaTitle =
        (typeof entry.meta?.title === "string" && entry.meta.title.trim()) ||
        resolveTemplateTitle(templateId, "") ||
        "";
      const title = metaTitle || t("defaultDealTitle");
      const isSpendEvent = entry.kind === "spend";
      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: isSpendEvent
              ? t("smartInsightSpendTitle", { temptation: title })
              : t("smartInsightDeclineTitle", { temptation: title }),
            body: isSpendEvent
              ? t("smartInsightSpendBody", { temptation: title })
              : t("smartInsightDeclineBody", { temptation: title }),
          },
          trigger: new Date(triggerTime),
        });
        const payload = {
          id: `smart-${entry.id}`,
          eventId: entry.id,
          kind: entry.kind,
          title,
          timestamp,
          scheduledAt: triggerTime,
          notificationId,
        };
        setSmartReminders((prev) => normalizeSmartReminderEntries([payload, ...prev]));
      } catch (error) {
        console.warn("smart reminder schedule", error);
      }
    },
    [ensureNotificationPermission, resolveTemplateTitle, setSmartReminders, t]
  );

  const logHistoryEvent = useCallback(
    (kind, meta = {}) => {
      const timestamp = Date.now();
      const entry = {
        id: `history-${timestamp}-${Math.random().toString(16).slice(2, 6)}`,
        kind,
        meta,
        timestamp,
      };
      setHistoryEvents((prev) => {
        const next = [entry, ...prev].filter((item) => {
          if (!item?.timestamp) return false;
          return timestamp - item.timestamp <= HISTORY_RETENTION_MS;
        });
        return next.slice(0, MAX_HISTORY_EVENTS);
      });
      setChallengesState((prev) => applyChallengeEvent(prev, entry));
      registerSmartReminder(entry);
    },
    [registerSmartReminder, setChallengesState]
  );

  const recomputeHistoryAggregates = useCallback(
    (list) => {
      let nextDeclines = 0;
      let resolvedToWishes = 0;
      let resolvedToDeclines = 0;
      const nextRefuseStats = {};
      (list || []).forEach((entry) => {
        if (!entry) return;
        if (entry.kind === "refuse_spend") {
          const amount = Math.max(0, Number(entry.meta?.amountUSD) || 0);
          nextDeclines += 1;
          const templateId =
            entry.meta?.templateId || entry.meta?.id || entry.meta?.title || "unknown";
          const current = nextRefuseStats[templateId] || {
            count: 0,
            totalUSD: 0,
            lastSavedAt: 0,
            lastSavedAmountUSD: 0,
          };
          current.count += 1;
          current.totalUSD += amount;
          if (!current.lastSavedAt || (entry.timestamp || 0) > current.lastSavedAt) {
            current.lastSavedAt = entry.timestamp || 0;
            current.lastSavedAmountUSD = amount;
          }
          nextRefuseStats[templateId] = current;
        } else if (entry.kind === "pending_to_wish") {
          resolvedToWishes += 1;
        } else if (entry.kind === "pending_to_decline") {
          resolvedToDeclines += 1;
        }
      });
      setDeclineCount(nextDeclines);
      setRefuseStats(nextRefuseStats);
      setDecisionStats((prev) => ({
        ...prev,
        resolvedToWishes,
        resolvedToDeclines,
      }));
    },
    [setDeclineCount, setDecisionStats, setRefuseStats, setSavedTotalUSD]
  );

  const rebuildSavingsFromHistory = useCallback(
    (list) => {
      const normalized = Array.isArray(list) ? list.filter(Boolean) : [];
      if (!normalized.length) {
        setSavedTotalUSD(0);
        setLifetimeSavedUSD(0);
        return;
      }
      const sorted = normalized.slice().sort((a, b) => {
        const aStamp = typeof a?.timestamp === "number" ? a.timestamp : 0;
        const bStamp = typeof b?.timestamp === "number" ? b.timestamp : 0;
        return aStamp - bStamp;
      });
      let running = 0;
      let peak = 0;
      sorted.forEach((entry) => {
        if (!entry?.kind) return;
        const amount = Math.max(0, Number(entry?.meta?.amountUSD) || 0);
        if (!amount) return;
        if (HISTORY_SAVED_GAIN_EVENTS.has(entry.kind)) {
          running += amount;
        } else if (HISTORY_SAVED_LOSS_EVENTS.has(entry.kind)) {
          running -= amount;
        }
        if (running < 0) running = 0;
        if (running > peak) peak = running;
      });
      setSavedTotalUSD(running);
      setLifetimeSavedUSD(peak);
    },
    [setLifetimeSavedUSD, setSavedTotalUSD]
  );

  const handleHistoryDelete = useCallback(
    (entry) => {
      if (!entry) return;
      const entryId = entry.id;
      if (entry.kind === "refuse_spend") {
        const amountUSD = Math.max(0, Number(entry.meta?.amountUSD) || 0);
        const metaCoinReward = Math.max(0, Number(entry.meta?.coinReward) || 0);
        const resolvedCurrency = entry.meta?.currency || profile.currency || DEFAULT_PROFILE.currency;
        const coinRefund = metaCoinReward > 0
          ? metaCoinReward
          : computeRefuseCoinReward(amountUSD, resolvedCurrency);
        if (coinRefund > 0) {
          setHealthPoints((prev) => Math.max(0, prev - coinRefund));
        }
      }
      setHistoryEvents((prev) => {
        const next = prev.filter((h) => h.id !== entryId);
        AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next)).catch(() => {});
        rebuildSavingsFromHistory(next);
        setChallengesState((prevState) => rebuildChallengeProgressFromHistory(next, prevState));
        return next;
      });
      if (entry.kind === "pending_added" && entry.meta?.pendingId) {
        setPendingList((prev) => prev.filter((p) => p.id !== entry.meta.pendingId));
      }
      if (entry.kind === "wish_added" && entry.meta?.wishId) {
        setWishes((prev) => prev.filter((w) => w.id !== entry.meta.wishId));
      }
    },
    [profile.currency, rebuildSavingsFromHistory, setPendingList, setWishes, setHealthPoints, setChallengesState]
  );

  useEffect(() => {
    recomputeHistoryAggregates(resolvedHistoryEvents);
  }, [resolvedHistoryEvents, recomputeHistoryAggregates]);
  const maybeTriggerNorthStarMetric = useCallback(() => {
    if (!northStarHydrated || !profileHydrated || northStarLoggedRef.current) return;
    if (!profileJoinedAt) return;
    const joinedAtTimestamp = new Date(profileJoinedAt).getTime();
    if (!Number.isFinite(joinedAtTimestamp)) return;
    const windowEnd = joinedAtTimestamp + NORTH_STAR_WINDOW_MS;
    let savesInWindow = 0;
    resolvedHistoryEvents.forEach((entry) => {
      if (entry?.kind !== "refuse_spend") return;
      const eventTimestamp = typeof entry.timestamp === "number" ? entry.timestamp : 0;
      if (!eventTimestamp) return;
      if (eventTimestamp >= joinedAtTimestamp && eventTimestamp <= windowEnd) {
        savesInWindow += 1;
      }
    });
    if (savesInWindow < NORTH_STAR_SAVE_THRESHOLD) return;
    const hoursSinceJoinRaw = Math.max(0, (Date.now() - joinedAtTimestamp) / (1000 * 60 * 60));
    const hoursSinceJoin = Math.min(24, Math.round(hoursSinceJoinRaw * 10) / 10);
    setNorthStarLogged(true);
    northStarLoggedRef.current = true;
    AsyncStorage.setItem(
      STORAGE_KEYS.NORTH_STAR_METRIC,
      JSON.stringify({
        logged: true,
        loggedAt: new Date().toISOString(),
        savesInWindow,
      })
    ).catch(() => {});
    logEvent("north_star_two_saves", {
      saves_in_window: savesInWindow,
      hours_since_join: hoursSinceJoin,
    });
  }, [logEvent, northStarHydrated, profileHydrated, profileJoinedAt, resolvedHistoryEvents]);
  useEffect(() => {
    maybeTriggerNorthStarMetric();
  }, [maybeTriggerNorthStarMetric]);

  const triggerCardFeedback = useCallback((templateId) => {
    if (!templateId) return;
    const burstKey = Date.now();
    setCardFeedback((prev) => ({
      ...prev,
      [templateId]: {
        ...(prev[templateId] || {}),
        message: true,
        burstKey,
      },
    }));
    if (cardFeedbackTimers.current[templateId]) {
      clearTimeout(cardFeedbackTimers.current[templateId]);
    }
    cardFeedbackTimers.current[templateId] = setTimeout(() => {
      setCardFeedback((prev) => {
        const entry = prev[templateId];
        if (!entry) return prev;
        return {
          ...prev,
          [templateId]: {
            ...entry,
            message: false,
          },
        };
      });
      delete cardFeedbackTimers.current[templateId];
    }, 2000);
  }, []);

  const triggerCoinHaptics = useCallback(() => {
    const pulses = [0, 90, 180, 270];
    pulses.forEach((delay) => {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }, delay);
    });
  }, []);

  const closeSpendPrompt = useCallback(() => {
    setSpendPrompt({ visible: false, item: null });
  }, []);

  const processMascotQueue = useCallback(() => {
    if (overlay || mascotBusyRef.current) return;
    if (!mascotQueueRef.current.length) return;
    const next = mascotQueueRef.current.shift();
    if (!next) return;
    mascotBusyRef.current = true;
    setMascotOverride({ ...next, key: Date.now() });
  }, [overlay]);

  useEffect(() => {
    if (!overlay) {
      processMascotQueue();
    }
  }, [overlay, processMascotQueue]);

  const requestMascotAnimation = useCallback(
    (type, duration) => {
      const resolvedDuration = duration || TAMAGOTCHI_REACTION_DURATION[type] || 3200;
      mascotQueueRef.current.push({ type, duration: resolvedDuration });
      processMascotQueue();
    },
    [processMascotQueue]
  );

  const feedTamagotchi = useCallback(
    (foodId = TAMAGOTCHI_DEFAULT_FOOD_ID) => {
      const food = TAMAGOTCHI_FOOD_MAP[foodId] || TAMAGOTCHI_FOOD_MAP[TAMAGOTCHI_DEFAULT_FOOD_ID];
      if (!food) return;
      if (tamagotchiState.hunger >= TAMAGOTCHI_MAX_HUNGER) {
        Alert.alert(
          language === "ru" ? "Алми" : "Almi",
          language === "ru"
            ? "Алми сыта на 100%. Вернись позже, когда появится голод."
            : "Almi is already full. Come back later when she gets hungry."
        );
        return;
      }
      if (tamagotchiCoins < food.cost) {
        const hint =
          language === "ru"
            ? "Пополняй монетки через отказы, уровни и награды."
            : "Earn coins via saves, levels and rewards.";
        const needText =
          language === "ru"
            ? `Нужно минимум ${food.cost} монет на ${food.emoji}.`
            : `You need at least ${food.cost} coins for ${food.emoji}.`;
        Alert.alert(language === "ru" ? "Алми" : "Almi", `${needText}\n\n${hint}`);
        return;
      }
      let hungerBefore = tamagotchiState.hunger;
      let hungerAfter = tamagotchiState.hunger;
      setTamagotchiState((prev) => {
        const prevHunger = Math.max(0, Number(prev.hunger) || 0);
        const nextHunger = Math.min(TAMAGOTCHI_MAX_HUNGER, prevHunger + food.hungerBoost);
        hungerBefore = prevHunger;
        hungerAfter = nextHunger;
        const nextFoodId = resolveNextTamagotchiFoodId(nextHunger, food.id, true);
        return {
          ...prev,
          hunger: nextHunger,
          lastFedAt: new Date().toISOString(),
          desiredFoodId: nextFoodId,
        };
      });
      const coinsAfter = Math.max(0, tamagotchiCoins - food.cost);
      logEvent("tamagotchi_feed", {
        food_id: food.id,
        food_cost: food.cost,
        hunger_before: hungerBefore,
        hunger_after: hungerAfter,
        coins_before: tamagotchiCoins,
        coins_after: coinsAfter,
      });
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      setHealthPoints((coins) => Math.max(0, coins - food.cost));
      requestMascotAnimation("happy", 3600);
    },
    [language, logEvent, requestMascotAnimation, setHealthPoints, tamagotchiCoins, tamagotchiState.hunger]
  );

  const stopPartyEffects = useCallback(() => {
    if (partyGlowAnimRef.current) {
      partyGlowAnimRef.current.stop();
      partyGlowAnimRef.current = null;
    }
    partyGlow.setValue(0);
    setPartyActive(false);
  }, [partyGlow]);

  const runPartyEffects = useCallback(
    (cyclesLeft = 2) => {
      const executeCycle = (remaining) => {
        if (remaining <= 0) {
          stopPartyEffects();
          return;
        }
        setPartyBurstKey((prev) => prev + 1);
        const glowPulse = Animated.sequence([
          Animated.timing(partyGlow, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(partyGlow, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(320),
        ]);
        partyGlowAnimRef.current = glowPulse;
        glowPulse.start(() => executeCycle(remaining - 1));
      };
      executeCycle(cyclesLeft);
    },
    [partyGlow, stopPartyEffects]
  );

  useEffect(() => {
    return () => {
      stopPartyEffects();
    };
  }, [stopPartyEffects]);


  const startParty = useCallback(() => {
    if (tamagotchiCoins < TAMAGOTCHI_PARTY_COST) {
      const hint =
        language === "ru"
          ? "Пополняй монетки через отказы, уровни и награды."
          : "Earn more coins through saves, levels and rewards.";
      Alert.alert(
        language === "ru" ? "Алми" : "Almi",
        language === "ru"
          ? `Нужно ${TAMAGOTCHI_PARTY_BLUE_COST} синих монет на вечеринку.\n\n${hint}`
          : `You need ${TAMAGOTCHI_PARTY_BLUE_COST} blue coins to start a party.\n\n${hint}`
      );
      return;
    }
    setHealthPoints((coins) => Math.max(0, coins - TAMAGOTCHI_PARTY_COST));
    stopPartyEffects();
    setPartyActive(true);
    runPartyEffects(2);
    requestMascotAnimation("happyHeadshake", 3600);
  }, [language, requestMascotAnimation, runPartyEffects, setHealthPoints, stopPartyEffects, tamagotchiCoins]);

  const handleMascotAnimationComplete = useCallback(() => {
    mascotBusyRef.current = false;
    if (!overlay && mascotQueueRef.current.length) {
      const next = mascotQueueRef.current.shift();
      if (next) {
        mascotBusyRef.current = true;
        setMascotOverride({ ...next, key: Date.now() });
        return;
      }
    }
    setMascotOverride(null);
  }, [overlay]);

  const triggerStormEffect = useCallback(() => {
    if (stormTimerRef.current) {
      clearTimeout(stormTimerRef.current);
    }
    setStormActive(true);
    stormTimerRef.current = setTimeout(() => setStormActive(false), 2400);
  }, []);
  const recordTemptationInteraction = useCallback((templateId, actionType) => {
    if (!templateId) return;
    if (actionType !== "save" && actionType !== "spend") return;
    setTemptationInteractions((prev) => {
      const prevEntry = prev?.[templateId] || { saveCount: 0, spendCount: 0, lastInteractionAt: 0 };
      const nextEntry = {
        saveCount: (prevEntry.saveCount || 0) + (actionType === "save" ? 1 : 0),
        spendCount: (prevEntry.spendCount || 0) + (actionType === "spend" ? 1 : 0),
        lastInteractionAt: Date.now(),
      };
      return {
        ...(prev || {}),
        [templateId]: nextEntry,
      };
    });
  }, []);
  const executeSpend = useCallback(
    (item) => {
      if (!item) return;
      const priceUSD = item.priceUSD || item.basePriceUSD || 0;
      const title = `${item.emoji || "✨"} ${
        item.title?.[language] || item.title?.en || item.title || "wish"
      }`;
      registerFocusLoss(item);
      handleFocusSpend(item);
      logHistoryEvent("spend", { title, amountUSD: priceUSD });
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      setSavedTotalUSD((prev) => Math.max(prev - priceUSD, 0));
      setPurchases((prev) => [
        {
          id: `spend-${item.id}-${Date.now()}`,
          title,
          price: priceUSD,
          paidAmount: priceUSD,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
      setFreeDayStats((prev) => {
        const todayKey = getDayKey(Date.now());
        if (!prev) {
          return { ...INITIAL_FREE_DAY_STATS, blockedDate: todayKey };
        }
        if (prev.blockedDate === todayKey && prev.current === 0) {
          return prev;
        }
        const next = {
          ...prev,
          current: 0,
          blockedDate: todayKey,
        };
        return next;
      });
      logImpulseEvent("spend", item, priceUSD, title);
      requestMascotAnimation(Math.random() > 0.5 ? "sad" : "ohno");
      recordTemptationInteraction(item.id, "spend");
    },
    [handleFocusSpend, language, logHistoryEvent, logImpulseEvent, recordTemptationInteraction, registerFocusLoss, requestMascotAnimation, setFreeDayStats]
  );

  const handleSpendConfirm = useCallback(() => {
    if (!spendPrompt.item) return;
    const item = spendPrompt.item;
    closeSpendPrompt();
    triggerStormEffect();
    executeSpend(item);
  }, [closeSpendPrompt, executeSpend, spendPrompt.item, triggerStormEffect]);

  const buildTemptationPayload = useCallback(
    (item, extra = {}) => {
      const priceUSD = item.priceUSD || item.basePriceUSD || 0;
      return {
        item_id: item.id,
        price_usd: priceUSD,
        categories: (item.categories || []).join(","),
        persona: profile.persona || "unknown",
        currency: profile.currency || DEFAULT_PROFILE.currency,
        ...extra,
      };
    },
    [profile.currency, profile.persona]
  );

  const logTemptationAction = useCallback(
    (action, item, extra = {}) => {
      if (!item || !action) return;
      logEvent("temptation_action", buildTemptationPayload(item, { action, ...extra }));
    },
    [buildTemptationPayload]
  );

  const logImpulseEvent = useCallback(
    (action, item, amountUSD = 0, overrideTitle = null) => {
      if (!item || (action !== "save" && action !== "spend")) return;
      const timestamp = Date.now();
      const entryTitle =
        overrideTitle ||
        `${item.emoji || "✨"} ${
          item.title?.[language] || item.title?.en || item.title || t("defaultDealTitle")
        }`;
      const event = {
        id: `impulse-${timestamp}-${Math.random().toString(16).slice(2, 6)}`,
        templateId: item.id,
        title: entryTitle,
        emoji: item.emoji || "✨",
        category: resolveImpulseCategory(item),
        action,
        amountUSD: amountUSD || item.priceUSD || item.basePriceUSD || 0,
        timestamp,
        hour: new Date(timestamp).getHours(),
      };
      setImpulseTracker((prev) => {
        const nextEvents = [event, ...(prev?.events || [])].slice(0, MAX_IMPULSE_EVENTS);
        return {
          ...(prev || INITIAL_IMPULSE_TRACKER),
          events: nextEvents,
        };
      });
    },
    [language, t]
  );

  const handleTemptationAction = useCallback(
    async (type, item, options = {}) => {
      const {
        skipPrompt = false,
        goalId: forcedGoalId = null,
        shouldAssign = false,
        pinnedBy = null,
        bypassSpendPrompt = false,
      } = options || {};
      const priceUSD = item.priceUSD || item.basePriceUSD || 0;
      const title = `${item.emoji || "✨"} ${
        item.title?.[language] || item.title?.en || item.title || "wish"
      }`;
      const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
      const priceLocal = convertToCurrency(priceUSD, currencyCode);
      const balanceLocal = convertToCurrency(savedTotalUSD, currencyCode);
      if (type === "spend") {
        logTemptationAction("spend", item);
        logEvent("temptation_spend", buildTemptationPayload(item, { total_saved_usd: savedTotalUSD }));
        logEvent("temptation_decision", {
          temptation_id: item.id,
          decision: "spend",
          price: priceLocal,
          balance_before: balanceLocal,
        });
        if (bypassSpendPrompt) {
          triggerStormEffect();
          executeSpend(item);
        } else {
          setSpendPrompt({ visible: true, item });
        }
        return;
      }
      if (type === "want") {
        logTemptationAction("wish", item);
        logEvent("temptation_want", buildTemptationPayload(item));
        const newWish = {
          id: `wish-${item.id}-${Date.now()}`,
          templateId: item.id,
          title,
          targetUSD: priceUSD,
          savedUSD: 0,
          status: "active",
          createdAt: Date.now(),
          autoManaged: false,
          emoji: item.emoji || DEFAULT_GOAL_EMOJI,
          pinnedSource: pinnedBy,
        };
        setWishes((prev) => insertWishAfterPrimary(prev, newWish));
        logHistoryEvent("wish_added", { title, targetUSD: priceUSD, templateId: item.id, wishId: newWish.id });
        triggerOverlayState("purchase", t("wishAdded", { title }));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }
      if (type === "save") {
        const saveTimestamp = Date.now();
        const windowStart = saveTimestamp - SAVE_SPAM_WINDOW_MS;
        const recentSaves = saveActionLogRef.current.filter(
          (entry) => entry.timestamp >= windowStart
        );
        const sameItemCount = recentSaves.filter((entry) => entry.itemId === item.id).length;
        const totalSaveCount = recentSaves.length;
        if (sameItemCount >= SAVE_SPAM_ITEM_LIMIT) {
          Alert.alert("Almost", t("saveSpamWarningItem"));
          return;
        }
        if (totalSaveCount >= SAVE_SPAM_GLOBAL_LIMIT) {
          Alert.alert("Almost", t("saveSpamWarningGlobal"));
          return;
        }
        const storedGoalId = resolveTemptationGoalId(item.id);
        const desiredGoalId = forcedGoalId || storedGoalId;
        const shouldPrompt =
          !skipPrompt && assignableGoals.length > 1 && !desiredGoalId;
        if (shouldPrompt) {
          setGoalLinkPrompt({ visible: true, item, intent: "save" });
          return;
        }
        let targetGoalId = desiredGoalId || getFallbackGoalId();
        if (!targetGoalId && assignableGoals.length === 0 && wishes.length > 0) {
          targetGoalId = wishes[0].id;
        }
        const shouldStoreGoal =
          (shouldAssign && !!targetGoalId) ||
          (!storedGoalId && !forcedGoalId && !!targetGoalId);
        if (shouldStoreGoal) {
          assignTemptationGoal(item.id, targetGoalId);
        }
        const targetWish = targetGoalId ? wishes.find((wish) => wish.id === targetGoalId) : null;
        logEvent("temptation_decision", {
          temptation_id: item.id,
          decision: "save",
          price: priceLocal,
          balance_before: balanceLocal,
          saving_target_id: targetGoalId || null,
        });
        let appliedAmount = 0;
        if (targetGoalId) {
          appliedAmount = applySavingsToWish(targetGoalId, priceUSD);
        }
        let saveOverlayPayload = { title, moodLine: moodPreset?.saveOverlay || null };
        if (targetWish && targetWish.targetUSD > 0 && priceUSD > 0) {
          const previousSavedUSD = targetWish.savedUSD || 0;
          const targetUSD = targetWish.targetUSD || 0;
          const nextSavedUSD = Math.min(previousSavedUSD + appliedAmount, targetUSD);
          const remainingUSD = Math.max(targetUSD - nextSavedUSD, 0);
          const remainingTemptations = Math.max(Math.ceil(remainingUSD / priceUSD), 0);
          saveOverlayPayload = {
            ...saveOverlayPayload,
            goalTitle: targetWish.title || "",
            remainingTemptations,
            goalComplete: remainingUSD <= 0,
          };
          const progressPercent =
            targetUSD > 0 ? Math.min((nextSavedUSD / targetUSD) * 100, 100) : 0;
          if (targetGoalId && appliedAmount > 0) {
            logEvent("saving_progress_updated", {
              target_id: targetGoalId,
              amount_added: convertToCurrency(appliedAmount, currencyCode),
              new_progress: progressPercent,
            });
          }
        }
        const timestamp = saveTimestamp;
        setSavedTotalUSD((prev) => prev + priceUSD);
        setDeclineCount((prev) => prev + 1);
        const coinReward = priceUSD
          ? computeRefuseCoinReward(priceUSD, profile.currency || DEFAULT_PROFILE.currency)
          : 0;
        if (coinReward > 0) {
          setHealthPoints((prev) => prev + coinReward);
        }
        setRefuseStats((prev) => {
          const current = prev[item.id] || {};
          const count = (current.count || 0) + 1;
          const totalUSD = (current.totalUSD || 0) + priceUSD;
          return {
            ...prev,
            [item.id]: {
              count,
              totalUSD,
              lastSavedAt: timestamp,
              lastSavedAmountUSD: priceUSD,
            },
          };
        });
        logHistoryEvent("refuse_spend", {
          title,
          amountUSD: priceUSD,
          templateId: item.id,
          coinReward,
          currency: profile.currency || DEFAULT_PROFILE.currency,
        });
        const refuseStatsEntry = refuseStats[item.id] || {};
        logEvent(
          "temptation_save",
          buildTemptationPayload(item, {
            total_saved_usd: savedTotalUSD + priceUSD,
            refuse_count_for_item: (refuseStatsEntry.count || 0) + 1,
          })
        );
        logTemptationAction("save", item, { goal_id: targetGoalId || null });
        logImpulseEvent("save", item, priceUSD, title);
        triggerCardFeedback(item.id);
        triggerCoinHaptics();
        handleFocusSaveProgress(item);
        triggerOverlayState("save", { ...saveOverlayPayload, coinReward });
        requestMascotAnimation("happy");
        saveActionLogRef.current = [...recentSaves, { itemId: item.id, timestamp: saveTimestamp }];
        recordTemptationInteraction(item.id, "save");
        return;
      }
      if (type === "maybe") {
        logEvent(
          "temptation_think_later",
          buildTemptationPayload(item, { reminder_days: REMINDER_DAYS })
        );
        logTemptationAction("pending", item);
        const now = Date.now();
        const pendingEntry = {
          id: `pending-${item.id}-${now}`,
          templateId: item.id,
          title,
          priceUSD,
          createdAt: now,
          decisionDue: now + REMINDER_MS,
          notificationId: null,
        };
        logEvent(
          "pending_added",
          buildTemptationPayload(item, {
            remind_at: pendingEntry.decisionDue,
          })
        );
        const reminderId = await schedulePendingReminder(title, pendingEntry.decisionDue);
        if (reminderId) pendingEntry.notificationId = reminderId;
        setPendingList((prev) => [pendingEntry, ...prev]);
        logHistoryEvent("pending_added", { title, amountUSD: priceUSD, pendingId: pendingEntry.id });
        triggerOverlayState("cart", t("pendingAdded"));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }
      Alert.alert("Almost", t("actionSoon"));
    },
    [
      language,
      t,
      schedulePendingReminder,
      logHistoryEvent,
      triggerCardFeedback,
      triggerCoinHaptics,
      buildTemptationPayload,
      savedTotalUSD,
      refuseStats,
      logImpulseEvent,
      logTemptationAction,
      resolveTemptationGoalId,
      assignableGoals.length,
      assignTemptationGoal,
      applySavingsToWish,
      setGoalLinkPrompt,
      getFallbackGoalId,
      wishes,
      moodPreset,
      requestMascotAnimation,
      handleFocusSaveProgress,
      logEvent,
      profile.currency,
      executeSpend,
      triggerStormEffect,
      recordTemptationInteraction,
    ]
  );

  const closeGoalLinkPrompt = useCallback(() => {
    setGoalLinkPrompt({ visible: false, item: null, intent: null });
  }, []);

  const handleGoalLinkSelect = useCallback(
    (wishId) => {
      const sourceItem = goalLinkPrompt.item;
      const intent = goalLinkPrompt.intent;
      closeGoalLinkPrompt();
      if (!wishId || !sourceItem) return;
      if (intent === "save") {
        handleTemptationAction("save", sourceItem, {
          skipPrompt: true,
          goalId: wishId,
          shouldAssign: true,
        });
        return;
      }
      assignTemptationGoal(sourceItem.id, wishId);
    },
    [assignTemptationGoal, closeGoalLinkPrompt, goalLinkPrompt, handleTemptationAction]
  );

  const handleGoalLongPress = useCallback(
    (wish) => {
      if (!wish) return;
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      setGoalTemptationPrompt({ visible: true, wish });
    },
    [triggerHaptic]
  );

  const closeGoalTemptationPrompt = useCallback(() => {
    setGoalTemptationPrompt({ visible: false, wish: null });
  }, []);

  const handleGoalTemptationAssign = useCallback(
    (templateId) => {
      const targetWish = goalTemptationPrompt.wish;
      closeGoalTemptationPrompt();
      if (!templateId || !targetWish) return;
      assignTemptationGoal(templateId, targetWish.id);
    },
    [assignTemptationGoal, closeGoalTemptationPrompt, goalTemptationPrompt]
  );

  const handleNewPendingSubmit = useCallback(async () => {
    const trimmedTitle = (newPendingModal.title || "").trim();
    if (!trimmedTitle) {
      Alert.alert("Almost", t("pendingCustomError"));
      return;
    }
    const parsedLocal = parseNumberInputValue(newPendingModal.amount);
    if (!Number.isFinite(parsedLocal) || parsedLocal <= 0) {
      Alert.alert("Almost", t("pendingCustomError"));
      return;
    }
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const amountUSD = convertFromCurrency(parsedLocal, currencyCode);
    const emoji = normalizeEmojiValue(newPendingModal.emoji, DEFAULT_TEMPTATION_EMOJI);
    const manualItem = {
      id: `manual_pending_${Date.now()}`,
      title: trimmedTitle,
      emoji,
      priceUSD: amountUSD,
      basePriceUSD: amountUSD,
      categories: [],
    };
    await handleTemptationAction("maybe", manualItem);
    setNewPendingModal({ visible: false, title: "", amount: "", emoji: DEFAULT_TEMPTATION_EMOJI });
  }, [handleTemptationAction, newPendingModal, profile.currency, t]);

  const openGoalEditorPrompt = useCallback(
    (wish) => {
      if (!wish) return;
      const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
      const targetLocal = formatNumberInputValue(convertToCurrency(wish.targetUSD || 0, currencyCode));
      setGoalEditorPrompt({
        visible: true,
        wish,
        name: getWishTitleWithoutEmoji(wish) || "",
        target: targetLocal,
        emoji: normalizeEmojiValue(wish.emoji || resolveWishEmoji(wish), DEFAULT_GOAL_EMOJI),
      });
    },
    [profile.currency]
  );

  const closeGoalEditorPrompt = useCallback(() => {
    setGoalEditorPrompt({
      visible: false,
      wish: null,
      name: "",
      target: "",
      emoji: DEFAULT_GOAL_EMOJI,
    });
  }, []);

  const handleGoalEditorNameChange = useCallback((value) => {
    setGoalEditorPrompt((prev) => ({ ...prev, name: value }));
  }, []);

  const handleGoalEditorTargetChange = useCallback((value) => {
    setGoalEditorPrompt((prev) => ({ ...prev, target: value }));
  }, []);

  const handleGoalEditorEmojiChange = useCallback((value) => {
    setGoalEditorPrompt((prev) => ({ ...prev, emoji: limitEmojiInput(value) }));
  }, []);

  const saveGoalEditorPrompt = useCallback(() => {
    if (!goalEditorPrompt.wish) return;
    const trimmedName = goalEditorPrompt.name?.trim();
    if (!trimmedName) {
      Alert.alert("Almost", t("goalEditNameError"));
      return;
    }
    const parsed = parseNumberInputValue(goalEditorPrompt.target);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Almost", t("goalEditTargetError"));
      return;
    }
    const fallbackEmoji = resolveWishEmoji(goalEditorPrompt.wish);
    const normalizedEmoji = normalizeEmojiValue(
      goalEditorPrompt.emoji,
      fallbackEmoji || DEFAULT_GOAL_EMOJI
    );
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const nextTargetUSD = convertFromCurrency(parsed, currencyCode);
    let resultingStatus = goalEditorPrompt.wish.status || "active";
    setWishes((prev) => {
      let statusCapture = resultingStatus;
      const next = prev.map((wish) => {
        if (wish.id !== goalEditorPrompt.wish.id) return wish;
        const nextSaved = Math.min(wish.savedUSD || 0, nextTargetUSD);
        const nextStatus = nextSaved >= nextTargetUSD ? "done" : "active";
        statusCapture = nextStatus;
        return {
          ...wish,
          title: trimmedName,
          emoji: normalizedEmoji,
          targetUSD: nextTargetUSD,
          savedUSD: nextSaved,
          status: nextStatus,
        };
      });
      resultingStatus = statusCapture;
      return next;
    });
    const shouldResetCelebration = resultingStatus !== "done";
    if (
      goalEditorPrompt.wish.kind === PRIMARY_GOAL_KIND &&
      goalEditorPrompt.wish.goalId
    ) {
      const goalExtras = {
        customTitle: trimmedName,
        customEmoji: normalizedEmoji,
      };
      setProfile((prev) => {
        const updated = updatePrimaryGoalTargetInProfile(
          prev,
          goalEditorPrompt.wish.goalId,
          nextTargetUSD,
          goalExtras
        );
        return shouldResetCelebration
          ? { ...updated, goalCelebrated: false, goalRenewalPending: false }
          : updated;
      });
      setProfileDraft((prev) => {
        const updated = updatePrimaryGoalTargetInProfile(
          prev,
          goalEditorPrompt.wish.goalId,
          nextTargetUSD,
          goalExtras
        );
        return shouldResetCelebration
          ? { ...updated, goalCelebrated: false, goalRenewalPending: false }
          : updated;
      });
    }
    if (shouldResetCelebration) {
      dismissGoalRenewalPrompt();
    }
    closeGoalEditorPrompt();
  }, [
    closeGoalEditorPrompt,
    dismissGoalRenewalPrompt,
    goalEditorPrompt,
    profile.currency,
    setProfile,
    setProfileDraft,
    t,
  ]);

  const handleGoalRenewalLater = useCallback(() => {
    dismissGoalRenewalPrompt();
    const currentGoalId = mainGoalWish?.goalId || profile.primaryGoals?.[0]?.id || null;
    setProfile((prev) => ({ ...prev, goalRenewalPending: false }));
    setProfileDraft((prev) => ({ ...prev, goalRenewalPending: false }));
    logEvent("goal_renewal_later", { goal_id: currentGoalId });
  }, [dismissGoalRenewalPrompt, mainGoalWish, profile.primaryGoals, setProfile, setProfileDraft]);

  const handleGoalRenewalStart = useCallback(() => {
    dismissGoalRenewalPrompt();
    setProfile((prev) => ({ ...prev, goalRenewalPending: false }));
    setProfileDraft((prev) => ({ ...prev, goalRenewalPending: false }));
    setActiveTab("cart");
    const targetWish = mainGoalWish || selectMainGoalWish(wishes);
    logEvent("goal_renewal_start", { had_existing_goal: !!targetWish });
    setTimeout(() => {
      openNewGoalModal(true, "goal_renewal");
    }, 280);
  }, [
    dismissGoalRenewalPrompt,
    mainGoalWish,
    openNewGoalModal,
    setActiveTab,
    wishes,
    setProfile,
    setProfileDraft,
  ]);

  const handleLogFreeDay = useCallback(() => {
    const today = new Date();
    const todayKey = getDayKey(today);
    if (freeDayStats.lastDate === todayKey) {
      Alert.alert("Almost", t("freeDayLoggedToday"));
      return;
    }
    Alert.alert("Almost", t("freeDayConfirm"), [
      { text: t("priceEditCancel"), style: "cancel" },
      {
        text: t("freeDayButton"),
        onPress: () => {
          const yesterdayKey = getDayKey(new Date(today.getTime() - DAY_MS));
          const continues = freeDayStats.lastDate === yesterdayKey;
          const current = continues ? freeDayStats.current + 1 : 1;
          const best = Math.max(freeDayStats.best, current);
          const total = freeDayStats.total + 1;
          let achievements = [...freeDayStats.achievements];
          const newMilestones = FREE_DAY_MILESTONES.filter(
            (m) => current >= m && !achievements.includes(m)
          );
          achievements = [...achievements, ...newMilestones];
          setFreeDayStats({
            total,
            current,
            best,
            lastDate: todayKey,
            achievements,
            blockedDate: null,
          });
          logHistoryEvent("free_day", { total, current, best });
          logEvent("free_day_logged", {
            total,
            current_streak: current,
            best_streak: best,
            weekday: today.getDay(),
            persona: profile.persona || "unknown",
            goal: profile.goal || "none",
          });
          newMilestones.forEach((milestone) => {
            logEvent("free_day_milestone", {
              milestone,
              current_streak: current,
            });
          });
          const message =
            newMilestones.length > 0
              ? t("freeDayMilestone", { days: current })
              : t("freeDayCongrats", { days: current });
          triggerOverlayState("purchase", message);
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
          const rewardBlueCoins = FREE_DAY_LOGIN_BLUE_COINS * current;
          const rewardHealthPoints = rewardBlueCoins * BLUE_HEALTH_COIN_VALUE;
          setHealthPoints((prev) => prev + rewardHealthPoints);
          const rewardReason =
            current > 1
              ? t("freeDayCoinRewardStreak", { coins: rewardBlueCoins, days: current })
              : t("freeDayCoinReward", { coins: rewardBlueCoins });
          triggerOverlayState("health", {
            amount: rewardHealthPoints,
            displayCoins: rewardBlueCoins,
            coinValue: BLUE_HEALTH_COIN_VALUE,
            reason: rewardReason,
          });
          logEvent("free_day_coin_reward", {
            blue_coins: rewardBlueCoins,
            health_points: rewardHealthPoints,
            current_streak: current,
          });
        },
      },
    ]);
  }, [freeDayStats, t, logEvent, logHistoryEvent, profile.goal, profile.persona, setHealthPoints, triggerOverlayState]);

  const toggleTemptationEditor = useCallback(
    (item) => {
      if (!item) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      setPriceEditor((prev) => {
        if (prev.item?.id === item.id) {
          return {
            item: null,
            value: "",
            title: "",
            emoji: "",
            category: DEFAULT_IMPULSE_CATEGORY,
            description: "",
          };
        }
        const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
        const currentValue = convertToCurrency(item.priceUSD || item.basePriceUSD || 0, currencyCode);
        const categorySlug = resolveTemptationCategory(item);
        const descriptionString = typeof item.description === "string" ? item.description : null;
        const descriptionMap =
          item.description && typeof item.description === "object" && !Array.isArray(item.description)
            ? item.description
            : null;
        const isCustom =
          Array.isArray(item?.categories) && item.categories.some((category) => category === "custom");
        const customDescriptionFallback = isCustom
          ? buildCustomTemptationDescription(item?.gender || "none")
          : null;
        const overrideDescription =
          typeof descriptionOverrides[item.id] === "string"
            ? descriptionOverrides[item.id]
            : "";
        const resolvedDescription =
          (overrideDescription && overrideDescription.length
            ? overrideDescription
            : (descriptionMap ? descriptionMap[language] : null) ||
              (language === "ru"
                ? descriptionMap?.ru || descriptionMap?.en || descriptionString
                : descriptionMap?.en || descriptionMap?.ru || descriptionString) ||
              descriptionString ||
              (isCustom
                ? customDescriptionFallback?.[language] ||
                  (language === "ru"
                    ? customDescriptionFallback?.ru
                    : customDescriptionFallback?.en) ||
                  customDescriptionFallback?.en ||
                  ""
                : ""));
        logEvent("temptation_viewed", {
          temptation_id: item.id,
          category: categorySlug,
          price: convertToCurrency(item.priceUSD || item.basePriceUSD || 0, currencyCode),
        });
        return {
          item,
          value: formatNumberInputValue(Number(currentValue) || 0),
          title: resolveTemptationTitle(item, language, titleOverrides[item.id]),
          emoji: item.emoji || DEFAULT_TEMPTATION_EMOJI,
          category: categorySlug,
          description: resolvedDescription,
        };
      });
    },
    [language, profile.currency, titleOverrides, descriptionOverrides, resolveTemptationCategory]
  );

  const closePriceEditor = useCallback(() => {
    if (!priceEditor.item) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPriceEditor({
      item: null,
      value: "",
      title: "",
      emoji: "",
      category: DEFAULT_IMPULSE_CATEGORY,
      description: "",
    });
  }, [priceEditor.item]);

  useEffect(() => {
    if (priceEditor.item) {
      if (!editOverlayVisible) setEditOverlayVisible(true);
      Animated.timing(editOverlayAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (editOverlayVisible) {
      Animated.timing(editOverlayAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setEditOverlayVisible(false);
      });
    }
  }, [priceEditor.item, editOverlayAnim, editOverlayVisible]);

  const handlePriceTitleChange = (value) => {
    setPriceEditor((prev) => ({ ...prev, title: value }));
  };

  const handlePriceEmojiChange = (value) => {
    setPriceEditor((prev) => ({ ...prev, emoji: limitEmojiInput(value) }));
  };

  const handlePriceCategoryChange = (value) => {
    if (!IMPULSE_CATEGORY_DEFS[value]) return;
    setPriceEditor((prev) => ({ ...prev, category: value }));
  };

  const handleQuickGoalToggle = useCallback(
    (item) => {
      if (!item) return;
      const existing = (wishes || []).find((wish) => wish.templateId === item.id);
      if (existing) {
        setWishes((prev) => prev.filter((wish) => wish.id !== existing.id));
        assignTemptationGoal(item.id, null);
        logHistoryEvent("wish_removed", { title: existing.title });
        triggerOverlayState("cart", t("goalRemoved"));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      handleTemptationAction("want", item, { pinnedBy: "swipe" });
    },
    [
      assignTemptationGoal,
      handleTemptationAction,
      logHistoryEvent,
      t,
      triggerHaptic,
      triggerOverlayState,
      wishes,
    ]
  );

  const handlePriceInputChange = (value) => {
    setPriceEditor((prev) => ({ ...prev, value }));
  };

  const handlePriceDescriptionChange = (value) => {
    setPriceEditor((prev) => ({ ...prev, description: value }));
  };

  const patchTemptationDisplay = useCallback((templateId, patch = {}) => {
    if (!templateId || !patch || typeof patch !== "object") return;
    setTemptations((prev) =>
      prev.map((card) => (card.id === templateId ? { ...card, ...patch } : card))
    );
    setQuickTemptations((prev) => {
      let changed = false;
      const next = prev.map((card) => {
        if (card.id !== templateId) return card;
        changed = true;
        return { ...card, ...patch };
      });
      return changed ? next : prev;
    });
  }, []);

  const removeTemptationTemplate = useCallback(
    (templateId) => {
      if (!templateId) return;
      const existsInQuick = quickTemptations.some((card) => card.id === templateId);
      if (existsInQuick) {
        setQuickTemptations((prev) => prev.filter((card) => card.id !== templateId));
      } else {
        setHiddenTemptations((prev) => (prev.includes(templateId) ? prev : [...prev, templateId]));
      }
      setTemptationGoalMap((prev) => {
        if (!prev[templateId]) return prev;
        const next = { ...prev };
        delete next[templateId];
        return next;
      });
      setCatalogOverrides((prev) => {
        if (!(templateId in prev)) return prev;
        const next = { ...prev };
        delete next[templateId];
        return next;
      });
      setTitleOverrides((prev) => {
        if (!(templateId in prev)) return prev;
        const next = { ...prev };
        delete next[templateId];
        return next;
      });
      setEmojiOverrides((prev) => {
        if (!(templateId in prev)) return prev;
        const next = { ...prev };
        delete next[templateId];
        return next;
      });
      setCategoryOverrides((prev) => {
        if (!(templateId in prev)) return prev;
        const next = { ...prev };
        delete next[templateId];
        return next;
      });
      setDescriptionOverrides((prev) => {
        if (!(templateId in prev)) return prev;
        const next = { ...prev };
        delete next[templateId];
        return next;
      });
      setRefuseStats((prev) => {
        if (!prev[templateId]) return prev;
        const next = { ...prev };
        delete next[templateId];
        return next;
      });
      setPendingList((prev) => prev.filter((entry) => entry.templateId !== templateId));
    },
    [
      quickTemptations,
      setQuickTemptations,
      setHiddenTemptations,
      setTemptationGoalMap,
      setCatalogOverrides,
      setTitleOverrides,
      setEmojiOverrides,
      setDescriptionOverrides,
      setRefuseStats,
      setPendingList,
    ]
  );

  const persistPriceOverride = (valueUSD = null) => {
    const targetId = priceEditor.item?.id;
    if (!targetId) return;
    setCatalogOverrides((prev) => {
      const next = { ...prev };
      if (valueUSD) {
        next[targetId] = valueUSD;
      } else {
        delete next[targetId];
      }
      return next;
    });
  };

  const persistTitleOverride = (value = null) => {
    const targetId = priceEditor.item?.id;
    if (!targetId) return;
    setTitleOverrides((prev) => {
      const next = { ...prev };
      if (value && value.length) {
        next[targetId] = value;
      } else {
        delete next[targetId];
      }
      return next;
    });
  };

  const persistEmojiOverride = (value = null) => {
    const targetId = priceEditor.item?.id;
    if (!targetId) return;
    setEmojiOverrides((prev) => {
      const next = { ...prev };
      if (value && value.length) {
        next[targetId] = value;
      } else {
        delete next[targetId];
      }
      return next;
    });
  };

  const persistDescriptionOverride = (value = null) => {
    const targetId = priceEditor.item?.id;
    if (!targetId) return;
    setDescriptionOverrides((prev) => {
      const next = { ...prev };
      const normalized =
        typeof value === "string" && value.trim().length ? value.trim() : null;
      if (normalized) {
        next[targetId] = normalized;
      } else {
        delete next[targetId];
      }
      return next;
    });
  };

  const persistCategoryOverride = (value = null) => {
    const targetId = priceEditor.item?.id;
    if (!targetId) return;
    setCategoryOverrides((prev) => {
      const next = { ...prev };
      if (value && IMPULSE_CATEGORY_DEFS[value]) {
        next[targetId] = value;
      } else {
        delete next[targetId];
      }
      return next;
    });
  };

  const savePriceEdit = () => {
    if (!priceEditor.item) return;
    const parsed = parseFloat((priceEditor.value || "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Almost", t("priceEditError"));
      return;
    }
    const usdValue = parsed / (CURRENCY_RATES[activeCurrency] || 1);
    const previousPriceUSD = priceEditor.item.priceUSD || priceEditor.item.basePriceUSD || 0;
    persistPriceOverride(usdValue);
    const titleValue = (priceEditor.title || "").trim();
    persistTitleOverride(titleValue || null);
    const hasCustomEmoji = !!priceEditor.emoji?.trim();
    const resolvedEmoji = hasCustomEmoji
      ? normalizeEmojiValue(priceEditor.emoji, priceEditor.item.emoji || DEFAULT_TEMPTATION_EMOJI)
      : priceEditor.item.emoji || DEFAULT_TEMPTATION_EMOJI;
    persistEmojiOverride(hasCustomEmoji ? resolvedEmoji : null);
    const categoryValue =
      priceEditor.category && IMPULSE_CATEGORY_DEFS[priceEditor.category]
        ? priceEditor.category
        : null;
    const previousCategory = resolveTemptationCategory(priceEditor.item);
    const nextCategory = categoryValue || previousCategory;
    persistCategoryOverride(categoryValue);
    const descriptionValue = (priceEditor.description || "").trim();
    const previousDescriptionOverride =
      typeof descriptionOverrides[priceEditor.item.id] === "string"
        ? descriptionOverrides[priceEditor.item.id]
        : "";
    const changedDescription = descriptionValue !== previousDescriptionOverride;
    persistDescriptionOverride(descriptionValue || null);
    const changedPrice = Math.abs(previousPriceUSD - usdValue) > 0.0001;
    const changedCategory = nextCategory !== previousCategory;
    patchTemptationDisplay(priceEditor.item.id, {
      priceUSD: usdValue,
      titleOverride: titleValue || null,
      emoji: resolvedEmoji,
      impulseCategoryOverride: categoryValue || null,
      descriptionOverride: descriptionValue || null,
    });
    logEvent("temptation_edited", {
      temptation_id: priceEditor.item.id,
      changed_price: changedPrice,
      changed_category: changedCategory,
      changed_description: changedDescription,
    });
    closePriceEditor();
  };

  const promptTemptationDelete = useCallback(
    (targetItem = null) => {
      const item = targetItem || priceEditor.item;
      if (!item) return;
      Alert.alert(t("priceEditDelete"), t("priceEditDeleteConfirm"), [
        { text: t("priceEditCancel"), style: "cancel" },
        {
          text: t("priceEditDelete"),
          style: "destructive",
          onPress: () => {
            logEvent("temptation_deleted", {
              temptation_id: item.id,
              is_custom: isCustomTemptation(item),
              price: convertToCurrency(
                item.priceUSD || item.basePriceUSD || 0,
                profile.currency || DEFAULT_PROFILE.currency
              ),
            });
            removeTemptationTemplate(item.id);
            if (priceEditor.item?.id === item.id) {
              closePriceEditor();
            }
          },
        },
      ]);
    },
    [closePriceEditor, logEvent, priceEditor.item, profile.currency, removeTemptationTemplate, t]
  );
  const handleTemptationDelete = useCallback(
    (item) => {
      promptTemptationDelete(item);
    },
    [promptTemptationDelete]
  );

  const handleRemoveWish = useCallback(
    (wishId) => {
      const targetWish = wishes.find((wish) => wish.id === wishId);
      if (!targetWish) return;
      const performRemoval = () => {
        setWishes((prev) => prev.filter((wish) => wish.id !== wishId));
        if (
          targetWish.kind === PRIMARY_GOAL_KIND &&
          targetWish.goalId
        ) {
          setProfile((prev) => removePrimaryGoalFromProfile(prev, targetWish.goalId));
          setProfileDraft((prev) => removePrimaryGoalFromProfile(prev, targetWish.goalId));
        }
        logEvent("goal_abandoned", {
          goal_id: targetWish.goalId || targetWish.id,
          reason: "deleted",
        });
      };
      Alert.alert(t("wishlistTitle"), t("wishlistRemoveConfirm"), [
        { text: t("priceEditCancel"), style: "cancel" },
        {
          text: t("wishlistRemove"),
          style: "destructive",
          onPress: performRemoval,
        },
      ]);
    },
    [logEvent, setProfile, setProfileDraft, t, wishes]
  );

  const handlePendingDecision = useCallback(
    async (pendingItem, decision) => {
      if (!pendingItem) return;
      if (pendingItem.notificationId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(pendingItem.notificationId);
        } catch (error) {
          console.warn("cancel reminder", error);
        }
      }
      setPendingList((prev) => prev.filter((entry) => entry.id !== pendingItem.id));
      const template = findTemplateById(pendingItem.templateId);
      const title =
        pendingItem.title || template?.title?.[language] || template?.title?.en || "Wish";
      const priceUSD = pendingItem.priceUSD || template?.basePriceUSD || 0;
      const decisionTimestamp = Date.now();
      const daysWaited = Math.max(
        0,
        Math.round((decisionTimestamp - (pendingItem.createdAt || decisionTimestamp)) / DAY_MS)
      );
      if (decision === "want") {
        const targetUSD = pendingItem.priceUSD || template?.basePriceUSD || 0;
        const newWish = {
          id: `wish-${pendingItem.templateId}-${Date.now()}`,
          templateId: pendingItem.templateId,
          title,
          targetUSD,
          savedUSD: 0,
          status: "active",
          createdAt: Date.now(),
          autoManaged: false,
          emoji: template?.emoji || DEFAULT_GOAL_EMOJI,
        };
        setWishes((prev) => insertWishAfterPrimary(prev, newWish));
        ensureActiveGoalForNewWish(newWish);
        setDecisionStats((prev) => ({
          ...prev,
          resolvedToWishes: prev.resolvedToWishes + 1,
        }));
        logEvent(
          "pending_decide_want",
          buildTemptationPayload(
            { ...pendingItem, priceUSD },
            {
              days_waited: daysWaited,
            }
          )
        );
        logHistoryEvent("pending_to_wish", { title, targetUSD, wishId: newWish.id, pendingId: pendingItem.id });
        triggerOverlayState("purchase", t("wishAdded", { title }));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }
      if (decision === "decline") {
        const price = priceUSD;
        const localAmount = formatCurrency(
          convertToCurrency(price, profile.currency || DEFAULT_PROFILE.currency)
        );
        setSavedTotalUSD((prev) => prev + price);
        setDeclineCount((prev) => prev + 1);
        setDecisionStats((prev) => ({
          ...prev,
          resolvedToDeclines: prev.resolvedToDeclines + 1,
        }));
        logEvent(
          "pending_decide_decline",
          buildTemptationPayload(
            { ...pendingItem, priceUSD: price },
            {
              days_waited: daysWaited,
            }
          )
        );
        logHistoryEvent("pending_to_decline", { title, amountUSD: price });
        triggerOverlayState("cart", t("wishDeclined", { amount: localAmount }));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [language, profile.currency, t, logHistoryEvent, buildTemptationPayload]
  );
  const handlePendingDelete = useCallback(
    (pendingItem) => {
      if (!pendingItem) return;
      const template = findTemplateById(pendingItem.templateId);
      const title =
        pendingItem.title || template?.title?.[language] || template?.title?.en || "Wish";
      const performDelete = async () => {
        if (pendingItem.notificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(pendingItem.notificationId);
          } catch (error) {
            console.warn("cancel reminder", error);
          }
        }
        setPendingList((prev) => prev.filter((entry) => entry.id !== pendingItem.id));
        logHistoryEvent("pending_removed", { title, pendingId: pendingItem.id });
        logEvent("pending_deleted", { pending_id: pendingItem.id });
      };
      Alert.alert(t("pendingTitle"), t("pendingDeleteConfirm"), [
        { text: t("priceEditCancel"), style: "cancel" },
        {
          text: t("goalSwipeDelete"),
          style: "destructive",
          onPress: () => {
            performDelete();
          },
        },
      ]);
    },
    [findTemplateById, language, logEvent, logHistoryEvent, setPendingList, t]
  );

  const processOverlayQueue = useCallback(() => {
    if (overlayActiveRef.current) return;
    const next = overlayQueueRef.current.shift();
    if (!next) return;
    overlayActiveRef.current = true;
    if (overlayTimer.current) {
      clearTimeout(overlayTimer.current);
    }
    if (next.type === "purchase") {
      setConfettiKey((prev) => prev + 1);
    }
    setOverlay({ type: next.type, message: next.message });
    const defaultDuration =
      next.type === "cart"
        ? 1800
        : next.type === "level"
        ? 3200
        : next.type === "reward"
        ? 3200
        : next.type === "save"
        ? 4200
        : next.type === "impulse_alert"
        ? null
        : next.type === "focus_digest"
        ? null
        : 2600;
    const timeout = next.duration ?? defaultDuration;
    if (typeof timeout === "number" && Number.isFinite(timeout) && timeout > 0) {
      overlayTimer.current = setTimeout(() => {
        setOverlay(null);
        overlayActiveRef.current = false;
        processOverlayQueue();
      }, timeout);
    } else {
      overlayTimer.current = null;
    }
  }, []);

  const triggerOverlayState = useCallback(
    (type, message, duration) => {
      overlayQueueRef.current.push({ type, message, duration });
      processOverlayQueue();
    },
    [processOverlayQueue]
  );

  const dismissOverlay = useCallback(() => {
    if (overlay?.type === "focus_digest" && overlay?.message?.prompt) {
      focusPromptActiveRef.current = false;
    }
    if (overlayTimer.current) {
      clearTimeout(overlayTimer.current);
      overlayTimer.current = null;
    }
    if (overlayActiveRef.current) {
      overlayActiveRef.current = false;
    }
    setOverlay(null);
    processOverlayQueue();
  }, [overlay, processOverlayQueue]);

  const resetFocusLossCounter = useCallback((templateId) => {
    if (!templateId) return;
    focusLossCountersRef.current[templateId] = { count: 0 };
  }, []);

  const promptFocusForTemptation = useCallback(
    (template) => {
      if (!template?.id) return;
      if (focusPromptActiveRef.current) return;
      if (overlay?.type === "focus_digest") return;
      focusPromptActiveRef.current = true;
      const title = resolveTemptationTitle(template, language, titleOverrides[template.id]) || t("defaultDealTitle");
      triggerOverlayState("focus_digest", {
        title: t("focusPromptTitle"),
        body: t("focusPromptBody", { title }),
        strong: null,
        weak: { title, templateId: template.id },
        positive: false,
        targetId: template.id,
        prompt: true,
      }, null);
    },
    [language, overlay, t, titleOverrides, triggerOverlayState]
  );

  const registerFocusLoss = useCallback(
    (template) => {
      if (!template?.id) return;
      const key = template.id;
      const entry = focusLossCountersRef.current[key] || { count: 0 };
      const nextCount = entry.count + 1;
      focusLossCountersRef.current[key] = { count: nextCount };
      if (nextCount >= FOCUS_LOSS_THRESHOLD) {
        focusLossCountersRef.current[key] = { count: 0 };
        if (focusTemplateId === key) return;
        promptFocusForTemptation(template);
      }
    },
    [focusTemplateId, promptFocusForTemptation]
  );

  const celebrateFocusVictory = useCallback(
    (template) => {
      if (!template) return;
      const title = resolveTemptationTitle(template, language, titleOverrides[template.id]) || t("defaultDealTitle");
      setFocusTemplateId(null);
      setFocusSaveCount(0);
      resetFocusLossCounter(template.id);
    setHealthPoints((prev) => prev + FOCUS_VICTORY_REWARD);
    triggerOverlayState("focus_reward", {
      title: t("focusRewardTitle"),
      body: t("focusRewardSubtitle", { title, amount: FOCUS_VICTORY_REWARD }),
      amount: FOCUS_VICTORY_REWARD,
    });
    },
    [language, resetFocusLossCounter, setHealthPoints, t, titleOverrides, triggerOverlayState]
  );

  const handleFocusSaveProgress = useCallback(
    (template) => {
      if (!template?.id || template.id !== focusTemplateId) return;
      resetFocusLossCounter(template.id);
      setFocusSaveCount((prev) => {
        const next = prev + 1;
        if (next >= FOCUS_VICTORY_THRESHOLD) {
          celebrateFocusVictory(template);
          return 0;
        }
        return next;
      });
    },
    [celebrateFocusVictory, focusTemplateId, resetFocusLossCounter]
  );

  const handleFocusSpend = useCallback(
    (template) => {
      if (!template?.id || template.id !== focusTemplateId) return;
      setFocusSaveCount(0);
    },
    [focusTemplateId]
  );

  const applyFocusTarget = useCallback(
    (templateId, source = "manual") => {
      if (!templateId) return;
      setFocusTemplateId(templateId);
      setFocusSaveCount(0);
      resetFocusLossCounter(templateId);
      logEvent("focus_target_set", { template_id: templateId, source });
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    },
    [logEvent, resetFocusLossCounter]
  );

  const resolveFocusDigest = useCallback(
    (action = "later") => {
      if (!pendingFocusDigest) return;
      const targetDateKey = pendingFocusDigest.dateKey;
      setFocusDigestSeenKey(targetDateKey);
      setPendingFocusDigest(null);
      setFocusDigestPromptShown(false);
      AsyncStorage.removeItem(STORAGE_KEYS.FOCUS_DIGEST_PENDING).catch(() => {});
      if (action === "later") {
        logEvent("focus_digest_later", { date_key: targetDateKey });
      } else if (action === "focus") {
        logEvent("focus_digest_focus", { date_key: targetDateKey });
      }
    },
    [pendingFocusDigest, logEvent]
  );

  const handleFocusOverlayConfirm = useCallback(
    (templateId, source = "digest") => {
      const isPrompt = overlay?.message?.prompt;
      if (templateId) {
        applyFocusTarget(templateId, source);
      }
      resolveFocusDigest("focus");
      dismissOverlay();
      if (isPrompt) {
        focusPromptActiveRef.current = false;
      }
    },
    [applyFocusTarget, dismissOverlay, overlay, resolveFocusDigest]
  );

  const handleFocusOverlayLater = useCallback(() => {
    const isPrompt = overlay?.message?.prompt;
    resolveFocusDigest("later");
    dismissOverlay();
    if (isPrompt) {
      focusPromptActiveRef.current = false;
    }
  }, [dismissOverlay, overlay, resolveFocusDigest]);

  const notifyImpulseRisk = useCallback(
    async (risk) => {
      if (!risk?.templateId) return;
      const now = Date.now();
      const lastShown = impulseAlertCooldownRef.current?.[risk.templateId] || 0;
      if (now - lastShown < IMPULSE_ALERT_COOLDOWN_MS) return;
      const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
      const amountLabel = formatCurrency(
        convertToCurrency(Math.max(risk.amountUSD || 0, 0), currencyCode),
        currencyCode
      );
      const baseOverlayMessage = t("impulseAlertMessage", {
        temptation: risk.title,
        window: risk.windowLabel || "",
        amount: amountLabel,
      });
      const overlayMessage = moodPreset?.impulseOverlay
        ? `${baseOverlayMessage}\n${moodPreset.impulseOverlay}`
        : baseOverlayMessage;
      const pushTitle =
        moodPreset?.pushImpulseTitle && moodPreset.pushImpulseTitle.trim()
          ? renderTemplateString(moodPreset.pushImpulseTitle, { temptation: risk.title })
          : t("impulseNotificationTitle", { temptation: risk.title });
      const pushBody =
        moodPreset?.pushImpulseBody && moodPreset.pushImpulseBody.trim()
          ? renderTemplateString(moodPreset.pushImpulseBody, {
              temptation: risk.title,
              amount: amountLabel,
            })
          : t("impulseNotificationBody", { temptation: risk.title, amount: amountLabel });
      triggerOverlayState("impulse_alert", {
        title: t("impulseAlertTitle"),
        body: overlayMessage,
        moodLine: moodPreset?.impulseOverlay || null,
        window: risk.windowLabel || null,
        amountLabel,
        temptation: risk.title || "",
      });
      await sendImmediateNotification({
        title: pushTitle,
        body: pushBody,
      });
      impulseAlertCooldownRef.current = {
        ...(impulseAlertCooldownRef.current || {}),
        [risk.templateId]: now,
      };
      setImpulseTracker((prev) => ({
        ...(prev || INITIAL_IMPULSE_TRACKER),
        lastAlerts: {
          ...(prev?.lastAlerts || {}),
          [risk.templateId]: now,
        },
        events: prev?.events || [],
      }));
    },
    [profile.currency, sendImmediateNotification, t, triggerOverlayState, moodPreset]
  );

  const triggerCelebration = () => {
    const messages = getCelebrationMessages(language, activeGender);
    if (!messages.length) return;
    triggerOverlayState("purchase", messages[Math.floor(Math.random() * messages.length)]);
  };

  const handleLevelCelebrate = useCallback(
    (level, levelsEarned = 1) => {
      const rewardCoins = sumLevelRewardCoins(level, levelsEarned);
      if (rewardCoins <= 0) {
        triggerOverlayState("level", level);
        triggerSuccessHaptic();
        return;
      }
      const rewardAmount = rewardCoins * HEALTH_COIN_TIERS[1].value;
      setHealthPoints((prev) => prev + rewardAmount);
      triggerOverlayState("level", level);
      triggerOverlayState(
        "health",
        {
          amount: rewardAmount,
          displayCoins: rewardCoins,
          coinValue: rewardAmount,
          reason: t("healthCelebrateLevel"),
        },
        3200
      );
      triggerSuccessHaptic();
    },
    [t, triggerOverlayState]
  );

  const handleRewardClaim = useCallback(
    (reward) => {
      if (!reward?.id || !reward.unlocked || reward.claimed || claimedRewards[reward.id]) return;
      const rewardAmount = reward.rewardHealth || HEALTH_PER_REWARD;
      setClaimedRewards((prev) => ({ ...prev, [reward.id]: true }));
      setHealthPoints((prev) => prev + rewardAmount);
      triggerOverlayState(
        "health",
        {
          amount: rewardAmount,
          reason: t("healthCelebrateReward"),
        },
        3200
      );
      triggerSuccessHaptic();
      logEvent("reward_claimed", { reward_id: reward.id });
      logHistoryEvent("reward_claimed", { rewardId: reward.id, title: reward.title });
    },
    [claimedRewards, t, triggerOverlayState, logHistoryEvent]
  );

  const handleChallengeAccept = useCallback(
    async (challengeId) => {
      const def = CHALLENGE_DEF_MAP[challengeId];
      if (!def) return;
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      let activated = false;
      let startedAt = Date.now();
      let expiresAt = startedAt + def.durationDays * DAY_MS;
      setChallengesState((prev) => {
        const entry = prev[challengeId] || createChallengeEntry(challengeId);
        const canStart =
          entry.status === CHALLENGE_STATUS.IDLE ||
          entry.status === CHALLENGE_STATUS.EXPIRED ||
          entry.status === CHALLENGE_STATUS.CLAIMED;
        if (!canStart) {
          return prev;
        }
        activated = true;
        startedAt = Date.now();
        expiresAt = startedAt + def.durationDays * DAY_MS;
        return {
          ...prev,
          [challengeId]: {
            ...createChallengeEntry(challengeId),
            status: CHALLENGE_STATUS.ACTIVE,
            startedAt,
            expiresAt,
          },
        };
      });
      if (!activated) return;
      const copy = getChallengeCopy(def, language);
      const title = copy.title || challengeId;
      triggerOverlayState("cart", t("challengeStartedOverlay", { title }));
      logEvent("challenge_started", { challenge_id: challengeId });
      logEvent("challenge_joined", {
        challenge_id: challengeId,
        type: CHALLENGE_TYPE_LABELS[def.metricType] || def.metricType,
      });
      const reminderIds = await scheduleChallengeReminders(challengeId, def, startedAt, expiresAt);
      if (reminderIds.length) {
        setChallengesState((prev) => {
          const entry = prev[challengeId];
          if (!entry || entry.startedAt !== startedAt) return prev;
          return {
            ...prev,
            [challengeId]: {
              ...entry,
              reminderNotificationIds: reminderIds,
            },
          };
        });
      }
    },
    [language, scheduleChallengeReminders, t, triggerOverlayState]
  );

  const handleChallengeClaim = useCallback(
    (challengeId) => {
      const def = CHALLENGE_DEF_MAP[challengeId];
      if (!def) return;
      const currentEntry = challengesState[challengeId];
      if (!currentEntry || currentEntry.status !== CHALLENGE_STATUS.COMPLETED) return;
      (currentEntry.reminderNotificationIds || []).forEach((id) => {
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      });
      triggerSuccessHaptic();
      setChallengesState((prev) => {
        const entry = prev[challengeId];
        if (!entry || entry.status !== CHALLENGE_STATUS.COMPLETED) return prev;
        return {
          ...prev,
          [challengeId]: {
            ...entry,
            status: CHALLENGE_STATUS.CLAIMED,
            claimedAt: Date.now(),
            reminderNotificationIds: [],
          },
        };
      });
      const rewardAmount = getScaledChallengeReward(def.rewardHealth);
      setHealthPoints((prev) => prev + rewardAmount);
      const copy = getChallengeCopy(def, language);
      const title = copy.title || challengeId;
      triggerOverlayState(
        "health",
        {
          amount: rewardAmount,
          reason: t("challengeClaimedOverlay", { title, amount: rewardAmount }),
        },
        3200
      );
      logEvent("challenge_claimed", { challenge_id: challengeId });
    },
    [challengesState, language, t, triggerOverlayState]
  );

  const handleChallengeCancel = useCallback(
    (challengeId) => {
      setChallengesState((prev) => {
        const entry = prev[challengeId];
        if (!entry || entry.status !== CHALLENGE_STATUS.ACTIVE) return prev;
        (entry.reminderNotificationIds || []).forEach((id) => {
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
        });
        logEvent("challenge_cancelled", { challenge_id: challengeId });
        return {
          ...prev,
          [challengeId]: createChallengeEntry(challengeId),
        };
      });
    },
    [logEvent]
  );

  const handleFreeDayRescue = useCallback(() => {
    const now = new Date();
    if (!freeDayStats.lastDate || healthPoints < FREE_DAY_RESCUE_COST) return;
    const yesterdayKey = getDayKey(new Date(now.getTime() - DAY_MS));
    const dayBeforeYesterdayKey = getDayKey(new Date(now.getTime() - DAY_MS * 2));
    if (freeDayStats.lastDate !== dayBeforeYesterdayKey) return;
    setHealthPoints((prev) => Math.max(prev - FREE_DAY_RESCUE_COST, 0));
    setFreeDayStats((prev) => ({ ...prev, lastDate: yesterdayKey }));
    triggerOverlayState("reward", t("freeDayRescueOverlay"));
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    logEvent("free_day_rescue", {
      current_streak: freeDayStats.current,
      health_remaining: Math.max(healthPoints - FREE_DAY_RESCUE_COST, 0),
    });
  }, [freeDayStats.lastDate, freeDayStats.current, healthPoints, triggerOverlayState, t]);

  const handleResetData = () => {
    Alert.alert(
      t("developerReset"),
      t("developerResetConfirm"),
      [
        { text: t("developerResetCancel"), style: "cancel" },
        {
          text: t("developerResetApply"),
          style: "destructive",
          onPress: async () => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
            } catch (error) {
              console.warn("reset", error);
            }
            try {
              await Promise.all(
                pendingList
                  .filter((entry) => entry.notificationId)
                  .map((entry) =>
                    Notifications.cancelScheduledNotificationAsync(entry.notificationId).catch(() => {})
                  )
              );
            } catch {}
            try {
              const challengeReminderIds = Object.values(challengesState || {}).flatMap(
                (entry) => entry?.reminderNotificationIds || []
              );
              await Promise.all(
                challengeReminderIds.map((id) =>
                  Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
                )
              );
            } catch {}
            setWishes([]);
            setPendingList([]);
            setPurchases([]);
            setSavedTotalUSD(0);
            setLifetimeSavedUSD(0);
            setDeclineCount(0);
            setCatalogOverrides({});
            setTitleOverrides({});
            setEmojiOverrides({});
            setQuickTemptations([]);
            setFreeDayStats({ ...INITIAL_FREE_DAY_STATS });
            setDecisionStats({ ...INITIAL_DECISION_STATS });
            setHistoryEvents([]);
            setRefuseStats({});
            setTemptationInteractions({});
            const resetProfile = { ...DEFAULT_PROFILE, joinedAt: new Date().toISOString() };
            setProfile(resetProfile);
            setProfileDraft(resetProfile);
            setRegistrationData(INITIAL_REGISTRATION);
            goToOnboardingStep("logo", { recordHistory: false, resetHistory: true });
            setActiveCategory("all");
            setActiveTab("feed");
            setOverlay(null);
            setTheme("light");
            setLanguage("ru");
            setActiveCurrency(DEFAULT_PROFILE.currency);
            setHealthPoints(0);
            setTamagotchiSkinId(DEFAULT_TAMAGOTCHI_SKIN);
            setSkinPickerVisible(false);
            setClaimedRewards({});
            setRewardCelebratedMap({});
            const resetChallenges = createInitialChallengesState();
            challengesPrevRef.current = resetChallenges;
            setChallengesState(resetChallenges);
            setImpulseTracker({ ...INITIAL_IMPULSE_TRACKER });
            setMoodState(createMoodStateForToday());
            impulseAlertCooldownRef.current = {};
            setTabHintsSeen(DEFAULT_TAB_HINTS_STATE);
            setTabHintVisible(null);
            if (customReminderId) {
              Notifications.cancelScheduledNotificationAsync(customReminderId).catch(() => {});
            }
            persistCustomReminderId(null);
          },
        },
      ]
    );
  };

  const startProfileEdit = () => {
    triggerHaptic();
    setProfileDraft(profile);
    setIsEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    triggerHaptic();
    setProfileDraft(profile);
    setIsEditingProfile(false);
  };

  const saveProfileEdit = () => {
    triggerHaptic();
    const normalizedGoals = Array.isArray(profileDraft.primaryGoals) && profileDraft.primaryGoals.length
      ? profileDraft.primaryGoals.map((entry) => {
          const goalId = entry?.id || profileDraft.goal || profile.goal || DEFAULT_PROFILE.goal;
          const targetUSD =
            Number.isFinite(entry?.targetUSD) && entry.targetUSD > 0
              ? entry.targetUSD
              : getGoalDefaultTargetUSD(goalId);
          const normalized = {
            id: goalId,
            targetUSD,
          };
          if (Number.isFinite(entry?.savedUSD)) {
            normalized.savedUSD = entry.savedUSD;
          }
          if (entry?.status) {
            normalized.status = entry.status;
          }
          if (entry?.createdAt) {
            normalized.createdAt = entry.createdAt;
          }
          if (entry?.customTitle) {
            normalized.customTitle = entry.customTitle;
          }
          if (entry?.customEmoji) {
            normalized.customEmoji = entry.customEmoji;
          }
          return normalized;
        })
      : [
          {
            id: profileDraft.goal || profile.goal || DEFAULT_PROFILE.goal,
            targetUSD: getGoalDefaultTargetUSD(profileDraft.goal || profile.goal || DEFAULT_PROFILE.goal),
            savedUSD: 0,
            status: "active",
            createdAt: Date.now(),
          },
        ];
    const activeEntry = normalizedGoals[0];
    const activeTarget =
      Number.isFinite(activeEntry?.targetUSD) && activeEntry.targetUSD > 0
        ? activeEntry.targetUSD
        : getGoalDefaultTargetUSD(activeEntry?.id || profile.goal || DEFAULT_PROFILE.goal);
    const activeSaved = Number.isFinite(activeEntry?.savedUSD) ? Math.max(activeEntry.savedUSD, 0) : 0;
    const hasMetTarget = activeTarget > 0 && activeSaved >= activeTarget;
    const prevCustomId = profile.customSpend?.id || "custom_habit";
    const prevCustomTitle = (profile.customSpend?.title || "").trim();
    const nextCustomId = profileDraft.customSpend?.id || prevCustomId;
    const nextCustomTitle = (profileDraft.customSpend?.title || "").trim();
    const nextProfile = {
      ...profileDraft,
      primaryGoals: normalizedGoals,
      goal: normalizedGoals[0]?.id || DEFAULT_PROFILE.goal,
      goalTargetUSD: activeTarget,
      goalCelebrated: hasMetTarget ? profileDraft.goalCelebrated : false,
    };
    if (nextCustomId && prevCustomTitle !== nextCustomTitle) {
      setTitleOverrides((prev) => {
        const next = { ...prev };
        if (nextCustomTitle) {
          next[nextCustomId] = nextCustomTitle;
        } else {
          delete next[nextCustomId];
        }
        return next;
      });
    }
    const prevBaselineUSD = profile.spendingProfile?.baselineMonthlyWasteUSD || 0;
    const nextBaselineUSD = nextProfile.spendingProfile?.baselineMonthlyWasteUSD || 0;
    if (prevBaselineUSD !== nextBaselineUSD) {
      logEvent("profile_baseline_updated", {
        previous_usd: prevBaselineUSD,
        baseline_usd: nextBaselineUSD,
        currency: nextProfile.currency || DEFAULT_PROFILE.currency,
      });
    }
    const prevCustomSpend = profile.customSpend || null;
    const nextCustomSpend = nextProfile.customSpend || null;
    const prevCustomAmountUSD = resolveCustomPriceUSD(
      prevCustomSpend,
      profile.currency || DEFAULT_PROFILE.currency
    );
    const nextCustomAmountUSD = resolveCustomPriceUSD(
      nextCustomSpend,
      nextProfile.currency || DEFAULT_PROFILE.currency
    );
    const prevCustomFrequency = prevCustomSpend?.frequencyPerWeek || 0;
    const nextCustomFrequency = nextCustomSpend?.frequencyPerWeek || 0;
    const customSpendChanged =
      prevCustomTitle !== nextCustomTitle ||
      prevCustomAmountUSD !== nextCustomAmountUSD ||
      prevCustomFrequency !== nextCustomFrequency;
    if (customSpendChanged) {
      logEvent("profile_custom_spend_updated", {
        title: nextCustomTitle || null,
        amount_usd: nextCustomAmountUSD || 0,
        frequency_per_week: nextCustomFrequency || 0,
        removed: nextCustomSpend ? 0 : 1,
      });
    }
    setProfile(nextProfile);
    setIsEditingProfile(false);
    Keyboard.dismiss();
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case "cart":
        return (
          <WishListScreen
            wishes={wishes}
            currency={profile.currency || DEFAULT_PROFILE.currency}
            onRemoveWish={handleRemoveWish}
            t={t}
            colors={colors}
            primaryGoals={profile.primaryGoals}
            onGoalLongPress={handleGoalLongPress}
            onGoalEdit={openGoalEditorPrompt}
            activeGoalId={activeGoalId || profile.goal}
            onSetActiveGoal={handleActiveGoalSelect}
            language={language}
            catCuriousSource={tamagotchiAnimations.curious}
          />
        );
      case "pending":
        return (
          <PendingScreen
            items={pendingList}
            currency={profile.currency || DEFAULT_PROFILE.currency}
            t={t}
            colors={colors}
            onResolve={handlePendingDecision}
            onDelete={handlePendingDelete}
            language={language}
            catCuriousSource={tamagotchiAnimations.curious}
          />
        );
      case "purchases":
        return (
          <RewardsScreen
            achievements={achievements}
            challenges={challengeList}
            activePane={rewardsPane}
            onPaneChange={setRewardsPane}
            onChallengeAccept={handleChallengeAccept}
            onChallengeClaim={handleChallengeClaim}
            onChallengeCancel={handleChallengeCancel}
            t={t}
            colors={colors}
            savedTotalUSD={savedTotalUSD}
            currency={profile.currency || DEFAULT_PROFILE.currency}
            onRewardClaim={handleRewardClaim}
            healthRewardAmount={HEALTH_PER_REWARD}
            language={language}
            dailyChallenge={activeDailyChallenge}
          />
        );
      case "profile":
        return (
          <ProfileScreen
            profile={isEditingProfile ? profileDraft : profile}
            stats={profileStats}
            isEditing={isEditingProfile}
            onFieldChange={(field, value) => setProfileDraft((prev) => ({ ...prev, [field]: value }))}
            onEditPress={startProfileEdit}
            onCancelEdit={cancelProfileEdit}
            onSaveEdit={saveProfileEdit}
            onThemeToggle={handleThemeToggle}
            onLanguageChange={handleLanguageChange}
            onCurrencyChange={handleProfileCurrencyChange}
          onGoalChange={handleProfileGoalChange}
          onResetData={handleResetData}
          onPickImage={handlePickImage}
          theme={theme}
          language={language}
          currencyValue={profile.currency || DEFAULT_PROFILE.currency}
          history={resolvedHistoryEvents}
          onHistoryDelete={handleHistoryDelete}
          freeDayStats={freeDayStats}
          rewardBadges={unlockedRewards}
          analyticsOptOut={analyticsOptOutValue}
          onAnalyticsToggle={handleAnalyticsToggle}
          t={t}
          colors={colors}
          moodPreset={moodPreset}
          mascotImageSource={tamagotchiAvatarSource}
        />
      );
      default:
        return (
          <FeedScreen
            products={filteredProducts}
            categories={categories}
            activeCategory={activeCategory}
            onCategorySelect={handleCategorySelect}
            savedTotalUSD={savedTotalUSD}
            wishes={wishes}
            onTemptationAction={handleTemptationAction}
            onTemptationEditToggle={toggleTemptationEditor}
            onTemptationQuickGoalToggle={handleQuickGoalToggle}
            t={t}
            language={language}
            colors={colors}
            currency={profile.currency || DEFAULT_PROFILE.currency}
            freeDayStats={freeDayStats}
            onFreeDayLog={handleLogFreeDay}
            goalAssignments={temptationGoalMap}
            analyticsStats={analyticsStats}
            refuseStats={refuseStats}
            cardFeedback={cardFeedback}
            historyEvents={resolvedHistoryEvents}
            profile={profile}
            titleOverrides={titleOverrides}
            descriptionOverrides={descriptionOverrides}
            onLevelCelebrate={handleLevelCelebrate}
            onBaselineSetup={handleBaselineSetupPrompt}
            healthPoints={healthPoints}
            onFreeDayRescue={handleFreeDayRescue}
            freeDayRescueCost={FREE_DAY_RESCUE_COST}
            impulseInsights={impulseInsights}
            moodPreset={moodPreset}
            onMoodDetailsOpen={openMoodDetails}
            onPotentialDetailsOpen={openPotentialDetails}
            heroGoalTargetUSD={heroGoalTargetUSD}
            heroGoalSavedUSD={heroGoalSavedUSD}
            mascotOverride={mascotOverride}
            onMascotAnimationComplete={handleMascotAnimationComplete}
            hideMascot={tamagotchiVisible}
            onMascotPress={openTamagotchiOverlay}
            editingTemptationId={priceEditor.item?.id || null}
            editingTitleValue={priceEditor.title}
            editingPriceValue={priceEditor.value}
            editingGoalLabel={priceEditorAssignedGoalTitle}
            editingEmojiValue={priceEditor.emoji}
            editingDescriptionValue={priceEditor.description || ""}
            editingCategoryValue={priceEditor.category || DEFAULT_IMPULSE_CATEGORY}
            onTemptationEditTitleChange={handlePriceTitleChange}
            onTemptationEditPriceChange={handlePriceInputChange}
            onTemptationEditEmojiChange={handlePriceEmojiChange}
            onTemptationEditDescriptionChange={handlePriceDescriptionChange}
            onTemptationEditCategoryChange={handlePriceCategoryChange}
            onTemptationEditSave={savePriceEdit}
            onTemptationEditCancel={closePriceEditor}
            onTemptationEditDelete={handleTemptationDelete}
            onTemptationGoalSelect={openGoalLinkPrompt}
            onTemptationSwipeDelete={handleTemptationDelete}
            onSavingsBreakdownPress={openSavingsBreakdown}
            resolveTemplateTitle={resolveTemplateTitle}
            tamagotchiMood={tamagotchiMood}
            tamagotchiDesiredFood={tamagotchiDesiredFood}
            primaryTemptationId={primaryTemptationId}
            primaryTemptationDescription={primaryTemptationDescription}
            focusTemplateId={focusTemplateId}
            tamagotchiAnimations={tamagotchiAnimations}
            lifetimeSavedUSD={lifetimeSavedUSD}
            interactionStats={temptationInteractions}
          />
        );
    }
  };

  useEffect(() => {
    const tabScreens = {
      feed: "feed",
      cart: "wishlist",
      pending: "pending",
      purchases: "rewards",
      profile: "profile",
    };
    const screenName = tabScreens[activeTab] || "feed";
    logScreenView(screenName);
  }, [activeTab]);
  useEffect(() => {
    if (!tabHintsHydrated) return;
    if (!tutorialSeen) return;
    if (tutorialVisible) return;
    if (tabHintVisible) return;
    if (tabHintsSeen[activeTab]) return;
    const config = TAB_HINT_CONFIG[activeTab];
    if (!config) return;
    setTabHintVisible({
      tab: activeTab,
      title: t(config.titleKey),
      body: t(config.bodyKey),
    });
    markTabHintSeen(activeTab);
  }, [
    activeTab,
    markTabHintSeen,
    tabHintVisible,
    tabHintsHydrated,
    tabHintsSeen,
    t,
    tutorialSeen,
    tutorialVisible,
  ]);
  useEffect(() => {
    if (!tutorialVisible && !tutorialSeen) return;
    if (!tabHintVisible) return;
    setTabHintVisible(null);
  }, [tutorialVisible, tutorialSeen, tabHintVisible]);

  useEffect(() => {
    const onboardingScreens = {
      language: "onboarding_language",
      persona: "onboarding_persona",
      habit: "onboarding_custom_spend",
      baseline: "onboarding_baseline",
      goal: "onboarding_goal",
      goal_target: "onboarding_goal_target",
      analytics_consent: "onboarding_analytics_consent",
    };
    const screen = onboardingScreens[onboardingStep];
    if (screen) {
      logScreenView(screen);
    }
  }, [onboardingStep]);

  if (onboardingStep !== "done") {
    const onboardingBackHandler = canGoBackOnboarding ? handleOnboardingBack : undefined;
    let onboardContent = null;
    if (onboardingStep === "logo") {
      onboardContent = <LogoSplash onDone={() => goToOnboardingStep("language", { recordHistory: false })} />;
    } else if (onboardingStep === "language") {
      onboardContent = (
        <LanguageScreen
          colors={colors}
          t={t}
          selectedLanguage={language}
          selectedCurrency={registrationData.currency || DEFAULT_PROFILE.currency}
          onLanguageChange={handleLanguageChange}
          onCurrencyChange={(code) => updateRegistrationData("currency", code)}
          onContinue={handleLanguageContinue}
          onBack={onboardingBackHandler}
          onShowTerms={handleTermsOpen}
          termsAccepted={termsAccepted}
          mascotWaveSource={tamagotchiAnimations.waving}
        />
      );
    } else if (onboardingStep === "guide") {
      onboardContent = (
        <HowItWorksScreen colors={colors} t={t} onContinue={handleGuideContinue} onBack={onboardingBackHandler} />
      );
    } else if (onboardingStep === "register") {
      onboardContent = (
        <RegistrationScreen
          data={registrationData}
          onChange={updateRegistrationData}
          onSubmit={handleRegistrationSubmit}
          onPickImage={handleRegistrationPickImage}
          colors={colors}
          t={t}
          onBack={onboardingBackHandler}
          mascotImageSource={tamagotchiAvatarSource}
        />
      );
    } else if (onboardingStep === "persona") {
      onboardContent = (
        <PersonaScreen
          data={registrationData}
          onChange={updateRegistrationData}
          onSubmit={handlePersonaSubmit}
          colors={colors}
          t={t}
          language={language}
          onBack={onboardingBackHandler}
        />
      );
    } else if (onboardingStep === "habit") {
      onboardContent = (
        <CustomHabitScreen
          data={registrationData}
          onChange={updateRegistrationData}
          onSubmit={handleHabitSubmit}
          colors={colors}
          t={t}
          currency={registrationData.currency || profile.currency || DEFAULT_PROFILE.currency}
          onBack={onboardingBackHandler}
          language={language}
        />
      );
    } else if (onboardingStep === "baseline") {
      onboardContent = (
        <SpendingBaselineScreen
          value={registrationData.baselineMonthlyWaste || ""}
          currency={registrationData.currency || profile.currency || DEFAULT_PROFILE.currency}
          onChange={(text) => updateRegistrationData("baselineMonthlyWaste", text)}
          onSubmit={handleBaselineSubmit}
          colors={colors}
          t={t}
          onBack={onboardingBackHandler}
        />
      );
    } else if (onboardingStep === "goal") {
      onboardContent = (
        <GoalScreen
          selectedGoals={registrationData.goalSelections || []}
          onToggle={handleGoalToggle}
          onSubmit={handleGoalStageContinue}
          colors={colors}
          t={t}
          language={language}
          onBack={onboardingBackHandler}
          customGoals={registrationData.customGoals || []}
          onCustomGoalCreate={openOnboardingGoalModal}
        />
      );
    } else if (onboardingStep === "goal_target") {
      onboardContent = (
        <GoalTargetScreen
          selections={registrationData.goalSelections || []}
          values={registrationData.goalTargetMap || {}}
          currency={registrationData.currency || profile.currency || DEFAULT_PROFILE.currency}
          onChange={handleGoalTargetDraftChange}
          onSubmit={handleGoalTargetSubmit}
          onBack={onboardingBackHandler}
          colors={colors}
          t={t}
          language={language}
          customGoals={registrationData.customGoals || []}
        />
      );
    } else if (onboardingStep === "analytics_consent") {
      onboardContent = (
        <AnalyticsConsentScreen
          colors={colors}
          t={t}
          onSubmit={(allow) => handleAnalyticsConsentComplete(allow)}
          onBack={onboardingBackHandler}
        />
      );
    }
    const onboardingBackground = onboardingStep === "logo" ? "#fff" : colors.background;
    return (
      <>
        <View style={[styles.appBackground, { backgroundColor: onboardingBackground }]}>
          <SafeAreaView
            style={[
              styles.appShell,
              {
                backgroundColor: onboardingBackground,
                paddingTop: topSafeInset,
              },
            ]}
          >
            <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor={onboardingBackground} />
            {onboardContent || (
              <LogoSplash onDone={() => goToOnboardingStep("language", { recordHistory: false })} />
            )}
          </SafeAreaView>
        </View>
        <ImageSourceSheet
          visible={showImageSourceSheet}
          colors={colors}
          t={t}
          onClose={closeImagePickerSheet}
          onSelect={handleImageSourceChoice}
        />
        <OnboardingGoalModal
          visible={onboardingGoalModal.visible}
          colors={colors}
          t={t}
          currency={registrationData.currency || profile.currency || DEFAULT_PROFILE.currency}
          data={onboardingGoalModal}
          onChange={handleOnboardingGoalChange}
          onSubmit={handleOnboardingGoalSubmit}
          onCancel={handleOnboardingGoalCancel}
          keyboardOffset={keyboardModalOffset}
        />
        <TermsModal
          visible={termsModalVisible}
          colors={colors}
          t={t}
          language={language}
          onAccept={handleTermsAccept}
          onCancel={handleTermsCancel}
          onOpenLink={handleTermsLinkOpen}
        />
      </>
    );
  }

  return (
    <SavingsProvider value={{ savedTotalUSD }}>
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
        disabled={!keyboardVisible}
        touchSoundDisabled
      >
        <View style={[styles.appBackground, { backgroundColor: colors.background }]}>
        <SafeAreaView
            style={[
              styles.appShell,
              {
                backgroundColor: colors.background,
                paddingTop: topSafeInset,
              },
            ]}
            onLayout={handleHomeLayout}
          >
        {startupLogoVisible && (
          <View style={[styles.logoSplashOverlay, { backgroundColor: colors.background }]}>
            <LogoSplash onDone={handleStartupLogoComplete} />
          </View>
        )}
        <StatusBar
          style={theme === "dark" ? "light" : "dark"}
          backgroundColor={systemOverlayActive ? overlaySystemColor : colors.background}
        />
        <View style={[styles.screenWrapper, screenKeyboardAdjustmentStyle]}>{renderActiveScreen()}</View>
        {savingsBreakdownVisible && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={closeSavingsBreakdown}>
              <View style={styles.breakdownOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.breakdownCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.breakdownHeader}>
                      <Text style={[styles.breakdownTitle, { color: colors.text }]}>
                        {language === "ru" ? "Разбивка экономии" : "Savings breakdown"}
                      </Text>
                      <TouchableOpacity onPress={closeSavingsBreakdown}>
                        <Text style={[styles.breakdownClose, { color: colors.muted }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  <View style={styles.breakdownBars}>
                    {(() => {
                        const maxTotal = Math.max(...savingsBreakdown.days.map((d) => d.total || 0), 1);
                        return savingsBreakdown.days.map((day) => (
                          <View key={day.label} style={styles.breakdownBarItem}>
                            <View style={[styles.breakdownBarTrack, { backgroundColor: colors.border }]}>
                              {day.stacks.map((stack) => {
                                const share = day.total ? (stack.value / (day.total || 1)) * 100 : 0;
                                const height = Math.max(6, Math.min(90, share));
                                return (
                                  <View
                                    key={stack.title}
                                    style={[
                                      styles.breakdownBarStack,
                                      {
                                        height: `${height}%`,
                                        backgroundColor: stack.color,
                                      },
                                    ]}
                                  />
                                );
                              })}
                            </View>
                            <Text style={[styles.breakdownBarLabel, { color: colors.muted }]}>{day.label}</Text>
                            <View style={styles.breakdownAmountWrapper}>
                              <Text
                                style={[styles.breakdownBarAmount, { color: colors.text }]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.6}
                              >
                                {savingsBreakdown.formatLocal(day.total)}
                              </Text>
                            </View>
                          </View>
                        ));
                      })()}
                    </View>
                    <View style={styles.breakdownLegend}>
                      {savingsBreakdown.legend.map((entry) => (
                        <View
                          key={entry.id}
                          style={[styles.breakdownLegendItem, { borderColor: colors.border }]}
                        >
                          <View
                            style={[styles.breakdownLegendDot, { backgroundColor: entry.color }]}
                          />
                          <Text style={[styles.breakdownLegendText, { color: colors.text }]}>
                            {entry.label} · {entry.percent}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {dailyChallengePromptVisible && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={handleDailyChallengeLater}>
              <View style={styles.dailySummaryBackdrop}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.dailyChallengeCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.dailyChallengeGlow,
                        { backgroundColor: isDarkTheme ? "rgba(255,200,87,0.4)" : "rgba(255,160,60,0.25)" },
                      ]}
                    />
                    <View style={styles.dailyChallengeContent}>
                      <View style={styles.dailyChallengeHeroRow}>
                        <View style={{ flex: 1, gap: 6 }}>
                          <View
                            style={[
                              styles.dailyChallengeBadge,
                              { borderColor: colors.border, backgroundColor: colors.background },
                            ]}
                          >
                            <Text style={[styles.dailyChallengeBadgeText, { color: colors.muted }]}>
                              {t("dailyChallengeOfferBadge")}
                            </Text>
                          </View>
                          <Text style={[styles.dailyChallengeTitle, { color: colors.text }]}>
                            {t("dailyChallengeOfferTitle")}
                          </Text>
                          <Text style={[styles.dailyChallengeSubtitle, { color: colors.muted }]}>
                            {t("dailyChallengeOfferSubtitle", { temptation: dailyChallengeDisplayTitle })}
                          </Text>
                        </View>
                        <View style={styles.dailyChallengeRewardStack}>
                          <HealthRewardTokens amount={dailyChallenge.rewardBonus} color={colors.text} iconSize={18} />
                          <Text style={[styles.dailyChallengeRewardHint, { color: colors.text }]}>
                            {t("dailyChallengeOfferReward", { amount: dailyChallenge.rewardBonus })}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.dailyChallengeTemptationRow}>
                        <View style={styles.dailyChallengeEmojiCard}>
                          <Text style={styles.dailyChallengeEmojiCardText}>{dailyChallenge.emoji || "✨"}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={[styles.dailyChallengeTemptationTitle, { color: colors.text }]}>
                            {dailyChallengeDisplayTitle}
                          </Text>
                          <Text style={[styles.dailyChallengeTemptationHint, { color: colors.muted }]}>
                            {t("dailyChallengeOfferHint")}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.dailyChallengeActions}>
                        <TouchableOpacity
                          style={[styles.dailyChallengePrimaryButton, { backgroundColor: colors.text }]}
                          activeOpacity={0.92}
                          onPress={handleDailyChallengeAccept}
                        >
                          <Text style={[styles.dailyChallengePrimaryText, { color: colors.background }]}>
                            {t("dailyChallengeOfferAccept")}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.dailyChallengeGhostButton, { borderColor: colors.border }]}
                          activeOpacity={0.85}
                          onPress={handleDailyChallengeLater}
                        >
                          <Text style={[styles.dailyChallengeGhostText, { color: colors.muted }]}>
                            {t("dailyChallengeOfferLater")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {dailySummaryVisible && dailySummaryData && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={() => setDailySummaryVisible(false)}>
              <View style={styles.dailySummaryBackdrop}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.dailySummaryCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.dailySummaryGlow,
                        { backgroundColor: isDarkTheme ? "#FFC857" : "#111111" },
                      ]}
                    />
                    <View style={styles.dailySummaryCardContent}>
                      <View style={styles.dailySummaryHeroRow}>
                        <View
                          style={[
                            styles.dailySummaryIconWrap,
                            {
                              backgroundColor: isDarkTheme
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(17,17,17,0.05)",
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text style={styles.dailySummaryIconText}>🌙</Text>
                        </View>
                        <View style={styles.dailySummaryHeroText}>
                          <View
                            style={[
                              styles.dailySummaryBadge,
                              { backgroundColor: colors.background, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.dailySummaryBadgeText, { color: colors.muted }]}>
                              {language === "ru" ? "вечерний отчёт" : "daily recap"}
                            </Text>
                          </View>
                          <Text style={[styles.dailySummaryTitle, { color: colors.text }]}>
                            {language === "ru" ? "Итоги дня" : "Today’s recap"}
                          </Text>
                          <Text style={[styles.dailySummarySubtitle, { color: colors.muted }]}>
                            {language === "ru"
                              ? "Так держать, продолжай в том же духе!"
                              : "Great momentum — keep it up!"}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.dailySummaryHighlight,
                          {
                            backgroundColor: isDarkTheme
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(17,17,17,0.03)",
                            borderColor: isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                          },
                        ]}
                      >
                        <Text style={[styles.dailySummaryHighlightLabel, { color: colors.muted }]}>
                          {language === "ru" ? "Сэкономлено сегодня" : "Saved today"}
                        </Text>
                        <Text style={[styles.dailySummaryHighlightValue, { color: colors.text }]}>
                          {formatCurrency(
                            convertToCurrency(
                              dailySummaryData.savedUSD || 0,
                              profile.currency || DEFAULT_PROFILE.currency
                            ),
                            profile.currency || DEFAULT_PROFILE.currency
                          )}
                        </Text>
                        <Text style={[styles.dailySummaryHighlightSub, { color: colors.muted }]}>
                          {language === "ru"
                            ? "Каждый отказ приближает к цели"
                            : "Every skip nudges the goal closer"}
                        </Text>
                      </View>
                      <View style={styles.dailySummaryStatsRow}>
                        <View
                          style={[
                            styles.dailySummaryStatCard,
                            {
                              backgroundColor: isDarkTheme
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(255,255,255,0.94)",
                              borderColor: isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
                            },
                          ]}
                        >
                          <Text style={[styles.dailySummaryStatValue, { color: colors.text }]}>
                            {dailySummaryData.declines || 0}
                          </Text>
                          <Text style={[styles.dailySummaryStatLabel, { color: colors.muted }]}>
                            {t("statsDeclines")}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.dailySummaryStatCard,
                            {
                              backgroundColor: isDarkTheme
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(255,255,255,0.94)",
                              borderColor: isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
                            },
                          ]}
                        >
                        <Text style={[styles.dailySummaryStatValue, { color: colors.text }]}>
                            {dailySummaryData.spends || 0}
                          </Text>
                          <Text style={[styles.dailySummaryStatLabel, { color: colors.muted }]}>
                            {language === "ru" ? "Траты" : "Spends"}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.dailySummaryButton, { backgroundColor: colors.text }]}
                        onPress={handleDailySummaryContinue}
                        activeOpacity={0.9}
                      >
                        <Text style={[styles.dailySummaryButtonText, { color: colors.background }]}>
                          {language === "ru" ? "Продолжить" : "Continue"}
                        </Text>
                        <Text style={[styles.dailySummaryButtonIcon, { color: colors.background }]}>
                          →
                        </Text>
                      </TouchableOpacity>
                      <Text style={[styles.dailySummaryHint, { color: colors.muted }]}>
                        {language === "ru"
                          ? "Загляну завтра с новыми цифрами."
                          : "See you tomorrow with fresh numbers."}
                      </Text>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {ratingPromptVisible && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={handleRatingPromptLater}>
              <View style={styles.ratingPromptBackdrop}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.ratingPromptCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.ratingPromptTitle, { color: colors.text }]}>
                      {t("ratingPromptTitle")}
                    </Text>
                    <Text style={[styles.ratingPromptBody, { color: colors.muted }]}>
                      {t("ratingPromptBody")}
                    </Text>
                    <View style={styles.ratingPromptActions}>
                      <TouchableOpacity
                        style={[styles.ratingPromptSecondary, { borderColor: colors.border }]}
                        activeOpacity={0.85}
                        onPress={handleRatingPromptLater}
                      >
                        <Text style={[styles.ratingPromptSecondaryText, { color: colors.muted }]}>
                          {t("ratingPromptLater")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.ratingPromptPrimary, { backgroundColor: colors.text }]}
                        activeOpacity={0.92}
                        onPress={handleRatingPromptConfirm}
                      >
                        <Text style={[styles.ratingPromptPrimaryText, { color: colors.background }]}>
                          {t("ratingPromptAction")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {levelShareModal.visible && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={closeLevelShareModal}>
              <View style={styles.dailySummaryBackdrop}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.levelShareModalCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.levelShareModalTitle, { color: colors.text }]}>
                      {t("levelShareModalTitle")}
                    </Text>
                    <Text style={[styles.levelShareModalCaption, { color: colors.muted }]}>
                      {t("levelShareModalCaption")}
                    </Text>
                    <ViewShot
                      ref={levelShareCardRef}
                      options={{ format: "png", quality: 0.96, result: "tmpfile" }}
                      style={styles.levelShareShot}
                    >
                      <View style={styles.levelShareCanvas}>
                        <View style={styles.levelShareBadge}>
                          <Text style={styles.levelShareBadgeText}>{t("levelShareCardBadge")}</Text>
                        </View>
                        <Text style={styles.levelShareCanvasTitle}>
                          {t("levelShareCardTitle", { level: levelShareModal.level })}
                        </Text>
                        <Text style={styles.levelShareCanvasSubtitle}>{t("levelShareCardSubtitle")}</Text>
                        <Image source={LEVEL_SHARE_CAT} style={styles.levelShareCat} />
                        <Text style={styles.levelShareJoin}>{t("levelShareJoin")}</Text>
                        <View style={styles.levelShareFooter}>
                          <Image source={LEVEL_SHARE_LOGO} style={styles.levelShareLogo} />
                          <View>
                            <Text style={styles.levelShareFooterBrand}>{t("levelShareFooterBrand")}</Text>
                            <Text style={styles.levelShareFooterHint}>{t("levelShareFooterHint")}</Text>
                          </View>
                        </View>
                      </View>
                    </ViewShot>
                    <View style={styles.levelShareActions}>
                      <TouchableOpacity
                        style={[
                          styles.levelSharePrimary,
                          { backgroundColor: colors.text, opacity: levelShareSharing ? 0.6 : 1 },
                        ]}
                        activeOpacity={0.92}
                        disabled={levelShareSharing}
                        onPress={handleLevelShareConfirm}
                      >
                        <Text style={[styles.levelSharePrimaryText, { color: colors.background }]}>
                          {levelShareSharing ? "..." : t("levelShareModalShare")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.levelShareGhost, { borderColor: colors.border }]}
                        activeOpacity={0.85}
                        onPress={closeLevelShareModal}
                      >
                        <Text style={[styles.levelShareGhostText, { color: colors.muted }]}>
                          {t("levelShareModalClose")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: tabBarBottomInset,
              marginBottom: Platform.OS === "ios" ? -(safeAreaInsets.bottom || 0) : 0,
              paddingTop: 12,
            },
          ]}
          onLayout={handleTabBarLayout}
        >
          {["feed", "cart", "pending", "purchases", "profile"].map((tab) => {
            const isHighlighted = !!tutorialHighlightTabs?.has(tab);
            const isActiveTab = activeTab === tab;
            const highlightBackground = theme === "dark" ? "rgba(255,255,255,0.2)" : "#FFFFFF";
            const highlightTextColor = theme === "dark" ? "#05070D" : colors.text;
            const defaultTextColor = isActiveTab ? colors.text : colors.muted;
            const textColor = isHighlighted ? highlightTextColor : defaultTextColor;
            const highlightBorderColor =
              theme === "dark" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.08)";
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  isHighlighted && styles.tabButtonHighlight,
                  isHighlighted && {
                    borderColor: highlightBorderColor,
                    backgroundColor: highlightBackground,
                  },
                ]}
                onPress={() => handleTabChange(tab)}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    {
                      color: textColor,
                      fontWeight: isActiveTab || isHighlighted ? "700" : "500",
                      fontSize: Platform.OS === "ios" ? 12 : 13,
                    },
                  ]}
                >
                  {tab === "feed"
                    ? t("feedTab")
                    : tab === "cart"
                    ? t("wishlistTab")
                    : tab === "pending"
                    ? t("pendingTab")
                    : tab === "purchases"
                    ? t("purchasesTitle")
                    : t("profileTab")}
                </Text>
                {tab === "purchases" && rewardsBadgeCount > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      styles.tabBadgeFloating,
                      {
                        backgroundColor: theme === "dark" ? "#FEE5A8" : colors.text,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        { color: theme === "dark" ? "#05070D" : colors.background },
                      ]}
                    >
                      {rewardsBadgeCount > 99 ? "99+" : `${rewardsBadgeCount}`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab !== "profile" && activeTab !== "purchases" && (
          <View pointerEvents="box-none" style={styles.fabCenterContainer}>
            <View
              ref={fabButtonWrapperRef}
              style={styles.fabButtonWrapper}
              pointerEvents="box-none"
              onLayout={handleFabWrapperLayout}
            >
              {fabTutorialVisible && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.fabTutorialHalo,
                    {
                      backgroundColor: theme === "dark" ? "rgba(255,214,140,0.22)" : "rgba(245,200,105,0.22)",
                      borderColor: theme === "dark" ? "#FFE08A" : "#F5C869",
                      shadowColor: theme === "dark" ? "#FFE08A" : "#F5C869",
                    },
                  ]}
                />
              )}
              <AnimatedTouchableOpacity
                style={[
                  styles.cartBadge,
                  {
                    backgroundColor: colors.text,
                    borderColor: colors.border,
                    transform: [{ scale: cartBadgeScale }],
                  },
                  fabTutorialVisible && styles.cartBadgeHighlight,
                ]}
                onPress={handleFabPress}
                onLongPress={handleFabLongPress}
                delayLongPress={420}
              >
                <Text style={[styles.cartBadgeIcon, { color: colors.background }]}>+</Text>
              </AnimatedTouchableOpacity>
            </View>
          </View>
        )}

        <CoinEntryModal
          visible={coinEntryVisible}
          colors={colors}
          t={t}
          currency={profile.currency || DEFAULT_PROFILE.currency}
          language={language}
          maxAmountUSD={coinSliderMaxUSD}
          onUpdateMaxUSD={handleCoinSliderMaxUpdate}
          onSubmit={handleCoinEntrySubmit}
          onCancel={handleCoinEntryClose}
        />

        <QuickCustomModal
          visible={showCustomSpend}
          colors={colors}
          t={t}
          currency={profile.currency || DEFAULT_PROFILE.currency}
          data={quickSpendDraft}
          onChange={handleQuickCustomChange}
          onSubmit={handleQuickCustomSubmit}
          onCancel={handleQuickCustomCancel}
          language={language}
          keyboardOffset={keyboardModalOffset}
        />
        <NewPendingModal
          visible={newPendingModal.visible}
          colors={colors}
          t={t}
          currency={profile.currency || DEFAULT_PROFILE.currency}
          data={newPendingModal}
          onChange={handleNewPendingChange}
          onSubmit={handleNewPendingSubmit}
          onCancel={handleNewPendingCancel}
          keyboardOffset={keyboardModalOffset}
        />

        <NewGoalModal
          visible={newGoalModal.visible}
          colors={colors}
          t={t}
          currency={profile.currency || DEFAULT_PROFILE.currency}
          data={newGoalModal}
          onChange={handleNewGoalChange}
          onSubmit={handleNewGoalSubmit}
          onCancel={handleNewGoalCancel}
          keyboardOffset={keyboardModalOffset}
        />

        {activeTab !== "profile" && fabTutorialVisible && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={() => handleFabTutorialDismiss("backdrop")}>
              <View style={styles.fabTutorialBackdrop}>
                <Svg
                  pointerEvents="none"
                  width={SCREEN_WIDTH}
                  height={SCREEN_HEIGHT}
                  style={styles.fabTutorialOverlaySvg}
                >
                  <Defs>
                    <Mask id="fabTutorialMask">
                      <SvgRect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="white" />
                      <SvgCircle
                        cx={fabTutorialCutout.centerX}
                        cy={fabTutorialCutout.centerY}
                        r={FAB_TUTORIAL_HALO_SIZE / 2}
                        fill="black"
                      />
                    </Mask>
                  </Defs>
                  <SvgRect
                    width={SCREEN_WIDTH}
                    height={SCREEN_HEIGHT}
                    fill={fabOverlayColor}
                    mask="url(#fabTutorialMask)"
                  />
                </Svg>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.fabTutorialContent} pointerEvents="box-none">
                    <View
                      style={[
                        styles.fabTutorialCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          marginBottom: tabBarBottomInset + FAB_CONTAINER_BOTTOM + FAB_TUTORIAL_CARD_SPACING,
                        },
                      ]}
                    >
                      <Text style={[styles.fabTutorialTitle, { color: colors.text }]}>
                        {t("fabTutorialTitle")}
                      </Text>
                      <Text style={[styles.fabTutorialDescription, { color: colors.muted }]}>
                        {t("fabTutorialDesc")}
                      </Text>
                      <TouchableOpacity
                        style={[styles.fabTutorialButton, { backgroundColor: colors.text }]}
                        onPress={() => handleFabTutorialDismiss("cta")}
                      >
                        <Text style={[styles.fabTutorialButtonText, { color: colors.background }]}>
                          {t("fabTutorialAction")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {tutorialVisible && activeTutorialStep && (
          <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleTutorialSkip}
          >
            <View
              style={[
                styles.tutorialBackdrop,
                { paddingBottom: 24 + tutorialCardOffset },
              ]}
              pointerEvents="box-none"
            >
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.tutorialBackdropDim,
                  { bottom: tutorialOverlayInset },
                ]}
              />
              <View
                style={[
                  styles.tutorialCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={styles.tutorialIcon}>{activeTutorialStep.icon}</Text>
                <Text style={[styles.tutorialTitle, { color: colors.text }]}>
                  {t(activeTutorialStep.titleKey)}
                </Text>
                <Text style={[styles.tutorialDescription, { color: colors.muted }]}>
                  {t(activeTutorialStep.descriptionKey)}
                </Text>
                <View style={styles.tutorialProgressRow}>
                  <View style={styles.tutorialDots}>
                    {APP_TUTORIAL_STEPS.map((step, index) => (
                      <View
                        key={step.id}
                        style={[
                          styles.tutorialDot,
                          {
                            backgroundColor:
                              index <= tutorialStepIndex ? colors.text : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.tutorialProgressText, { color: colors.muted }]}>
                    {t("tutorialProgress", {
                      current: `${tutorialStepIndex + 1}`,
                      total: `${APP_TUTORIAL_STEPS.length}`,
                    })}
                  </Text>
                </View>
                <View style={styles.tutorialActions}>
                  <TouchableOpacity style={styles.tutorialSkipButton} onPress={handleTutorialSkip}>
                    <Text style={[styles.tutorialSkipText, { color: colors.muted }]}>
                      {t("tutorialSkip")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tutorialPrimaryButton, { backgroundColor: colors.text }]}
                    onPress={handleTutorialNext}
                  >
                    <Text style={[styles.tutorialPrimaryText, { color: colors.background }]}>
                      {tutorialStepIndex === APP_TUTORIAL_STEPS.length - 1
                        ? t("tutorialDone")
                        : t("tutorialNext")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
        {tabHintVisible && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissTabHint}>
              <View style={styles.tabHintBackdrop}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.tabHintCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.tabHintTitle, { color: colors.text }]}>
                      {tabHintVisible.title}
                    </Text>
                    <Text style={[styles.tabHintBody, { color: colors.muted }]}>
                      {tabHintVisible.body}
                    </Text>
                    <TouchableOpacity
                      style={[styles.tabHintButton, { backgroundColor: colors.text }]}
                      onPress={dismissTabHint}
                    >
                      <Text style={[styles.tabHintButtonText, { color: colors.background }]}>
                        {t("tabHintGotIt")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        <Modal
          visible={tamagotchiVisible}
          transparent
          animationType="fade"
          onRequestClose={closeTamagotchiOverlay}
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={closeTamagotchiOverlay}>
            <View style={styles.tamagotchiBackdrop}>
              {partyActive && <PartyFireworksLayer isDarkMode={isDarkTheme} />}
              <TouchableWithoutFeedback onPress={() => {}}>
                <Animated.View
                  style={[
                    styles.tamagotchiCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    {
                      transform: [
                        {
                          translateY: tamagotchiModalAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        },
                        {
                          scale: tamagotchiModalAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                      opacity: tamagotchiModalAnim,
                    },
                  ]}
                >
                  <View style={styles.tamagotchiHeader}>
                    <Text style={[styles.tamagotchiTitle, { color: colors.text }]}>
                      {language === "ru" ? "Алми" : "Almi"}
                    </Text>
                    <Text style={[styles.tamagotchiMood, { color: colors.muted }]}>
                      {tamagotchiMood.label}
                    </Text>
                  </View>
                  <View style={styles.tamagotchiPreview}>
                    <AlmiTamagotchi
                      override={mascotOverride}
                      onOverrideComplete={handleMascotAnimationComplete}
                      isStarving={tamagotchiMood.tone === "urgent"}
                      animations={tamagotchiAnimations}
                    />
                    <TouchableOpacity
                      style={[
                        styles.skinPickerButton,
                        { borderColor: colors.border, backgroundColor: colors.card },
                      ]}
                      onPress={openSkinPicker}
                    >
                      <Text style={styles.skinPickerIcon}>🧥</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.tamagotchiStatRow}>
                    <Text style={[styles.tamagotchiStatLabel, { color: colors.muted }]}>
                      {language === "ru" ? "Сытость" : "Fullness"}
                    </Text>
                    <Text style={[styles.tamagotchiStatValue, { color: colors.text }]}>
                      {Math.round(tamagotchiHungerPercent)}%
                    </Text>
                  </View>
                  <View style={[styles.tamagotchiProgress, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.tamagotchiProgressFill,
                        {
                          backgroundColor: colors.text,
                          width: `${Math.max(8, Math.min(100, tamagotchiHungerPercent))}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.tamagotchiStatRow}>
                    <Text style={[styles.tamagotchiStatLabel, { color: colors.muted }]}>
                      {language === "ru" ? "Монетки" : "Coins"}
                    </Text>
                    <Text style={[styles.tamagotchiStatValue, { color: colors.text }]}>
                      {tamagotchiCoins}
                    </Text>
                  </View>
                  {tamagotchiState.lastFedAt ? (
                    <Text style={[styles.tamagotchiSub, { color: colors.muted }]}>
                      {language === "ru" ? "Покормлен" : "Fed at"}:{" "}
                      {new Date(tamagotchiState.lastFedAt).toLocaleString()}
                    </Text>
                  ) : (
                    <Text style={[styles.tamagotchiSub, { color: colors.muted }]}>
                      {language === "ru" ? "Алми ждёт первую монетку" : "Almi awaits the first coin"}
                    </Text>
                  )}
                  <Text style={[styles.tamagotchiFoodTitle, { color: colors.text }]}>
                    {t("tamagotchiFoodMenuTitle")}
                  </Text>
                  <View style={styles.tamagotchiFoodList}>
                    {TAMAGOTCHI_FOOD_OPTIONS.map((food, index) => {
                      const label = food.label[language] || food.label.en;
                      const coinTier = getHealthCoinTierForAmount(food.cost);
                      const affordable = tamagotchiCoins >= food.cost;
                      const isDesired = tamagotchiDesiredFood?.id === food.id;
                      const isLast = index === TAMAGOTCHI_FOOD_OPTIONS.length - 1;
                      return (
                        <TouchableOpacity
                          key={food.id}
                          style={[
                            styles.tamagotchiFoodButton,
                            { borderColor: colors.border, backgroundColor: colors.card },
                            isDesired && { borderColor: colors.text },
                            tamagotchiIsFull && styles.tamagotchiFoodButtonDisabled,
                            isLast && styles.tamagotchiFoodButtonLast,
                          ]}
                          activeOpacity={0.9}
                          onPress={() => feedTamagotchi(food.id)}
                          disabled={tamagotchiIsFull}
                        >
                          <Text style={styles.tamagotchiFoodEmoji}>{food.emoji}</Text>
                          <View style={styles.tamagotchiFoodInfo}>
                            <Text style={[styles.tamagotchiFoodLabel, { color: colors.text }]}>{label}</Text>
                            <Text style={[styles.tamagotchiFoodBoost, { color: colors.muted }]}>
                              {t("tamagotchiFoodBoostLabel", { percent: food.hungerBoost })}
                            </Text>
                          </View>
                          <View style={styles.tamagotchiFoodCost}>
                            <Image source={coinTier.asset} style={styles.tamagotchiFoodCostIcon} />
                            <Text
                              style={[
                                styles.tamagotchiFoodCostText,
                                { color: colors.text, opacity: affordable ? 1 : 0.5 },
                              ]}
                            >
                              ×{food.cost}
                            </Text>
                          </View>
                          {isDesired && (
                            <View style={[styles.tamagotchiFoodBadge, { backgroundColor: colors.text }]}>
                              <Text style={[styles.tamagotchiFoodBadgeText, { color: colors.background }]}>
                                {t("tamagotchiFoodWantLabel")}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.tamagotchiActions}>
                    <TouchableOpacity
                      style={[
                        styles.tamagotchiButton,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                      onPress={startParty}
                    >
                      <View style={styles.tamagotchiButtonContent}>
                        <Image source={HEALTH_COIN_TIERS[1].asset} style={styles.tamagotchiButtonIcon} />
                        <Text style={[styles.tamagotchiButtonText, { color: colors.text }]}>
                          {language === "ru"
                            ? `Вечеринка ×${TAMAGOTCHI_PARTY_BLUE_COST}`
                            : `Party ×${TAMAGOTCHI_PARTY_BLUE_COST}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  {tamagotchiIsFull && (
                    <Text style={[styles.tamagotchiHint, { color: colors.muted }]}>
                      {language === "ru" ? "Алми сыт, покорми позже." : "He is full, try again later."}
                    </Text>
                  )}
                  <TouchableOpacity onPress={closeTamagotchiOverlay} style={styles.tamagotchiClose}>
                    <Text style={[styles.tamagotchiCloseText, { color: colors.muted }]}>
                      {language === "ru" ? "Закрыть" : "Close"}
                    </Text>
                  </TouchableOpacity>
                  {partyActive && (
                    <>
                      <ConfettiCannon
                        key={`party_confetti_${partyBurstKey}`}
                        count={120}
                        origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
                        fadeOut
                        explosionSpeed={420}
                        fallSpeed={3200}
                      />
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.partyGlowOverlay,
                          {
                            opacity: partyGlow.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.1, 0.4],
                            }),
                            backgroundColor: isDarkTheme ? "rgba(110,155,255,0.6)" : "rgba(255,210,120,0.7)",
                          },
                        ]}
                      />
                    </>
                  )}
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
        <Modal
          visible={skinPickerVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={closeSkinPicker}
        >
          <TouchableWithoutFeedback onPress={closeSkinPicker}>
            <View style={styles.skinPickerBackdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.skinPickerCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.skinPickerTitle, { color: colors.text, textAlign: "center" }]}>
                    {t("tamagotchiSkinTitle")}
                  </Text>
                  <ScrollView
                    contentContainerStyle={styles.skinPickerList}
                    showsVerticalScrollIndicator={false}
                  >
                    {tamagotchiSkinsLocked && (
                      <View
                        style={[
                          styles.skinUnlockCard,
                          {
                            backgroundColor: lightenColor(
                              colors.card,
                              isDarkTheme ? 0.08 : 0.15
                            ),
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.skinUnlockTitle, { color: colors.text }]}>
                          {t("tamagotchiSkinUnlockTitle")}
                        </Text>
                        <Text style={[styles.skinUnlockSubtitle, { color: colors.muted }]}>
                          {t("tamagotchiSkinUnlockDescription", { email: SUPPORT_EMAIL })}
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.skinUnlockButton,
                            { backgroundColor: colors.text },
                          ]}
                          onPress={handleUnlockSkinsPress}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.skinUnlockButtonText,
                              { color: colors.background },
                            ]}
                          >
                            {t("tamagotchiSkinUnlockButton")}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {TAMAGOTCHI_SKIN_OPTIONS.map((skin) => {
                      const active = skin.id === tamagotchiSkinId;
                      const locked = tamagotchiSkinsLocked && skin.id !== DEFAULT_TAMAGOTCHI_SKIN;
                      const label = skin.label?.[language] || skin.label?.en || skin.id;
                      const description =
                        skin.description?.[language] || skin.description?.en || "";
                      return (
                        <TouchableOpacity
                          key={skin.id}
                          style={[
                            styles.skinPickerItem,
                            {
                              borderColor: active ? colors.text : colors.border,
                              backgroundColor: active
                                ? lightenColor(colors.card, isDarkTheme ? 0.1 : 0.2)
                                : "transparent",
                              opacity: locked ? 0.55 : 1,
                            },
                          ]}
                          onPress={() => handleSkinSelect(skin.id)}
                          disabled={locked}
                        >
                          <Image source={skin.preview} style={styles.skinPickerAvatar} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.skinPickerItemTitle, { color: colors.text }]}>
                              {label}
                            </Text>
                            {!!description && (
                              <Text style={[styles.skinPickerItemSubtitle, { color: colors.muted }]}>
                                {description}
                              </Text>
                            )}
                          </View>
                          {active ? (
                            <View
                              style={[
                                styles.skinPickerBadge,
                                { borderColor: colors.border, backgroundColor: colors.background },
                              ]}
                            >
                              <Text style={[styles.skinPickerBadgeText, { color: colors.text }]}>
                                {t("tamagotchiSkinCurrent")}
                              </Text>
                            </View>
                          ) : locked ? (
                            <View
                              style={[
                                styles.skinPickerBadge,
                                styles.skinPickerLockedBadge,
                                { borderColor: colors.border, backgroundColor: colors.background },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.skinPickerBadgeText,
                                  styles.skinPickerLockedBadgeText,
                                  { color: colors.muted },
                                ]}
                              >
                                {t("tamagotchiSkinLockedBadge")}
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {editOverlayVisible && (
          <TouchableWithoutFeedback onPress={closePriceEditor}>
            <View
              style={[styles.temptationEditOverlay, modalKeyboardPaddingStyle]}
              pointerEvents="box-none"
            >
              <Animated.View
                style={[
                  styles.temptationEditBackdrop,
                  {
                    opacity: editOverlayAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.6],
                    }),
                  },
                ]}
              />
              {priceEditor.item && (
                <TouchableWithoutFeedback onPress={() => {}}>
                  <Animated.View
                    style={[
                      styles.temptationEditCardContainer,
                      {
                        opacity: editOverlayAnim,
                        transform: [
                          {
                            scale: editOverlayAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.92, 1],
                            }),
                          },
                          {
                            translateY: editOverlayAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [40, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <TemptationCard
                      item={priceEditor.item}
                      language={language}
                      colors={colors}
                      t={t}
                      isFocusTarget={priceEditor.item?.id === focusTemplateId}
                      descriptionOverride={
                        descriptionOverrides[priceEditor.item.id] ||
                        (priceEditor.item.id === primaryTemptationId
                          ? primaryTemptationDescription
                          : null)
                      }
                      currency={profile.currency || DEFAULT_PROFILE.currency}
                      stats={refuseStats[priceEditor.item.id]}
                      feedback={cardFeedback[priceEditor.item.id]}
                      titleOverride={titleOverrides[priceEditor.item.id]}
                      goalLabel={priceEditorAssignedGoalTitle || null}
                      isEditing
                      showEditorInline
                      cardStyle={styles.temptationOverlayCard}
                      editTitleValue={priceEditor.title}
                      editPriceValue={priceEditor.value}
                      editGoalLabel={priceEditorAssignedGoalTitle || ""}
                      editEmojiValue={priceEditor.emoji}
                      editDescriptionValue={priceEditor.description || ""}
                      editCategoryValue={priceEditor.category}
                      onEditTitleChange={handlePriceTitleChange}
                      onEditPriceChange={handlePriceInputChange}
                      onEditEmojiChange={handlePriceEmojiChange}
                      onEditDescriptionChange={handlePriceDescriptionChange}
                      onEditCategoryChange={handlePriceCategoryChange}
                      onEditSave={savePriceEdit}
                      onEditCancel={closePriceEditor}
                      onEditDelete={() => promptTemptationDelete(priceEditor.item)}
                      onEditGoalSelect={() => {
                        setGoalLinkPrompt({ visible: true, item: priceEditor.item, intent: "edit" });
                      }}
                      onQuickGoalToggle={handleQuickGoalToggle}
                      onSwipeDelete={() => promptTemptationDelete(priceEditor.item)}
                      onAction={async (type) => {
                        await handleTemptationAction(type, priceEditor.item);
                      }}
                    />
                  </Animated.View>
                </TouchableWithoutFeedback>
              )}
            </View>
          </TouchableWithoutFeedback>
        )}

        {moodDetailsVisible && moodPreset && (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={closeMoodDetails}
            statusBarTranslucent
          >
            <TouchableWithoutFeedback onPress={closeMoodDetails}>
              <View style={styles.moodDetailsBackdrop}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <MoodGradientBlock colors={moodGradient} style={styles.moodDetailsCard}>
                    <Text style={[styles.moodDetailsLabel, { color: colors.text }]}>
                      {moodPreset.label}
                    </Text>
                    {moodDescription ? (
                      <Text style={[styles.moodDetailsDescription, { color: colors.text }]}>
                        {moodDescription}
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.moodDetailsButton, { borderColor: colors.text }]}
                      onPress={closeMoodDetails}
                    >
                      <Text style={[styles.moodDetailsButtonText, { color: colors.text }]}>
                        {t("profileOk") || "Ок"}
                      </Text>
                    </TouchableOpacity>
                  </MoodGradientBlock>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {potentialDetailsVisible && (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={closePotentialDetails}
            statusBarTranslucent
          >
            <TouchableWithoutFeedback onPress={closePotentialDetails}>
              <View style={styles.moodDetailsBackdrop}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.moodDetailsCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.moodDetailsLabel, { color: colors.text }]}>
                      {t("potentialBlockTitle")}
                    </Text>
                    <Text style={[styles.moodDetailsDescription, { color: colors.muted }]}>
                      {potentialDetailsText}
                    </Text>
                    <TouchableOpacity
                      style={[styles.moodDetailsButton, { borderColor: colors.text }]}
                      onPress={closePotentialDetails}
                    >
                      <Text style={[styles.moodDetailsButtonText, { color: colors.text }]}>
                        {t("profileOk") || "Ок"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {activeTab !== "profile" && fabMenuVisible && (
          <View pointerEvents="box-none" style={styles.fabMenuOverlay}>
            <TouchableWithoutFeedback onPress={closeFabMenu}>
              <View style={styles.fabMenuBackdrop} />
            </TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.fabOption,
                styles.fabOptionRow,
                {
                  opacity: fabMenuAnim,
                  transform: [
                    {
                      translateY: fabMenuAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                    { scale: fabMenuAnim },
                  ],
                },
              ]}
            >
              <View style={styles.fabOptionRowContent}>
                <TouchableOpacity
                  style={[styles.fabCircle, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleFabNewGoal}
                >
                  <Text style={[styles.fabOptionText, { color: colors.text }]} numberOfLines={2}>
                    {t("fabNewGoal")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fabCircle, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={handleFabNewTemptation}
                >
                  <Text style={[styles.fabOptionText, { color: colors.text }]} numberOfLines={2}>
                    {t("fabNewTemptation")}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}

        {overlay &&
          overlay.type !== "level" &&
          overlay.type !== "save" &&
          overlay.type !== "custom_temptation" &&
          overlay.type !== "reward" &&
          overlay.type !== "health" &&
          overlay.type !== "focus_reward" &&
          overlay.type !== "goal_complete" &&
          overlay.type !== "impulse_alert" &&
          overlay.type !== "focus_digest" && (
            <Modal visible transparent animationType="fade" statusBarTranslucent>
              <TouchableWithoutFeedback onPress={dismissOverlay}>
                <View style={styles.confettiLayer}>
                  <View
                    style={[
                      styles.overlayDim,
                      { backgroundColor: overlayDimColor },
                    ]}
                  />
                  {overlay.type === "cancel" && <RainOverlay colors={colors} />}
                  {overlay.type === "purchase" && (
                    <ConfettiCannon
                      key={confettiKey}
                      count={90}
                      origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
                      fadeOut
                      explosionSpeed={350}
                      fallSpeed={2600}
                    />
                  )}
                  <View
                    style={[
                      styles.celebrationBanner,
                      {
                        backgroundColor: overlayCardBackground,
                        borderColor: overlayBorderColor,
                        borderWidth: overlay.type === "cart" ? 0 : 1,
                      },
                    ]}
                  >
                    {(overlay.type === "cancel" ||
                      overlay.type === "purchase" ||
                      overlay.type === "completion") && (
                      <Image
                        source={
                          overlay.type === "cancel"
                            ? tamagotchiAnimations.sad
                            : tamagotchiAnimations.happy
                        }
                        style={[
                          styles.celebrationCat,
                          overlay.type === "purchase" || overlay.type === "completion"
                            ? styles.catHappy
                            : styles.catSad,
                        ]}
                      />
                    )}
                    <Text style={[styles.celebrationText, { color: colors.text }]}>
                      {overlay.message}
                    </Text>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
        )}
        {overlay?.type === "focus_digest" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlayFullScreen}>
              <View
                style={[
                  styles.overlayDim,
                  { backgroundColor: overlayDimColor },
                ]}
              />
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.focusDigestCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.focusDigestTitle, { color: colors.text }]}>
                    {overlay.message?.title || ""}
                  </Text>
                  <Text style={[styles.focusDigestBody, { color: colors.muted }]}>
                    {overlay.message?.body || ""}
                  </Text>
                  <View style={styles.focusDigestStats}>
                    <View
                      style={[
                        styles.focusDigestStat,
                        {
                          borderColor: colors.border,
                          backgroundColor: lightenColor(colors.card, isDarkTheme ? 0.08 : 0.2),
                        },
                      ]}
                    >
                      <Text style={[styles.focusDigestLabel, { color: colors.muted }]}>
                        {t("focusDigestStrongLabel")}
                      </Text>
                      <Text style={[styles.focusDigestValue, { color: colors.text }]}>
                        {overlay.message?.strong?.title || t("focusDigestMissing")}
                      </Text>
                      {overlay.message?.strong?.window && (
                        <Text style={[styles.focusDigestHint, { color: colors.muted }]}>
                          {overlay.message.strong.window}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.focusDigestStat,
                        {
                          borderColor: colors.border,
                          backgroundColor: lightenColor(colors.card, isDarkTheme ? 0.04 : 0.12),
                        },
                      ]}
                    >
                      <Text style={[styles.focusDigestLabel, { color: colors.muted }]}>
                        {t("focusDigestWeakLabel")}
                      </Text>
                      <Text style={[styles.focusDigestValue, { color: colors.text }]}>
                        {overlay.message?.weak?.title || t("focusDigestMissing")}
                      </Text>
                      {overlay.message?.weak?.window && (
                        <Text style={[styles.focusDigestHint, { color: colors.muted }]}>
                          {overlay.message.weak.window}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.focusDigestButtons}>
                    <TouchableOpacity
                      style={[styles.focusDigestSecondary, { borderColor: colors.border }]}
                      onPress={handleFocusOverlayLater}
                    >
                      <Text style={[styles.focusDigestSecondaryText, { color: colors.muted }]}>
                        {t("focusDigestDismiss")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.focusDigestPrimary,
                        {
                          backgroundColor: overlay.message?.targetId ? colors.text : colors.border,
                        },
                      ]}
                      disabled={!overlay.message?.targetId}
                      onPress={() =>
                        handleFocusOverlayConfirm(
                          overlay.message?.targetId,
                          overlay.message?.positive ? "digest_positive" : "digest_negative"
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.focusDigestPrimaryText,
                          { color: overlay.message?.targetId ? colors.background : colors.muted },
                        ]}
                      >
                        {t("focusDigestButton")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </Modal>
        )}
        {overlay?.type === "level" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlayFullScreen}>
              <TouchableWithoutFeedback onPress={dismissOverlay}>
                <View style={styles.overlayTouchable} />
              </TouchableWithoutFeedback>
              <LevelUpCelebration
                colors={colors}
                message={overlay.message}
                level={overlay.message}
                t={t}
                onSharePress={handleLevelSharePress}
              />
            </View>
          </Modal>
        )}
        {overlay?.type === "save" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissOverlay}>
              <View style={styles.saveOverlay}>
                <View
                  style={[
                    styles.overlayDim,
                    { backgroundColor: overlayDimColor },
                  ]}
                />
                <CoinRainOverlay dropCount={16} />
                <Animated.View style={[styles.saveCard, saveCardBackgroundStyle]}>
                  <Text style={[styles.saveTitle, { color: colors.text }]}>{t("saveCelebrateTitlePrefix")}</Text>
                  <Text style={[styles.saveGoalText, { color: colors.text }]}>
                    {saveOverlayPayload?.title || ""}
                  </Text>
                  {saveOverlayGoalText ? (
                    <View style={styles.saveGoalBox}>
                      <Text style={[styles.saveGoalText, { color: colors.text }]}>
                        {saveOverlayGoalText}
                      </Text>
                    </View>
                  ) : null}
                  {Boolean(saveOverlayPayload?.coinReward) && (
                    <View
                      style={[
                        styles.saveCoinsRow,
                        {
                          backgroundColor: isDarkTheme
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(33,150,243,0.08)",
                        },
                      ]}
                    >
                      <Image source={HEALTH_COIN_TIERS[0].asset} style={styles.saveCoinIcon} />
                      <Text style={[styles.saveCoinsText, { color: colors.text }]}>
                        {language === "ru"
                          ? `+${saveOverlayPayload.coinReward} монет в копилку Алми`
                          : `+${saveOverlayPayload.coinReward} coins for Almi`}
                      </Text>
                    </View>
                  )}
                  <Image source={tamagotchiAnimations.happy} style={styles.saveGif} />
                </Animated.View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {overlay?.type === "custom_temptation" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissOverlay}>
              <View style={styles.saveOverlay}>
                <View
                  style={[
                    styles.overlayDim,
                    { backgroundColor: overlayDimColor },
                  ]}
                />
                <View
                  style={[
                    styles.customTemptationCard,
                    { backgroundColor: overlayCardBackground, borderColor: overlayBorderColor },
                  ]}
                >
                  <Image source={tamagotchiAnimations.follow} style={styles.customTemptationGif} />
                  <Text style={[styles.customTemptationText, { color: colors.text }]}>
                    {t("customTemptationAdded", { title: overlay.message || "" })}
                  </Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {overlay?.type === "reward" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissOverlay}>
              <View style={styles.overlayFullScreen}>
                <RewardCelebration
                  colors={colors}
                  message={overlay.message}
                  t={t}
                  mascotHappySource={tamagotchiAnimations.happy}
                />
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {overlay?.type === "focus_reward" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissOverlay}>
              <View style={styles.overlayFullScreen}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.focusRewardCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.focusRewardIconRow}>
                      <Image source={HEALTH_COIN_TIERS[0].asset} style={styles.focusRewardCoin} />
                      <Text style={[styles.focusRewardAmount, { color: colors.text }]}>
                        +{overlay.message?.amount || FOCUS_VICTORY_REWARD}
                      </Text>
                    </View>
                    <Text style={[styles.focusRewardTitle, { color: colors.text }]}>
                      {overlay.message?.title || t("focusRewardTitle")}
                    </Text>
                    <Text style={[styles.focusRewardBody, { color: colors.muted }]}>
                      {overlay.message?.body || ""}
                    </Text>
                    <TouchableOpacity
                      style={[styles.focusRewardButton, { borderColor: colors.text }]}
                      onPress={dismissOverlay}
                    >
                      <Text style={[styles.focusRewardButtonText, { color: colors.text }]}>
                        {t("profileOk") || "Ок"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {overlay?.type === "health" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissOverlay}>
              <View style={styles.overlayFullScreen}>
                <HealthCelebration colors={colors} payload={overlay.message} t={t} />
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {overlay?.type === "goal_complete" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissOverlay}>
              <View style={styles.overlayFullScreen}>
                <GoalCelebration
                  colors={colors}
                  payload={overlay.message}
                  t={t}
                  mascotHappySource={tamagotchiAnimations.happy}
                />
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {overlay?.type === "impulse_alert" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissOverlay}>
              <View
                style={[
                  styles.overlayDim,
                  { backgroundColor: overlayDimColor },
                ]}
              >
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    style={[
                      styles.impulseAlertCard,
                      { backgroundColor: overlayCardBackground, borderColor: overlayBorderColor },
                    ]}
                  >
                    <View
                      style={[
                        styles.impulseAlertGlow,
                        { backgroundColor: isDarkTheme ? "#FFC857" : "#FF8F5A" },
                      ]}
                    />
                    <View style={styles.impulseAlertContent}>
                      <View style={styles.impulseAlertHeader}>
                        <View
                          style={[
                            styles.impulseAlertBadge,
                            { backgroundColor: colors.background, borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.impulseAlertBadgeText, { color: colors.muted }]}>
                            {language === "ru" ? "умное уведомление" : "smart insight"}
                          </Text>
                        </View>
                        <Text style={styles.impulseAlertEmoji}>⚡️</Text>
                      </View>
                      <Text style={[styles.impulseAlertTitle, { color: colors.text }]}>
                        {impulseAlertPayload?.title || t("impulseAlertTitle")}
                      </Text>
                      <Text style={[styles.impulseAlertBody, { color: colors.muted }]}>
                        {impulseAlertPayload?.body || ""}
                      </Text>
                      {(impulseAlertPayload?.window || impulseAlertPayload?.amountLabel) && (
                        <View style={styles.impulseAlertStats}>
                          {impulseAlertPayload?.window ? (
                            <View style={styles.impulseAlertStat}>
                              <Text style={[styles.impulseAlertStatLabel, { color: colors.muted }]}>
                                {language === "ru" ? "Пик импульса" : "Hot zone"}
                              </Text>
                              <Text style={[styles.impulseAlertStatValue, { color: colors.text }]}>
                                {impulseAlertPayload.window}
                              </Text>
                            </View>
                          ) : null}
                          {impulseAlertPayload?.amountLabel ? (
                            <View style={styles.impulseAlertStat}>
                              <Text style={[styles.impulseAlertStatLabel, { color: colors.muted }]}>
                                {language === "ru" ? "Сумма риска" : "At stake"}
                              </Text>
                              <Text style={[styles.impulseAlertStatValue, { color: colors.text }]}>
                                {impulseAlertPayload.amountLabel}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      )}
                      {impulseAlertPayload?.moodLine ? (
                        <View
                          style={[
                            styles.impulseAlertMoodCard,
                            {
                              backgroundColor: isDarkTheme
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(17,17,17,0.04)",
                              borderColor: isDarkTheme ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
                            },
                          ]}
                        >
                          <Text style={[styles.impulseAlertMood, { color: colors.text }]}>
                            {impulseAlertPayload.moodLine}
                          </Text>
                        </View>
                      ) : null}
                      <TouchableOpacity
                        style={[styles.impulseAlertButton, { backgroundColor: colors.text }]}
                        onPress={dismissOverlay}
                        activeOpacity={0.9}
                      >
                        <Text style={[styles.impulseAlertButtonText, { color: colors.background }]}>
                          {language === "ru" ? "Держать курс" : "Stay focused"}
                        </Text>
                        <Text style={[styles.impulseAlertButtonIcon, { color: colors.background }]}>
                          →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        <Modal
          visible={goalLinkPrompt.visible}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={closeGoalLinkPrompt}>
            <View style={[styles.priceModalBackdrop, modalKeyboardPaddingStyle]}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.goalModalCard, { backgroundColor: colors.card }] }>
                  <Text style={[styles.goalModalTitle, { color: colors.text }]}>
                    {t("goalAssignPromptTitle")}
                  </Text>
                  {goalLinkPrompt.item && (
                    <Text style={[styles.goalModalSubtitle, { color: colors.muted }]}>
                      {t("goalAssignPromptSubtitle", {
                        title: resolveTemptationTitle(
                          goalLinkPrompt.item,
                          language,
                          titleOverrides[goalLinkPrompt.item.id]
                        ),
                      })}
                    </Text>
                  )}
                  <ScrollView style={{ maxHeight: 360 }}>
                    {goalSelectionList.map((goal) => {
                      const active = goalLinkCurrentGoalId === goal.id;
                      const currentLocal = formatCurrency(
                        convertToCurrency(goal.savedUSD || 0, profile.currency || DEFAULT_PROFILE.currency),
                        profile.currency || DEFAULT_PROFILE.currency
                      );
                      const targetLocal = formatCurrency(
                        convertToCurrency(goal.targetUSD || 0, profile.currency || DEFAULT_PROFILE.currency),
                        profile.currency || DEFAULT_PROFILE.currency
                      );
                      return (
                        <TouchableOpacity
                          key={goal.id}
                          style={[
                            styles.goalOptionButton,
                            {
                              borderColor: colors.border,
                              backgroundColor: active ? colors.text : "transparent",
                            },
                          ]}
                          onPress={() => handleGoalLinkSelect(goal.id)}
                        >
                          <Text
                            style={[
                              styles.goalOptionTitle,
                              { color: active ? colors.background : colors.text },
                            ]}
                          >
                            {goal.title}
                          </Text>
                          <Text
                            style={[
                              styles.goalOptionSubtitle,
                              { color: active ? colors.background : colors.muted },
                            ]}
                          >
                            {t("wishlistProgress", { current: currentLocal, target: targetLocal })}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {goalLinkPrompt.intent !== "save" && goalLinkPrompt.item && (
                    <TouchableOpacity
                      style={styles.goalPickerReset}
                      onPress={() => {
                        assignTemptationGoal(goalLinkPrompt.item.id, null);
                        closeGoalLinkPrompt();
                      }}
                    >
                      <Text style={[styles.goalPickerResetText, { color: colors.muted }]}>
                        {t("goalAssignClear")}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={closeGoalLinkPrompt}>
                    <Text style={[styles.priceModalCancel, { color: colors.muted }]}>
                      {t("priceEditCancel")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={goalTemptationPrompt.visible}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={closeGoalTemptationPrompt}>
            <View style={[styles.priceModalBackdrop, modalKeyboardPaddingStyle]}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.goalModalCard, { backgroundColor: colors.card }] }>
                  <Text style={[styles.goalModalTitle, { color: colors.text }]}>
                    {t("goalAssignTemptationTitle")}
                  </Text>
                  <Text style={[styles.goalModalSubtitle, { color: colors.muted }]}>
                    {t("goalAssignTemptationSubtitle", {
                      goal: goalTemptationPrompt.wish?.title || "",
                    })}
                  </Text>
                  <ScrollView style={{ maxHeight: 360 }}>
                    {temptations.map((template) => {
                      const templateTitle = resolveTemptationTitle(
                        template,
                        language,
                        titleOverrides[template.id]
                      );
                      const assignedGoalId = temptationGoalMap[template.id];
                      const isActive =
                        assignedGoalId && goalTemptationPrompt.wish
                          ? assignedGoalId === goalTemptationPrompt.wish.id
                          : false;
                      const assignedLabel = assignedGoalId
                        ? getWishTitleById(assignedGoalId)
                        : t("goalAssignNone");
                      return (
                        <TouchableOpacity
                          key={template.id}
                          style={[
                            styles.goalOptionButton,
                            {
                              borderColor: colors.border,
                              backgroundColor: isActive ? colors.text : "transparent",
                            },
                          ]}
                          onPress={() => handleGoalTemptationAssign(template.id)}
                        >
                          <Text
                            style={[
                              styles.goalOptionTitle,
                              { color: isActive ? colors.background : colors.text },
                            ]}
                          >
                            {templateTitle}
                          </Text>
                          <Text
                            style={[
                              styles.goalOptionSubtitle,
                              { color: isActive ? colors.background : colors.muted },
                            ]}
                          >
                            {assignedLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <TouchableOpacity onPress={closeGoalTemptationPrompt}>
                    <Text style={[styles.priceModalCancel, { color: colors.muted }]}>
                      {t("priceEditCancel")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={goalEditorPrompt.visible}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={closeGoalEditorPrompt}>
            <View style={[styles.priceModalBackdrop, modalKeyboardPaddingStyle]}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.priceModalCard, { backgroundColor: colors.card }] }>
                  <Text style={[styles.priceModalTitle, { color: colors.text }]}>
                    {t("goalEditModalTitle")}
                  </Text>
                  <Text style={[styles.priceModalLabel, { color: colors.muted, marginTop: 0 }]}>
                    {t("goalEditNameLabel")}
                  </Text>
                  <TextInput
                    style={[
                      styles.priceModalInput,
                      {
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: colors.card,
                      },
                    ]}
                    value={goalEditorPrompt.name}
                    onChangeText={handleGoalEditorNameChange}
                    placeholder={t("goalEditNameLabel")}
                    placeholderTextColor={colors.muted}
                  />
                  <Text style={[styles.priceModalLabel, { color: colors.muted }]}>
                    {t("goalEditTargetLabel")}
                  </Text>
                  <TextInput
                    style={[
                      styles.priceModalInput,
                      {
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: colors.card,
                      },
                    ]}
                    value={goalEditorPrompt.target}
                    onChangeText={handleGoalEditorTargetChange}
                    placeholder={t("goalEditTargetLabel")}
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.priceModalLabel, { color: colors.muted }]}>
                    {t("goalEditEmojiLabel")}
                  </Text>
                  <TextInput
                    style={[
                      styles.priceModalInput,
                      {
                        borderColor: colors.border,
                        color: colors.text,
                        backgroundColor: colors.card,
                      },
                    ]}
                    value={goalEditorPrompt.emoji}
                    onChangeText={handleGoalEditorEmojiChange}
                  placeholder={t("goalEditEmojiLabel")}
                  placeholderTextColor={colors.muted}
                  selectTextOnFocus
                  maxLength={2}
                />
                  <View style={styles.priceModalButtons}>
                    <TouchableOpacity
                      style={[styles.priceModalPrimary, { backgroundColor: colors.text }]}
                      onPress={saveGoalEditorPrompt}
                    >
                      <Text style={[styles.priceModalPrimaryText, { color: colors.background }]}>
                        {t("goalEditSave")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.priceModalSecondary, { borderColor: colors.border }]}
                      onPress={closeGoalEditorPrompt}
                    >
                      <Text style={[styles.priceModalSecondaryText, { color: colors.muted }]}>
                        {t("goalEditCancel")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={goalRenewalPromptVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={handleGoalRenewalLater}>
            <View style={styles.goalRenewalBackdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.goalRenewalCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.goalRenewalTitle, { color: colors.text }]}>
                    {t("goalRenewalTitle")}
                  </Text>
                  <Text style={[styles.goalRenewalSubtitle, { color: colors.muted }]}>
                    {t("goalRenewalSubtitle")}
                  </Text>
                  <View style={styles.goalRenewalActions}>
                    <TouchableOpacity
                      style={[styles.goalRenewalSecondary, { borderColor: colors.border }]}
                      onPress={handleGoalRenewalLater}
                    >
                      <Text style={[styles.goalRenewalSecondaryText, { color: colors.muted }]}>
                        {t("goalRenewalLater")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.goalRenewalPrimary, { backgroundColor: colors.text }]}
                      onPress={handleGoalRenewalStart}
                    >
                      <Text style={[styles.goalRenewalPrimaryText, { color: colors.background }]}>
                        {t("goalRenewalCreate")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <ImageSourceSheet
          visible={showImageSourceSheet}
          colors={colors}
          t={t}
          onClose={closeImagePickerSheet}
          onSelect={handleImageSourceChoice}
        />
        <SpendConfirmSheet
          visible={spendPrompt.visible}
          item={spendPrompt.item}
          currency={profile.currency || DEFAULT_PROFILE.currency}
          language={language}
          onCancel={closeSpendPrompt}
          onConfirm={handleSpendConfirm}
          colors={colors}
          t={t}
        />
        {stormActive && <StormOverlay t={t} />}
      </SafeAreaView>
        </View>
      </TouchableWithoutFeedback>
    </SavingsProvider>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);

const TYPOGRAPHY = {
  logo: {
    fontFamily: INTER_FONTS.extraBold,
    fontSize: scaleFontSize(44),
    letterSpacing: scaleLetterSpacing(-0.5),
  },
  display: {
    fontFamily: INTER_FONTS.bold,
    fontSize: scaleFontSize(34),
    letterSpacing: scaleLetterSpacing(-0.2),
  },
  blockTitle: {
    fontFamily: INTER_FONTS.bold,
    fontSize: scaleFontSize(24),
    letterSpacing: scaleLetterSpacing(-0.2),
  },
  body: {
    fontFamily: INTER_FONTS.regular,
    fontSize: scaleFontSize(15),
    lineHeight: scaleFontSize(20),
  },
  secondary: {
    fontFamily: INTER_FONTS.light,
    fontSize: scaleFontSize(12),
    lineHeight: scaleFontSize(16),
  },
  cta: {
    fontFamily: INTER_FONTS.semiBold,
    fontSize: scaleFontSize(14),
    letterSpacing: scaleLetterSpacing(CTA_LETTER_SPACING),
  },
};

const createBodyText = (overrides = {}) => ({ ...TYPOGRAPHY.body, ...scaleTypographyOverrides(overrides) });
const createSecondaryText = (overrides = {}) => ({
  ...TYPOGRAPHY.secondary,
  ...scaleTypographyOverrides(overrides),
});
const createCtaText = (overrides = {}) => ({ ...TYPOGRAPHY.cta, ...scaleTypographyOverrides(overrides) });

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
  },
  appShell: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: BASE_HORIZONTAL_PADDING,
    paddingTop: 24,
    position: "relative",
  },
  feedList: {
    marginHorizontal: -BASE_HORIZONTAL_PADDING,
    overflow: "visible",
  },
  feedListContent: {
    paddingTop: 4,
    paddingBottom: 160,
    paddingHorizontal: BASE_HORIZONTAL_PADDING,
  },
  feedHero: {
    paddingBottom: 12,
  },
  feedHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  moodGradientBlock: {
    position: "relative",
    overflow: "hidden",
  },
  moodGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
    transform: [{ rotate: "-10deg" }],
  },
  heroMoodGradient: {
    flex: 1,
    width: "100%",
    borderRadius: 28,
    padding: 18,
    paddingBottom: 20,
    position: "relative",
    overflow: "hidden",
  },
  moodBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    marginTop: 16,
  },
  moodBadgeText: {
    ...createCtaText({ fontSize: 13, textTransform: "uppercase" }),
  },
  moodDetailsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  moodDetailsCard: {
    width: "100%",
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  moodDetailsLabel: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 20,
    textAlign: "center",
  },
  moodDetailsDescription: {
    ...createBodyText({ fontSize: 16, textAlign: "center", lineHeight: 22 }),
  },
  moodDetailsButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  moodDetailsButtonText: {
    ...createCtaText({ textTransform: "uppercase" }),
  },
  heroMascotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroMascotContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  appName: {
    ...TYPOGRAPHY.logo,
  },
  heroTagline: {
    ...TYPOGRAPHY.body,
    marginTop: 4,
  },
  almiMascotWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  almiMascotImage: {
    width: "120%",
    height: "120%",
  },
  mascotBubble: {
    position: "absolute",
    top: -28,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 0,
    maxWidth: 180,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  mascotBubbleText: {
    ...createBodyText({ fontSize: 13, textAlign: "center" }),
    fontWeight: "600",
  },
  mascotBubbleTail: {
    position: "absolute",
    bottom: -6,
    width: 12,
    height: 12,
    transform: [{ rotate: "45deg" }],
    borderRadius: 2,
  },
  skinPickerButton: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "rgba(0,0,0,0.25)",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  skinPickerIcon: {
    fontSize: 16,
  },
  skinPickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  skinPickerCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    gap: 8,
  },
  skinPickerTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 20,
  },
  skinPickerSubtitle: {
    ...createBodyText({ fontSize: 15 }),
  },
  skinPickerList: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skinUnlockCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  skinUnlockTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 17,
  },
  skinUnlockSubtitle: {
    ...createBodyText({ fontSize: 14 }),
  },
  skinUnlockButton: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  skinUnlockButtonText: {
    ...createCtaText({ fontSize: 14, textTransform: "none" }),
  },
  skinPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  skinPickerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  skinPickerItemTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 16,
  },
  skinPickerItemSubtitle: {
    ...createBodyText({ fontSize: 13 }),
  },
  skinPickerBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skinPickerBadgeText: {
    ...createCtaText({ fontSize: 10, textTransform: "uppercase" }),
  },
  skinPickerLockedBadge: {
    opacity: 0.85,
  },
  skinPickerLockedBadgeText: {
    letterSpacing: 0.5,
  },
  tamagotchiBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  partyGlowOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  partyFireworksOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  partyFireworkRing: {
    position: "absolute",
    borderWidth: 2,
    opacity: 0,
  },
  tamagotchiCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    gap: 10,
  },
  tamagotchiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tamagotchiTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 18,
  },
  tamagotchiMood: {
    ...createBodyText({ fontSize: 14 }),
  },
  tamagotchiStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tamagotchiStatLabel: {
    ...createBodyText({ fontSize: 14 }),
  },
  tamagotchiStatValue: {
    ...createBodyText({ fontSize: 16, fontWeight: "700" }),
  },
  tamagotchiProgress: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  tamagotchiProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  tamagotchiActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  tamagotchiButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  tamagotchiButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tamagotchiButtonIcon: {
    width: 20,
    height: 20,
  },
  tamagotchiPreview: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  tamagotchiButtonText: {
    ...createCtaText({ fontSize: 14 }),
  },
  tamagotchiFoodTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 16,
    marginTop: 12,
  },
  tamagotchiFoodList: {
    marginTop: 6,
  },
  tamagotchiFoodButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    position: "relative",
    marginBottom: 10,
  },
  tamagotchiFoodButtonLast: {
    marginBottom: 0,
  },
  tamagotchiFoodButtonDisabled: {
    opacity: 0.5,
  },
  tamagotchiFoodEmoji: {
    fontSize: 28,
  },
  tamagotchiFoodInfo: {
    flex: 1,
    gap: 2,
  },
  tamagotchiFoodLabel: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 15,
  },
  tamagotchiFoodBoost: {
    ...createSecondaryText({ fontSize: 12 }),
  },
  tamagotchiFoodCost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tamagotchiFoodCostIcon: {
    width: 18,
    height: 18,
  },
  tamagotchiFoodCostText: {
    ...createCtaText({ fontSize: 13 }),
  },
  tamagotchiFoodBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tamagotchiFoodBadgeText: {
    ...createCtaText({ fontSize: 10, textTransform: "uppercase" }),
    letterSpacing: 0.6,
  },
  tamagotchiSub: {
    ...createSecondaryText({ fontSize: 12 }),
  },
  tamagotchiHint: {
    ...createSecondaryText({ fontSize: 12, textAlign: "center" }),
    marginTop: 4,
  },
  tamagotchiClose: {
    alignSelf: "center",
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tamagotchiCloseText: {
    ...createCtaText({ fontSize: 14 }),
  },
  heroStatCard: {
    padding: 16,
    borderRadius: 24,
    marginTop: 18,
  },
  heroStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroStatLabel: {
    textTransform: "uppercase",
    fontSize: 12,
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  heroSpendLine: {
    fontSize: Platform.OS === "ios" ? 16 : 18,
    lineHeight: Platform.OS === "ios" ? 20 : 22,
    fontWeight: "600",
    marginTop: Platform.OS === "ios" ? 6 : 10,
  },
  progressHeroCard: {
    marginTop: 8,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  savedHeroCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 26,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: "hidden",
  },
  savedHeroGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -40,
    right: -30,
    opacity: 0.6,
  },
  savedHeroGlowBottom: {
    width: 120,
    height: 120,
    bottom: -30,
    left: -10,
  },
  savedHeroHeader: {
    marginBottom: 12,
    position: "relative",
  },
  savedHeroTextBlock: {
    flex: 1,
    minWidth: 0,
    zIndex: 2,
  },
  savedHeroSubtitle: {
    ...createBodyText({
      fontSize: Platform.OS === "ios" ? 13 : 15,
      marginTop: Platform.OS === "ios" ? 4 : 6,
      lineHeight: Platform.OS === "ios" ? 18 : 20,
      width: "100%",
    }),
  },
  savedHeroLevelButton: {
    position: "absolute",
    top: -12,
    right: -12,
    zIndex: 2,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  savedHeroLevelBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
  },
  savedHeroLevelText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  savedHeroAmountWrap: {
    marginTop: 4,
    marginBottom: 10,
  },
  heroLevelDetails: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  heroLevelTitle: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  heroLevelSubtitle: {
    ...createBodyText({ fontSize: 12, marginTop: 6 }),
  },
  heroLevelMeta: {
    ...createSecondaryText({ marginTop: 8 }),
  },
  heroPotentialCard: {
    marginBottom: 12,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  heroPotentialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroPotentialLabel: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  heroPotentialValue: {
    ...createBodyText({ fontSize: 16, fontWeight: "700" }),
  },
  heroPotentialHint: {
    ...createSecondaryText({ fontSize: 12 }),
  },
  heroPotentialStatus: {
    ...createSecondaryText({ fontSize: 12 }),
  },
  heroPotentialButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  heroPotentialButtonText: {
    ...createCtaText(),
  },
  savedHeroProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  savedHeroBar: {
    flex: 1,
    marginBottom: 0,
  },
  savedHeroPercentTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  savedHeroPercentText: {
    ...createCtaText({ fontSize: 12 }),
  },
  savedHeroGoalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  goalLabel: {
    ...createCtaText({ fontSize: 12 }),
  },
  savedHeroGoalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
  },
  savedHeroGoalLabel: {
    ...createBodyText({ fontSize: 13, flex: 1 }),
  },
  goalCompleteBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  goalCompleteBadgeText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  goalSelectButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  goalSelectText: {
    ...createCtaText({ fontSize: 13 }),
  },
  breakdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dailySummaryBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dailySummaryCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  dailySummaryGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  dailySummaryCardContent: {
    gap: 18,
  },
  dailySummaryHeroRow: {
    flexDirection: "row",
    gap: 12,
  },
  dailySummaryHeroText: {
    flex: 1,
  },
  dailySummaryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dailySummaryIconText: {
    fontSize: 28,
  },
  dailySummaryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 6,
  },
  dailySummaryBadgeText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  dailySummaryTitle: {
    ...TYPOGRAPHY.blockTitle,
  },
  dailySummarySubtitle: {
    ...createBodyText({ fontSize: 16, marginTop: 4 }),
  },
  dailySummaryHighlight: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  dailySummaryHighlightLabel: {
    ...createCtaText({ fontSize: 13, textTransform: "uppercase" }),
  },
  dailySummaryHighlightValue: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 8,
  },
  dailySummaryHighlightSub: {
    ...createBodyText({ fontSize: 14, marginTop: 6 }),
  },
  dailySummaryStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  dailySummaryStatCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  dailySummaryStatValue: {
    fontSize: 26,
    fontWeight: "800",
  },
  dailySummaryStatLabel: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase", marginTop: 8 }),
  },
  dailySummaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  dailySummaryButtonText: {
    ...createCtaText({ fontSize: 15 }),
  },
  dailySummaryButtonIcon: {
    ...createCtaText({ fontSize: 16 }),
  },
  dailySummaryHint: {
    ...createSecondaryText({ textAlign: "center" }),
  },
  ratingPromptBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  ratingPromptCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 26,
    padding: 24,
    gap: 16,
    borderWidth: 1,
  },
  ratingPromptTitle: {
    ...TYPOGRAPHY.blockTitle,
    textAlign: "center",
  },
  ratingPromptBody: {
    ...createBodyText({ fontSize: 15, textAlign: "center" }),
  },
  ratingPromptActions: {
    flexDirection: "row",
    gap: 12,
  },
  ratingPromptSecondary: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  ratingPromptSecondaryText: {
    ...createCtaText({ fontSize: 15 }),
  },
  ratingPromptPrimary: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  ratingPromptPrimaryText: {
    ...createCtaText({ fontSize: 15 }),
  },
  levelShareModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    gap: 12,
  },
  levelShareModalTitle: {
    ...TYPOGRAPHY.blockTitle,
    textAlign: "center",
  },
  levelShareModalCaption: {
    ...createSecondaryText({ textAlign: "center" }),
  },
  levelShareShot: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
  },
  levelShareCanvas: {
    backgroundColor: LEVEL_SHARE_BG,
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
  },
  levelShareBadge: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: LEVEL_SHARE_ACCENT,
  },
  levelShareBadgeText: {
    color: "#1E0F00",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1,
  },
  levelShareCanvasTitle: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  levelShareCanvasSubtitle: {
    color: LEVEL_SHARE_MUTED,
    fontSize: 15,
    textAlign: "center",
  },
  levelShareCat: {
    width: 180,
    height: 180,
    resizeMode: "contain",
  },
  levelShareJoin: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  levelShareFooter: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelShareLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  levelShareFooterBrand: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  levelShareFooterHint: {
    color: LEVEL_SHARE_MUTED,
    fontSize: 12,
    textTransform: "uppercase",
  },
  levelShareActions: {
    gap: 10,
  },
  levelSharePrimary: {
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  levelSharePrimaryText: {
    ...createCtaText({ fontSize: 15 }),
  },
  levelShareGhost: {
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  levelShareGhostText: {
    ...createCtaText({ fontSize: 15 }),
  },
  dailyChallengeCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  dailyChallengeGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  dailyChallengeContent: {
    gap: 20,
  },
  dailyChallengeHeroRow: {
    flexDirection: "row",
    gap: 16,
  },
  dailyChallengeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  dailyChallengeBadgeText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  dailyChallengeTitle: {
    ...TYPOGRAPHY.blockTitle,
  },
  dailyChallengeSubtitle: {
    ...createBodyText({ fontSize: 15, marginTop: 4 }),
  },
  dailyChallengeRewardStack: {
    alignItems: "flex-end",
    gap: 6,
  },
  dailyChallengeRewardHint: {
    ...createBodyText({ fontSize: 13 }),
    fontWeight: "700",
  },
  dailyChallengeTemptationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(17,17,17,0.03)",
  },
  dailyChallengeEmojiCard: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,17,17,0.05)",
  },
  dailyChallengeEmojiCardText: {
    fontSize: 32,
  },
  dailyChallengeTemptationTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  dailyChallengeTemptationHint: {
    ...createBodyText({ fontSize: 14 }),
  },
  dailyChallengeActions: {
    flexDirection: "row",
    gap: 12,
  },
  dailyChallengePrimaryButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  dailyChallengePrimaryText: {
    ...createCtaText({ fontSize: 15 }),
  },
  dailyChallengeGhostButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  dailyChallengeGhostText: {
    ...createCtaText({ fontSize: 15 }),
  },
  breakdownCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  breakdownClose: {
    fontSize: 18,
    fontWeight: "700",
  },
  breakdownBars: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  breakdownBarItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  breakdownBarTrack: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  breakdownBarStack: {
    width: "100%",
  },
  breakdownBarLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  breakdownBarAmount: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  breakdownAmountWrapper: {
    width: "100%",
    paddingHorizontal: 4,
  },
  breakdownLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  breakdownLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  breakdownLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLegendText: {
    fontSize: 12,
    fontWeight: "700",
  },
  savedHeroToggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  savedHeroToggleText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  savedHeroDaily: {
    marginTop: 12,
    gap: 12,
  },
  savedHeroExpanded: {
    marginTop: 12,
    gap: 16,
  },
  savedHeroCoinsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  savedHeroCoinsText: {
    flex: 1,
    gap: 4,
  },
  savedHeroCoinsLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  savedHeroCoinsSubtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  savedHeroCoinsValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  savedHeroDailyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  savedHeroBars: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
  },
  savedHeroBarItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  savedHeroBarAmountWrap: {
    minHeight: 18,
    justifyContent: "flex-end",
  },
  savedHeroBarAmount: {
    fontSize: 10,
    textAlign: "center",
  },
  savedHeroBarTrack: {
    width: 20,
    height: 70,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.4)",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  savedHeroBarColumn: {
    width: "100%",
    borderRadius: 10,
  },
  savedHeroBarLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  savedHeroDailyEmpty: {
    fontSize: 12,
  },
  progressHeroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressHeroTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: Platform.OS === "ios" ? 22 : 24,
    lineHeight: Platform.OS === "ios" ? 26 : undefined,
    fontFamily: INTER_FONTS.extraBold,
    marginRight: Platform.OS === "ios" ? 8 : 0,
  },
  progressHeroAmount: {
    fontSize: 26,
    fontWeight: "900",
    fontFamily: INTER_FONTS.extraBold,
    marginBottom: 6,
  },
  progressHeroLevel: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressHeroBar: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressHeroFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressHeroNext: {
    fontSize: 13,
    fontWeight: "500",
  },
  savedHeroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  savedHeroStatsItem: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  savedHeroStatsValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  savedHeroStatsLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryChip: {
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    textTransform: "uppercase",
  },
  payBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  payBackdropHit: {
    flex: 1,
  },
  paySheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  paySheetHandle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignSelf: "center",
    marginBottom: 4,
  },
  payBrand: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  payCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  payCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  payCardEmoji: {
    fontSize: 26,
  },
  payCardTexts: {
    flex: 1,
  },
  payCardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  payCardAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  paySheetSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  paySheetHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  paySheetHintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFD93D",
  },
  paySheetHint: {
    fontSize: 12,
    textAlign: "center",
  },
  payConfirm: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  payConfirmText: {
    fontSize: 15,
    fontWeight: "700",
  },
  payCancel: {
    paddingVertical: 8,
    alignItems: "center",
  },
  payCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  freeDayCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    position: "relative",
  },
  freeDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  freeDayTitleBlock: {
    flex: 1,
  },
  freeDayLabel: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  freeDayStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  freeDayStat: {
    flex: 1,
    alignItems: "center",
  },
  freeDayStatLabel: {
    ...createSecondaryText({ marginBottom: 2, textAlign: "center" }),
  },
  freeDayStatValue: {
    ...createBodyText({ fontSize: 16, fontWeight: "700", textAlign: "center" }),
  },
  freeDaySummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    flexWrap: "wrap",
    gap: 8,
  },
  freeDayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
  },
  freeDayChipText: {
    ...createCtaText({ fontSize: 12, textAlign: "center" }),
  },
  freeDayToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  freeDayToggleText: {
    ...createCtaText({ fontSize: 12, textAlign: "center" }),
  },
  freeDayStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  freeDayStatusText: {
    ...createCtaText({ fontSize: 12, textAlign: "center" }),
  },
  freeDayStatusPillDisabled: {
    opacity: 0.5,
  },
  freeDayStatusCoin: {
    width: 18,
    height: 18,
    marginLeft: 6,
    resizeMode: "contain",
  },
  freeDayHealthBadge: {
    display: "none",
  },
  freeDayRescueBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  freeDayRescueTitle: {
    ...createBodyText({ fontSize: 15, marginBottom: 2 }),
  },
  freeDayRescueSubtitle: {
    ...createSecondaryText({ fontSize: 12 }),
  },
  freeDayRescueButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  freeDayRescueButtonText: {
    ...createCtaText({ fontSize: 13, color: "#fff", textAlign: "center" }),
  },
  freeDayRescueButtonDisabled: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  impulseCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  impulseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  impulseHeader: {
    gap: 4,
    flex: 1,
  },
  impulseCardTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 22,
  },
  impulseCardSubtitle: {
    ...createBodyText({ fontSize: 15, lineHeight: 22 }),
  },
  impulseToggle: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  impulseToggleText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  impulseSummaryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  impulseBadge: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  impulseSummaryLabel: {
    ...createCtaText({ fontSize: 11, textTransform: "none", letterSpacing: 0.2 }),
  },
  impulseSummaryValue: {
    ...createBodyText({ fontSize: 14, lineHeight: 20, fontWeight: "600" }),
  },
  impulseTrendRow: {
    paddingVertical: 4,
  },
  impulseTrendText: {
    ...createBodyText({ fontSize: 13, fontWeight: "700" }),
  },
  impulseCategoryList: {
    marginTop: 8,
    gap: 10,
  },
  impulseCategoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  impulseCategoryLabel: {
    ...createBodyText({ fontWeight: "700", flex: 1, marginRight: 12 }),
  },
  impulseCategoryStats: {
    alignItems: "flex-end",
    gap: 2,
  },
  impulseCategoryStat: {
    ...createBodyText({ fontSize: 13, fontWeight: "700" }),
  },
  impulseCategoryStatSecondary: {
    ...createSecondaryText({ fontSize: 12 }),
  },
  freeDayHealthRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  freeDayHealthIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(16,91,49,0.08)",
  },
  healthCoinIcon: {
    width: 26,
    height: 26,
    resizeMode: "contain",
  },
  freeDayHealthLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  freeDayHealthSubtitle: {
    fontSize: 12,
  },
  freeDayCoinRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  freeDayCoinBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  freeDayCoinImage: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  freeDayCoinCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  freeDayHealthValue: {
    fontSize: 20,
    fontWeight: "800",
    minWidth: 40,
    textAlign: "right",
  },
  freeDayCalendar: {
    marginTop: 4,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  freeDayCalendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  freeDayCalendarTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  freeDayCalendarDays: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  freeDayCalendarDay: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  freeDayCalendarLabel: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  freeDayCalendarDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  freeDayCalendarDotActive: {
    backgroundColor: "#1EB25F",
    borderColor: "#1EB25F",
  },
  freeDayCalendarDotToday: {
    borderColor: "#1EB25F",
    borderWidth: 2,
  },
  stormOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,6,15,0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  stormFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  stormMessageWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  stormMessage: {
    color: "#F5F6FF",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 14,
  },
  productCard: {
    width: "48%",
    borderRadius: 28,
    padding: 16,
    minHeight: 210,
  },
  productTagline: {
    fontSize: 12,
    color: "#4A3D5E",
  },
  productImage: {
    width: 100,
    height: 100,
    alignSelf: "center",
    marginVertical: 12,
    borderRadius: 16,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1A2A",
  },
  productPrice: {
    marginTop: 4,
    color: "#1C1A2A",
  },
  temptationCard: {
    borderRadius: 28,
    padding: 20,
    gap: 12,
    position: "relative",
    overflow: "visible",
  },
  temptationTextureContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    overflow: "hidden",
  },
  temptationTextureOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  temptationTextureAccent: {
    transform: [{ rotate: "-8deg" }],
    opacity: 0.12,
    top: -80,
    bottom: -80,
  },
  temptationTextureHighlight: {
    opacity: 0.16,
    transform: [{ rotate: "14deg" }],
    left: "-20%",
    right: "-20%",
    top: "-60%",
    bottom: "-60%",
  },
  temptationSwipeWrapper: {
    marginBottom: 16,
    position: "relative",
  },
  temptationSwipeBackground: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  swipeHint: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swipeHintLeft: {
    justifyContent: "flex-start",
  },
  swipeHintRight: {
    justifyContent: "flex-end",
  },
  swipeHintIcon: {
    fontSize: 14,
  },
  swipeHintText: {
    fontSize: 12,
    fontWeight: "600",
  },
  temptationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  temptationEmoji: {
    fontSize: 28,
  },
  emojiDisplayWrapper: {
    width: 40,
    alignItems: "center",
  },
  temptationBadgeStack: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "flex-end",
    gap: 4,
  },
  temptationPinnedBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  temptationPinnedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  temptationTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    flexWrap: "wrap",
  },
  titleEditWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleEditInputContainer: {
    flex: 1,
    position: "relative",
  },
  titleEditInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: "700",
  },
  titleEditIcon: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -10 }],
    fontSize: 14,
  },
  emojiEditWrapper: {
    width: 60,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: "center",
    position: "relative",
  },
  emojiEditInput: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    paddingRight: 14,
  },
  emojiEditIcon: {
    position: "absolute",
    right: 6,
    top: "50%",
    transform: [{ translateY: -9 }],
    fontSize: 12,
  },
  temptationDesc: {
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  temptationPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 6,
  },
  temptationPricePill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pricePillInput: {
    minWidth: 60,
    fontSize: 20,
    fontWeight: "700",
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  temptationPrice: {
    fontSize: 20,
    fontWeight: "700",
  },
  temptationGoalBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 6,
  },
  temptationGoalBadgeFloating: {
    alignSelf: "flex-end",
    marginBottom: 0,
  },
  temptationGoalBadgeEditable: {
    flexDirection: "row",
    alignItems: "center",
  },
  temptationGoalBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  categoryEditSection: {
    marginTop: 10,
    gap: 6,
  },
  categoryEditLabel: {
    ...createSecondaryText({ fontSize: 11, textTransform: "uppercase" }),
  },
  temptationFocusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 6,
  },
  temptationFocusBadgeText: {
    ...createCtaText({ fontSize: 11 }),
  },
  editPriceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  temptationRefuseMeta: {
    fontSize: 12,
    marginBottom: 6,
  },
  temptationFeedbackOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  temptationFeedbackText: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  coinBurst: {
    position: "absolute",
    bottom: 32,
    left: "50%",
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9A600",
    backgroundColor: "#FFD766",
    shadowColor: "#E9A600",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  coinBurstInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFF4B3",
  },
  temptationEditor: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 14,
  },
  temptationEditorField: {
    gap: 6,
  },
  editorLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  editorHintIcon: {
    fontSize: 14,
  },
  temptationEditorActions: {
    gap: 8,
  },
  temptationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  temptationBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  temptationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  temptationButtonPrimary: {
    flexGrow: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  temptationButtonPrimaryText: {
    fontWeight: "700",
    fontSize: 14,
  },
  temptationButtonGhost: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  temptationButtonGhostText: {
    fontWeight: "600",
  },
  temptationButtonOutline: {
    flexGrow: 1,
    borderRadius: 16,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  temptationButtonOutlineText: {
    fontWeight: "600",
  },
  detailBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  detailCard: {
    borderRadius: 30,
    padding: 20,
  },
  detailHero: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  detailImage: {
    width: 160,
    height: 160,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: "700",
  },
  detailTagline: {
    marginTop: 6,
    fontWeight: "600",
  },
  detailPrice: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  detailRating: {
    marginTop: 4,
    fontSize: 14,
  },
  detailDesc: {
    marginTop: 12,
    lineHeight: 20,
  },
  tutorialBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  tutorialBackdropDim: {
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  tutorialCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    gap: 12,
  },
  tutorialIcon: {
    fontSize: 32,
    textAlign: "center",
  },
  tutorialTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  tutorialDescription: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
  },
  tutorialProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  tutorialDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tutorialDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tutorialProgressText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tutorialActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  tutorialSkipButton: {
    flex: 1,
    paddingVertical: 12,
  },
  tutorialSkipText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  tutorialPrimaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  tutorialPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
  },
  tabHintBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    padding: 24,
  },
  tabHintCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  tabHintTitle: {
    ...createBodyText({ fontSize: 17, fontWeight: "700" }),
  },
  tabHintBody: {
    ...createBodyText({ fontSize: 14 }),
  },
  tabHintButton: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabHintButtonText: {
    ...createCtaText({ fontSize: 14 }),
  },
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
    gap: 10,
  },
  variantPill: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  variantText: {
    fontWeight: "600",
  },
  variantPrice: {
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 22,
  },
  primaryButtonText: {
    ...createCtaText({ fontSize: 16 }),
  },
  secondaryButtonClear: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonClearText: {
    ...createCtaText({ fontSize: 14 }),
  },
  secondaryButton: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...createCtaText(),
  },
  closeButton: {
    alignSelf: "flex-end",
  },
  closeButtonText: {
    fontSize: 28,
  },
  header: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 30,
    marginBottom: 16,
  },
  subheader: {
    ...TYPOGRAPHY.blockTitle,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 20,
  },
  emptyStateText: {
    ...createBodyText({ textAlign: "center", marginTop: 6 }),
  },
  cartEmptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  catImage: {
    width: 160,
    height: 160,
    opacity: 0.4,
    borderRadius: 32,
  },
  catImageLarge: {
    width: 220,
    height: 220,
    opacity: 0.9,
  },
  cartEmptyTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 22,
  },
  cartEmptySubtitle: {
    ...createBodyText({ fontSize: 16, textAlign: "center" }),
  },
  cartCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    padding: 16,
    marginBottom: 14,
  },
  cartImageWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#F1F2F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cartTitleText: {
    fontSize: 16,
    fontWeight: "700",
  },
  cartVariant: {
    marginTop: 4,
  },
  cartRight: {
    alignItems: "flex-end",
  },
  cartPrice: {
    fontWeight: "700",
  },
  cartBuyButton: {
    marginTop: 6,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cartBuyText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cartRemove: {
    marginTop: 4,
    fontSize: 12,
  },
  wishCard: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    gap: 10,
    position: "relative",
  },
  goalSwipeRow: {
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  goalSwipeActions: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 160,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    zIndex: 0,
  },
  goalSwipeButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  goalSwipeButtonDisabled: {
    opacity: 0.4,
  },
  goalSwipeButtonText: {
    ...createCtaText({ fontSize: 14 }),
  },
  goalSwipeContent: {
    width: "100%",
    zIndex: 1,
  },
  wishHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  wishTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
    gap: 8,
  },
  wishEmoji: {
    fontSize: 22,
  },
  wishTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    paddingRight: 0,
  },
  wishSavedHint: {
    fontSize: 12,
    marginTop: 2,
  },
  wishBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  wishBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  wishMeta: {
    fontSize: 13,
    marginBottom: 4,
  },
  wishProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  wishProgressTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  wishProgressBar: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 12,
  },
  wishProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  wishProgressLabel: {
    ...createSecondaryText({ fontSize: 13 }),
  },
  wishButtonGhost: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  goalDragWrapper: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    paddingVertical: 4,
  },
  goalDragWrapperActive: {
    opacity: 0.94,
  },
  goalDragHandle: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 18,
    marginRight: 4,
  },
  goalDragHandleDots: {
    fontSize: 18,
    fontWeight: "700",
  },
  goalDragCardActive: {
    transform: [{ scale: 0.995 }],
  },
  primaryGoalCard: {
    borderRadius: 36,
    padding: 28,
    overflow: "hidden",
  },
  primaryGoalAura: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -60,
    right: -40,
  },
  primaryGoalTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  primaryGoalBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  primaryGoalBadgeText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  primaryGoalTitle: {
    ...TYPOGRAPHY.blockTitle,
  },
  primaryGoalSubtitle: {
    ...createBodyText({ fontSize: 15, marginTop: 6 }),
  },
  primaryGoalEmblem: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  primaryGoalProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  primaryGoalProgressTrack: {
    flex: 1,
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
  },
  primaryGoalProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  primaryGoalPercent: {
    ...createBodyText({ fontSize: 16, fontWeight: "800" }),
  },
  pendingCard: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  pendingSwipeWrapper: {
    position: "relative",
  },
  pendingSwipeBackground: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    flexDirection: "row",
  },
  pendingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  pendingTitle: {
    ...createBodyText({ fontSize: 18, fontWeight: "700", flex: 1 }),
  },
  pendingDue: {
    ...createCtaText({ fontSize: 13, textTransform: "uppercase" }),
  },
  pendingPrice: {
    fontSize: 16,
    fontWeight: "600",
  },
  pendingButtons: {
    flexDirection: "row",
    gap: 10,
  },
  pendingCountdown: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  pendingButtonPrimary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  pendingButtonPrimaryText: {
    ...createCtaText(),
  },
  pendingButtonSecondary: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  cartTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  cartTotalText: {
    ...createBodyText({ fontSize: 18, fontWeight: "600" }),
  },
  cartTotalAmount: {
    ...createBodyText({ fontSize: 18, fontWeight: "700" }),
  },
  buyAllButton: {
    marginTop: 18,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  buyAllButtonText: {
    ...createCtaText(),
  },
  purchasesSubtitle: {
    marginBottom: 16,
  },
  progressCard: {
    borderRadius: 26,
    padding: 18,
    marginBottom: 20,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressLabel: {
    textTransform: "uppercase",
    fontSize: 12,
  },
  progressValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  progressGoal: {
    fontWeight: "700",
  },
  progressBar: {
    height: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 12,
  },
  progressHint: {
    marginTop: 10,
  },
  purchaseCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },
  purchaseInfo: {
    marginBottom: 8,
  },
  purchaseTitle: {
    fontWeight: "700",
  },
  purchaseDesc: {
    marginTop: 4,
  },
  purchasePrice: {
    fontWeight: "700",
  },
  levelWidget: {
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  levelWidgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  levelWidgetTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  levelWidgetBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  levelWidgetBadgeText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  levelWidgetSubtitle: {
    ...createBodyText({ fontSize: 14, fontWeight: "600" }),
  },
  levelWidgetBar: {
    height: 8,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  levelWidgetFill: {
    height: "100%",
    borderRadius: 16,
  },
  levelWidgetMeta: {
    ...createSecondaryText({ fontSize: 13 }),
  },
  goalCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    gap: 12,
    position: "relative",
  },
  goalTitle: {
    ...createBodyText({ fontWeight: "700", fontSize: 16 }),
  },
  goalDesc: {
    ...createBodyText({ marginTop: 4 }),
  },
  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rewardBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  rewardBadgeFloating: {
    position: "absolute",
    top: 0,
    right: -6,
  },
  rewardBadgeText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  rewardBadgeContainer: {
    position: "absolute",
    top: -8,
    right: -10,
    padding: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
    pointerEvents: "none",
  },
  healthRewardTokenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  healthRewardTokenRowCompact: {
    gap: 6,
  },
  healthRewardToken: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  healthRewardTokenIcon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  healthRewardTokenCount: {
    ...createCtaText({ fontSize: 12 }),
  },
  rewardClaimButton: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  rewardClaimButtonText: {
    ...createCtaText({ fontSize: 14, textAlign: "center", width: "100%" }),
  },
  rewardsTabs: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  rewardsTabButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: "center",
  },
  rewardsTabText: {
    ...createCtaText({ fontSize: 14 }),
  },
  challengeCard: {
    borderRadius: 22,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    position: "relative",
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  challengeEmoji: {
    fontSize: 28,
  },
  challengeTitle: {
    ...createBodyText({ fontSize: CHALLENGE_TITLE_FONT_SIZE, fontWeight: "700" }),
  },
  challengeDesc: {
    ...createBodyText({ fontSize: CHALLENGE_DESC_FONT_SIZE, lineHeight: CHALLENGE_LINE_HEIGHT }),
  },
  challengeMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeStatus: {
    ...createCtaText({ fontSize: CHALLENGE_META_FONT_SIZE, textTransform: "uppercase" }),
  },
  challengeTimer: {
    ...createSecondaryText({ fontSize: CHALLENGE_META_FONT_SIZE }),
    textAlign: "right",
  },
  challengeProgressBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  challengeProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  challengeProgressLabel: {
    ...createSecondaryText({ fontSize: CHALLENGE_META_FONT_SIZE }),
  },
  challengeActionButton: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  challengeActionText: {
    ...createCtaText(),
  },
  dailyChallengeWidget: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 16,
  },
  dailyChallengeWidgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dailyChallengeWidgetBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dailyChallengeEmojiPill: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  dailyChallengeEmojiText: {
    fontSize: scaleFontSize(30),
  },
  dailyChallengeWidgetTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "800",
  },
  dailyChallengeWidgetDesc: {
    ...createBodyText({ fontSize: 14 }),
  },
  dailyChallengeProgressBar: {
    height: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  dailyChallengeProgressFill: {
    height: "100%",
    borderRadius: 8,
  },
  dailyChallengeWidgetFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dailyChallengeProgressLabel: {
    ...createSecondaryText({ fontSize: 13 }),
  },
  dailyChallengeRewardLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: "800",
  },
  challengeRewardChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  challengeRewardChipFloating: {
    position: "absolute",
    right: 10,
    top: -6,
  },
  challengeSwipeWrapper: {
    position: "relative",
    borderRadius: 22,
    backgroundColor: "transparent",
  },
  challengeSwipeActions: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: CHALLENGE_SWIPE_ACTION_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    overflow: "hidden",
  },
  challengeSwipeButton: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    width: "80%",
    alignItems: "center",
  },
  challengeSwipeButtonText: {
    ...createCtaText({ fontSize: 13, textAlign: "center" }),
  },
  goalProgressBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 8,
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  profileCard: {
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  profileMoodAura: {
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  profileMoodGradient: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  profileMoodStatus: {
    ...createCtaText({ fontSize: 13, textTransform: "uppercase", marginTop: 10 }),
  },
  profileScrollContent: {
    paddingTop: 4,
    paddingBottom: 40,
    flexGrow: 1,
  },
  profileAvatarWrap: {
    alignItems: "center",
    marginBottom: 0,
    position: "relative",
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rewardBadgeSmall: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rewardBadgeSmallText: {
    ...createCtaText({ fontSize: 12 }),
  },
  profileAvatarHint: {
    ...createSecondaryText({ fontSize: 12, marginTop: 12, textAlign: "center" }),
  },
  profileAvatarEditBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarEditIcon: {
    fontSize: 15,
    fontWeight: "700",
  },
  profileName: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: scaleFontSize(28),
  },
  profileSubtitle: {
    ...createBodyText({ marginTop: 4 }),
    fontSize: PROFILE_SUBTITLE_FONT_SIZE,
    lineHeight: PROFILE_SUBTITLE_LINE_HEIGHT,
    textAlign: "center",
  },
  profileBio: {
    ...createBodyText({ marginTop: 10, textAlign: "center", lineHeight: 20 }),
  },
  profileStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  profileStat: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 2,
  },
  profileStatValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  profileStatValue: {
    ...createBodyText({ fontWeight: "700" }),
  },
  profileStatValueSuffix: {
    ...createBodyText({ fontWeight: "700" }),
  },
  profileStatLabel: {
    ...createCtaText({
      fontSize: PROFILE_STAT_LABEL_FONT_SIZE,
      textTransform: "uppercase",
      marginTop: 4,
      letterSpacing: PROFILE_STAT_LETTER_SPACING,
    }),
    textAlign: "center",
    flexShrink: 1,
  },
  profileActions: {
    width: "100%",
    marginTop: 20,
    gap: 12,
  },
  profileActionPrimary: {
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
  },
  profileActionPrimaryText: {
    ...createCtaText(),
  },
  profileActionSecondary: {
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  profileActionSecondaryText: {
    ...createCtaText(),
  },
  profileInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  goalTargetInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  goalTargetInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  goalTargetCurrency: {
    fontWeight: "700",
  },
  goalTargetRow: {
    width: "100%",
    marginBottom: 12,
    gap: 6,
  },
  goalTargetLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  profileInputHalf: {
    flex: 1,
    width: "auto",
  },
  profileHintText: {
    fontSize: 12,
    lineHeight: 18,
  },
  profileSettingValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  profileBioInput: {
    height: 90,
    textAlignVertical: "top",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  settingsCard: {
    borderRadius: 26,
    padding: 20,
    marginBottom: 40,
  },
  profileSection: {
    marginBottom: 16,
    gap: 12,
  },
  settingsDivider: {
    height: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 8,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  settingRow: {
    marginBottom: 18,
  },
  settingLabel: {
    marginBottom: 8,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingChoices: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  profileGoalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  profileGoalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  profileGoalEmoji: {
    fontSize: 18,
  },
  profileGoalText: {
    fontWeight: "600",
  },
  goalTargetBlock: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  goalTargetHeader: {
    gap: 4,
    marginBottom: 4,
  },
  goalTargetTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  goalTargetHint: {
    fontSize: 12,
  },
  guideCards: {
    width: "100%",
    gap: 12,
  },
  guideCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    gap: 8,
  },
  guideEmoji: {
    fontSize: 28,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  guideDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  settingChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  resetButton: {
    marginTop: Platform.OS === "ios" ? 16 : 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
  },
  analyticsCard: {
    borderRadius: 26,
    padding: 20,
    marginBottom: 24,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  analyticsRow: {
    flexDirection: "row",
    gap: 12,
  },
  analyticsItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  analyticsValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  analyticsLabel: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "center",
  },
  historyCard: {
    borderRadius: 26,
    padding: 20,
    marginBottom: 80,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  historyEmpty: {
    fontSize: 14,
  },
  historyList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
  },
  historyListContent: {
    paddingHorizontal: 12,
  },
  historyItem: {
    paddingVertical: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyDeleteBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  historyDeleteText: {
    fontSize: 16,
    fontWeight: "700",
  },
  historyItemTitle: {
    ...createBodyText({ fontWeight: "600" }),
  },
  historyItemMeta: {
    ...createSecondaryText({ marginTop: 4 }),
  },
  profileLinkButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 2,
  },
  profileLinkText: {
    ...createCtaText({ fontSize: 14 }),
  },
  profileLinkHint: {
    ...createSecondaryText({ fontSize: 12 }),
  },
  analyticsSwitch: {
    ...(Platform.OS === "ios"
      ? {
          transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
          marginLeft: 12,
          marginTop: 6,
        }
      : {}),
  },
  resetButtonText: {
    ...createCtaText(),
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabButtonHighlight: {
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: 4,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabButtonText: {
    ...createCtaText({ fontSize: 13, textTransform: "uppercase" }),
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeFloating: {
    position: "absolute",
    top: -6,
    right: -2,
  },
  tabBadgeText: {
    ...createCtaText({ fontSize: 11, textTransform: "none" }),
  },
  analyticsConsentScreen: {
    flex: 1,
    justifyContent: "flex-start",
    padding: 24,
    paddingTop: 48,
    gap: 20,
  },
  analyticsConsentCard: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 28,
    gap: 20,
  },
  analyticsConsentTitle: {
    ...TYPOGRAPHY.blockTitle,
  },
  analyticsConsentBody: {
    ...createBodyText({ lineHeight: 22 }),
  },
  analyticsConsentPrimary: {
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
  },
  analyticsConsentPrimaryText: {
    ...createCtaText({ fontSize: 15 }),
  },
  analyticsConsentSecondary: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  analyticsConsentSecondaryText: {
    ...createCtaText({ fontSize: 14 }),
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  paySheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
  },
  payCard: {
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  payLabel: {
    fontSize: 12,
    textTransform: "uppercase",
  },
  payDigits: {
    marginTop: 6,
    fontSize: 16,
  },
  payAmount: {
    fontWeight: "700",
    fontSize: 20,
  },
  payOptions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  payOptionChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: "center",
  },
  partialInputWrap: {
    marginTop: 6,
  },
  partialLabel: {
    marginBottom: 6,
  },
  partialInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  partialInfo: {
    ...createBodyText({ marginVertical: 12, textAlign: "center" }),
  },
  appleButton: {
    paddingVertical: 16,
    borderRadius: 26,
    alignItems: "center",
    marginTop: 12,
  },
  appleButtonText: {
    ...createCtaText({ fontSize: 16 }),
  },
  payCancel: {
    ...createSecondaryText({ textAlign: "center", marginTop: 12 }),
  },
  fabCenterContainer: {
    position: "absolute",
    bottom: FAB_CONTAINER_BOTTOM,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  fabButtonWrapper: {
    width: FAB_BUTTON_SIZE,
    height: FAB_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    width: FAB_BUTTON_SIZE,
    height: FAB_BUTTON_SIZE,
    borderRadius: FAB_BUTTON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
  },
  cartBadgeHighlight: {
    borderColor: "#F5C869",
    shadowColor: "#F5C869",
    shadowOpacity: 0.85,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderRadius: FAB_BUTTON_SIZE / 2,
  },
  cartBadgeIcon: {
    fontSize: 32,
  },
  fabMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 180,
    paddingHorizontal: 24,
  },
  fabMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  fabOption: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabOptionRow: {
    alignSelf: "center",
  },
  fabOptionRowContent: {
    flexDirection: "row",
    gap: 12,
  },
  fabCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  fabOptionText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 16,
  },
  fabTutorialBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  fabTutorialOverlaySvg: {
    ...StyleSheet.absoluteFillObject,
  },
  fabTutorialContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  fabTutorialHalo: {
    position: "absolute",
    width: FAB_TUTORIAL_HALO_SIZE,
    height: FAB_TUTORIAL_HALO_SIZE,
    borderRadius: FAB_TUTORIAL_HALO_SIZE / 2,
    borderWidth: 2,
    top: -FAB_TUTORIAL_HALO_INSET,
    left: -FAB_TUTORIAL_HALO_INSET,
    shadowOpacity: 0.65,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: -1,
  },
  fabTutorialCard: {
    width: "90%",
    maxWidth: 360,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
  },
  fabTutorialTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  fabTutorialDescription: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 16,
  },
  fabTutorialButton: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  fabTutorialButtonText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  quickModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  quickModalCard: {
    width: "100%",
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  quickModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  quickModalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  quickModalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  quickModalSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  quickModalSecondaryText: {
    fontWeight: "600",
  },
  quickModalPrimary: {
    flex: 1,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  quickModalPrimaryText: {
    ...createCtaText(),
  },
  coinEntryBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  coinEntryCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 32,
    padding: 22,
    borderWidth: 1,
    gap: 16,
  },
  coinEntryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  coinEntryTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 24,
  },
  coinEntrySubtitle: {
    ...createBodyText({ fontSize: 15, lineHeight: 20 }),
  },
  coinEntryClose: {
    padding: 4,
  },
  coinEntryCloseText: {
    fontSize: 20,
    fontWeight: "700",
  },
  coinEntryAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coinEntryAmount: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 28,
  },
  coinSliderWrapper: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: COIN_SLIDER_SIZE + 40,
    width: "100%",
  },
  coinSliderBackdrop: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  coinCircle: {
    width: COIN_SLIDER_SIZE,
    height: COIN_SLIDER_SIZE,
    borderRadius: COIN_SLIDER_SIZE / 2,
    borderWidth: 3,
    backgroundColor: "#F6F8FC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  coinInnerSurface: {
    width: COIN_SLIDER_SIZE - 24,
    height: COIN_SLIDER_SIZE - 24,
    borderRadius: (COIN_SLIDER_SIZE - 24) / 2,
    backgroundColor: "#ECEFF5",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  coinFillTrack: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    alignItems: "center",
  },
  coinFill: {
    width: "100%",
    borderTopLeftRadius: (COIN_SLIDER_SIZE - 24) / 2,
    borderTopRightRadius: (COIN_SLIDER_SIZE - 24) / 2,
  },
  coinShine: {
    position: "absolute",
    top: 18,
    left: 26,
    width: 86,
    height: 14,
    borderRadius: 14,
    opacity: 0.6,
  },
  coinCurrencySymbol: {
    fontSize: 48,
    fontWeight: "800",
    opacity: 0.2,
  },
  coinDirectionLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  coinDirectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  coinEntryActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  coinEntryActionButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  coinEntryActionButtonSpend: {
    backgroundColor: COIN_ENTRY_SPEND_BACKGROUND,
  },
  coinEntryActionButtonSave: {
    backgroundColor: COIN_ENTRY_SAVE_BACKGROUND,
  },
  coinEntryActionButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  coinEntryActionButtonTextSpend: {
    color: SPEND_ACTION_COLOR,
  },
  coinEntryActionButtonTextSave: {
    color: SAVE_ACTION_COLOR,
  },
  coinEntryHint: {
    ...createBodyText({ fontSize: 13 }),
  },
  coinEntryCategoryLabel: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 18,
  },
  coinEntryError: {
    fontSize: 12,
    fontWeight: "600",
  },
  coinEntryCategoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  coinEntryCategoryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  coinEntryCategoryEmoji: {
    fontSize: 28,
  },
  coinEntryCategoryText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  coinEntryMaxLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  coinEntryManualBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  coinEntryManualCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  coinEntryManualTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 20,
  },
  coinEntryManualInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "600",
  },
  coinEntryManualError: {
    fontSize: 12,
    fontWeight: "600",
  },
  coinEntryManualActions: {
    flexDirection: "row",
    gap: 12,
  },
  coinEntryManualButtonGhost: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  coinEntryManualButtonGhostText: {
    fontWeight: "600",
  },
  coinEntryManualButtonPrimary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  coinEntryManualButtonPrimaryText: {
    ...createCtaText(),
  },
  termsCard: {
    width: "100%",
    borderRadius: 28,
    padding: 22,
    gap: 12,
  },
  termsTitle: {
    ...TYPOGRAPHY.blockTitle,
    textAlign: "center",
  },
  termsSubtitle: {
    ...createBodyText({ fontSize: 15, lineHeight: 22, textAlign: "center" }),
  },
  termsScroll: {
    maxHeight: 260,
    marginVertical: 4,
  },
  termsScrollContent: {
    paddingBottom: 4,
    gap: 12,
  },
  termsPoint: {
    flexDirection: "row",
    gap: 8,
  },
  termsPointIndex: {
    ...createCtaText({ fontSize: 13 }),
  },
  termsPointText: {
    ...createBodyText({ flex: 1, fontSize: 15, lineHeight: 22 }),
  },
  termsLinkButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: "center",
  },
  termsLinkText: {
    ...createCtaText({ fontSize: 14 }),
  },
  termsHint: {
    ...createSecondaryText({ fontSize: 12, textAlign: "center" }),
  },
  languageMascot: {
    width: 240,
    height: 240,
    alignSelf: "center",
    marginBottom: 10,
  },
  confettiLayer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayFullScreen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 6, 15, 0.2)",
  },
  celebrationBanner: {
    position: "absolute",
    top: "35%",
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: "center",
    gap: 12,
  },
  celebrationText: {
    fontWeight: "700",
    fontSize: 18,
    textAlign: "center",
  },
  celebrationSubtext: {
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  focusDigestCard: {
    width: "86%",
    borderRadius: 30,
    borderWidth: 1,
    padding: 24,
    gap: 14,
  },
  focusDigestTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 22,
    textAlign: "center",
  },
  focusDigestBody: {
    ...createBodyText({ fontSize: 15, lineHeight: 22 }),
    textAlign: "center",
  },
  focusDigestStats: {
    flexDirection: "row",
    gap: 12,
  },
  focusDigestStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  focusDigestLabel: {
    ...createCtaText({ fontSize: 11, textTransform: "uppercase" }),
  },
  focusDigestValue: {
    ...createBodyText({ fontSize: 15, fontWeight: "700" }),
  },
  focusDigestHint: {
    ...createSecondaryText({ fontSize: 12 }),
  },
  focusDigestButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  focusDigestPrimary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  focusDigestPrimaryText: {
    ...createCtaText({ fontSize: 14 }),
  },
  focusDigestSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  focusDigestSecondaryText: {
    ...createCtaText({ fontSize: 14 }),
  },
  focusRewardCard: {
    width: "82%",
    borderRadius: 30,
    borderWidth: 1,
    padding: 24,
    gap: 14,
    alignItems: "center",
  },
  focusRewardIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  focusRewardCoin: {
    width: 48,
    height: 48,
  },
  focusRewardAmount: {
    ...createCtaText({ fontSize: 24 }),
  },
  focusRewardTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 24,
    textAlign: "center",
  },
  focusRewardBody: {
    ...createBodyText({ fontSize: 15, lineHeight: 22 }),
    textAlign: "center",
  },
  focusRewardButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  focusRewardButtonText: {
    ...createCtaText({ fontSize: 14 }),
  },
  impulseCategoryPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  impulseCategoryPickerCompact: {
    marginTop: 2,
  },
  impulseCategoryChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  impulseCategoryChipCompact: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  impulseCategoryChipText: {
    ...createCtaText({ fontSize: 12 }),
  },
  impulseAlertCard: {
    marginHorizontal: 24,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  impulseAlertGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  impulseAlertContent: {
    padding: 24,
    gap: 16,
    position: "relative",
  },
  impulseAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  impulseAlertBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  impulseAlertBadgeText: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  impulseAlertEmoji: {
    fontSize: 28,
  },
  impulseAlertTitle: {
    ...TYPOGRAPHY.blockTitle,
  },
  impulseAlertBody: {
    ...createBodyText({ fontSize: 15, lineHeight: 22 }),
  },
  impulseAlertStats: {
    flexDirection: "row",
    gap: 12,
  },
  impulseAlertStat: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  impulseAlertStatLabel: {
    ...createCtaText({ fontSize: 11, textTransform: "uppercase" }),
  },
  impulseAlertStatValue: {
    ...createBodyText({ fontSize: 18, fontWeight: "800", marginTop: 6 }),
  },
  impulseAlertMoodCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  impulseAlertMood: {
    ...createBodyText({ fontSize: 14, lineHeight: 20 }),
  },
  impulseAlertButton: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  impulseAlertButtonText: {
    ...createCtaText({ fontSize: 15 }),
  },
  impulseAlertButtonIcon: {
    ...createCtaText({ fontSize: 16 }),
  },
  celebrationCat: {
    width: 90,
    height: 90,
    borderRadius: 18,
    opacity: 0.9,
  },
  catHappy: {
    transform: [{ scale: 1.05 }],
  },
  catSad: {
    opacity: 0.7,
  },
  levelOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  levelBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,247,214,0.95)",
  },
  levelContent: {
    padding: 28,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 2,
    borderColor: "rgba(255,186,0,0.4)",
    alignItems: "center",
    gap: 12,
  },
  levelTitle: {
    ...TYPOGRAPHY.display,
    fontSize: 32,
  },
  levelSubtitle: {
    ...createBodyText({ fontSize: 16, fontWeight: "700", textAlign: "center" }),
  },
  levelShareButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 26,
    marginTop: 8,
  },
  levelShareButtonText: {
    ...createCtaText({ fontSize: 14 }),
  },
  rewardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  rewardBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,241,225,0.92)",
  },
  rewardCard: {
    paddingVertical: 30,
    paddingHorizontal: 24,
    borderRadius: 36,
    alignItems: "center",
    width: OVERLAY_CARD_MAX_WIDTH,
    maxWidth: OVERLAY_CARD_MAX_WIDTH,
    borderWidth: 2,
    borderColor: "rgba(255,181,115,0.7)",
    gap: 12,
  },
  rewardCat: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  rewardSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  healthOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  healthBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  healthHeartWrap: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  healthCoinImage: {
    width: 140,
    height: 140,
    resizeMode: "contain",
  },
  healthCard: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    width: OVERLAY_CARD_MAX_WIDTH,
    maxWidth: OVERLAY_CARD_MAX_WIDTH,
  },
  healthTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  healthSubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  goalCelebrateOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  goalCelebrateBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  goalCelebrateCard: {
    paddingVertical: 36,
    paddingHorizontal: 26,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    width: OVERLAY_CARD_MAX_WIDTH,
    maxWidth: OVERLAY_CARD_MAX_WIDTH,
    gap: 12,
  },
  goalCelebrateCat: {
    width: 120,
    height: 120,
  },
  goalCelebrateTitle: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  goalCelebrateSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  goalCelebrateTarget: {
    fontSize: 15,
    fontWeight: "700",
  },
  rewardHeart: {
    position: "absolute",
    bottom: 40,
    fontSize: 22,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 6,
  },
  levelCoin: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#FFD93D",
  },
  saveOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  saveCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    padding: 18,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(18,15,40,0.08)",
    marginHorizontal: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  saveGif: {
    width: 96,
    height: 96,
    borderRadius: 22,
    resizeMode: "contain",
  },
  saveTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  saveGoalText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  saveGoalBox: {
    backgroundColor: "rgba(18,15,40,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(18,15,40,0.05)",
    marginTop: 4,
  },
  saveCoinsRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(33, 150, 243, 0.08)",
  },
  saveCoinsText: {
    fontSize: 14,
    fontWeight: "700",
  },
  saveCoinIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  customTemptationCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(18,15,40,0.08)",
    marginHorizontal: 24,
  },
  customTemptationGif: {
    width: 160,
    height: 160,
    borderRadius: 32,
    resizeMode: "contain",
  },
  customTemptationText: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 18,
    textAlign: "center",
  },
  rainLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  rainDrop: {
    width: 2,
    borderRadius: 1,
    position: "absolute",
    top: 0,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    gap: 14,
  },
  sheetHandle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 6,
  },
  sheetTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 20,
    textAlign: "center",
  },
  sheetSubtitle: {
    ...createBodyText({ fontSize: 15, textAlign: "center" }),
  },
  sheetButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  sheetCancel: {
    ...createCtaText({ textAlign: "center", marginTop: 4 }),
  },
  priceModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  priceModalCard: {
    width: "100%",
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  priceModalTitle: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 20,
    textAlign: "center",
  },
  priceModalLabel: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase", marginTop: 12, marginBottom: 4 }),
  },
  priceModalInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    textAlign: "center",
  },
  priceModalInputCompact: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: "left",
  },
  goalPickerButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  goalPickerButtonText: {
    ...createCtaText({ fontSize: 15 }),
  },
  goalPickerReset: {
    marginTop: 6,
  },
  goalPickerResetText: {
    ...createSecondaryText({ fontSize: 13 }),
  },
  temptationEditOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 400,
    justifyContent: "center",
    alignItems: "center",
  },
  temptationEditBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#05060F",
  },
  temptationEditCardContainer: {
    width: "86%",
    maxWidth: 360,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  temptationOverlayCard: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 24,
  },
  priceModalButtons: {
    gap: 10,
  },
  priceModalPrimary: {
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  priceModalPrimaryText: {
    fontWeight: "700",
  },
  priceModalSecondary: {
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  priceModalSecondaryText: {
    fontWeight: "600",
  },
  priceModalCancel: {
    textAlign: "center",
    fontWeight: "600",
    marginTop: 4,
  },
  priceModalDeleteText: {
    textAlign: "center",
    fontWeight: "700",
    marginTop: 10,
  },
  goalModalCard: {
    width: "100%",
    borderRadius: 28,
    padding: 20,
    gap: 10,
  },
  goalModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  goalModalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  goalOptionButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  goalOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  goalOptionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  goalRenewalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  goalRenewalCard: {
    width: "100%",
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  goalRenewalTitle: {
    ...TYPOGRAPHY.blockTitle,
    textAlign: "center",
  },
  goalRenewalSubtitle: {
    ...createBodyText({ fontSize: 16, textAlign: "center", lineHeight: 22 }),
  },
  goalRenewalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  goalRenewalSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  goalRenewalSecondaryText: {
    ...createCtaText({ fontSize: 15 }),
  },
  goalRenewalPrimary: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  goalRenewalPrimaryText: {
    ...createCtaText({ fontSize: 15 }),
  },
  onboardContainer: {
    flex: 1,
    paddingHorizontal: BASE_HORIZONTAL_PADDING,
    paddingTop: 40,
    gap: 20,
  },
  onboardContent: {
    gap: 16,
    paddingBottom: 60,
  },
  onboardTitle: {
    ...TYPOGRAPHY.display,
  },
  onboardSubtitle: {
    ...createBodyText({ fontSize: 16, lineHeight: 22 }),
  },
  avatarPreview: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
  },
  primaryInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  baselineInputGroup: {
    marginTop: 8,
    gap: 4,
  },
  baselineHint: {
    ...createSecondaryText({ fontSize: 14, lineHeight: 20 }),
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  currencyLabel: {
    fontSize: 14,
    textTransform: "uppercase",
    marginTop: 4,
  },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  currencyChipLarge: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  goalGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  goalCustomSectionTitle: {
    ...createCtaText({ fontSize: 14, textTransform: "uppercase", marginTop: 16 }),
  },
  goalCustomButton: {
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  goalCustomButtonText: {
    ...createCtaText({ fontSize: 14 }),
  },
  goalOption: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  personaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  personaCard: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 6,
  },
  personaEmoji: {
    fontSize: 24,
  },
  personaTitle: {
    ...createBodyText({ fontWeight: "700", fontSize: 15 }),
  },
  personaSubtitleCard: {
    ...createBodyText({ fontSize: 14, lineHeight: 20 }),
  },
  goalEmoji: {
    fontSize: 28,
  },
  goalText: {
    ...createBodyText({ fontWeight: "600", textAlign: "center" }),
  },
  languageButtons: {
    flexDirection: "row",
    gap: 14,
  },
  languageTermsBlock: {
    width: "100%",
    marginTop: 18,
    gap: 8,
  },
  languageTermsNote: {
    ...createSecondaryText({ fontSize: 12, lineHeight: 18 }),
  },
  languageTermsButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  languageTermsButtonText: {
    ...createCtaText({ fontSize: 13 }),
  },
  genderGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  genderChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
  },
  genderEmoji: {
    fontSize: 20,
  },
  genderLabel: {
    ...createBodyText({ fontWeight: "600" }),
  },
  languageButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
  },
  onboardBackButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 12,
  },
  onboardBackIcon: {
    fontSize: 14,
  },
  onboardBackLabel: {
    ...createCtaText({ fontSize: 13 }),
  },
  languageHint: {
    ...createSecondaryText({ marginTop: 8, fontSize: 12 }),
  },
  goalTargetHint: {
    ...createSecondaryText({ fontSize: 13, marginTop: 8, marginBottom: 22 }),
  },
  logoSplashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  logoSplash: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoSplashText: {
    ...TYPOGRAPHY.logo,
    fontSize: 48,
    letterSpacing: -0.5,
    color: "#111",
  },
});
function ImageSourceSheet({ visible, colors, t, onClose, onSelect }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetBackdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.sheetCard, { backgroundColor: colors.card }] }>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("photoPromptTitle")}</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>{t("photoPromptSubtitle")}</Text>
              <TouchableOpacity
                style={[styles.sheetButton, { borderColor: colors.border }]}
                onPress={() => onSelect("library")}
              >
                <Text style={{ color: colors.text }}>{t("photoLibrary")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetButton, { borderColor: colors.border }]}
                onPress={() => onSelect("camera")}
              >
                <Text style={{ color: colors.text }}>{t("photoCamera")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <Text style={[styles.sheetCancel, { color: colors.muted }]}>{t("profileCancel")}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function RegistrationScreen({
  data,
  onChange,
  onSubmit,
  onPickImage,
  colors,
  t,
  onBack,
  mascotImageSource,
}) {
  const fallbackAvatar = mascotImageSource || CLASSIC_TAMAGOTCHI_ANIMATIONS.idle;
  const fade = useFadeIn();

  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView
        contentContainerStyle={styles.onboardContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("registrationTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("registrationSubtitle")}</Text>

        <TouchableOpacity
          style={[styles.avatarPreview, { borderColor: colors.border }]}
          onPress={() => onPickImage?.()}
        >
          {data.avatar ? (
            <Image source={{ uri: data.avatar }} style={styles.avatarImage} />
          ) : (
            <Image source={fallbackAvatar} style={styles.avatarImage} />
          )}
          <Text style={{ color: colors.muted }}>{t("photoTapHint")}</Text>
        </TouchableOpacity>

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.profileInput,
            styles.profileInputHalf,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
          ]}
          placeholder={t("inputFirstName")}
          placeholderTextColor={colors.muted}
          value={data.firstName}
          onChangeText={(text) => onChange("firstName", text)}
        />
        <TextInput
          style={[
            styles.profileInput,
            styles.profileInputHalf,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
          ]}
          placeholder={t("inputLastName")}
          placeholderTextColor={colors.muted}
          value={data.lastName}
          onChangeText={(text) => onChange("lastName", text)}
        />
      </View>

        <TextInput
          style={[
            styles.profileInput,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
          ]}
          placeholder={t("inputMotto")}
          placeholderTextColor={colors.muted}
          value={data.motto}
          onChangeText={(text) => onChange("motto", text)}
        />

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={onSubmit}>
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("nextButton")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

function GoalScreen({
  selectedGoals = [],
  onToggle,
  onSubmit,
  colors,
  t,
  language,
  onBack,
  customGoals = [],
  onCustomGoalCreate,
}) {
  const fade = useFadeIn();
  const selection = Array.isArray(selectedGoals) ? selectedGoals : [];
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false}>
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("goalTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("goalSubtitle")}</Text>

        <View style={styles.goalGrid}>
          {GOAL_PRESETS.map((goal) => {
            const active = selection.includes(goal.id);
            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalOption,
                  {
                    borderColor: colors.border,
                    backgroundColor: active ? colors.card : "transparent",
                  },
                ]}
                onPress={() => onToggle?.(goal.id)}
              >
                <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                <Text style={[styles.goalText, { color: colors.text }]}>
                  {goal[language] || goal.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {customGoals.length > 0 && (
          <>
            <Text style={[styles.goalCustomSectionTitle, { color: colors.muted }]}>
              {t("goalCustomSectionTitle")}
            </Text>
            <View style={styles.goalGrid}>
              {customGoals.map((goal) => {
                const active = selection.includes(goal.id);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.goalOption,
                      {
                        borderColor: colors.border,
                        backgroundColor: active ? colors.card : "transparent",
                      },
                    ]}
                    onPress={() => onToggle?.(goal.id)}
                  >
                    <Text style={styles.goalEmoji}>{goal.emoji || "🎯"}</Text>
                    <Text style={[styles.goalText, { color: colors.text }]}>{goal.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {onCustomGoalCreate && (
          <TouchableOpacity
            style={[styles.goalCustomButton, { borderColor: colors.border }]}
            onPress={onCustomGoalCreate}
          >
            <Text style={[styles.goalCustomButtonText, { color: colors.text }]}>
              {t("goalCustomCreate")}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={onSubmit}>
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("goalButton")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

function GoalTargetScreen({
  selections = [],
  values = {},
  currency,
  onChange,
  onSubmit,
  onBack,
  colors,
  t,
  language,
  customGoals = [],
}) {
  const fade = useFadeIn();
  const selectionList = Array.isArray(selections) ? selections : [];
  const customGoalMap = useMemo(() => {
    const entries = Array.isArray(customGoals) ? customGoals : [];
    return entries.reduce((acc, goal) => {
      acc[goal.id] = goal;
      return acc;
    }, {});
  }, [customGoals]);
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("goalTargetTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("goalTargetSubtitle")}</Text>
        {selectionList.map((goalId) => {
          const preset = getGoalPreset(goalId);
          const customGoal = customGoalMap[goalId];
          const goalLabel =
            customGoal?.title || preset?.[language] || preset?.en || goalId;
          return (
            <View key={goalId} style={styles.goalTargetRow}>
              <Text style={[styles.goalTargetLabel, { color: colors.muted }]}>{goalLabel}</Text>
              <View
                style={[
                  styles.goalTargetInputWrap,
                  { borderColor: colors.border, backgroundColor: colors.card },
                ]}
              >
                <TextInput
                  style={[styles.goalTargetInput, { color: colors.text }]}
                  placeholder={t("goalTargetPlaceholder")}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  value={values[goalId] || ""}
                  onChangeText={(text) => onChange?.(goalId, text)}
                />
                <Text style={[styles.goalTargetCurrency, { color: colors.muted }]}>{currency}</Text>
              </View>
            </View>
          );
        })}
        <Text style={[styles.goalTargetHint, { color: colors.muted }]}>{t("goalTargetHint")}</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={onSubmit}>
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("goalTargetCTA")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

function AnalyticsConsentScreen({ colors, t, onSubmit, onBack }) {
  return (
    <View style={[styles.analyticsConsentScreen, { backgroundColor: colors.background }]}>
      <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
      <View
        style={[
          styles.analyticsConsentCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.analyticsConsentTitle, { color: colors.text }]}>
          {t("analyticsConsentTitle")}
        </Text>
        <Text style={[styles.analyticsConsentBody, { color: colors.muted }]}>
          {t("analyticsConsentBody")}
        </Text>
        <TouchableOpacity
          style={[styles.analyticsConsentPrimary, { backgroundColor: colors.text }]}
          onPress={() => onSubmit(true)}
        >
          <Text style={[styles.analyticsConsentPrimaryText, { color: colors.background }]}>
            {t("analyticsConsentAgree")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.analyticsConsentSecondary, { borderColor: colors.border }]}
          onPress={() => onSubmit(false)}
        >
          <Text style={[styles.analyticsConsentSecondaryText, { color: colors.muted }]}>
            {t("analyticsConsentSkip")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SpendingBaselineScreen({ value, currency, onChange, onSubmit, colors, t, onBack }) {
  const fade = useFadeIn();
  const baselineSampleLabel = formatSampleAmount(BASELINE_SAMPLE_USD, currency || DEFAULT_PROFILE.currency);
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("baselineTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("baselineSubtitle")}</Text>
        <View style={styles.baselineInputGroup}>
          <TextInput
            style={[
              styles.primaryInput,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
            ]}
            placeholder={t("baselinePlaceholder", { amount: baselineSampleLabel })}
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={onChange}
          />
        </View>
        <Text style={[styles.baselineHint, { color: colors.muted }]}>{t("baselineHint")}</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={onSubmit}>
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("baselineCTA")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

function PersonaScreen({ data, onChange, onSubmit, colors, t, language, onBack }) {
  const fade = useFadeIn();
  const personaList = Object.values(PERSONA_PRESETS);
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false}>
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("personaTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("personaSubtitle")}</Text>

        <Text style={[styles.currencyLabel, { color: colors.muted }]}>{t("personaGenderLabel")}</Text>
        <View style={styles.genderGrid}>
          {GENDER_OPTIONS.map((option) => {
            const active = option.id === data.gender;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.genderChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: active ? colors.card : "transparent",
                  },
                ]}
                onPress={() => onChange("gender", option.id)}
              >
                <Text style={styles.genderEmoji}>{option.emoji}</Text>
                <Text style={[styles.genderLabel, { color: colors.text }]}>
                  {option.label[language] || option.label.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.currencyLabel, { color: colors.muted, marginTop: 16 }]}>
          {t("personaHabitLabel")}
        </Text>
        <View style={styles.personaGrid}>
          {personaList.map((persona) => {
            const active = data.persona === persona.id;
            return (
              <TouchableOpacity
                key={persona.id}
                style={[
                  styles.personaCard,
                  {
                    borderColor: colors.border,
                    backgroundColor: active ? colors.card : "transparent",
                  },
                ]}
                onPress={() => onChange("persona", persona.id)}
              >
                <Text style={styles.personaEmoji}>{persona.emoji}</Text>
                <Text style={[styles.personaTitle, { color: colors.text }]}>
                  {persona.title[language] || persona.title.en}
                </Text>
                <Text style={[styles.personaSubtitleCard, { color: colors.muted }]}>
                  {persona.description[language] || persona.description.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={onSubmit}>
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("personaConfirm")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

function CustomHabitScreen({ data, onChange, onSubmit, colors, t, currency, onBack, language }) {
  const fade = useFadeIn();
  const customSpendSampleLabel = formatSampleAmount(CUSTOM_SPEND_SAMPLE_USD, currency || DEFAULT_PROFILE.currency);
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false}>
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("customSpendTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("customSpendSubtitle")}</Text>

        <TextInput
          style={[
            styles.primaryInput,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
          ]}
          placeholder={t("customSpendNamePlaceholder")}
          placeholderTextColor={colors.muted}
          value={data.customSpendTitle}
          onChangeText={(text) => onChange("customSpendTitle", text)}
        />
        <View style={{ gap: 6 }}>
          <Text style={[styles.currencyLabel, { color: colors.muted }]}>{t("customSpendAmountLabel")}</Text>
          <TextInput
            style={[
              styles.primaryInput,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
            ]}
            placeholder={t("customSpendAmountPlaceholder", { amount: customSpendSampleLabel })}
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={data.customSpendAmount}
            onChangeText={(text) => onChange("customSpendAmount", text)}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={[styles.currencyLabel, { color: colors.muted }]}>{t("customSpendFrequencyLabel")}</Text>
          <TextInput
            style={[
              styles.primaryInput,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
            ]}
            placeholder={t("customSpendFrequencyPlaceholder")}
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            value={data.customSpendFrequency}
            onChangeText={(text) => onChange("customSpendFrequency", text)}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={[styles.currencyLabel, { color: colors.muted }]}>{t("impulseCategoryLabel")}</Text>
          <ImpulseCategorySelector
            value={data.customSpendCategory || DEFAULT_IMPULSE_CATEGORY}
            onChange={(cat) => onChange("customSpendCategory", cat)}
            colors={colors}
            language={language}
          />
        </View>
        <Text style={{ color: colors.muted }}>{t("customSpendHint")}</Text>

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={() => onSubmit(false)}>
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("personaConfirm")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButtonClear} onPress={() => onSubmit(true)}>
          <Text style={[styles.secondaryButtonClearText, { color: colors.muted }]}>{t("customSpendSkip")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

function ImpulseCategorySelector({ value, onChange, colors, language, compact = false }) {
  const selected = value && IMPULSE_CATEGORY_DEFS[value] ? value : DEFAULT_IMPULSE_CATEGORY;
  return (
    <View
      style={[
        styles.impulseCategoryPicker,
        compact && styles.impulseCategoryPickerCompact,
      ]}
    >
      {IMPULSE_CATEGORY_ORDER.map((categoryId) => {
        const active = selected === categoryId;
        return (
          <TouchableOpacity
            key={categoryId}
            style={[
              styles.impulseCategoryChip,
              compact && styles.impulseCategoryChipCompact,
              {
                borderColor: active ? colors.text : colors.border,
                backgroundColor: active ? colors.text : "transparent",
              },
            ]}
            onPress={() => onChange?.(categoryId)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.impulseCategoryChipText,
                { color: active ? colors.background : colors.text },
              ]}
            >
              {getImpulseCategoryLabel(categoryId, language)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CoinEntryModal({
  visible,
  colors,
  t,
  currency,
  language,
  maxAmountUSD = DEFAULT_COIN_SLIDER_MAX_USD,
  onUpdateMaxUSD,
  onSubmit,
  onCancel,
}) {
  const [sliderValue, setSliderValue] = useState(0.25);
  const [trackHeight, setTrackHeight] = useState(260);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryError, setCategoryError] = useState(false);
  const [manualMode, setManualMode] = useState(null);
  const [manualValue, setManualValue] = useState("");
  const [manualError, setManualError] = useState("");
  const directionAnim = useRef(new Animated.Value(0)).current;
  const sliderValueRef = useRef(0.25);
  const sliderValueCommitRef = useRef(0.25);
  const sliderValueThrottleRef = useRef(0);
  const hapticStepRef = useRef(0);
  const sliderHapticCooldownRef = useRef(0);
  const tossingRef = useRef(false);
  const [actionsUnlocked, setActionsUnlocked] = useState(false);
  const sliderGestureRef = useRef({
    axis: "pending",
  });
  const touchStartRef = useRef(0);
  const manualVisible = manualMode !== null;
  const manualIsAmountMode = manualMode === "amount";
  useEffect(() => {
    if (!visible) return;
    updateSliderValue(0.25, { force: true });
    hapticStepRef.current = Math.round(0.25 * 20);
    sliderHapticCooldownRef.current = 0;
    sliderGestureRef.current = {
      axis: "pending",
    };
    setSelectedCategory(null);
    setCategoryError(false);
    setManualMode(null);
    setManualValue("");
    setManualError("");
    directionAnim.setValue(0);
    tossingRef.current = false;
    touchStartRef.current = 0;
    setActionsUnlocked(false);
  }, [directionAnim, updateSliderValue, visible]);
  const currencySymbol =
    CURRENCY_SIGNS[currency] ||
    CURRENCY_SIGNS[DEFAULT_PROFILE.currency] ||
    DEFAULT_PROFILE.currency ||
    "$";
  const computeAmountUSDForValue = useCallback(
    (value) => {
      if (!Number.isFinite(value) || maxAmountUSD <= 0) return 0;
      const localAmount = roundCurrencyValue(
        convertToCurrency(maxAmountUSD * value, currency),
        currency
      );
      const usd = convertFromCurrency(localAmount, currency);
      return Math.max(0, Math.min(maxAmountUSD, usd));
    },
    [currency, maxAmountUSD]
  );
  const sliderAmountUSD = computeAmountUSDForValue(sliderValue);
  const sliderLocalValue = snapCurrencyValue(convertToCurrency(sliderAmountUSD, currency), currency);
  const sliderAmountLocal = formatCurrencyWhole(sliderLocalValue, currency);
  const sliderMaxLocalValue = useMemo(
    () => snapCurrencyValue(convertToCurrency(maxAmountUSD, currency), currency),
    [currency, maxAmountUSD]
  );
  const sliderMaxLocal = formatCurrencyWhole(sliderMaxLocalValue, currency);
  const sliderFillHeight = Math.max(COIN_FILL_MIN_HEIGHT, Math.min(trackHeight, trackHeight * sliderValue));
  const coinHasValue = sliderValue > 0.02;
  const coinFillColor = coinHasValue ? "#F7C45D" : "#DADDE3";
  const coinShineColor = coinHasValue ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)";
  const isDarkTheme = colors.background === THEMES.dark.background;
  const coinSurfaceOuter = isDarkTheme ? "#111525" : "#F6F8FC";
  const coinSurfaceInner = isDarkTheme ? "#181D31" : "#ECEFF5";
  const coinSurfaceBorder = isDarkTheme ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.8)";
  const coinSymbolColor = isDarkTheme ? "rgba(5,7,13,0.55)" : "rgba(5,7,13,0.25)";
  const coinSymbolOpacity = isDarkTheme ? 0.55 : 0.2;
  const sliderBackground = directionAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["rgba(217,72,98,0.18)", "rgba(0,0,0,0)", "rgba(46,184,115,0.18)"],
    extrapolate: "clamp",
  });
  const coinTranslateX = directionAnim.interpolate({
    inputRange: [-3, -1, 0, 1, 3],
    outputRange: [-SCREEN_WIDTH, -48, 0, 48, SCREEN_WIDTH],
    extrapolate: "clamp",
  });
  const currencyFineStep = useMemo(() => getCurrencyFineStep(currency), [currency]);
  const computeSteppedValue = useCallback(
    (rawValue) => {
      const clamped = Math.max(0, Math.min(1, rawValue));
      if (!Number.isFinite(clamped) || maxAmountUSD <= 0 || sliderMaxLocalValue <= 0) {
        return clamped;
      }
      const targetLocal = clamped * sliderMaxLocalValue;
      const stepLocal = currencyFineStep;
      const roundedLocal =
        stepLocal > 0
          ? roundCurrencyValue(Math.round(targetLocal / stepLocal) * stepLocal, currency)
          : roundCurrencyValue(targetLocal, currency);
      const limitedLocal = Math.max(0, Math.min(sliderMaxLocalValue, roundedLocal));
      const roundedUSD = convertFromCurrency(limitedLocal, currency);
      if (!Number.isFinite(roundedUSD) || roundedUSD < 0) {
        return clamped;
      }
      return Math.max(0, Math.min(1, roundedUSD / maxAmountUSD));
    },
    [currency, currencyFineStep, sliderMaxLocalValue, maxAmountUSD]
  );
  const computeValueFromTouch = useCallback(
    (locationY) => {
      if (!Number.isFinite(locationY) || trackHeight <= 0) {
        return sliderValueRef.current;
      }
      const clamped = Math.max(0, Math.min(trackHeight, locationY));
      const normalized = 1 - clamped / trackHeight;
      return computeSteppedValue(normalized);
    },
    [computeSteppedValue, sliderValueRef, trackHeight]
  );
  const updateSliderValue = useCallback(
    (value, { force = false, fromUser = false } = {}) => {
      const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
      sliderValueRef.current = clamped;
      const now = Date.now();
      if (force) {
        sliderValueCommitRef.current = clamped;
        sliderValueThrottleRef.current = now;
        setSliderValue(clamped);
        if (!fromUser && clamped <= COIN_SLIDER_VALUE_DEADBAND) {
          setActionsUnlocked(false);
        }
        return clamped;
      }
      const diff = Math.abs(clamped - sliderValueCommitRef.current);
      if (diff < COIN_SLIDER_VALUE_DEADBAND && now - sliderValueThrottleRef.current < COIN_SLIDER_STATE_MIN_INTERVAL) {
        return sliderValueCommitRef.current;
      }
      const smoothing = 0.35;
      const smoothed = sliderValueCommitRef.current + (clamped - sliderValueCommitRef.current) * smoothing;
      sliderValueCommitRef.current = smoothed;
      sliderValueThrottleRef.current = now;
      setSliderValue(smoothed);
      if (fromUser && smoothed > COIN_SLIDER_VALUE_DEADBAND) {
        setActionsUnlocked(true);
      }
      return smoothed;
    },
    [actionsUnlocked]
  );
  const openManual = useCallback(
    (mode) => {
      setManualMode(mode);
      setManualError("");
      if (mode === "amount") {
        const formatted = sliderLocalValue > 0 ? formatNumberInputValue(sliderLocalValue) : "";
        setManualValue(formatted);
      } else {
        setManualValue("");
      }
    },
    [sliderLocalValue]
  );
  const closeManual = useCallback(() => {
    setManualMode(null);
    setManualError("");
  }, []);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          sliderGestureRef.current = {
            axis: "vertical",
          };
          const touchY = evt.nativeEvent?.locationY;
          if (Number.isFinite(touchY)) {
            const nextValue = computeValueFromTouch(touchY);
            if (Math.abs(nextValue - sliderValueRef.current) >= COIN_SLIDER_VALUE_DEADBAND) {
              const applied = updateSliderValue(nextValue, { force: true, fromUser: true });
              hapticStepRef.current = Math.round(applied * 20);
            }
          }
          touchStartRef.current = Date.now();
          directionAnim.stopAnimation();
          directionAnim.setValue(0);
        },
        onPanResponderMove: (evt) => {
          if (tossingRef.current) return;
          if (trackHeight <= 0) return;
          const touchY = evt.nativeEvent?.locationY;
          const nextValue = computeValueFromTouch(touchY);
          if (Math.abs(nextValue - sliderValueRef.current) >= COIN_SLIDER_VALUE_DEADBAND) {
            const applied = updateSliderValue(nextValue, { fromUser: true });
            const nextStep = Math.round(applied * 20);
            if (nextStep !== hapticStepRef.current) {
              const now = Date.now();
              if (now - sliderHapticCooldownRef.current >= COIN_SLIDER_HAPTIC_COOLDOWN_MS) {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                sliderHapticCooldownRef.current = now;
              }
              hapticStepRef.current = nextStep;
            }
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const elapsed = Date.now() - (touchStartRef.current || 0);
          const isTap =
            Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6 && elapsed < 200 && !tossingRef.current;
          sliderGestureRef.current = {
            axis: "pending",
          };
          updateSliderValue(sliderValueRef.current, { force: true });
          if (isTap) {
            openManual("amount");
          }
        },
        onPanResponderTerminate: () => {
          sliderGestureRef.current = {
            axis: "pending",
          };
          updateSliderValue(sliderValueRef.current, { force: true });
        },
      }),
    [computeValueFromTouch, directionAnim, openManual, trackHeight, updateSliderValue]
  );
  const handleManualSave = () => {
    const parsed = parseNumberInputValue(manualValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setManualError(t("coinEntryManualError"));
      return;
    }
    const roundedLocal = snapCurrencyValue(parsed, currency);
    if (manualIsAmountMode) {
      if (!Number.isFinite(maxAmountUSD) || maxAmountUSD <= 0) {
        setManualError(t("coinEntryManualError"));
        return;
      }
      const limitedLocal = Math.max(0, Math.min(sliderMaxLocalValue, roundedLocal));
      const parsedUSD = convertFromCurrency(limitedLocal, currency);
      if (!Number.isFinite(parsedUSD)) {
        setManualError(t("coinEntryManualError"));
        return;
      }
      const normalized = Math.max(0, Math.min(1, parsedUSD / maxAmountUSD));
      updateSliderValue(normalized, { force: true, fromUser: true });
      hapticStepRef.current = Math.round(normalized * 20);
      sliderGestureRef.current = {
        axis: "pending",
      };
      closeManual();
      return;
    }
    const parsedUSD = convertFromCurrency(roundedLocal, currency);
    if (!Number.isFinite(parsedUSD) || parsedUSD <= 0) {
      setManualError(t("coinEntryManualError"));
      return;
    }
    onUpdateMaxUSD?.(parsedUSD);
    closeManual();
  };
  const categoryLabelKey = language === "ru" ? "ru" : "en";
  const manualTitle = manualIsAmountMode ? t("coinEntryManualAmountTitle") : t("coinEntryManualTitle");
  const manualPlaceholder = manualIsAmountMode
    ? t("coinEntryManualAmountPlaceholder", { amount: sliderAmountLocal })
    : t("coinEntryManualPlaceholder", { amount: sliderMaxLocal });
  const handleAction = useCallback(
    (direction) => {
      if (tossingRef.current) return;
      const value = sliderValueRef.current;
      const hasAmount = value >= 0.02;
      if (!hasAmount) {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      if (!selectedCategory) {
        setCategoryError(true);
        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      const computedAmountUSD = computeAmountUSDForValue(value);
      tossingRef.current = true;
      Animated.timing(directionAnim, {
        toValue: direction === "save" ? 3.2 : -3.2,
        duration: 180,
        easing: Easing.out(Easing.circle),
        useNativeDriver: false,
      }).start(() => {
        tossingRef.current = false;
        directionAnim.setValue(0);
        onSubmit?.({
          amountUSD: computedAmountUSD,
          category: selectedCategory,
          direction,
        });
      });
    },
    [computeAmountUSDForValue, directionAnim, onSubmit, selectedCategory]
  );
  const showActionButtons = actionsUnlocked && sliderValue > COIN_SLIDER_VALUE_DEADBAND;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.coinEntryBackdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.coinEntryCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.coinEntryHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.coinEntryTitle, { color: colors.text }]}>{t("coinEntryTitle")}</Text>
                  <Text style={[styles.coinEntrySubtitle, { color: colors.muted }]}>
                    {t("coinEntrySubtitle")}
                  </Text>
                </View>
                <TouchableOpacity onPress={onCancel} style={styles.coinEntryClose}>
                  <Text style={[styles.coinEntryCloseText, { color: colors.muted }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.coinEntryAmountRow}>
                <Text style={[styles.coinEntryAmount, { color: colors.text }]}>{sliderAmountLocal}</Text>
                <TouchableOpacity
                  onPress={() => openManual("max")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.coinEntryMaxLabel, { color: colors.muted }]}>
                    {sliderMaxLocal}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.coinSliderWrapper}>
                <Animated.View style={[styles.coinSliderBackdrop, { backgroundColor: sliderBackground }]} />
                <Animated.View
                  style={[
                    styles.coinCircle,
                    {
                      borderColor: coinHasValue ? "rgba(247,196,93,0.5)" : colors.border,
                      backgroundColor: coinSurfaceOuter,
                      shadowColor: coinHasValue ? "#F7C45D" : "#A0A5B6",
                      transform: [{ translateX: coinTranslateX }],
                    },
                  ]}
                  onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    if (height) setTrackHeight(height);
                  }}
                  {...panResponder.panHandlers}
                >
                  <View
                    style={[
                      styles.coinInnerSurface,
                      { backgroundColor: coinSurfaceInner, borderColor: coinSurfaceBorder },
                    ]}
                  >
                    <View style={styles.coinFillTrack}>
                      <View
                        style={[
                          styles.coinFill,
                          {
                            height: sliderFillHeight,
                            backgroundColor: coinFillColor,
                          },
                        ]}
                      />
                    </View>
                    <View style={[styles.coinShine, { backgroundColor: coinShineColor }]} />
                    <Text
                      style={[
                        styles.coinCurrencySymbol,
                        { color: coinSymbolColor, opacity: coinSymbolOpacity },
                      ]}
                    >
                      {currencySymbol}
                    </Text>
                  </View>
                </Animated.View>
              </View>
              {showActionButtons && (
                <View style={styles.coinEntryActions}>
                  <TouchableOpacity
                    style={[styles.coinEntryActionButton, styles.coinEntryActionButtonSpend]}
                    onPress={() => handleAction("spend")}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.coinEntryActionButtonText, styles.coinEntryActionButtonTextSpend]}>
                      {t("spendAction")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.coinEntryActionButton, styles.coinEntryActionButtonSave]}
                    onPress={() => handleAction("save")}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.coinEntryActionButtonText, styles.coinEntryActionButtonTextSave]}>
                      {t("saveAction")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={[styles.coinEntryHint, { color: colors.muted }]}>{t("coinEntryHint")}</Text>
              <Text style={[styles.coinEntryCategoryLabel, { color: colors.text }]}>
                {t("coinEntryCategoryLabel")}
              </Text>
              {categoryError && (
                <Text style={[styles.coinEntryError, { color: SPEND_ACTION_COLOR }]}>
                  {t("coinEntryCategoryError")}
                </Text>
              )}
              <View style={styles.coinEntryCategoryRow}>
                {IMPULSE_CATEGORY_ORDER.map((categoryId) => {
                  const def = IMPULSE_CATEGORY_DEFS[categoryId];
                  const active = selectedCategory === categoryId;
                  return (
                    <TouchableOpacity
                      key={categoryId}
                      style={[
                        styles.coinEntryCategoryButton,
                        {
                          borderColor: active ? colors.text : colors.border,
                          backgroundColor: active ? colors.text : "transparent",
                        },
                      ]}
                      onPress={() => {
                        setSelectedCategory(categoryId);
                        setCategoryError(false);
                      }}
                    >
                      <Text style={styles.coinEntryCategoryEmoji}>{def.emoji}</Text>
                      <Text
                        style={[
                          styles.coinEntryCategoryText,
                          { color: active ? colors.background : colors.text },
                        ]}
                        numberOfLines={2}
                      >
                        {def[categoryLabelKey]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      {manualVisible && (
        <Modal visible transparent animationType="fade" onRequestClose={closeManual}>
          <TouchableWithoutFeedback onPress={closeManual}>
            <View style={styles.coinEntryManualBackdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.coinEntryManualCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.coinEntryManualTitle, { color: colors.text }]}>
                    {manualTitle}
                  </Text>
                  <TextInput
                    style={[styles.coinEntryManualInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder={manualPlaceholder}
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    value={manualValue}
                    onChangeText={setManualValue}
                  />
                  {!!manualError && (
                    <Text style={[styles.coinEntryManualError, { color: SPEND_ACTION_COLOR }]}>{manualError}</Text>
                  )}
                  <View style={styles.coinEntryManualActions}>
                    <TouchableOpacity
                      style={[styles.coinEntryManualButtonGhost, { borderColor: colors.border }]}
                      onPress={closeManual}
                    >
                      <Text style={[styles.coinEntryManualButtonGhostText, { color: colors.muted }]}>
                        {t("coinEntryManualCancel")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.coinEntryManualButtonPrimary, { backgroundColor: colors.text }]}
                      onPress={handleManualSave}
                    >
                      <Text style={[styles.coinEntryManualButtonPrimaryText, { color: colors.background }]}>
                        {t("coinEntryManualSave")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </Modal>
  );
}

function QuickCustomModal({
  visible,
  colors,
  t,
  currency,
  data,
  onChange,
  onSubmit,
  onCancel,
  language,
  keyboardOffset = 0,
}) {
  const keyboardPaddingStyle = keyboardOffset ? { paddingBottom: keyboardOffset } : null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.quickModalBackdrop, keyboardPaddingStyle]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.quickModalCard, { backgroundColor: colors.card }] }>
              <Text style={[styles.quickModalTitle, { color: colors.text }]}>{t("quickCustomTitle")}</Text>
              <Text style={[styles.quickModalSubtitle, { color: colors.muted }]}>{t("quickCustomSubtitle")}</Text>
              <View style={{ gap: 8, width: "100%" }}>
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("quickCustomNameLabel")}
                  placeholderTextColor={colors.muted}
                  value={data.title}
                  onChangeText={(text) => onChange("title", text)}
                />
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("quickCustomAmountLabel", { currency })}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  value={data.amount}
                  onChangeText={(text) => onChange("amount", text)}
                />
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("quickCustomEmojiLabel")}
                  placeholderTextColor={colors.muted}
                  value={data.emoji || ""}
                  onChangeText={(text) => onChange("emoji", text)}
                  selectTextOnFocus
                  maxLength={2}
                />
                <View style={{ gap: 6 }}>
                  <Text style={[styles.currencyLabel, { color: colors.muted }]}>
                    {t("impulseCategoryLabel")}
                  </Text>
                  <ImpulseCategorySelector
                    value={data.category || DEFAULT_IMPULSE_CATEGORY}
                    onChange={(cat) => onChange("category", cat)}
                    colors={colors}
                    language={language}
                  />
                </View>
              </View>
              <View style={styles.quickModalActions}>
                <TouchableOpacity
                  style={[styles.quickModalSecondary, { borderColor: colors.border }]}
                  onPress={onCancel}
                >
                  <Text style={[styles.quickModalSecondaryText, { color: colors.muted }]}>
                    {t("quickCustomCancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickModalPrimary, { backgroundColor: colors.text }]}
                  onPress={() => onSubmit(data)}
                >
                  <Text style={[styles.quickModalPrimaryText, { color: colors.background }]}>
                    {t("quickCustomConfirm")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function NewGoalModal({
  visible,
  colors,
  t,
  currency,
  data,
  onChange,
  onSubmit,
  onCancel,
  keyboardOffset = 0,
}) {
  const keyboardPaddingStyle = keyboardOffset ? { paddingBottom: keyboardOffset } : null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.quickModalBackdrop, keyboardPaddingStyle]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.quickModalCard, { backgroundColor: colors.card }] }>
              <Text style={[styles.quickModalTitle, { color: colors.text }]}>{t("newGoalTitle")}</Text>
              <Text style={[styles.quickModalSubtitle, { color: colors.muted }]}>{t("newGoalSubtitle")}</Text>
              <View style={{ gap: 8, width: "100%" }}>
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newGoalNameLabel")}
                  placeholderTextColor={colors.muted}
                  value={data.name}
                  onChangeText={(text) => onChange("name", text)}
                />
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newGoalTargetLabel", { currency })}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  value={data.target}
                  onChangeText={(text) => onChange("target", text)}
                />
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newGoalEmojiLabel")}
                  placeholderTextColor={colors.muted}
                  value={data.emoji || ""}
                  onChangeText={(text) => onChange("emoji", text)}
                  selectTextOnFocus
                  maxLength={2}
                />
              </View>
              <View style={styles.quickModalActions}>
                <TouchableOpacity
                  style={[styles.quickModalSecondary, { borderColor: colors.border }]}
                  onPress={onCancel}
                >
                  <Text style={[styles.quickModalSecondaryText, { color: colors.muted }]}>
                    {t("newGoalCancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickModalPrimary, { backgroundColor: colors.text }]}
                  onPress={onSubmit}
                >
                  <Text style={[styles.quickModalPrimaryText, { color: colors.background }]}>
                    {t("newGoalCreate")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function NewPendingModal({
  visible,
  colors,
  t,
  currency,
  data,
  onChange,
  onSubmit,
  onCancel,
  keyboardOffset = 0,
}) {
  const keyboardPaddingStyle = keyboardOffset ? { paddingBottom: keyboardOffset } : null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.quickModalBackdrop, keyboardPaddingStyle]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.quickModalCard, { backgroundColor: colors.card }] }>
              <Text style={[styles.quickModalTitle, { color: colors.text }]}>{t("newPendingTitle")}</Text>
              <Text style={[styles.quickModalSubtitle, { color: colors.muted }]}>{t("newPendingSubtitle")}</Text>
              <View style={{ gap: 8, width: "100%" }}>
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newPendingNameLabel")}
                  placeholderTextColor={colors.muted}
                  value={data.title}
                  onChangeText={(text) => onChange("title", text)}
                />
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newPendingAmountLabel", { currency })}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  value={data.amount}
                  onChangeText={(text) => onChange("amount", text)}
                />
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newPendingEmojiLabel")}
                  placeholderTextColor={colors.muted}
                  value={data.emoji || ""}
                  onChangeText={(text) => onChange("emoji", text)}
                  selectTextOnFocus
                  maxLength={2}
                />
              </View>
              <View style={styles.quickModalActions}>
                <TouchableOpacity
                  style={[styles.quickModalSecondary, { borderColor: colors.border }]}
                  onPress={onCancel}
                >
                  <Text style={[styles.quickModalSecondaryText, { color: colors.muted }]}>
                    {t("newPendingCancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickModalPrimary, { backgroundColor: colors.text }]}
                  onPress={onSubmit}
                >
                  <Text style={[styles.quickModalPrimaryText, { color: colors.background }]}>
                    {t("newPendingCreate")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function OnboardingGoalModal({
  visible,
  colors,
  t,
  currency,
  data,
  onChange,
  onSubmit,
  onCancel,
  keyboardOffset = 0,
}) {
  const keyboardPaddingStyle = keyboardOffset ? { paddingBottom: keyboardOffset } : null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.quickModalBackdrop, keyboardPaddingStyle]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.quickModalCard, { backgroundColor: colors.card }] }>
              <Text style={[styles.quickModalTitle, { color: colors.text }]}>{t("newGoalTitle")}</Text>
              <Text style={[styles.quickModalSubtitle, { color: colors.muted }]}>{t("newGoalSubtitle")}</Text>
              <View style={{ gap: 8, width: "100%" }}>
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newGoalNameLabel")}
                  placeholderTextColor={colors.muted}
                  value={data.name}
                  onChangeText={(text) => onChange("name", text)}
                />
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newGoalTargetLabel", { currency })}
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  value={data.target}
                  onChangeText={(text) => onChange("target", text)}
                />
                <TextInput
                  style={[
                    styles.primaryInput,
                    { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
                  ]}
                  placeholder={t("newGoalEmojiLabel")}
                  placeholderTextColor={colors.muted}
                  value={data.emoji || ""}
                  onChangeText={(text) => onChange("emoji", text)}
                  selectTextOnFocus
                  maxLength={2}
                />
              </View>
              <View style={styles.quickModalActions}>
                <TouchableOpacity
                  style={[styles.quickModalSecondary, { borderColor: colors.border }]}
                  onPress={onCancel}
                >
                  <Text style={[styles.quickModalSecondaryText, { color: colors.muted }]}>
                    {t("newGoalCancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickModalPrimary, { backgroundColor: colors.text }]}
                  onPress={onSubmit}
                >
                  <Text style={[styles.quickModalPrimaryText, { color: colors.background }]}>
                    {t("goalCustomCreate")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function TermsModal({ visible, colors, t, language, onAccept, onCancel, onOpenLink }) {
  const points = TERMS_POINTS[language] || TERMS_POINTS.en;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.quickModalBackdrop}>
        <View style={[styles.termsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.termsTitle, { color: colors.text }]}>{t("termsTitle")}</Text>
          <Text style={[styles.termsSubtitle, { color: colors.muted }]}>{t("termsSubtitle")}</Text>
          <ScrollView
            style={styles.termsScroll}
            contentContainerStyle={styles.termsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {points.map((point, index) => (
              <View key={`${index}-${language}`} style={styles.termsPoint}>
                <Text style={[styles.termsPointIndex, { color: colors.muted }]}>{index + 1}.</Text>
                <Text style={[styles.termsPointText, { color: colors.text }]}>{point}</Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.termsLinkButton, { borderColor: colors.border }]}
            onPress={onOpenLink}
          >
            <Text style={[styles.termsLinkText, { color: colors.text }]}>{t("termsViewFull")}</Text>
          </TouchableOpacity>
          <Text style={[styles.termsHint, { color: colors.muted }]}>{t("termsLinkHint")}</Text>
          <View style={styles.quickModalActions}>
            <TouchableOpacity
              style={[styles.quickModalSecondary, { borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.quickModalSecondaryText, { color: colors.muted }]}>{t("termsDecline")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickModalPrimary, { backgroundColor: colors.text }]}
              onPress={onAccept}
            >
              <Text style={[styles.quickModalPrimaryText, { color: colors.background }]}>{t("termsAccept")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OnboardingBackButton({ onPress, colors, t }) {
  if (!onPress) return null;
  return (
    <TouchableOpacity
      style={[styles.onboardBackButton, { borderColor: colors.border }]}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={[styles.onboardBackIcon, { color: colors.text }]}>←</Text>
      <Text style={[styles.onboardBackLabel, { color: colors.text }]}>{t("onboardingBack")}</Text>
    </TouchableOpacity>
  );
}

function HowItWorksScreen({ colors, t, onContinue, onBack }) {
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView
        contentContainerStyle={[styles.onboardContent, { gap: 18 }]}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("onboardingGuideTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("onboardingGuideSubtitle")}</Text>
        <View style={styles.guideCards}>
          {HOW_IT_WORKS_STEPS.map((step) => (
            <View
              key={step.id}
              style={[
                styles.guideCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={styles.guideEmoji}>{step.emoji}</Text>
              <Text style={[styles.guideTitle, { color: colors.text }]}>{t(step.titleKey)}</Text>
              <Text style={[styles.guideDesc, { color: colors.muted }]}>{t(step.descKey)}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.text }]}
          onPress={onContinue}
        >
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("onboardingGuideButton")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}
function LanguageScreen({
  colors,
  t,
  selectedLanguage,
  selectedCurrency,
  onLanguageChange,
  onCurrencyChange,
  onContinue,
  onBack,
  onShowTerms,
  termsAccepted,
  mascotWaveSource,
}) {
  const fade = useFadeIn();
  const wavingSource = mascotWaveSource || CLASSIC_TAMAGOTCHI_ANIMATIONS.waving;
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <View style={styles.onboardContent}>
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Image source={wavingSource} style={styles.languageMascot} />
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("languageTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("languageSubtitle")}</Text>
        <View style={styles.languageButtons}>
          {[
            { key: "ru", label: t("languageRussian") },
            { key: "en", label: t("languageEnglish") },
          ].map((lang) => (
            <TouchableOpacity
              key={lang.key}
              style={[
                styles.languageButton,
                {
                  borderColor: colors.border,
                  backgroundColor: selectedLanguage === lang.key ? colors.card : "transparent",
                },
              ]}
              onPress={() => onLanguageChange?.(lang.key)}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ width: "100%", marginTop: 32 }}>
          <Text style={[styles.currencyLabel, { color: colors.muted }]}>{t("currencyLabel")}</Text>
          <View style={[styles.currencyGrid, { marginTop: 12 }]}>
            {CURRENCIES.map((currency) => {
              const active = currency === selectedCurrency;
              return (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.currencyChipLarge,
                    {
                      backgroundColor: active ? colors.text : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => onCurrencyChange?.(currency)}
                >
                  <Text
                    style={{
                      color: active ? colors.background : colors.text,
                      fontWeight: "600",
                    }}
                  >
                    {currency}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.languageHint, { color: colors.muted }]}>{t("languageCurrencyHint")}</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.text, marginTop: 32 }]}
          onPress={onContinue}
        >
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("nextButton")}</Text>
        </TouchableOpacity>
        <View style={styles.languageTermsBlock}>
          <Text style={[styles.languageTermsNote, { color: colors.muted }]}>
            {termsAccepted ? t("languageTermsAccepted") : t("languageTermsHint")}
          </Text>
          <TouchableOpacity
            style={[styles.languageTermsButton, { borderColor: colors.border }]}
            onPress={() => onShowTerms?.()}
          >
            <Text style={[styles.languageTermsButtonText, { color: colors.text }]}>{t("languageTermsLink")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

function LogoSplash({ onDone }) {
  const [text, setText] = useState("");
  const handleLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  useEffect(() => {
    const word = "Almost";
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      setText(word.slice(0, index));
      if (index === word.length) {
        clearInterval(interval);
        setTimeout(() => onDone?.(), 600);
      }
    }, 140);
    return () => clearInterval(interval);
  }, [onDone]);

  return (
    <View style={styles.logoSplash} onLayout={handleLayout}>
      <Text style={styles.logoSplashText}>{text}</Text>
    </View>
  );
}
const LevelUpCelebration = ({ colors, message, t, onSharePress }) => {
  const coins = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, index) => ({
        id: `level_coin_${index}`,
        delay: Math.random() * 400,
        left: Math.random() * SCREEN_WIDTH,
        size: 14 + Math.random() * 20,
        duration: 1500 + Math.random() * 600,
      })),
    []
  );
  const levelNumber = Number(message) || 1;
  return (
    <View style={styles.levelOverlay} pointerEvents="box-none">
      <View style={styles.levelBackdrop} />
      <View style={styles.levelContent}>
        <Text style={[styles.levelTitle, { color: colors.text }]}>{t("progressHeroLevel", { level: levelNumber })}</Text>
        <Text style={[styles.levelSubtitle, { color: colors.text }]}>
          {t("levelCelebrate", { level: levelNumber })}
        </Text>
        {onSharePress && (
          <TouchableOpacity
            style={[styles.levelShareButton, { backgroundColor: colors.text }]}
            activeOpacity={0.92}
            onPress={() => onSharePress(levelNumber)}
          >
            <Text style={[styles.levelShareButtonText, { color: colors.background }]}>
              {t("levelShareButton")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {coins.map((coin) => (
        <FallingCoin key={coin.id} {...coin} />
      ))}
    </View>
  );
};

const FallingCoin = ({ left, size, delay, duration }) => {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, duration, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, Dimensions.get("window").height],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["-40deg", "40deg"],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.levelCoin,
        {
          width: size,
          height: size,
          left,
          opacity,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    />
  );
};

const RewardCelebration = ({ colors, message, t, mascotHappySource }) => {
  const happySource = mascotHappySource || CLASSIC_TAMAGOTCHI_ANIMATIONS.happy;
  const hearts = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, index) => ({
        id: `reward_heart_${index}`,
        left: Math.random() * SCREEN_WIDTH,
        delay: Math.random() * 1200,
        duration: 1800 + Math.random() * 800,
      })),
    []
  );
  const isDarkTheme = colors.background === THEMES.dark.background;
  const rewardBackdropColor = isDarkTheme ? "rgba(0,0,0,0.85)" : "rgba(255,241,225,0.92)";
  const rewardCardBg = isDarkTheme ? lightenColor(colors.card, 0.12) : colors.card;
  const rewardCardBorder = isDarkTheme ? lightenColor(colors.border, 0.25) : "rgba(255,181,115,0.7)";
  return (
    <View style={styles.rewardOverlay} pointerEvents="none">
      <View style={[styles.rewardBackdrop, { backgroundColor: rewardBackdropColor }]} />
      {hearts.map((heart) => (
        <RewardHeart key={heart.id} {...heart} />
      ))}
      <View
        style={[
          styles.rewardCard,
          { backgroundColor: rewardCardBg, borderColor: rewardCardBorder },
        ]}
      >
        <Image source={happySource} style={styles.rewardCat} />
        <Text style={[styles.rewardTitle, { color: colors.text }]}>
          {t("rewardCelebrateTitle", { title: message })}
        </Text>
        <Text style={[styles.rewardSubtitle, { color: colors.muted }]}>
          {t("rewardCelebrateSubtitle")}
        </Text>
      </View>
    </View>
  );
};

const HealthCelebration = ({ colors, payload, t }) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 460,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale]);
  const data = payload && typeof payload === "object" ? payload : { reason: payload };
  const amount =
    typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : HEALTH_PER_REWARD;
  const displayCoins =
    typeof data.displayCoins === "number" && Number.isFinite(data.displayCoins)
      ? data.displayCoins
      : null;
  const coinValue =
    typeof data.coinValue === "number" && Number.isFinite(data.coinValue) ? data.coinValue : amount;
  const baseSubtitle = t("healthCelebrateSubtitle");
  const reason = data.reason || baseSubtitle;
  const isDarkTheme = colors.background === THEMES.dark.background;
  const backdropColor = isDarkTheme ? "rgba(0,0,0,0.85)" : "rgba(6,9,19,0.35)";
  const cardBg = isDarkTheme ? lightenColor(colors.card, 0.15) : colors.card;
  const cardBorder = isDarkTheme ? lightenColor(colors.border, 0.25) : "rgba(0,0,0,0.1)";
  const heartBackground = isDarkTheme ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)";
  const rewardCoinTier = getHealthCoinTierForAmount(coinValue);
  const titleAmount = displayCoins ?? amount;
  return (
    <View style={styles.healthOverlay} pointerEvents="none">
      <View style={[styles.healthBackdrop, { backgroundColor: backdropColor }]} />
      <Animated.View
        style={[
          styles.healthHeartWrap,
          { transform: [{ scale }], backgroundColor: heartBackground },
        ]}
      >
        <Image source={rewardCoinTier.asset} style={styles.healthCoinImage} />
      </Animated.View>
      <View style={[styles.healthCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>
          {t("healthCelebrateTitle", { amount: titleAmount })}
        </Text>
        <Text style={[styles.healthSubtitle, { color: colors.muted }]}>{reason}</Text>
        {reason !== baseSubtitle && (
          <Text style={[styles.healthSubtitle, { color: colors.muted }]}>{baseSubtitle}</Text>
        )}
      </View>
    </View>
  );
};

const GoalCelebration = ({ colors, payload, t, mascotHappySource }) => {
  const happySource = mascotHappySource || CLASSIC_TAMAGOTCHI_ANIMATIONS.happy;
  const hearts = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, index) => ({
        id: `goal_heart_${index}`,
        left: Math.random() * SCREEN_WIDTH,
        delay: Math.random() * 900,
        duration: 1600 + Math.random() * 900,
      })),
    []
  );
  const data =
    payload && typeof payload === "object"
      ? payload
      : { title: payload || t("goalCelebrationTitle"), subtitle: t("goalCelebrationSubtitle") };
  const isDarkTheme = colors.background === THEMES.dark.background;
  const backdropColor = isDarkTheme ? "rgba(0,0,0,0.85)" : "rgba(7,44,23,0.85)";
  const cardBg = isDarkTheme ? lightenColor(colors.card, 0.15) : "#E7FFE9";
  const cardBorder = isDarkTheme ? lightenColor(colors.border, 0.25) : "#8FD7AE";
  return (
    <View style={styles.goalCelebrateOverlay} pointerEvents="none">
      <View style={[styles.goalCelebrateBackdrop, { backgroundColor: backdropColor }]} />
      {hearts.map((heart) => (
        <RewardHeart key={heart.id} {...heart} />
      ))}
      <View style={[styles.goalCelebrateCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Image source={happySource} style={styles.goalCelebrateCat} />
        <Text style={[styles.goalCelebrateTitle, { color: colors.text }]}>
          {data.title || t("goalCelebrationTitle")}
        </Text>
        <Text style={[styles.goalCelebrateSubtitle, { color: colors.muted }]}>
          {data.subtitle || t("goalCelebrationSubtitle")}
        </Text>
        {data.targetLabel && (
          <Text style={[styles.goalCelebrateTarget, { color: colors.text }]}>{data.targetLabel}</Text>
        )}
      </View>
    </View>
  );
};

const RewardHeart = ({ left, delay, duration }) => {
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -160,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: duration * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, duration, opacity, translateY]);

  return (
    <Animated.Text
      style={[
        styles.rewardHeart,
        {
          left,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      ❤️
    </Animated.Text>
  );
};
