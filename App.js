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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";
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
import { initAnalytics, logEvent, logScreenView, setAnalyticsOptOut as setAnalyticsOptOutFlag } from "./analytics";
import { SavingsProvider, useRealSavedAmount } from "./src/hooks/useRealSavedAmount";
import { useSavingsSimulation } from "./src/hooks/useSavingsSimulation";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

initSentry();
initAnalytics();

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
  CUSTOM_TEMPTATIONS: "@almost_custom_temptations",
  HIDDEN_TEMPTATIONS: "@almost_hidden_temptations",
  IMPULSE_TRACKER: "@almost_impulse_tracker",
  MOOD_STATE: "@almost_mood_state",
  CHALLENGES: "@almost_challenges",
  CUSTOM_REMINDER: "@almost_custom_reminder",
  TAMAGOTCHI: "@almost_tamagotchi_state",
  DAILY_SUMMARY: "@almost_daily_summary",
  TUTORIAL: "@almost_tutorial_state",
};

const PURCHASE_GOAL = 20000;
const CAT_IMAGE = require("./assets/Cat_mascot.png");
const CAT_CURIOUS = require("./assets/Cat_curious.gif");
const CAT_HAPPY_GIF = require("./assets/Cat_happy.gif");
const CAT_WAVING = require("./assets/Cat_waving.gif");
const CAT_FOLLOWS = require("./assets/Cat_follows.gif");
const CAT_IDLE = require("./assets/Cat_idle.gif");
const CAT_SAD = require("./assets/Cat_sad.gif");
const CAT_OH_OH = require("./assets/Cat_oh_oh.gif");
const CAT_HAPPY_HEADSHAKE = require("./assets/Cat_happy_headshake.gif");
const CAT_SPEAKS = require("./assets/Cat_speaks.gif");
const HEALTH_COIN_TIERS = [
  { id: "green", value: 1, asset: require("./assets/coins/Coin_green.png") },
  { id: "blue", value: 10, asset: require("./assets/coins/Coin_blue.png") },
  { id: "orange", value: 100, asset: require("./assets/coins/Coin_orange.png") },
  { id: "red", value: 1000, asset: require("./assets/coins/Coin_red.png") },
  { id: "pink", value: 10000, asset: require("./assets/coins/Coin_pink.png") },
];

const ECONOMY_RULES = {
  saveRewardStepUSD: 12,
  minSaveReward: 2,
  maxSaveReward: 24,
  baseAchievementReward: 60,
  freeDayRescueCost: 60,
  tamagotchiFeedCost: 5,
  tamagotchiFeedBoost: 24,
  tamagotchiPartyCost: 20,
};
const SCREEN_WIDTH = Dimensions.get("window").width;

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

const CTA_LETTER_SPACING = 0.4;

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
const DEFAULT_REMOTE_IMAGE =
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80";
const REMINDER_DAYS = 14;
const DAY_MS = 1000 * 60 * 60 * 24;
const REMINDER_MS = REMINDER_DAYS * DAY_MS;
const SAVE_SPAM_WINDOW_MS = 1000 * 60 * 5;
const SAVE_SPAM_ITEM_LIMIT = 3;
const SAVE_SPAM_GLOBAL_LIMIT = 5;
const SAVE_ACTION_COLOR = "#2EB873";
const SPEND_ACTION_COLOR = "#D94862";
const GOAL_HIGHLIGHT_COLOR = "#F6C16B";
const GOAL_SWIPE_THRESHOLD = 80;
const DELETE_SWIPE_THRESHOLD = 130;
const CHALLENGE_SWIPE_ACTION_WIDTH = 120;
const BASELINE_SAMPLE_USD = 120;
const CUSTOM_SPEND_SAMPLE_USD = 7.5;

const getDayKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
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
const computeRefuseCoinReward = (amountUSD = 0) => {
  if (!amountUSD || amountUSD <= 0) return ECONOMY_RULES.minSaveReward;
  const raw = Math.round(amountUSD / ECONOMY_RULES.saveRewardStepUSD);
  return Math.max(
    ECONOMY_RULES.minSaveReward,
    Math.min(ECONOMY_RULES.maxSaveReward, raw)
  );
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
    drops.forEach(({ anim, duration, delay }) => {
      Animated.loop(
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
      ).start();
    });
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

const TAMAGOTCHI_IDLE_VARIANTS = ["idle", "idle", "curious", "follow", "speak"];
const TAMAGOTCHI_ANIMATIONS = {
  idle: CAT_IDLE,
  curious: CAT_CURIOUS,
  follow: CAT_FOLLOWS,
  speak: CAT_SPEAKS,
  happy: CAT_HAPPY_GIF,
  happyHeadshake: CAT_HAPPY_HEADSHAKE,
  sad: CAT_SAD,
  ohno: CAT_OH_OH,
};
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
const TAMAGOTCHI_PARTY_BLUE_COST = Math.max(
  1,
  Math.round(TAMAGOTCHI_PARTY_COST / HEALTH_COIN_TIERS[1].value)
);
const TAMAGOTCHI_START_STATE = {
  hunger: 80,
  coins: 5,
  lastFedAt: null,
  lastDecayAt: null,
  coinTick: 0,
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

function AlmiTamagotchi({ override, onOverrideComplete, style }) {
  const [currentKey, setCurrentKey] = useState("idle");
  const idleTimerRef = useRef(null);
  const overrideTimerRef = useRef(null);

  const scheduleIdleCycle = useCallback(
    (delay = 4500) => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        const next =
          TAMAGOTCHI_IDLE_VARIANTS[Math.floor(Math.random() * TAMAGOTCHI_IDLE_VARIANTS.length)];
        setCurrentKey(next);
        scheduleIdleCycle(5000 + Math.random() * 3000);
      }, delay);
    },
    []
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
    const key = TAMAGOTCHI_ANIMATIONS[override.type] ? override.type : "happy";
    setCurrentKey(key);
    overrideTimerRef.current = setTimeout(() => {
      onOverrideComplete?.();
      scheduleIdleCycle(2500);
    }, override.duration || 3200);
  }, [override?.key, override?.type, override?.duration, onOverrideComplete, scheduleIdleCycle]);

  const source = TAMAGOTCHI_ANIMATIONS[currentKey] || TAMAGOTCHI_ANIMATIONS.idle;
  return (
    <View style={[styles.almiMascotWrap, style]}>
      <Image
        source={source}
        defaultSource={TAMAGOTCHI_ANIMATIONS.idle}
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
  events.forEach((event) => {
    if (!event || !event.templateId) return;
    processedEvents += 1;
    const category = event.category || "things";
    if (!categories[category]) {
      categories[category] = { save: 0, spend: 0 };
    }
    if (event.action === "save") {
      categories[category].save += 1;
    } else if (event.action === "spend") {
      categories[category].spend += 1;
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
      const title =
        (resolvedTitle ||
          entry.meta?.title ||
          entry.title ||
          entry.meta?.templateId ||
          entry.emoji ||
          entry.id ||
          (language === "ru" ? "Отказ" : "Skip"))
          .toString()
          .slice(0, 42);
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
const SHELL_HORIZONTAL_PADDING = Platform.OS === "android" ? 0 : 8;

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
  return { ru, en };
};

const createCustomHabitTemptation = (customSpend, fallbackCurrency, gender = "none") => {
  if (!customSpend?.title) return null;
  const price = resolveCustomPriceUSD(customSpend, fallbackCurrency);
  if (!price) return null;
  const title = customSpend.title;
  const description = buildCustomTemptationDescription(gender);
  return {
    id: customSpend.id || "custom_habit",
    emoji: customSpend.emoji || "💡",
    color: "#FFF5E6",
    categories: ["habit", "custom"],
    basePriceUSD: price,
    priceUSD: price,
    title: {
      ru: title,
      en: title,
    },
    description,
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
  if (hasValidCustomPrice(entry)) return entry;
  const rebuilt = createCustomHabitTemptation(entry, fallbackCurrency, entry?.gender || "none");
  if (!rebuilt) return null;
  const merged = { ...rebuilt, ...entry };
  merged.priceUSD = rebuilt.priceUSD;
  merged.basePriceUSD = rebuilt.basePriceUSD;
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

const TRANSLATIONS = {
  ru: {
    appTagline: "Витрина искушений которая помогает копить",
    heroAwaiting: "В листе желаний",
    heroSpendLine: {
      female: "Последняя экономия: «{{title}}».",
      male: "Последняя экономия: «{{title}}».",
      none: "Последняя экономия: «{{title}}».",
    },
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
    freeDayLoggedToday: "Сегодня уже засчитано",
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
    freeDayRescueNeedHealth: "Нужно {{cost}} здоровья",
    freeDayRescueNeedTime: "Доступно после 18:00",
    freeDayRescueOverlay: "Серия спасена",
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
    impulseNotificationTitle: "Импульс на {{temptation}}",
    impulseNotificationBody: "В это время ты обычно тратишься. Отправь {{amount}} в копилку и сохрани курс.",
    pendingTab: "Думаем",
    pendingTitle: "Думаем",
    pendingEmptyTitle: "В «думаем» пусто",
    pendingEmptySubtitle: "Отправляй цели в «думаем», и мы вернёмся через 14 дней.",
    pendingDaysLeft: "Осталось {{days}} д.",
    pendingExpired: "Срок вышел",
    pendingDueToday: "Реши сегодня",
    pendingActionWant: "Начать копить",
    pendingActionDecline: "Сэкономить",
    pendingNotificationTitle: "Прошло 14 дней",
    pendingNotificationBody: {
      female: "Готова решить, что делать с «{{title}}»?",
      male: "Готов решить, что делать с «{{title}}»?",
      none: "Готовы решить, что делать с «{{title}}»?",
    },
    pendingAdded: "Добавлено в «думаем». Напомним вовремя.",
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
    statsDeclines: "Отказов",
    statsFreeDays: "Серия дней",
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
    historyWishAdded: "Добавлена хотелка: {{title}}",
    historyWishProgress: "Прогресс по «{{title}}»: {{amount}} из {{target}}",
    historyWishDone: "Цель достигнута: {{title}}",
    historyDecline: "Отказ от {{title}} (+{{amount}})",
    historyRefuseSpend: "Сохранено на «{{title}}» (+{{amount}})",
    historyPendingAdded: "Отложено на 14 дней: {{title}}",
    historyPendingWant: "После паузы решили копить: {{title}}",
    historyPendingDecline: "После паузы отказ: {{title}} (+{{amount}})",
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
    historyMoodChanged: "Режим настроения: {{label}}",
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
    rewardCelebrateTitle: "Награда «{{title}}» получена!",
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
    challengeClaimedOverlay: "За челлендж «{{title}}»",
    challengeReminderTitle: "Челлендж «{{title}}»",
    challengeReminderBody: "Продолжай - совсем скоро финиш у «{{title}}».",
    challengeCancelAction: "Отменить",
    challengeAcceptConfirmTitle: "Начать челлендж?",
    challengeAcceptConfirmMessage: "Запустить «{{title}}»? Время пойдёт сразу.",
    challengeAcceptConfirmYes: "Начать",
    challengeAcceptConfirmNo: "Не сейчас",
    challengeCancelConfirmTitle: "Отменить челлендж?",
    challengeCancelConfirmMessage: "Прервать «{{title}}»? Прогресс обнулится.",
    challengeCancelConfirmYes: "Отменить",
    challengeCancelConfirmNo: "Продолжить",
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
    goalCompleteMessage: "Всё готово, погнали копить!",
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
    smartReminderTitle: "Пауза перед «{{temptation}}»",
    smartReminderBody: "Ты решил копить вместо «{{temptation}}». Хочешь удержать фокус?",
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
    quickCustomTitle: "Новое искушение",
    quickCustomSubtitle: "Опиши траты, от которых хочешь отказаться первой",
    quickCustomNameLabel: "Название",
    quickCustomAmountLabel: "Стоимость ({{currency}})",
    quickCustomEmojiLabel: "Эмодзи карточки",
    quickCustomConfirm: "Добавить",
    quickCustomCancel: "Отмена",
    fabNewGoal: "Новая цель",
    fabNewTemptation: "Новая трата",
    newGoalTitle: "Новая цель",
    newGoalSubtitle: "Как назовём мечту и сколько она стоит?",
    newGoalNameLabel: "Название цели",
    newGoalTargetLabel: "Сумма ({{currency}})",
    newGoalEmojiLabel: "Эмодзи цели",
    newGoalCreate: "Создать цель",
    newGoalCancel: "Отмена",
    tutorialFeedTitle: "Лента искушений",
    tutorialFeedDesc: "Отмечай импульсы и выбирай: копить, добавить в цели или подумать 14 дней.",
    tutorialGoalsTitle: "Цели",
    tutorialGoalsDesc: "Здесь живут мечты. Следи за прогрессом и пополняй главную цель.",
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
  },
  en: {
    appTagline: "An offline temptation board that keeps savings safe",
    heroAwaiting: "On the wish list",
    heroSpendLine: {
      female: "Latest save: “{{title}}”.",
      male: "Latest save: “{{title}}”.",
      none: "Latest save: “{{title}}”.",
    },
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
    freeDayLoggedToday: "Already logged today",
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
    freeDayRescueNeedHealth: "Need {{cost}} health",
    freeDayRescueNeedTime: "Available after 6 pm",
    freeDayRescueOverlay: "Streak rescued",
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
    impulseNotificationTitle: "Impulse for {{temptation}}",
    impulseNotificationBody: "You usually cave now. Send {{amount}} to savings instead.",
    pendingTab: "Thinking",
    pendingTitle: "Thinking",
    pendingEmptyTitle: "Nothing in Thinking",
    pendingEmptySubtitle: "Park temptations in Thinking and we’ll remind you in 14 days.",
    pendingDaysLeft: "{{days}} days left",
    pendingExpired: "Decision overdue",
    pendingDueToday: "Decide today",
    pendingActionWant: "Start saving",
    pendingActionDecline: "Save it",
    pendingNotificationTitle: "14 days passed",
    pendingNotificationBody: "Ready to decide what to do with “{{title}}”?",
    pendingAdded: "Sent to Thinking. We’ll remind you in 2 weeks.",
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
    freeDayLoggedToday: "Already logged today",
    freeDayConfirm: "Stayed away from impulse buys today?",
    freeDayCongrats: "{{days}} day streak! Budget loves it.",
    freeDayMilestone: "{{days}} days in a row! New badge unlocked.",
    freeDayStreakLabel: "Free-day streak",
    freeDayTotalLabel: "Total: {{total}}",
    statsSpent: "Finished goals",
    statsSaved: "Saved",
    statsItems: "Goals",
    statsCart: "In list",
    statsDeclines: "Declines",
    statsFreeDays: "Streak",
    analyticsTitle: "Progress",
    analyticsPendingToBuy: "Wishes",
    analyticsPendingToDecline: "Declines",
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
    historyWishAdded: "Wish added: {{title}}",
    historyWishProgress: "Progress “{{title}}”: {{amount}} of {{target}}",
    historyWishDone: "Goal completed: {{title}}",
    historyDecline: "Declined {{title}} (+{{amount}} saved)",
    historyRefuseSpend: "Skipped {{title}} (+{{amount}} saved)",
    historyPendingAdded: "Queued for later: {{title}}",
    historyPendingWant: "Later decision → saving: {{title}}",
    historyPendingDecline: "Later decision → decline: {{title}} (+{{amount}})",
    historyFreeDay: "Free day #{{total}}",
    historySpend: "Spent on {{title}} (-{{amount}})",
    historyWishRemoved: "Goal removed: {{title}}",
    historyGoalStarted: "Goal started: {{title}}",
    historyGoalCancelled: "Goal cancelled: {{title}}",
    historyRewardClaimed: "Reward claimed: {{title}}",
    historyMoodChanged: "Mood mode: {{label}}",
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
    rewardCelebrateTitle: "“{{title}}” unlocked!",
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
    challengeClaimedOverlay: "Challenge “{{title}}”",
    challengeReminderTitle: "Challenge “{{title}}”",
    challengeReminderBody: "You're close to finishing “{{title}}”. Keep going!",
    challengeCancelAction: "Cancel",
    challengeAcceptConfirmTitle: "Start challenge?",
    challengeAcceptConfirmMessage: "Kick off “{{title}}”? The timer starts right away.",
    challengeAcceptConfirmYes: "Start",
    challengeAcceptConfirmNo: "Not now",
    challengeCancelConfirmTitle: "Cancel this challenge?",
    challengeCancelConfirmMessage: "Stop “{{title}}”? All progress will reset.",
    challengeCancelConfirmYes: "Cancel",
    challengeCancelConfirmNo: "Keep going",
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
    goalCompleteMessage: "You’re set. Let’s start saving!",
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
    smartReminderTitle: "Pause before “{{temptation}}”",
    smartReminderBody: "You planned to save instead of “{{temptation}}”. Stay on track?",
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
    quickCustomTitle: "Add temptation",
    quickCustomSubtitle: "Name the impulse and set a price to add it to the deck",
    quickCustomNameLabel: "Name",
    quickCustomAmountLabel: "Cost ({{currency}})",
    quickCustomEmojiLabel: "Card emoji",
    quickCustomConfirm: "Add",
    quickCustomCancel: "Cancel",
    fabNewGoal: "New goal",
    fabNewTemptation: "New spend",
    newGoalTitle: "New goal",
    newGoalSubtitle: "Name the dream and set its target.",
    newGoalNameLabel: "Goal name",
    newGoalTargetLabel: "Target ({{currency}})",
    newGoalEmojiLabel: "Goal emoji",
    newGoalCreate: "Create goal",
    newGoalCancel: "Cancel",
    tutorialFeedTitle: "Temptation feed",
    tutorialFeedDesc: "Log every impulse and choose: save it, add to goals, or park it for 14 days.",
    tutorialGoalsTitle: "Goals",
    tutorialGoalsDesc: "All dreams live here — track progress and refill your primary goal.",
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
  },
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
};

const FREE_DAY_MILESTONES = [3, 7, 30];
const HEALTH_PER_REWARD = ECONOMY_RULES.baseAchievementReward;
const FREE_DAY_RESCUE_COST = ECONOMY_RULES.freeDayRescueCost;

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

const formatCurrency = (value = 0, currency = activeCurrency) => {
  const locale = CURRENCY_LOCALES[currency] || "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value || 0);
  } catch {
    const symbol = currency === "EUR" ? "€" : currency === "RUB" ? "₽" : "$";
    return `${symbol}${Number(value || 0).toLocaleString(locale)}`;
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
  const rgbMatch = value.match(/^rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)$/i);
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

const getTierProgress = (savedUSD = 0) => {
  let previousTarget = 0;
  for (let i = 0; i < SAVINGS_TIERS.length; i += 1) {
    const target = SAVINGS_TIERS[i];
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
    level: SAVINGS_TIERS.length + 1,
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

function TemptationCard({
  item,
  language,
  colors,
  onAction,
  t,
  currency = activeCurrency,
  stats = {},
  feedback,
  titleOverride,
  goalLabel = null,
  isWishlistGoal = false,
  onToggleEdit,
  isEditing = false,
  editTitleValue = "",
  editPriceValue = "",
  editGoalLabel = "",
  editEmojiValue = "",
  onEditTitleChange,
  onEditPriceChange,
  onEditEmojiChange,
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
  const desc = item.description?.[language] || item.description?.en || "";
  const priceUSD = item.priceUSD || item.basePriceUSD || 0;
  const priceLabel = formatCurrency(convertToCurrency(priceUSD, currency), currency);
  const highlight = true;
  const isDarkTheme = colors.background === THEMES.dark.background;
  const baseColor = item.color || colors.card;
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
  const baseCardBackground = isDarkTheme ? darkCardPalette.background : baseColor;
  const cardBackground = baseCardBackground;
  const primaryHighlightColor = "#FF4D5A";
  const cardTextColor = isDarkTheme ? darkCardPalette.text : colors.text;
  const cardMutedColor = isDarkTheme ? darkCardPalette.muted : colors.muted;
  const resolvedGoalLabel =
    typeof goalLabel === "string" && goalLabel.trim().length ? goalLabel.trim() : "";
  const coinBurstColor = isDarkTheme ? "#FFD78B" : "#FFF4B3";
  const effectiveWishlistGoal = isWishlistGoal && !isPrimaryTemptation;
  const highlightPinned = effectiveWishlistGoal && !showEditorInline;
  const cardBorderColor = isPrimaryTemptation
    ? primaryHighlightColor
    : highlightPinned
    ? GOAL_HIGHLIGHT_COLOR
    : isDarkTheme
    ? darkCardPalette.border
    : highlight
    ? colors.text
    : "transparent";
  const borderWidth = isPrimaryTemptation ? 3 : highlight ? 2 : 1;
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
        onStartShouldSetPanResponder: () => !showEditorInline,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !showEditorInline &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 6,
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
          cardStyle,
          {
            backgroundColor: cardBackground,
            borderColor: cardBorderColor,
            borderWidth,
            transform: [{ translateX }],
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={handleCardPress}>
          <View>
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
      {desc ? (
        <Text style={[styles.temptationDesc, { color: isDarkTheme ? "#FFFFFF" : cardMutedColor }]}>
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
              { color: isDarkTheme ? "#FFFFFF" : colors.text },
            ]}
          >
            {priceLabel}
          </Text>
        )}
      </View>
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
}) {
  const [expanded, setExpanded] = useState(false);
  const streakActive = (freeDayStats.current || 0) > 0;
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
  const subtitle = streakActive
    ? t("freeDayActiveLabel", { days: freeDayStats.current })
    : t("freeDayInactiveLabel");
  const stats = [
    { label: t("freeDayCurrentLabel"), value: `${freeDayStats.current || 0}` },
    { label: t("freeDayBestLabel"), value: `${freeDayStats.best || 0}` },
    { label: t("freeDayTotalShort"), value: `${freeDayStats.total || 0}` },
  ];
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
        <View style={styles.freeDayHeaderText}>
          <Text style={[styles.freeDayLabel, { color: colors.muted }]}>{t("freeDayCardTitle")}</Text>
          <Text
            style={[
              styles.freeDayValue,
              !streakActive && styles.freeDayValueInactive,
              { color: palette.accent },
            ]}
          >
            {subtitle}
          </Text>
        </View>
        {canLog ? (
          <TouchableOpacity
            style={[styles.freeDayButton, { backgroundColor: buttonColor }]}
            onPress={onLog}
          >
            <Text style={styles.freeDayButtonText}>{t("freeDayButton")}</Text>
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.freeDayLockedPill,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Text style={[styles.freeDayLockedText, { color: colors.muted }]}>
              {freeDayStats.lastDate === todayKey ? t("freeDayLoggedToday") : t("freeDayLocked")}
            </Text>
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

function FeedScreen({
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
  onTemptationEditTitleChange,
  onTemptationEditPriceChange,
  onTemptationEditEmojiChange,
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
}) {
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
  const latestSaving = useMemo(
    () => historyEvents.find((entry) => entry.kind === "refuse_spend"),
    [historyEvents]
  );
  const heroSpendCopy = useMemo(() => {
    const resolvedLatestTitle = resolveTemplateTitle(
      latestSaving?.meta?.templateId,
      latestSaving?.meta?.title
    );
    if (resolvedLatestTitle) {
      return t("heroSpendLine", { title: resolvedLatestTitle });
    }
    if (!realSavedUSD || realSavedUSD <= 0) {
      return t("heroSpendFallback");
    }
    const template = personaPreset?.tagline?.[language];
    if (template) {
      return template.replace("{{amount}}", totalSavedLabel);
    }
    return t("heroSpendFallback");
  }, [realSavedUSD, totalSavedLabel, personaPreset, language, t, latestSaving, resolveTemplateTitle]);
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
  const mainTemptationId = useMemo(() => {
    if (!profile?.customSpend) return null;
    return profile.customSpend.id || "custom_habit";
  }, [profile?.customSpend]);
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
  const tierInfo = getTierProgress(savedTotalUSD || 0);
  const span = Math.max(
    (tierInfo.nextTargetUSD ?? tierInfo.prevTargetUSD ?? 1) -
      (tierInfo.prevTargetUSD ?? 0),
    1
  );
  const previousTierInfo = useRef(tierInfo.level);
  const tierProgress = tierInfo.nextTargetUSD
    ? (savedTotalUSD - tierInfo.prevTargetUSD) / span
    : 1;
  const heroLevelHasNext = !!tierInfo.nextTargetUSD;
  const heroLevelCurrency = profile?.currency || DEFAULT_PROFILE.currency;
  const heroLevelRemainingUSD = heroLevelHasNext
    ? Math.max(tierInfo.nextTargetUSD - savedTotalUSD, 0)
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
    ? Math.max(tierInfo.nextTargetUSD - savedTotalUSD, 0)
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
  const isEvening = new Date().getHours() >= 18;
  const canLogFreeDay = isEvening && freeDayStats.lastDate !== todayKey;
  const streakNeedsRescue =
    freeDayStats.current > 0 &&
    freeDayStats.lastDate === dayBeforeYesterdayKey &&
    freeDayStats.lastDate !== todayKey;
  const hasRescueHealth = healthPoints >= freeDayRescueCost;
  const canRescueFreeDay = isEvening && streakNeedsRescue && hasRescueHealth;
  const rescueStatus = !streakNeedsRescue
    ? null
    : !hasRescueHealth
    ? t("freeDayRescueNeedHealth", { cost: freeDayRescueCost })
    : !isEvening
    ? t("freeDayRescueNeedTime")
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
    const ordered = entries.sort((a, b) => {
      const priceDiff = getTemptationPrice(a) - getTemptationPrice(b);
      if (priceDiff !== 0) {
        return priceDiff;
      }
      return (a.id || "").localeCompare(b.id || "");
    });
    if (primaryCard) ordered.unshift(primaryCard);
    return ordered;
  }, [products, mainTemptationId]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return orderedProducts;
    return orderedProducts.filter((product) => product.categories?.includes(activeCategory));
  }, [activeCategory, orderedProducts]);
  const analyticsPreview = analyticsStats.slice(0, 3);
  const freeDayEventKeys = useMemo(() => {
    const keys = new Set();
    historyEvents.forEach((entry) => {
      if (entry.kind === "free_day") {
        keys.add(getDayKey(entry.timestamp));
      }
    });
    return keys;
  }, [historyEvents]);
  const weekLabels = WEEKDAY_LABELS[language] || WEEKDAY_LABELS.en;
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
    historyEvents.forEach((entry) => {
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
      const label = WEEKDAY_LABELS[language]?.[weekdayIndex] || WEEKDAY_LABELS.en[weekdayIndex];
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
  }, [currency, historyEvents, language, todayTimestamp]);
  const showImpulseCard = useMemo(() => hasImpulseHistory(impulseInsights), [impulseInsights]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }] }>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160, paddingTop: 4 }}
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
                  <TouchableOpacity onPress={onMascotPress} activeOpacity={0.9}>
                    <AlmiTamagotchi
                      style={heroMascotWrapStyle}
                      override={mascotOverride}
                      onOverrideComplete={onMascotAnimationComplete}
                    />
                  </TouchableOpacity>
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
        renderItem={({ item }) => {
          const assignedGoalId = goalAssignments?.[item.id];
          const assignedGoal =
            assignedGoalId && (wishes || []).find((wish) => wish.id === assignedGoalId);
          const wishlistEntry = (wishes || []).find(
            (wish) => wish.templateId === item.id && wish.pinnedSource === "swipe"
          );
          const isWishlistGoal = !!wishlistEntry;
          return (
            <TemptationCard
              item={item}
              language={language}
              colors={colors}
              t={t}
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
              onEditTitleChange={onTemptationEditTitleChange}
              onEditPriceChange={onTemptationEditPriceChange}
              onEditEmojiChange={onTemptationEditEmojiChange}
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
        }}
      />
    </SafeAreaView>
  );
}

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

function WishListScreen({
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
}) {
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
          <Image source={CAT_CURIOUS} style={[styles.catImage, styles.catImageLarge]} />
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
}

function PendingScreen({ items, currency, t, colors, onResolve, language }) {
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.decisionDue || 0) - (b.decisionDue || 0)),
    [items]
  );

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
          <Image source={CAT_CURIOUS} style={[styles.catImage, styles.catImageLarge]} />
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
        const diff = (item.decisionDue || 0) - Date.now();
        const countdownLabel = formatCountdown(diff);
        const overdue = diff <= 0;
        const priceLabel = formatCurrency(convertToCurrency(item.priceUSD || 0, currency), currency);
        return (
          <View
            key={item.id}
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
        );
      })}
    </ScrollView>
  );
}

const ACHIEVEMENT_METRIC_TYPES = {
  SAVED_AMOUNT: "SAVED_AMOUNT",
  FREE_DAYS_TOTAL: "FREE_DAYS_TOTAL",
  FREE_DAYS_STREAK: "FREE_DAYS_STREAK",
  REFUSE_COUNT: "REFUSE_COUNT",
  FRIDGE_ITEMS_COUNT: "FRIDGE_ITEMS_COUNT",
  FRIDGE_DECISIONS: "FRIDGE_DECISIONS",
};

const ACHIEVEMENT_DEFS = [
  {
    id: "saved_50",
    metricType: ACHIEVEMENT_METRIC_TYPES.SAVED_AMOUNT,
    targetValue: 50,
    emoji: "💾",
    rewardHealth: 40,
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
    metricType: ACHIEVEMENT_METRIC_TYPES.FREE_DAYS_TOTAL,
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
    return {
      id: def.id,
      emoji: def.emoji,
      title: copy.title || "",
      description,
      rewardHealth: def.rewardHealth,
      rewardLabel: formatHealthRewardLabel(def.rewardHealth, language),
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

function RewardsScreen({
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
            <Text style={[styles.challengeTitle, { color: colors.text }]}>{challenge.title}</Text>
            <Text style={[styles.challengeDesc, { color: colors.muted }]}>{challenge.description}</Text>
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
}

function ProfileScreen({
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
}) {
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
      case "mood_changed":
        return t("historyMoodChanged", { label: meta.label || meta.moodId || t("historyUnknown") });
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
                  source={profile.avatar ? { uri: profile.avatar } : CAT_IMAGE}
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
              <Text style={[styles.profileSubtitle, { color: colors.muted }]}>{joinDateLabel}</Text>
            )}
            <Text style={[styles.profileBio, { color: colors.muted }]}>{profile.bio}</Text>
          </>
        )}

          <View style={styles.profileStatsRow}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { color: colors.text }]}>{stat.value}</Text>
                <Text style={[styles.profileStatLabel, { color: colors.muted }]}>
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
      </ScrollView>
    </View>
  );
}

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
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("feed");
  const [catalogOverrides, setCatalogOverrides] = useState({});
  const [titleOverrides, setTitleOverrides] = useState({});
  const [emojiOverrides, setEmojiOverrides] = useState({});
  const [temptations, setTemptations] = useState(DEFAULT_TEMPTATIONS);
  const [quickTemptations, setQuickTemptations] = useState([]);
  const [hiddenTemptations, setHiddenTemptations] = useState([]);
  const [priceEditor, setPriceEditor] = useState({ item: null, value: "", title: "", emoji: "" });
  const [customReminderId, setCustomReminderId] = useState(null);
  const [savedTotalUSD, setSavedTotalUSD] = useState(0);
  const [savedTotalHydrated, setSavedTotalHydrated] = useState(false);
  const [declineCount, setDeclineCount] = useState(0);
  const [pendingList, setPendingList] = useState([]);
  const [freeDayStats, setFreeDayStats] = useState({ ...INITIAL_FREE_DAY_STATS });
  const [healthPoints, setHealthPoints] = useState(0);
  const [claimedRewards, setClaimedRewards] = useState({});
  const [challengesState, setChallengesState] = useState(() => createInitialChallengesState());
  const [rewardsPane, setRewardsPane] = useState("challenges");
  const [decisionStats, setDecisionStats] = useState({ ...INITIAL_DECISION_STATS });
  const [historyEvents, setHistoryEvents] = useState([]);
  const declineStreak = useMemo(() => computeRefuseStreak(historyEvents), [historyEvents]);
  const [pendingGoalTargets, setPendingGoalTargets] = useState(null);
  const [savingsBreakdownVisible, setSavingsBreakdownVisible] = useState(false);
  const products = temptations;
  const [activeCategory, setActiveCategory] = useState("all");
  const [profile, setProfile] = useState(() => ({
    ...DEFAULT_PROFILE_PLACEHOLDER,
    joinedAt: new Date().toISOString(),
  }));
  const [profileDraft, setProfileDraft] = useState(() => ({
    ...DEFAULT_PROFILE_PLACEHOLDER,
    joinedAt: new Date().toISOString(),
  }));
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("ru");
  const resolveTemplateTitle = useCallback(
    (templateId, fallback = null) => {
      if (!templateId) return fallback;
      const findInList = (list) => (list || []).find((card) => card?.id === templateId);
      const source =
        findInList(quickTemptations) || findInList(temptations) || findTemplateById(templateId);
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
    [language, quickTemptations, temptations]
  );
  const [overlay, setOverlay] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const overlayTimer = useRef(null);
  const overlayQueueRef = useRef([]);
  const overlayActiveRef = useRef(false);
  const [dailySummaryVisible, setDailySummaryVisible] = useState(false);
  const [dailySummaryData, setDailySummaryData] = useState(null);
  const [dailySummarySeenKey, setDailySummarySeenKey] = useState(null);
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
    [dismissGoalRenewalPrompt, mainGoalWish?.status, profile.goalCelebrated]
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
  const tamagotchiModalAnim = useRef(new Animated.Value(0)).current;
  const partyGlow = useRef(new Animated.Value(0)).current;
  const [partyActive, setPartyActive] = useState(false);
  const [partyBurstKey, setPartyBurstKey] = useState(0);
  const saveActionLogRef = useRef([]);
  const cartBadgeScale = useRef(new Animated.Value(1)).current;
  const [onboardingStep, setOnboardingStep] = useState("logo");
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
  });
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
  const openTamagotchiOverlay = useCallback(() => setTamagotchiVisible(true), []);
  const closeTamagotchiOverlay = useCallback(() => setTamagotchiVisible(false), []);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const fabMenuAnim = useRef(new Animated.Value(0)).current;
  const tamagotchiMood = useMemo(
    () => getTamagotchiMood(tamagotchiState.hunger, language),
    [tamagotchiState.hunger, language]
  );
  const tamagotchiHungerPercent = useMemo(
    () => Math.min(TAMAGOTCHI_MAX_HUNGER, Math.max(0, tamagotchiState.hunger)),
    [tamagotchiState.hunger]
  );
  const tamagotchiCoins = healthPoints;
  const [newGoalModal, setNewGoalModal] = useState({
    visible: false,
    name: "",
    target: "",
    emoji: DEFAULT_GOAL_EMOJI,
    makePrimary: false,
  });
  const openNewGoalModal = useCallback(
    (makePrimary = false) =>
      setNewGoalModal({
        visible: true,
        name: "",
        target: "",
        emoji: DEFAULT_GOAL_EMOJI,
        makePrimary,
      }),
    []
  );
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
    triggerHaptic();
    if (fabMenuVisible) {
      closeFabMenu();
    } else {
      openFabMenu();
    }
  }, [closeFabMenu, fabMenuVisible, openFabMenu, triggerHaptic]);
  const imagePickerResolver = useRef(null);
  const [refuseStats, setRefuseStats] = useState({});
  const [impulseTracker, setImpulseTracker] = useState({ ...INITIAL_IMPULSE_TRACKER });
  const [moodState, setMoodState] = useState(() => createMoodStateForToday());
  const [cardFeedback, setCardFeedback] = useState({});
  const [moodHydrated, setMoodHydrated] = useState(false);
  const editOverlayAnim = useRef(new Animated.Value(0)).current;
  const [editOverlayVisible, setEditOverlayVisible] = useState(false);
  const cardFeedbackTimers = useRef({});
  const impulseAlertCooldownRef = useRef({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [spendPrompt, setSpendPrompt] = useState({ visible: false, item: null });
  const [stormActive, setStormActive] = useState(false);
  const tabBarBottomInset = Platform.OS === "ios" ? 28 : 0;
  const topSafeInset = Platform.OS === "android" ? RNStatusBar.currentHeight || 24 : 0;
  const [analyticsOptOut, setAnalyticsOptOutState] = useState(null);

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
        historyEvents,
        profile.currency || DEFAULT_PROFILE.currency,
        resolveTemplateTitle,
        language
      ),
    [historyEvents, profile.currency, resolveTemplateTitle, language]
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
  const t = (key, replacements = {}) => {
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
    let text = raw;
    if (text === undefined || text === null) {
      text = key;
    }
    text = String(text);
    Object.entries(replacements).forEach(([token, value]) => {
      text = text.replace(`{{${token}}}`, value);
    });
    return text;
  };
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
  const lastMoodLoggedRef = useRef(null);
  useEffect(() => {
    if (!moodPreset || !currentMood) return;
    if (lastMoodLoggedRef.current === currentMood) return;
    if (lastMoodLoggedRef.current !== null) {
      logHistoryEvent("mood_changed", {
        moodId: currentMood,
        label: moodPreset.label || currentMood,
      });
    }
    lastMoodLoggedRef.current = currentMood;
  }, [currentMood, moodPreset?.label, logHistoryEvent]);
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
    const mappedEvents = mapHistoryEventsToMoodEvents(historyEvents, now);
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
  }, [historyEvents, pendingList.length]);

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

  useEffect(() => {
    schedulePersonalTemptationReminder(profile.customSpend);
  }, [profile.customSpend, schedulePersonalTemptationReminder]);

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
    const newlyCompleted = [];
    Object.keys(challengesState).forEach((id) => {
      const previousStatus = prev[id]?.status;
      const nextStatus = challengesState[id]?.status;
      if (nextStatus === CHALLENGE_STATUS.COMPLETED && previousStatus !== CHALLENGE_STATUS.COMPLETED) {
        newlyCompleted.push(id);
      }
    });
    newlyCompleted.forEach((challengeId) => {
      const def = CHALLENGE_DEF_MAP[challengeId];
      if (!def) return;
      const copy = getChallengeCopy(def, language);
      const title = copy.title || challengeId;
      triggerOverlayState("reward", t("challengeCompletedOverlay", { title }));
      logEvent("challenge_completed", { challenge_id: challengeId });
    });
    challengesPrevRef.current = challengesState;
  }, [challengesState, language, t, triggerOverlayState, logEvent]);

  useEffect(() => {
    impulseAlertCooldownRef.current = impulseTracker.lastAlerts || {};
  }, [impulseTracker.lastAlerts]);


  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    if (Platform.OS !== "android") return;
    const targetNavColor = systemOverlayActive ? overlaySystemColor : colors.card;
    const targetButtonStyle = systemOverlayActive ? "light" : isDarkTheme ? "light" : "dark";
    const targetStatusColor = systemOverlayActive ? overlaySystemColor : colors.background;
    const targetNavVisibility = systemOverlayActive ? "hidden" : "visible";
    const applyNav = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(targetNavColor);
        await NavigationBar.setButtonStyleAsync(targetButtonStyle);
        await NavigationBar.setVisibilityAsync(targetNavVisibility);
      } catch (err) {
        console.warn("navigation bar color", err);
      }
    };
    applyNav();
    RNStatusBar.setBackgroundColor(targetStatusColor, true);
  }, [colors.card, colors.background, isDarkTheme, overlayDimColor, overlaySystemColor, systemOverlayActive]);
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
        logEvent("goal_completed", {
          goal_id: completedGoalMeta.goalId,
          wish_id: completedGoalMeta.wishId,
          template_id: completedGoalMeta.templateId,
        });
      }
      return applied;
    },
    [syncPrimaryGoalProgress, logEvent]
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

  const wishCount = wishes.length;
  const profileStats = useMemo(() => {
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const totalSavedConverted = formatCurrency(
      convertToCurrency(savedTotalUSD, currencyCode),
      currencyCode
    );
    return [
      { label: t("statsSaved"), value: totalSavedConverted },
      { label: t("statsItems"), value: `${wishCount}` },
      { label: t("statsDeclines"), value: `${declineCount}` },
      { label: t("statsFreeDays"), value: `${freeDayStats.current}🔥` },
    ];
  }, [savedTotalUSD, wishCount, declineCount, freeDayStats.current, t, profile.currency]);

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

  useEffect(() => {
    if (!impulseInsights.activeRisk) return;
    notifyImpulseRisk(impulseInsights.activeRisk);
  }, [impulseInsights.activeRisk, notifyImpulseRisk]);

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
      const title = t("smartReminderTitle", { temptation: customSpend.title });
      const body = t("smartReminderBody", { temptation: customSpend.title });
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
    [customReminderId, ensureNotificationPermission, persistCustomReminderId, t]
  );

  const loadStoredData = async () => {
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
        savedTotalRaw,
        declinesRaw,
        freeDayRaw,
        decisionStatsRaw,
        historyRaw,
        refuseStatsRaw,
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
        tamagotchiRaw,
        dailySummaryRaw,
        tutorialRaw,
        termsAcceptedRaw,
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
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_TOTAL),
        AsyncStorage.getItem(STORAGE_KEYS.DECLINES),
        AsyncStorage.getItem(STORAGE_KEYS.FREE_DAY),
        AsyncStorage.getItem(STORAGE_KEYS.DECISION_STATS),
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.REFUSE_STATS),
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
        AsyncStorage.getItem(STORAGE_KEYS.TAMAGOTCHI),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_SUMMARY),
        AsyncStorage.getItem(STORAGE_KEYS.TUTORIAL),
        AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTED),
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
        parsedProfile.primaryGoals = normalizedPrimaryGoals;
        parsedProfile.goal = normalizedPrimaryGoals[0]?.id || DEFAULT_PROFILE.goal;
        const activeTargetEntry = normalizedPrimaryGoals[0];
        const activeTargetUSD =
          Number.isFinite(activeTargetEntry?.targetUSD) && activeTargetEntry.targetUSD > 0
            ? activeTargetEntry.targetUSD
            : getGoalDefaultTargetUSD(parsedProfile.goal || activeTargetEntry?.id || DEFAULT_PROFILE.goal);
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
      }
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
          setTamagotchiState({
            ...TAMAGOTCHI_START_STATE,
            ...parsed,
            hunger: parsedHunger,
            coins: parsedCoins,
            lastDecayAt: parsed?.lastDecayAt || Date.now(),
            coinTick: Math.max(0, Number(parsed?.coinTick) || 0),
          });
          if (!healthRaw) {
            setHealthPoints(parsedCoins);
          }
        } catch (err) {
          setTamagotchiState({ ...TAMAGOTCHI_START_STATE });
        }
      }
      if (themeRaw) setTheme(themeRaw);
      if (languageRaw) setLanguage(languageRaw);
      setActiveGoalId(parsedProfile?.goal || DEFAULT_PROFILE.goal);
      if (dailySummaryRaw) setDailySummarySeenKey(dailySummaryRaw);
      setTutorialSeen(tutorialRaw === "pending" ? false : true);
      if (termsAcceptedRaw === "1") {
        setTermsAccepted(true);
      }
      if (catalogRaw) setCatalogOverrides(JSON.parse(catalogRaw));
      if (titleRaw) setTitleOverrides(JSON.parse(titleRaw));
      if (emojiOverridesRaw) setEmojiOverrides(JSON.parse(emojiOverridesRaw));
      if (savedTotalRaw) {
        setSavedTotalUSD(Number(savedTotalRaw) || 0);
      } else {
        setSavedTotalUSD(0);
      }
      setSavedTotalHydrated(true);
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
        setHealthPoints(Number(healthRaw) || 0);
      } else {
        setHealthPoints(0);
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
      }
    } catch (error) {
      console.warn("load error", error);
      setAnalyticsOptOutState((prev) => (prev === null ? false : prev));
    } finally {
      setWishesHydrated(true);
      setSavedTotalHydrated(true);
      setRewardsReady(true);
      setMoodHydrated(true);
    }
  };

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    if (onboardingStep !== "done") return;
    if (tutorialSeen) return;
    if (!APP_TUTORIAL_STEPS.length) return;
    setTutorialStepIndex(0);
    setTutorialVisible(true);
  }, [onboardingStep, tutorialSeen]);

  useEffect(() => {
    if (onboardingStep !== "done") return;
    const hour = new Date().getHours();
    if (hour < 20) return;
    const todayKey = getDayKey(Date.now());
    if (dailySummarySeenKey === todayKey) return;
    const todayEvents = historyEvents.filter((e) => getDayKey(e.timestamp) === todayKey);
    if (!todayEvents.length) return;
    const savedUSD = todayEvents
      .filter((e) => e.kind === "refuse_spend")
      .reduce((sum, e) => sum + (Number(e.meta?.amountUSD) || 0), 0);
    const declines = todayEvents.filter((e) => e.kind === "refuse_spend").length;
    const thinking = todayEvents.filter((e) => e.kind === "pending_added").length;
    setDailySummaryData({ savedUSD, declines, thinking, todayKey });
    setDailySummaryVisible(true);
    setDailySummarySeenKey(todayKey);
    AsyncStorage.setItem(STORAGE_KEYS.DAILY_SUMMARY, todayKey).catch(() => {});
  }, [dailySummarySeenKey, historyEvents, onboardingStep]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTamagotchiState((prev) => {
        const now = Date.now();
        const last = prev.lastDecayAt || now;
        const elapsed = Math.max(0, now - last);
        const ticks = Math.floor(elapsed / TAMAGOTCHI_DECAY_INTERVAL_MS);
        if (ticks <= 0) {
          return { ...prev, lastDecayAt: now };
        }
        const hungerDrop = ticks * TAMAGOTCHI_DECAY_STEP;
        const nextHunger = Math.max(0, prev.hunger - hungerDrop);
        const totalTicks = prev.coinTick + ticks;
        const coinsToBurn = Math.floor(totalTicks / TAMAGOTCHI_COIN_DECAY_TICKS);
        const nextCoinTick = totalTicks % TAMAGOTCHI_COIN_DECAY_TICKS;
        if (coinsToBurn > 0) {
          setHealthPoints((coins) => Math.max(0, coins - coinsToBurn));
        }
        return {
          ...prev,
          hunger: nextHunger,
          lastDecayAt: last + ticks * TAMAGOTCHI_DECAY_INTERVAL_MS,
          coinTick: nextCoinTick,
        };
      });
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [setHealthPoints]);

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
    AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)).catch(() => {});
  }, [profile]);

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
    AsyncStorage.setItem(STORAGE_KEYS.HEALTH, String(healthPoints)).catch(() => {});
  }, [healthPoints]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CLAIMED_REWARDS, JSON.stringify(claimedRewards)).catch(() => {});
  }, [claimedRewards]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(challengesState)).catch(() => {});
  }, [challengesState]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.TAMAGOTCHI, JSON.stringify(tamagotchiState)).catch(() => {});
  }, [tamagotchiState]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalogOverrides)).catch(() => {});
  }, [catalogOverrides]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.TITLE_OVERRIDES, JSON.stringify(titleOverrides)).catch(() => {});
  }, [titleOverrides]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.EMOJI_OVERRIDES, JSON.stringify(emojiOverrides)).catch(() => {});
  }, [emojiOverrides]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.SAVED_TOTAL, String(savedTotalUSD)).catch(() => {});
  }, [savedTotalUSD]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.DECLINES, String(declineCount)).catch(() => {});
  }, [declineCount]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.PENDING, JSON.stringify(pendingList)).catch(() => {});
  }, [pendingList]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.FREE_DAY, JSON.stringify(freeDayStats)).catch(() => {});
  }, [freeDayStats]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.REFUSE_STATS, JSON.stringify(refuseStats)).catch(() => {});
  }, [refuseStats]);

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
    if (!rewardsReady || !rewardCelebratedHydrated || !achievements.length) return;
    const newlyUnlocked = achievements.filter(
      (reward) => reward.unlocked && !rewardCelebratedMap[reward.id]
    );
    if (!newlyUnlocked.length) return;
    setRewardCelebratedMap((prev) => {
      const next = { ...prev };
      newlyUnlocked.forEach((reward) => {
        next[reward.id] = true;
      });
      return next;
    });
    triggerOverlayState("reward", newlyUnlocked[0].title);
  }, [achievements, rewardCelebratedMap, rewardCelebratedHydrated, rewardsReady]);

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
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyEvents)).catch(() => {});
  }, [historyEvents]);

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
    const nextList = DEFAULT_TEMPTATIONS.map((item) => ({
      ...item,
      priceUSD: catalogOverrides[item.id] ?? item.basePriceUSD,
      titleOverride: titleOverrides[item.id] || null,
      emoji: emojiOverrides[item.id] || item.emoji,
    })).sort(
      (a, b) =>
        (a.priceUSD ?? a.basePriceUSD ?? 0) - (b.priceUSD ?? b.basePriceUSD ?? 0)
    );
    const personalized = buildPersonalizedTemptations(profile, nextList).map((card) => ({
      ...card,
      titleOverride: titleOverrides[card.id] ?? card.titleOverride ?? null,
      emoji: emojiOverrides[card.id] || card.emoji,
    }));
    const hiddenSet = new Set(hiddenTemptations);
    const personalizedVisible = personalized.filter((card) => !hiddenSet.has(card.id));
    const personalizedIds = new Set(personalizedVisible.map((c) => c.id));
    const quickAdjusted = quickTemptations
      .filter((card) => card && !hiddenSet.has(card.id) && !personalizedIds.has(card.id))
      .map((card) => ({
        ...card,
        priceUSD: catalogOverrides[card.id] ?? card.priceUSD ?? card.basePriceUSD,
        titleOverride: titleOverrides[card.id] ?? card.titleOverride ?? null,
        emoji: emojiOverrides[card.id] || card.emoji,
      }));
    // Быстрая кастомная карта всегда рендерится первой, затем идёт персонализированный порядок.
    const combined = [...quickAdjusted, ...personalizedVisible];

    setTemptations(combined);
  }, [
    catalogOverrides,
    profile,
    titleOverrides,
    emojiOverrides,
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

  const handleCategorySelect = (category) => {
    triggerHaptic();
    setActiveCategory(category);
  };

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

  const handleQuickCustomChange = (field, value) => {
    setQuickSpendDraft((prev) => ({
      ...prev,
      [field]: field === "emoji" ? limitEmojiInput(value) : value,
    }));
  };

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
    const newCustom = {
      title: customData.title.trim(),
      amountUSD,
      currency: currencyCode,
      emoji: emojiValue,
      id: customData.id || `custom_habit_${Date.now()}`,
      gender: ownerGender,
    };
    const card = createCustomHabitTemptation(newCustom, currencyCode, ownerGender);
    if (card) {
      card.gender = ownerGender;
      setQuickTemptations((prev) => [card, ...prev]);
    }
    logEvent("custom_temptation_created", {
      title: newCustom.title,
      amount_usd: amountUSD,
      currency: currencyCode,
    });
    setQuickSpendDraft({ title: "", amount: "", emoji: DEFAULT_TEMPTATION_EMOJI });
    setShowCustomSpend(false);
    triggerOverlayState("custom_temptation", newCustom.title);
  };

  const handleQuickCustomCancel = () => {
    setQuickSpendDraft({ title: "", amount: "", emoji: DEFAULT_TEMPTATION_EMOJI });
    setShowCustomSpend(false);
  };

  const handleFabNewTemptation = useCallback(() => {
    triggerHaptic();
    closeFabMenu();
    setQuickSpendDraft({ title: "", amount: "", emoji: DEFAULT_TEMPTATION_EMOJI });
    setShowCustomSpend(true);
  }, [closeFabMenu, triggerHaptic]);

  const handleFabNewGoal = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    closeFabMenu();
    openNewGoalModal(false);
  }, [closeFabMenu, openNewGoalModal, triggerHaptic]);

  const handleNewGoalChange = useCallback((field, value) => {
    setNewGoalModal((prev) => ({
      ...prev,
      [field]: field === "emoji" ? limitEmojiInput(value) : value,
    }));
  }, []);

  const handleNewGoalCancel = useCallback(() => {
    setNewGoalModal({ visible: false, name: "", target: "", emoji: DEFAULT_GOAL_EMOJI, makePrimary: false });
  }, []);

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
        title: trimmedName,
        target_usd: targetUSD,
        source: "manual_primary",
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
        title: trimmedName,
        target_usd: targetUSD,
        source: "manual",
      });
    }
    triggerOverlayState("purchase", t("wishAdded", { title: trimmedName }));
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    dismissGoalRenewalPrompt();
    setNewGoalModal({ visible: false, name: "", target: "", emoji: DEFAULT_GOAL_EMOJI, makePrimary: false });
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
      title: trimmedName,
      target_usd: targetUSD,
      source: "onboarding_custom",
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
      customSpend = {
        title: customName,
        amountUSD,
        currency: registrationData.currency,
        frequencyPerWeek:
          Number.isFinite(customFrequency) && customFrequency > 0
            ? Math.round(customFrequency)
            : 0,
      };
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
    setActiveCurrency(updatedProfile.currency);
    ensurePrimaryGoalWish(primaryGoals, language, updatedProfile.goal);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    triggerOverlayState("completion", t("goalCompleteMessage"), 2400);
    logEvent("onboarding_completed", {
      persona_id: personaId,
      goal_id: primaryGoals[0]?.id || selections[0] || DEFAULT_PROFILE.goal,
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
    },
    [setChallengesState]
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

  const handleHistoryDelete = useCallback(
    (entry) => {
      if (!entry) return;
      const entryId = entry.id;
      if (entry.kind === "refuse_spend") {
        const amountUSD = Math.max(0, Number(entry.meta?.amountUSD) || 0);
        if (amountUSD > 0) {
          setSavedTotalUSD((prev) => Math.max(0, prev - amountUSD));
        }
      }
      setHistoryEvents((prev) => {
        const next = prev.filter((h) => h.id !== entryId);
        AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      if (entry.kind === "pending_added" && entry.meta?.pendingId) {
        setPendingList((prev) => prev.filter((p) => p.id !== entry.meta.pendingId));
      }
      if (entry.kind === "wish_added" && entry.meta?.wishId) {
        setWishes((prev) => prev.filter((w) => w.id !== entry.meta.wishId));
      }
    },
    []
  );

  useEffect(() => {
    recomputeHistoryAggregates(historyEvents);
  }, [historyEvents, recomputeHistoryAggregates]);

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

  const feedTamagotchi = useCallback(() => {
    if (tamagotchiCoins < TAMAGOTCHI_FEED_COST) {
      const hint =
        language === "ru"
          ? "Пополняй монетки через отказы, уровни и награды."
          : "Earn coins via saves, levels and rewards.";
      Alert.alert(
        language === "ru" ? "Алми" : "Almi",
        language === "ru"
          ? `Нужно минимум ${TAMAGOTCHI_FEED_COST} монет, чтобы покормить Алми.\n\n${hint}`
          : `You need at least ${TAMAGOTCHI_FEED_COST} coins to feed Almi.\n\n${hint}`
      );
      return;
    }
    setTamagotchiState((prev) => {
      const nextHunger = Math.min(TAMAGOTCHI_MAX_HUNGER, prev.hunger + TAMAGOTCHI_FEED_AMOUNT);
      return {
        ...prev,
        hunger: nextHunger,
        lastFedAt: new Date().toISOString(),
      };
    });
    setHealthPoints((coins) => Math.max(0, coins - TAMAGOTCHI_FEED_COST));
    requestMascotAnimation("happy", 3600);
  }, [language, requestMascotAnimation, setHealthPoints, tamagotchiCoins]);

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
    setPartyActive(true);
    setPartyBurstKey((prev) => prev + 1);
    partyGlow.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(partyGlow, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(partyGlow, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
      ])
    ).start();
    requestMascotAnimation("happyHeadshake", 3600);
    setTimeout(() => {
      partyGlow.stopAnimation();
      partyGlow.setValue(0);
      setPartyActive(false);
    }, 2400);
  }, [language, partyGlow, requestMascotAnimation, setHealthPoints, tamagotchiCoins]);

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
  const executeSpend = useCallback(
    (item) => {
      if (!item) return;
      const priceUSD = item.priceUSD || item.basePriceUSD || 0;
      const title = `${item.emoji || "✨"} ${
        item.title?.[language] || item.title?.en || item.title || "wish"
      }`;
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
      logImpulseEvent("spend", item, priceUSD, title);
      requestMascotAnimation(Math.random() > 0.5 ? "sad" : "ohno");
    },
    [language, logHistoryEvent, logImpulseEvent, requestMascotAnimation]
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
  } = options || {};
      const priceUSD = item.priceUSD || item.basePriceUSD || 0;
      const title = `${item.emoji || "✨"} ${
        item.title?.[language] || item.title?.en || item.title || "wish"
      }`;
      if (type === "spend") {
        logTemptationAction("spend", item);
        logEvent("temptation_spend", buildTemptationPayload(item, { total_saved_usd: savedTotalUSD }));
        setSpendPrompt({ visible: true, item });
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
        }
        const timestamp = saveTimestamp;
        setSavedTotalUSD((prev) => prev + priceUSD);
        setDeclineCount((prev) => prev + 1);
        const coinReward = priceUSD ? computeRefuseCoinReward(priceUSD) : 0;
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
        triggerOverlayState("save", { ...saveOverlayPayload, coinReward });
        requestMascotAnimation("happy");
        saveActionLogRef.current = [...recentSaves, { itemId: item.id, timestamp: saveTimestamp }];
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
      openNewGoalModal(true);
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
        },
      },
    ]);
  }, [freeDayStats, t, logHistoryEvent, profile.goal, profile.persona]);

  const toggleTemptationEditor = useCallback(
    (item) => {
      if (!item) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
      setPriceEditor((prev) => {
        if (prev.item?.id === item.id) {
          return { item: null, value: "", title: "", emoji: "" };
        }
        const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
        const currentValue = convertToCurrency(item.priceUSD || item.basePriceUSD || 0, currencyCode);
        return {
          item,
          value: formatNumberInputValue(Number(currentValue) || 0),
          title: resolveTemptationTitle(item, language, titleOverrides[item.id]),
          emoji: item.emoji || DEFAULT_TEMPTATION_EMOJI,
        };
      });
    },
    [language, profile.currency, titleOverrides]
  );

  const closePriceEditor = useCallback(() => {
    if (!priceEditor.item) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPriceEditor({ item: null, value: "", title: "", emoji: "" });
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

  const savePriceEdit = () => {
    if (!priceEditor.item) return;
    const parsed = parseFloat((priceEditor.value || "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Almost", t("priceEditError"));
      return;
    }
    const usdValue = parsed / (CURRENCY_RATES[activeCurrency] || 1);
    persistPriceOverride(usdValue);
    const titleValue = (priceEditor.title || "").trim();
    persistTitleOverride(titleValue || null);
    const hasCustomEmoji = !!priceEditor.emoji?.trim();
    const resolvedEmoji = hasCustomEmoji
      ? normalizeEmojiValue(priceEditor.emoji, priceEditor.item.emoji || DEFAULT_TEMPTATION_EMOJI)
      : priceEditor.item.emoji || DEFAULT_TEMPTATION_EMOJI;
    persistEmojiOverride(hasCustomEmoji ? resolvedEmoji : null);
    patchTemptationDisplay(priceEditor.item.id, {
      priceUSD: usdValue,
      titleOverride: titleValue || null,
      emoji: resolvedEmoji,
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
            removeTemptationTemplate(item.id);
            if (priceEditor.item?.id === item.id) {
              closePriceEditor();
            }
          },
        },
      ]);
    },
    [closePriceEditor, priceEditor.item, removeTemptationTemplate, t]
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
    [setProfile, setProfileDraft, t, wishes]
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
    const timeout =
      next.duration ??
      (next.type === "cart"
        ? 1800
        : next.type === "level"
        ? 3200
        : next.type === "reward"
        ? 3200
        : next.type === "save"
        ? 4200
        : 2600);
    overlayTimer.current = setTimeout(() => {
      setOverlay(null);
      overlayActiveRef.current = false;
      processOverlayQueue();
    }, timeout);
  }, []);

  const triggerOverlayState = useCallback(
    (type, message, duration) => {
      overlayQueueRef.current.push({ type, message, duration });
      processOverlayQueue();
    },
    [processOverlayQueue]
  );

  const dismissOverlay = useCallback(() => {
    if (overlayTimer.current) {
      clearTimeout(overlayTimer.current);
      overlayTimer.current = null;
    }
    if (overlayActiveRef.current) {
      overlayActiveRef.current = false;
    }
    setOverlay(null);
    processOverlayQueue();
  }, [processOverlayQueue]);

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
      try {
        const allowed = await ensureNotificationPermission();
        if (allowed) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: pushTitle,
              body: pushBody,
            },
            trigger: null,
          });
        }
      } catch (error) {
        console.warn("impulse notify", error);
      }
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
    [ensureNotificationPermission, profile.currency, t, triggerOverlayState, moodPreset]
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
      setHealthPoints((prev) => prev + def.rewardHealth);
      const copy = getChallengeCopy(def, language);
      const title = copy.title || challengeId;
      triggerOverlayState(
        "health",
        {
          amount: def.rewardHealth,
          reason: t("challengeClaimedOverlay", { title }),
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
  if (now.getHours() < 18 || !freeDayStats.lastDate || healthPoints < FREE_DAY_RESCUE_COST) return;
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
            setDeclineCount(0);
            setCatalogOverrides({});
            setTitleOverrides({});
            setEmojiOverrides({});
            setQuickTemptations([]);
            setFreeDayStats({ ...INITIAL_FREE_DAY_STATS });
            setDecisionStats({ ...INITIAL_DECISION_STATS });
            setHistoryEvents([]);
            setRefuseStats({});
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
            setClaimedRewards({});
            setRewardCelebratedMap({});
            const resetChallenges = createInitialChallengesState();
            challengesPrevRef.current = resetChallenges;
            setChallengesState(resetChallenges);
            setImpulseTracker({ ...INITIAL_IMPULSE_TRACKER });
            setMoodState(createMoodStateForToday());
            impulseAlertCooldownRef.current = {};
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
            language={language}
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
          history={historyEvents}
          onHistoryDelete={handleHistoryDelete}
          freeDayStats={freeDayStats}
          rewardBadges={unlockedRewards}
          analyticsOptOut={analyticsOptOutValue}
          onAnalyticsToggle={handleAnalyticsToggle}
          t={t}
          colors={colors}
          moodPreset={moodPreset}
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
            historyEvents={historyEvents}
            profile={profile}
            titleOverrides={titleOverrides}
            onLevelCelebrate={handleLevelCelebrate}
            onBaselineSetup={handleBaselineSetupPrompt}
            healthPoints={healthPoints}
            onFreeDayRescue={handleFreeDayRescue}
            freeDayRescueCost={FREE_DAY_RESCUE_COST}
            impulseInsights={impulseInsights}
            moodPreset={moodPreset}
            onMoodDetailsOpen={() => setMoodDetailsVisible(true)}
            onPotentialDetailsOpen={(description) => {
              setPotentialDetailsText(description);
              setPotentialDetailsVisible(true);
            }}
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
            onTemptationEditTitleChange={handlePriceTitleChange}
            onTemptationEditPriceChange={handlePriceInputChange}
            onTemptationEditEmojiChange={handlePriceEmojiChange}
            onTemptationEditSave={savePriceEdit}
            onTemptationEditCancel={closePriceEditor}
            onTemptationEditDelete={(item) => promptTemptationDelete(item)}
            onTemptationGoalSelect={(item) => {
              if (!item) return;
              setGoalLinkPrompt({ visible: true, item, intent: "edit" });
            }}
            onTemptationSwipeDelete={(item) => promptTemptationDelete(item)}
            onSavingsBreakdownPress={() => setSavingsBreakdownVisible(true)}
            resolveTemplateTitle={resolveTemplateTitle}
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
      >
      <View
        style={[
          styles.appBackground,
          { backgroundColor: colors.background },
        ]}
      >
      <SafeAreaView
        style={[
          styles.appShell,
          {
            backgroundColor: colors.background,
            paddingTop: topSafeInset,
          },
        ]}
      >
        <StatusBar
          style={theme === "dark" ? "light" : "dark"}
          backgroundColor={systemOverlayActive ? overlaySystemColor : colors.background}
        />
        <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
        {savingsBreakdownVisible && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={() => setSavingsBreakdownVisible(false)}>
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
                      <TouchableOpacity onPress={() => setSavingsBreakdownVisible(false)}>
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
                            <Text style={[styles.breakdownBarAmount, { color: colors.text }]}>
                              {savingsBreakdown.formatLocal(day.total)}
                            </Text>
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
                            {language === "ru" ? "Отказов" : "Declines"}
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
                            {dailySummaryData.thinking || 0}
                          </Text>
                          <Text style={[styles.dailySummaryStatLabel, { color: colors.muted }]}>
                            {language === "ru" ? "В думаем" : "Thinking"}
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
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: tabBarBottomInset,
              paddingTop: 12,
            },
          ]}
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
              </TouchableOpacity>
            );
          })}
        </View>

        <AnimatedTouchableOpacity
          style={[
            styles.cartBadge,
            {
              backgroundColor: colors.text,
              borderColor: colors.border,
              transform: [{ scale: cartBadgeScale }],
            },
          ]}
          onPress={handleFabPress}
        >
          <Text style={[styles.cartBadgeIcon, { color: colors.background }]}>+</Text>
        </AnimatedTouchableOpacity>

        <QuickCustomModal
          visible={showCustomSpend}
          colors={colors}
          t={t}
          currency={profile.currency || DEFAULT_PROFILE.currency}
          data={quickSpendDraft}
          onChange={handleQuickCustomChange}
          onSubmit={handleQuickCustomSubmit}
          onCancel={handleQuickCustomCancel}
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
        />

        {tutorialVisible && activeTutorialStep && (
          <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleTutorialSkip}
          >
            <View style={styles.tutorialBackdrop} pointerEvents="box-none">
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.tutorialBackdropDim,
                  { bottom: tabBarBottomInset + 56 },
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

        <Modal
          visible={tamagotchiVisible}
          transparent
          animationType="fade"
          onRequestClose={closeTamagotchiOverlay}
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={closeTamagotchiOverlay}>
            <View style={styles.tamagotchiBackdrop}>
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
                    <AlmiTamagotchi override={mascotOverride} onOverrideComplete={handleMascotAnimationComplete} />
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
                  <View style={styles.tamagotchiActions}>
                    <TouchableOpacity
                      style={[
                        styles.tamagotchiButton,
                        { backgroundColor: colors.text, borderColor: colors.text },
                      ]}
                      onPress={feedTamagotchi}
                    >
                      <View style={styles.tamagotchiButtonContent}>
                        <Image source={HEALTH_COIN_TIERS[0].asset} style={styles.tamagotchiButtonIcon} />
                        <Text style={[styles.tamagotchiButtonText, { color: colors.background }]}>
                          {language === "ru"
                            ? `Покормить ×${TAMAGOTCHI_FEED_COST}`
                            : `Feed ×${TAMAGOTCHI_FEED_COST}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
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

        {editOverlayVisible && (
          <TouchableWithoutFeedback onPress={closePriceEditor}>
            <View style={styles.temptationEditOverlay} pointerEvents="box-none">
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
                      onEditTitleChange={handlePriceTitleChange}
                      onEditPriceChange={handlePriceInputChange}
                      onEditEmojiChange={handlePriceEmojiChange}
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
            onRequestClose={() => setMoodDetailsVisible(false)}
            statusBarTranslucent
          >
            <TouchableWithoutFeedback onPress={() => setMoodDetailsVisible(false)}>
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
                      onPress={() => setMoodDetailsVisible(false)}
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
            onRequestClose={() => setPotentialDetailsVisible(false)}
            statusBarTranslucent
          >
            <TouchableWithoutFeedback onPress={() => setPotentialDetailsVisible(false)}>
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
                      onPress={() => setPotentialDetailsVisible(false)}
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

        {fabMenuVisible && (
          <View pointerEvents="box-none" style={styles.fabMenuOverlay}>
            <TouchableWithoutFeedback onPress={closeFabMenu}>
              <View style={styles.fabMenuBackdrop} />
            </TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.fabOption,
                styles.fabOptionGoal,
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
              <TouchableOpacity
                style={[styles.fabCircle, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleFabNewGoal}
              >
                <Text style={[styles.fabOptionText, { color: colors.text }]} numberOfLines={2}>
                  {t("fabNewGoal")}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View
              style={[
                styles.fabOption,
                styles.fabOptionTemptation,
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
              <TouchableOpacity
                style={[styles.fabCircle, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleFabNewTemptation}
              >
                <Text style={[styles.fabOptionText, { color: colors.text }]} numberOfLines={2}>
                  {t("fabNewTemptation")}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {overlay &&
          overlay.type !== "level" &&
          overlay.type !== "save" &&
          overlay.type !== "custom_temptation" &&
          overlay.type !== "reward" &&
          overlay.type !== "health" &&
          overlay.type !== "goal_complete" &&
          overlay.type !== "impulse_alert" && (
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
                        source={CAT_IMAGE}
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
        {overlay?.type === "level" && (
          <Modal visible transparent animationType="fade" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={dismissOverlay}>
              <View style={styles.overlayFullScreen}>
                <LevelUpCelebration colors={colors} message={overlay.message} level={overlay.message} t={t} />
              </View>
            </TouchableWithoutFeedback>
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
                  <Image source={CAT_HAPPY_GIF} style={styles.saveGif} />
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
                  <Image source={CAT_FOLLOWS} style={styles.customTemptationGif} />
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
                <RewardCelebration colors={colors} message={overlay.message} t={t} />
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
                <GoalCelebration colors={colors} payload={overlay.message} t={t} />
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
            <View style={styles.priceModalBackdrop}>
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
            <View style={styles.priceModalBackdrop}>
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
            <View style={styles.priceModalBackdrop}>
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
  return <AppContent />;
}

export default Sentry.wrap(App);

const TYPOGRAPHY = {
  logo: {
    fontFamily: INTER_FONTS.extraBold,
    fontSize: 44,
    letterSpacing: -0.5,
  },
  display: {
    fontFamily: INTER_FONTS.bold,
    fontSize: 34,
    letterSpacing: -0.2,
  },
  blockTitle: {
    fontFamily: INTER_FONTS.bold,
    fontSize: 24,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: INTER_FONTS.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  secondary: {
    fontFamily: INTER_FONTS.light,
    fontSize: 12,
    lineHeight: 16,
  },
  cta: {
    fontFamily: INTER_FONTS.semiBold,
    fontSize: 14,
    letterSpacing: CTA_LETTER_SPACING,
  },
};

const createBodyText = (overrides = {}) => ({ ...TYPOGRAPHY.body, ...overrides });
const createSecondaryText = (overrides = {}) => ({ ...TYPOGRAPHY.secondary, ...overrides });
const createCtaText = (overrides = {}) => ({ ...TYPOGRAPHY.cta, ...overrides });

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
  },
  appShell: {
    flex: 1,
    paddingHorizontal: SHELL_HORIZONTAL_PADDING,
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
    alignItems: "flex-start",
    gap: 12,
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
  tamagotchiSub: {
    ...createSecondaryText({ fontSize: 12 }),
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
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
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
    ...createBodyText({ fontSize: 15, marginTop: 6, lineHeight: 20, width: "100%" }),
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
    fontSize: 24,
    fontFamily: INTER_FONTS.extraBold,
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
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    position: "relative",
  },
  freeDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 8,
  },
  freeDayHeaderText: {
    flex: 1,
    gap: 2,
  },
  freeDayLabel: {
    ...TYPOGRAPHY.blockTitle,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  freeDayValue: {
    ...createBodyText({ fontSize: 18, fontWeight: "700" }),
  },
  freeDayValueInactive: {
    ...createBodyText({ fontSize: 16, fontWeight: "400" }),
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
  freeDayButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  freeDayButtonText: {
    ...createCtaText({ fontSize: 13, color: "#fff" }),
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
  freeDayLockedPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
    alignItems: "center",
  },
  freeDayLockedText: {
    ...createCtaText({ fontSize: 12, textAlign: "center" }),
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
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
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
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
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
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    fontSize: 11,
    fontWeight: "700",
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
    ...createBodyText({ fontSize: 16, fontWeight: "700" }),
  },
  challengeDesc: {
    ...createBodyText({ fontSize: 14, lineHeight: 20 }),
  },
  challengeMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeStatus: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase" }),
  },
  challengeTimer: {
    ...createSecondaryText({ fontSize: 12 }),
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
    ...createSecondaryText({ fontSize: 12 }),
  },
  challengeActionButton: {
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  challengeActionText: {
    ...createCtaText(),
  },
  challengeRewardChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  challengeRewardChipFloating: {
    position: "absolute",
    right: 10,
    top: 10,
  },
  challengeSwipeWrapper: {
    position: "relative",
    overflow: "hidden",
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
    fontSize: 28,
  },
  profileSubtitle: {
    ...createBodyText({ marginTop: 4 }),
    fontSize: 13,
    lineHeight: 18,
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
  },
  profileStatValue: {
    ...createBodyText({ fontWeight: "700" }),
  },
  profileStatLabel: {
    ...createCtaText({ fontSize: 12, textTransform: "uppercase", marginTop: 4 }),
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
    marginTop: 8,
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
  cartBadge: {
    position: "absolute",
    bottom: 96,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
  },
  cartBadgeIcon: {
    fontSize: 32,
  },
  fabMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  fabMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  fabOption: {
    position: "absolute",
    right: 24,
    alignItems: "flex-end",
  },
  fabOptionGoal: {
    bottom: 280,
  },
  fabOptionTemptation: {
    bottom: 185,
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
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRadius: 36,
    alignItems: "center",
    width: "80%",
    maxWidth: 360,
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
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    width: "80%",
    maxWidth: 360,
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
    paddingHorizontal: 30,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    width: "82%",
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

function RegistrationScreen({ data, onChange, onSubmit, onPickImage, colors, t, onBack }) {
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
            <Image source={CAT_IMAGE} style={styles.avatarImage} />
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

function CustomHabitScreen({ data, onChange, onSubmit, colors, t, currency, onBack }) {
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

function QuickCustomModal({ visible, colors, t, currency, data, onChange, onSubmit, onCancel }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.quickModalBackdrop}>
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
                  maxLength={2}
                />
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

function NewGoalModal({ visible, colors, t, currency, data, onChange, onSubmit, onCancel }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.quickModalBackdrop}>
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

function OnboardingGoalModal({ visible, colors, t, currency, data, onChange, onSubmit, onCancel }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.quickModalBackdrop}>
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
}) {
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <View style={styles.onboardContent}>
        <OnboardingBackButton onPress={onBack} colors={colors} t={t} />
        <Image source={CAT_WAVING} style={styles.languageMascot} />
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
  useEffect(() => {
    const word = "almost";
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
    <View style={styles.logoSplash}>
      <Text style={styles.logoSplashText}>{text}</Text>
    </View>
  );
}
const LevelUpCelebration = ({ colors, message, t }) => {
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
    <View style={styles.levelOverlay} pointerEvents="none">
      <View style={styles.levelBackdrop} />
      <View style={styles.levelContent}>
        <Text style={[styles.levelTitle, { color: colors.text }]}>{t("progressHeroLevel", { level: levelNumber })}</Text>
        <Text style={[styles.levelSubtitle, { color: colors.text }]}>
          {t("levelCelebrate", { level: levelNumber })}
        </Text>
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

const RewardCelebration = ({ colors, message, t }) => {
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
        <Image source={CAT_HAPPY_GIF} style={styles.rewardCat} />
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

const GoalCelebration = ({ colors, payload, t }) => {
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
        <Image source={CAT_HAPPY_GIF} style={styles.goalCelebrateCat} />
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
