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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
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
  CATALOG: "@almost_catalog_overrides",
  TITLE_OVERRIDES: "@almost_title_overrides",
  WISHES: "@almost_wishes",
  SAVED_TOTAL: "@almost_saved_total",
  DECLINES: "@almost_declines",
  PENDING: "@almost_pending",
  FREE_DAY: "@almost_free_day_stats",
  DECISION_STATS: "@almost_decision_stats",
  HISTORY: "@almost_history",
  REFUSE_STATS: "@almost_refuse_stats",
  REWARDS_CELEBRATED: "@almost_rewards_celebrated",
  ANALYTICS_OPT_OUT: "@almost_analytics_opt_out",
  TEMPTATION_GOALS: "@almost_temptation_goals",
};

const PURCHASE_GOAL = 20000;
const CAT_IMAGE = require("./assets/Cat_mascot.png");
const CAT_CURIOUS = require("./assets/Cat_curious.gif");
const CAT_HAPPY_GIF = require("./assets/Cat_happy.gif");
const CAT_WAVING = require("./assets/Cat_waving.gif");
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
const MAX_HISTORY_EVENTS = 200;
const INITIAL_DECISION_STATS = {
  resolvedToWishes: 0,
  resolvedToDeclines: 0,
};

const WEEKDAY_LABELS = {
  ru: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
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

const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
  Haptics.impactAsync(style).catch(() => {});
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

const createCustomHabitTemptation = (customSpend, fallbackCurrency) => {
  if (!customSpend?.title) return null;
  const price = resolveCustomPriceUSD(customSpend, fallbackCurrency);
  if (!price) return null;
  const title = customSpend.title;
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
    description: {
      ru: "Твоя основная ежедневная трата, с которой начнём экономию.",
      en: "Your main daily spend is the first habit we’ll tackle together.",
    },
  };
};

const matchesGenderAudience = (card, gender = "none") => {
  if (!card || !card.audience || !gender || gender === "none") return true;
  const list = Array.isArray(card.audience) ? card.audience : [card.audience];
  return list.includes(gender);
};

const buildPersonalizedTemptations = (profile, baseList = DEFAULT_TEMPTATIONS) => {
  const preset = getPersonaPreset(profile?.persona);
  const customFirst = createCustomHabitTemptation(profile?.customSpend, profile?.currency);
  const personaCard = createPersonaTemptation(preset);
  const gender = profile?.gender || "none";
  const seen = new Set(customFirst ? [customFirst.id] : []);
  const pool = [...baseList];
  if (personaCard && matchesGenderAudience(personaCard, gender)) {
    pool.push(personaCard);
  }
  const sortedPool = pool
    .filter((item) => {
      if (!item || seen.has(item.id)) return false;
      if (!matchesGenderAudience(item, gender)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => {
      const priceA = a.priceUSD ?? a.basePriceUSD ?? Number.POSITIVE_INFINITY;
      const priceB = b.priceUSD ?? b.basePriceUSD ?? Number.POSITIVE_INFINITY;
      return priceA - priceB;
    });
  const visibleCustom = customFirst && matchesGenderAudience(customFirst, gender);
  return visibleCustom ? [customFirst, ...sortedPool] : sortedPool;
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
    appTagline: "Витрина искушений, которые помогают копить",
    heroAwaiting: "В листе желаний",
    heroSpendLine: {
      female: "Сэкономила на «{{title}}».",
      male: "Сэкономил на «{{title}}».",
      none: "Сэкономили на «{{title}}».",
    },
    heroSpendFallback: {
      female: "Каждый отказ приближает к осознанной свободе.",
      male: "Каждый отказ приближает к осознанной свободе.",
      none: "Каждый отказ приближает к осознанной свободе.",
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
    wishlistSavedHint: "Сколько уже отложено",
    wishlistSaveProgress: "Обновить прогресс",
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
    freeDayInactiveLabel: "Отметь вечер без трат",
    freeDayCurrentLabel: "Текущая",
    freeDayBestLabel: "Лучшая",
    freeDayTotalShort: "Всего",
    freeDayWeekTitle: "Эта неделя",
    freeDayExpand: "Показать детали",
    freeDayCollapse: "Скрыть",
    freeDayTotalLabel: "Всего: {{total}}",
    pendingTab: "Думаем",
    pendingTitle: "Думаем",
    pendingEmptyTitle: "В «думаем» пусто",
    pendingEmptySubtitle: "Отправляй хотелки в «думаем», и мы вернёмся через 14 дней.",
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
    priceEditTitle: "Настрой цену",
    priceEditPlaceholder: "Сумма в текущей валюте",
    priceEditSave: "Сохранить",
    priceEditReset: "Сбросить",
    priceEditCancel: "Отмена",
    priceEditError: "Введи сумму больше нуля",
    priceEditNameLabel: "Название карточки",
    priceEditAmountLabel: "Стоимость ({{currency}})",
    wishAdded: "Добавлено в хотелки: {{title}}",
    wishDeclined: "+{{amount}} к копилке. Отличное решение!",
    saveCelebrateTitle: "Сэкономлено на «{{title}}»",
    saveCelebrateSubtitle: "Алми радуется, счёт пополнен!",
    statsSpent: "Закрыто целей",
    statsSaved: "Спасено",
    statsItems: "Хотелок",
    statsCart: "В листе",
    statsDeclines: "Отказов",
    statsFreeDays: "Серия дней",
    analyticsTitle: "Прогресс",
    analyticsPendingToBuy: "Хотелки",
    analyticsPendingToDecline: "Отказы",
    analyticsFridgeCount: "В «думаем»",
    analyticsBestStreak: "Бесплатных дней",
    historyTitle: "История событий",
    historyEmpty: "Тишина. Добавь цель или отметь бесплатный день.",
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
    historyTimestamp: "{{date}} · {{time}}",
    historyUnknown: "Событие",
    progressHeroTitle: "Спасено",
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
    rewardCelebrateTitle: "Награда «{{title}}» получена!",
    rewardCelebrateSubtitle: "Алми ликует: продолжай накапливать достижения.",
    rainMessage: "Как же так? Спаси денежки.",
    developerReset: "Сбросить данные",
    developerResetConfirm: "Очистить хотелки, историю и профиль?",
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
    inputFirstName: "Имя",
    inputLastName: "Фамилия",
    inputMotto: "Девиз дня",
    currencyLabel: "Валюта накоплений",
    nextButton: "Дальше",
    goalTitle: "Определим цель",
    goalSubtitle: "Выбери главное направление экономии",
    goalButton: "Готово",
    goalCompleteMessage: "Всё готово, погнали копить!",
    goalPrimaryBadge: "Главная цель",
    goalTargetTitle: "Сколько нужно на цель?",
    goalTargetSubtitle: "Укажи сумму — Almost будет держать фокус и прогресс.",
    goalTargetPlaceholder: "Например 1200",
    goalTargetHint: "Сумму можно поменять позже в профиле.",
    goalTargetCTA: "Запомнить",
    goalTargetBack: "Назад к целям",
    goalTargetError: "Введи сумму цели",
    goalTargetLabel: "Сумма главной цели",
    primaryGoalLabel: "Главная цель",
    primaryGoalLocked: "Эту цель можно поменять только в профиле.",
    primaryGoalRemaining: "Осталось {{amount}}",
    goalWidgetTargetLabel: "Цель: {{amount}}",
    goalWidgetRemaining: "Осталось {{amount}}",
    goalWidgetComplete: "Цель достигнута",
    goalWidgetTitle: "Цель",
    goalWidgetCompleteTagline: "Экономия продолжалась — и цель закрыта.",
    goalAssignPromptTitle: "Куда зачесть экономию?",
    goalAssignPromptSubtitle: "Выбери цель, которую наполняет «{{title}}».",
    goalAssignNone: "Пока без цели",
    goalAssignTemptationTitle: "Назначить искушение",
    goalAssignTemptationSubtitle: "Что будет пополнять «{{goal}}»?",
    goalAssignClear: "Сбросить назначение",
    goalAssignFieldLabel: "Куда копим",
    goalEditAction: "Изменить",
    goalDeleteAction: "Удалить",
    goalEditModalTitle: "Редактировать цель",
    goalEditNameLabel: "Название цели",
    goalEditTargetLabel: "Сумма цели",
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
    levelWidgetTitle: "Прогресс уровней",
    levelWidgetCurrent: "Уровень {{level}}",
    levelWidgetSubtitle: "До следующего уровня {{amount}}",
    levelWidgetTarget: "Следующий уровень при {{amount}}",
    levelWidgetMaxed: "Максимальный уровень достигнут!",
    onboardingGuideTitle: "Смысл Almost",
    onboardingGuideSubtitle: "Первые шаги в борьбе с потребительством и импульсивными тратами.",
    onboardingGuideButton: "Продолжить",
    guideStepTrackTitle: "Главная цель: осознанность",
    guideStepTrackDesc: "Мы помогаем тратить деньги только на важное, сохраняя бюджет и фокус на крупных целях.",
    guideStepDecisionTitle: "Меню искушений",
    guideStepDecisionDesc: "Отмечай каждое искушение и уставай перед ним, и тогда деньги остаются в кошельке, а Almost фиксирует победы.",
    guideStepRewardTitle: "Визуализация прогресса",
    guideStepRewardDesc: "Не забывай отмечать, на чём сэкономила: приложение показывает путь к глобальной цели и даёт мотивацию.",
    personaTitle: "Расскажи про себя",
    personaSubtitle: "Выбери, что хочешь прокачать в первую очередь",
    personaGenderLabel: "Как к тебе обращаться?",
    personaHabitLabel: "Профиль, который ближе всего",
    personaConfirm: "Продолжить",
    customSpendTitle: "Твоя ежедневная трата",
    customSpendSubtitle: "Дай ей имя, и мы превратим её в первую мини-цель",
    customSpendNamePlaceholder: "Матча, сигареты, маникюр...",
    customSpendAmountLabel: "Сколько стоит один раз?",
    customSpendAmountPlaceholder: "Например 550",
    customSpendHint: "Это всегда можно поменять в профиле.",
    customSpendSkip: "Пропустить",
    baselineTitle: "Сколько уходит на мелкие импульсы?",
    baselineSubtitle: "Прикинь месячную сумму — Almost сравнит её с реальными победами.",
    baselinePlaceholder: "Например 4300",
    baselineCTA: "Запомнить",
    baselineHint: "Это ориентир, позже можно обновить его в профиле.",
    baselineInputError: "Введи сумму ежемесячных необязательных трат",
    potentialBlockTitle: "Потенциал экономии",
    potentialBlockSubtitle: "Ты мог бы уже спасти {{potential}}, а реально спас {{actual}}.",
    potentialBlockStatusStart: "Начни отмечать отказы — потенциал ждёт.",
    potentialBlockStatusBehind: "Ты на пути, но потенциал выше.",
    potentialBlockStatusOnTrack: "Ты почти полностью используешь потенциал. Продолжай!",
    potentialBlockActualLabel: "Реально спасено",
    potentialBlockPotentialLabel: "Потенциал",
    potentialBlockHint: "Потенциал ещё {{amount}}. Не всё потеряно 🙂",
    potentialBlockCta: "Расскажи, сколько уходит на мелкие траты, и мы покажем, сколько ты мог бы уже спасти.",
    quickCustomTitle: "Новое искушение",
    quickCustomSubtitle: "Опиши траты, от которых хочешь отказаться первой",
    quickCustomNameLabel: "Название",
    quickCustomAmountLabel: "Стоимость ({{currency}})",
    quickCustomConfirm: "Добавить",
    quickCustomCancel: "Отмена",
  },
  en: {
    appTagline: "An offline temptation board that keeps savings safe",
    heroAwaiting: "On the wish list",
    heroSpendLine: {
      female: "You saved on “{{title}}”.",
      male: "You saved on “{{title}}”.",
      none: "You saved on “{{title}}”.",
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
    wishlistSavedHint: "How much you’ve already saved",
    wishlistSaveProgress: "Update progress",
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
    priceEditTitle: "Adjust the target amount",
    priceEditPlaceholder: "Enter amount",
    priceEditSave: "Save",
    priceEditReset: "Reset",
    priceEditCancel: "Cancel",
    priceEditError: "Enter a positive number",
    priceEditNameLabel: "Card name",
    priceEditAmountLabel: "Amount ({{currency}})",
    wishAdded: "Added to wishes: {{title}}",
    wishDeclined: "+{{amount}} safely tucked away",
    saveCelebrateTitle: "Skipped “{{title}}” and the bankroll is grateful",
    saveCelebrateSubtitle: "Almi purrs: savings up!",
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
    statsItems: "Wishes",
    statsCart: "In list",
    statsDeclines: "Declines",
    statsFreeDays: "Streak",
    analyticsTitle: "Progress",
    analyticsPendingToBuy: "Wishes",
    analyticsPendingToDecline: "Declines",
    analyticsFridgeCount: "Thinking list",
    analyticsBestStreak: "Free days",
    historyTitle: "Event log",
    historyEmpty: "Nothing yet. Add a goal or mark a free day.",
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
    historyTimestamp: "{{date}} · {{time}}",
    historyUnknown: "Event",
    progressHeroTitle: "Saved",
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
    rewardCelebrateTitle: "“{{title}}” unlocked!",
    rewardCelebrateSubtitle: "Almi is proud—keep the streak going.",
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
    inputFirstName: "First name",
    inputLastName: "Last name",
    inputMotto: "Personal motto",
    currencyLabel: "Savings currency",
    nextButton: "Continue",
    goalTitle: "Pick a goal",
    goalSubtitle: "Where should your mindful deals lead?",
    goalButton: "Start saving",
    goalCompleteMessage: "You’re set. Let’s start saving!",
    goalPrimaryBadge: "Primary goal",
    goalTargetTitle: "How big is this goal?",
    goalTargetSubtitle: "Set the amount so Almost tracks every dollar toward it.",
    goalTargetPlaceholder: "E.g. 1200",
    goalTargetHint: "You can edit the amount later in the profile.",
    goalTargetCTA: "Save amount",
    goalTargetBack: "Back to goals",
    goalTargetError: "Enter a goal amount",
    goalTargetLabel: "Goal amount",
    primaryGoalLabel: "Primary goal",
    primaryGoalLocked: "Change this goal later from your profile.",
    primaryGoalRemaining: "Remaining {{amount}}",
    goalWidgetTargetLabel: "Goal: {{amount}}",
    goalWidgetRemaining: "{{amount}} to go",
    goalWidgetComplete: "Goal completed",
    goalWidgetTitle: "Goal",
    goalWidgetCompleteTagline: "Savings kept rolling — mission accomplished.",
    goalAssignPromptTitle: "Where should this savings go?",
    goalAssignPromptSubtitle: "Pick the goal that “{{title}}” will fund.",
    goalAssignNone: "No goal yet",
    goalAssignTemptationTitle: "Assign temptation",
    goalAssignTemptationSubtitle: "Which habit fills “{{goal}}”?",
    goalAssignClear: "Clear assignment",
    goalAssignFieldLabel: "Sends savings to",
    goalEditAction: "Edit",
    goalDeleteAction: "Remove",
    goalEditModalTitle: "Edit goal",
    goalEditNameLabel: "Goal name",
    goalEditTargetLabel: "Goal amount",
    goalEditSave: "Save",
    goalEditCancel: "Cancel",
    goalEditNameError: "Enter a goal name",
    goalEditTargetError: "Set a goal amount",
    goalCelebrationTitle: "Main goal complete!",
    goalCelebrationSubtitle: "Almi is proud — time to pick the next dream.",
    goalCelebrationTarget: "Saved {{amount}}",
    levelWidgetTitle: "Level progress",
    levelWidgetCurrent: "Level {{level}}",
    levelWidgetSubtitle: "{{amount}} to the next level",
    levelWidgetTarget: "Next level at {{amount}} total",
    levelWidgetMaxed: "Top level reached — legendary saver!",
    onboardingGuideTitle: "What Almost is about",
    onboardingGuideSubtitle: "A mindful antidote to consumerism and impulse buys.",
    onboardingGuideButton: "Got it",
    guideStepTrackTitle: "Your main mission",
    guideStepTrackDesc: "Spend consciously, protect the budget, and focus on the goals that actually matter.",
    guideStepDecisionTitle: "Temptation menu",
    guideStepDecisionDesc: "Log each temptation and resist it so Almost records the win and keeps that cash untouched.",
    guideStepRewardTitle: "See the big picture",
    guideStepRewardDesc: "Check off every saved item and watch the app visualize the bigger goal you’re working toward.",
    personaTitle: "Tell us about you",
    personaSubtitle: "Choose what you want to rein in first",
    personaGenderLabel: "How should we address you?",
    personaHabitLabel: "Pick a starter profile",
    personaConfirm: "Continue",
    customSpendTitle: "Your daily temptation",
    customSpendSubtitle: "Give it a short name and we’ll turn it into the first mini goal",
    customSpendNamePlaceholder: "Morning latte, cigarettes, nail art…",
    customSpendAmountLabel: "Cost per attempt",
    customSpendAmountPlaceholder: "E.g. 7.50",
    customSpendHint: "You can change this anytime in the profile.",
    customSpendSkip: "Skip for now",
    baselineTitle: "How much slips on small stuff?",
    baselineSubtitle: "Estimate one month of coffees, snacks and impulse buys to compare with real wins.",
    baselinePlaceholder: "E.g. 120",
    baselineCTA: "Save amount",
    baselineHint: "Rough number is fine — you can tweak it later in Profile.",
    baselineInputError: "Enter your rough monthly spend on non‑essentials",
    potentialBlockTitle: "Potential vs real savings",
    potentialBlockSubtitle: "You could have saved {{potential}}, and you actually saved {{actual}}.",
    potentialBlockStatusStart: "Start logging wins — the potential is waiting.",
    potentialBlockStatusBehind: "You're on track, but there’s even more potential.",
    potentialBlockStatusOnTrack: "You’re tapping almost all the potential. Keep going!",
    potentialBlockActualLabel: "Actually saved",
    potentialBlockPotentialLabel: "Potential",
    potentialBlockHint: "There’s still {{amount}} of potential left. Keep it up 🙂",
    potentialBlockCta: "Tell us how much usually slips on small extras and we’ll show the potential savings.",
    quickCustomTitle: "Add temptation",
    quickCustomSubtitle: "Name the impulse and set a price to add it to the deck",
    quickCustomNameLabel: "Name",
    quickCustomAmountLabel: "Cost ({{currency}})",
    quickCustomConfirm: "Add",
    quickCustomCancel: "Cancel",
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
};

const PERSONA_HABIT_TYPES = {
  mindful_coffee: "coffee",
  habit_smoking: "smoking",
  glam_beauty: "beauty",
  gamer_loot: "gaming",
  foodie_delivery: "delivery",
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
  { id: "daily", ru: "Ежедневные хотелки", en: "Daily treats", emoji: "🍩", targetUSD: 250 },
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

const sumPrimaryGoalTargets = (goals = []) =>
  goals.reduce((sum, goal) => sum + (Number(goal?.targetUSD) || 0), 0);

const removePrimaryGoalFromProfile = (profileState = {}, goalId) => {
  if (!goalId) return profileState;
  const currentGoals = Array.isArray(profileState.primaryGoals) ? profileState.primaryGoals : [];
  const filtered = currentGoals.filter((goal) => goal.id !== goalId);
  const nextGoalId = filtered[0]?.id || "";
  return {
    ...profileState,
    primaryGoals: filtered,
    goal: nextGoalId,
    goalTargetUSD: sumPrimaryGoalTargets(filtered),
    goalCelebrated: filtered.length ? profileState.goalCelebrated : false,
  };
};

const updatePrimaryGoalTargetInProfile = (profileState = {}, goalId, targetUSD) => {
  if (!goalId) return profileState;
  const currentGoals = Array.isArray(profileState.primaryGoals) ? profileState.primaryGoals : [];
  const updated = currentGoals.map((goal) =>
    goal.id === goalId ? { ...goal, targetUSD } : goal
  );
  return {
    ...profileState,
    primaryGoals: updated,
    goalTargetUSD: sumPrimaryGoalTargets(updated),
  };
};

const DEFAULT_PROFILE = {
  name: "Nina Cleanova",
  firstName: "Nina",
  lastName: "Cleanova",
  subtitle: "Управляю хотелками и бюджетом",
  motto: "Управляю хотелками и бюджетом",
  bio: "Люблю красивые вещи, но больше люблю финансовый план",
  avatar: "",
  currency: "USD",
  goal: "save",
  goalTargetUSD: getGoalDefaultTargetUSD("save"),
  primaryGoals: [{ id: "save", targetUSD: getGoalDefaultTargetUSD("save") }],
  goalCelebrated: false,
  persona: "mindful_coffee",
  gender: "none",
  customSpend: null,
  spendingProfile: {
    baselineMonthlyWasteUSD: 0,
    baselineStartAt: null,
  },
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
  baselineMonthlyWaste: "",
  baselineCapturedAt: null,
  goalSelections: [],
  goalTargetMap: {},
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

const getDayKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

const isSameDay = (tsA, tsB = Date.now()) => {
  if (!tsA) return false;
  return getDayKey(tsA) === getDayKey(tsB);
};

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

const lightenColor = (hex, amount = 0.25) => {
  if (typeof hex !== "string" || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) {
    return hex;
  }
  const full = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
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

function TemptationCard({
  item,
  language,
  colors,
  onEditPrice,
  onAction,
  t,
  savedTotalUSD = 0,
  currency = activeCurrency,
  stats = {},
  feedback,
  starterPriceUSD = null,
  titleOverride,
  goalLabel = null,
}) {
  const title = resolveTemptationTitle(item, language, titleOverride);
  const desc = item.description?.[language] || item.description?.en || "";
  const priceUSD = item.priceUSD || item.basePriceUSD || 0;
  const priceLabel = formatCurrency(convertToCurrency(priceUSD, currency), currency);
  const isStarterCard =
    Number.isFinite(starterPriceUSD) && starterPriceUSD > 0 && priceUSD === starterPriceUSD;
  const isCustomHabitCard = Array.isArray(item.categories) && item.categories.includes("custom");
  const unlocked =
    (savedTotalUSD >= priceUSD && priceUSD > 0) || isStarterCard || isCustomHabitCard;
  const highlight = unlocked;
  const statusLabel = unlocked ? t("tileReady") : t("tileLocked");
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
  const cardBackground = isDarkTheme
    ? darkCardPalette.background
    : !highlight
    ? lightenColor(baseColor, 0.35)
    : baseColor;
  const cardBorderColor = isDarkTheme
    ? darkCardPalette.border
    : highlight
    ? colors.text
    : "transparent";
  const badgeBackground = isDarkTheme ? darkCardPalette.badgeBg : colors.background;
  const badgeBorder = isDarkTheme ? darkCardPalette.badgeBorder : colors.border;
  const cardTextColor = isDarkTheme ? darkCardPalette.text : colors.text;
  const cardMutedColor = isDarkTheme ? darkCardPalette.muted : colors.muted;
  const coinBurstColor = isDarkTheme ? "#FFD78B" : "#FFF4B3";
  const refuseCount = stats?.count || 0;
  const totalRefusedLabel = formatCurrency(
    convertToCurrency(stats?.totalUSD || 0, currency),
    currency
  );
  const actionConfig = unlocked
    ? [
        { type: "save", label: t("saveAction"), variant: "primary" },
        { type: "spend", label: t("spendAction"), variant: "ghost" },
        { type: "maybe", label: t("maybeAction"), variant: "outline" },
      ]
    : [
        { type: "want", label: t("wantAction"), variant: "primary" },
        { type: "maybe", label: t("maybeAction"), variant: "outline" },
      ];
  const [coinBursts, setCoinBursts] = useState([]);
  const messageActive = feedback?.message;
  const burstKey = feedback?.burstKey;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateX.setValue(0);
  }, [item.id, translateX]);

  const handleSwipeRelease = useCallback(
    (shouldTrigger) => {
      if (shouldTrigger && onEditPrice) {
        onEditPrice(item);
      }
      Animated.timing(translateX, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    },
    [item, onEditPrice, translateX]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 6,
        onPanResponderMove: (_, gestureState) => {
          const dx = Math.max(0, gestureState.dx);
          translateX.setValue(Math.min(dx, 140));
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldTrigger = gestureState.dx > 80;
          handleSwipeRelease(shouldTrigger);
        },
        onPanResponderTerminate: () => handleSwipeRelease(false),
      }),
    [handleSwipeRelease, translateX]
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

  return (
    <View style={styles.temptationSwipeWrapper}>
      <View
        style={[
          styles.temptationSwipeBackground,
          {
            borderColor: isDarkTheme ? darkCardPalette.swipeBorder : colors.border,
            backgroundColor: isDarkTheme
              ? darkCardPalette.swipeBg
              : lightenColor(colors.background, 0.18),
          },
        ]}
        pointerEvents="none"
      >
        <Text style={[styles.temptationSwipeIcon, { color: cardTextColor }]}>✏️</Text>
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.temptationCard,
          {
            backgroundColor: cardBackground,
            borderColor: cardBorderColor,
            borderWidth: highlight ? 2 : 1,
            transform: [{ translateX }],
          },
        ]}
      >
      <View style={styles.temptationHeader}>
        <Text style={[styles.temptationEmoji, { color: cardTextColor }]}>{item.emoji || "✨"}</Text>
        <Text style={[styles.temptationTitle, { color: cardTextColor }]}>{title}</Text>
        <View
          style={[
            styles.temptationBadge,
            { backgroundColor: badgeBackground, borderColor: badgeBorder },
          ]}
        >
          <Text style={[styles.temptationBadgeText, { color: cardTextColor }]}>{statusLabel}</Text>
        </View>
      </View>
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
        <Text
          style={[
            styles.temptationPrice,
            { color: isDarkTheme ? "#FFFFFF" : colors.text },
          ]}
        >
          {priceLabel}
        </Text>
      </View>
      {goalLabel ? (
        <Text style={[styles.temptationGoalLabel, { color: cardMutedColor }]}>
          {t("goalAssignFieldLabel")}: {goalLabel}
        </Text>
      ) : null}
      <View style={styles.temptationActions}>
        {actionConfig.map((action) => {
          let buttonStyle;
          let textStyle;
          if (action.variant === "primary") {
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
      </Animated.View>
    </View>
  );
}

function SavingsHeroCard({
  goldPalette,
  heroSpendCopy,
  heroEncouragementLine,
  levelLabel,
  heroSavedLabel,
  progressPercent,
  progressPercentLabel,
  nextLabel,
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
}) {
  const [expanded, setExpanded] = useState(false);
  const maxAmount = Math.max(...dailySavings.map((day) => day.amountUSD), 0);
  const potentialLocal = formatCurrency(convertToCurrency(potentialSavedUSD || 0, currency), currency);
  const actualLocal = formatCurrency(convertToCurrency(actualSavedUSD || 0, currency), currency);
  const potentialRatio = potentialSavedUSD > 0 ? Math.min(actualSavedUSD / potentialSavedUSD, 1) : 0;
  const missedUSD = Math.max(0, potentialSavedUSD - actualSavedUSD);
  const statusKey =
    actualSavedUSD <= 0
      ? "potentialBlockStatusStart"
      : potentialRatio >= 0.8
      ? "potentialBlockStatusOnTrack"
      : "potentialBlockStatusBehind";
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
          <Text
            style={[styles.savedHeroSubtitle, { color: goldPalette.subtext }]}
            numberOfLines={2}
          >
            {`${heroSpendCopy} ${heroEncouragementLine}`}
          </Text>
        </View>
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
      </View>
      <View style={styles.savedHeroAmountWrap}>
        <Text style={[styles.progressHeroAmount, { color: goldPalette.text }]}>
          {heroSavedLabel}
        </Text>
      </View>
      <View
        style={[
          styles.heroPotentialCard,
          {
            backgroundColor: goldPalette.badgeBg,
            borderColor: goldPalette.badgeBorder,
          },
        ]}
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
            <Text style={[styles.heroPotentialSubtitle, { color: goldPalette.subtext }]}>
              {t("potentialBlockActualLabel")} · {actualLocal}
            </Text>
            <View
              style={[
                styles.heroPotentialTrack,
                { backgroundColor: goldPalette.barBg || "rgba(255,255,255,0.4)" },
              ]}
            >
              <View
                style={[
                  styles.heroPotentialFill,
                  { width: `${Math.max(0, Math.min(potentialRatio, 1)) * 100}%`, backgroundColor: goldPalette.accent },
                ]}
              />
            </View>
            <Text style={[styles.heroPotentialStatus, { color: goldPalette.subtext }]}>
              {t(statusKey)}
            </Text>
            {missedUSD > 0 && (
              <Text style={[styles.heroPotentialHint, { color: goldPalette.subtext }]}>
                {t("potentialBlockHint", {
                  amount: formatCurrency(convertToCurrency(missedUSD, currency), currency),
                })}
              </Text>
            )}
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
      </View>
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
        <View>
          <Text style={[styles.goalLabel, { color: goldPalette.subtext }]}>{t("goalWidgetTitle")}</Text>
          <Text style={[styles.savedHeroGoalLabel, { color: goldPalette.subtext }]}>
            {goalProgressLabel}
          </Text>
        </View>
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
      <View style={styles.savedHeroNextRow}>
        <Text style={[styles.progressHeroNext, styles.savedHeroNextText, { color: goldPalette.subtext }]}>
          {nextLabel}
        </Text>
        <TouchableOpacity
          style={styles.savedHeroToggleButton}
          onPress={() => setExpanded((prev) => !prev)}
        >
          <Text style={[styles.savedHeroToggleText, { color: goldPalette.subtext }]}>
            {expanded ? t("heroCollapse") : t("heroExpand")}
          </Text>
        </TouchableOpacity>
      </View>
      {expanded && (
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.freeDayLabel, { color: colors.muted }]}>{t("freeDayCardTitle")}</Text>
          <Text style={[styles.freeDayValue, { color: palette.accent }]}>{subtitle}</Text>
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
    <Modal visible={visible} transparent animationType="fade">
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

function FeedScreen({
  products,
  categories,
  activeCategory,
  onCategorySelect,
  savedTotalUSD,
  wishes = [],
  onTemptationAction,
  onEditPrice,
  t,
  language,
  colors,
  currency,
  freeDayStats,
  onFreeDayLog,
  analyticsStats = [],
  refuseStats = {},
  cardFeedback = {},
  historyEvents = [],
  profile,
  titleOverrides = {},
  onLevelCelebrate,
  onBaselineSetup,
  goalAssignments = {},
}) {
  const handleBaselineSetup = onBaselineSetup || (() => {});
  const realSavedUSD = useRealSavedAmount();
  const heroSavedLabel = useMemo(
    () => formatCurrency(convertToCurrency(savedTotalUSD || 0, currency), currency),
    [savedTotalUSD, currency]
  );
  const resolvedGoalTargetUSD =
    Number.isFinite(profile?.goalTargetUSD) && profile.goalTargetUSD > 0
      ? profile.goalTargetUSD
      : getGoalDefaultTargetUSD(profile?.goal || DEFAULT_PROFILE.goal);
  const activeWishlistTargets = (wishes || [])
    .filter((wish) => wish.status !== "done")
    .reduce((sum, wish) => sum + (Number.isFinite(wish.targetUSD) ? wish.targetUSD : 0), 0);
  const aggregatedTargetUSD = activeWishlistTargets || resolvedGoalTargetUSD || 0;
  const aggregatedTargetLocal = formatCurrency(
    convertToCurrency(aggregatedTargetUSD, currency),
    currency
  );
  const isGoalComplete = aggregatedTargetUSD > 0 && savedTotalUSD >= aggregatedTargetUSD;
  const goalProgress = aggregatedTargetUSD > 0 ? savedTotalUSD / aggregatedTargetUSD : 0;
  const remainingLocal = formatCurrency(
    convertToCurrency(Math.max(aggregatedTargetUSD - savedTotalUSD, 0), currency),
    currency
  );
  const goalProgressLabel = aggregatedTargetUSD
    ? t("progressGoal", { current: heroSavedLabel, goal: aggregatedTargetLocal })
    : t("progressGoal", { current: heroSavedLabel, goal: heroSavedLabel });
  const personaPreset = useMemo(() => getPersonaPreset(profile?.persona), [profile?.persona]);
  const latestSaving = useMemo(
    () => historyEvents.find((entry) => entry.kind === "refuse_spend"),
    [historyEvents]
  );
  const heroSpendCopy = useMemo(() => {
    if (latestSaving?.meta?.title) {
      return t("heroSpendLine", { title: latestSaving.meta.title });
    }
    const template = personaPreset?.tagline?.[language];
    if (template) {
      return template.replace("{{amount}}", heroSavedLabel);
    }
    return t("heroSpendFallback");
  }, [heroSavedLabel, personaPreset, language, t, latestSaving]);
  const heroEncouragementLine = isGoalComplete
    ? t("goalWidgetCompleteTagline")
    : t("heroEconomyContinues");
  const isDarkMode = colors === THEMES.dark;
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
      logEvent("savings_level_up", {
        level: tierInfo.level,
        saved_usd_total: savedTotalUSD,
      });
      onLevelCelebrate?.(tierInfo.level);
    }
    previousTierInfo.current = tierInfo.level;
  }, [tierInfo.level, onLevelCelebrate, savedTotalUSD]);
  const progressPercent = Math.min(Math.max(goalProgress, 0), 1);
  const progressPercentLabel = Math.round(progressPercent * 100);
  const levelLabel = t("progressHeroLevel", { level: tierInfo.level });
  const nextLabel = aggregatedTargetUSD
    ? isGoalComplete
      ? t("goalWidgetComplete")
      : t("goalWidgetRemaining", { amount: remainingLocal })
    : t("goalWidgetTargetLabel", { amount: aggregatedTargetLocal });
  const todayDate = new Date();
  const todayTimestamp = todayDate.getTime();
  const todayKey = getDayKey(todayDate);
  const isEvening = new Date().getHours() >= 18;
  const canLogFreeDay = isEvening && freeDayStats.lastDate !== todayKey;
  const potentialSavedUSD = useSavingsSimulation(
    profile?.spendingProfile?.baselineMonthlyWasteUSD || 0,
    profile?.spendingProfile?.baselineStartAt || null
  );
  const hasBaseline = !!(
    profile?.spendingProfile?.baselineMonthlyWasteUSD && profile?.spendingProfile?.baselineStartAt
  );

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((product) => product.categories?.includes(activeCategory));
  }, [activeCategory, products]);
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
  const starterPriceUSD = useMemo(() => {
    if (!products?.length) return null;
    return products.reduce((min, product) => {
      const price = product.priceUSD ?? product.basePriceUSD ?? Infinity;
      if (!Number.isFinite(price) || price <= 0) return min;
      return price < min ? price : min;
    }, Infinity);
  }, [products]);

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
              <View style={styles.heroTextWrap}>
                <Text style={[styles.appName, { color: colors.text }]}>Almost</Text>
                <Text style={[styles.heroTagline, { color: colors.muted }]}>{t("appTagline")}</Text>
              </View>
            </View>
            <SavingsHeroCard
              goldPalette={goldPalette}
              heroSpendCopy={heroSpendCopy}
              heroEncouragementLine={heroEncouragementLine}
              levelLabel={levelLabel}
              heroSavedLabel={heroSavedLabel}
              progressPercent={progressPercent}
              progressPercentLabel={progressPercentLabel}
              nextLabel={nextLabel}
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
            />
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
          return (
            <TemptationCard
              item={item}
              language={language}
              colors={colors}
              t={t}
              onEditPrice={() => onEditPrice(item)}
              savedTotalUSD={savedTotalUSD}
              currency={currency}
              stats={refuseStats[item.id]}
              feedback={cardFeedback[item.id]}
              starterPriceUSD={starterPriceUSD}
              titleOverride={titleOverrides[item.id]}
              goalLabel={assignedGoal?.title || null}
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

function WishListScreen({
  wishes,
  currency = DEFAULT_PROFILE.currency,
  t,
  colors,
  onRemoveWish,
  primaryGoals = [],
  onGoalLongPress = null,
  onGoalEdit = null,
}) {
  const isDarkTheme = colors.background === THEMES.dark.background;
  const primaryGoalIds = Array.isArray(primaryGoals)
    ? primaryGoals.map((goal) => goal?.id).filter(Boolean)
    : [];
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
  if (wishes.length === 0) {
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
    convertToCurrency(wishes.reduce((sum, wish) => sum + (wish.targetUSD || 0), 0), currency),
    currency
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={[styles.header, { color: colors.text }]}>{t("wishlistTitle")}</Text>
      <Text style={[styles.purchasesSubtitle, { color: colors.muted }]}>
        {t("wishlistSummary", { amount: totalTarget })}
      </Text>
      {wishes.map((wish) => {
        const targetLocal = formatCurrency(
          convertToCurrency(wish.targetUSD || 0, currency),
          currency
        );
        const progress = Math.min((wish.savedUSD || 0) / (wish.targetUSD || 1), 1);
        const progressLabel = t("wishlistProgress", {
          current: formatCurrency(convertToCurrency(wish.savedUSD || 0, currency), currency),
          target: targetLocal,
        });
        const isPrimaryGoal =
          wish.kind === PRIMARY_GOAL_KIND ||
          wish.id === PRIMARY_GOAL_WISH_ID_LEGACY ||
          (typeof wish.id === "string" && wish.id.startsWith("wish_primary_goal_"));
        const badgeText = isPrimaryGoal
          ? t("goalPrimaryBadge")
          : wish.status === "done"
          ? t("wishlistDoneLabel")
          : `${Math.round(progress * 100)}%`;
        const remainingUSD = Math.max((wish.targetUSD || 0) - (wish.savedUSD || 0), 0);
        const remainingLabel = formatCurrency(convertToCurrency(remainingUSD, currency), currency);
        const renderWithLongPress = (content) => {
          if (typeof onGoalLongPress === "function") {
            return (
              <TouchableOpacity activeOpacity={0.96} delayLongPress={320} onLongPress={() => onGoalLongPress(wish)}>
                {content}
              </TouchableOpacity>
            );
          }
          return content;
        };
        if (isPrimaryGoal) {
          const preset = getGoalPreset(wish.goalId || primaryGoalIds[0]);
          const emblem = preset?.emoji || "🎯";
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
            <View style={[styles.primaryGoalCard, { backgroundColor: colors.text }]}>
              <View style={[styles.primaryGoalAura, { backgroundColor: auraColor }]} />
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
                    {wish.title}
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
            </View>
          );
          return (
            <SwipeableGoalRow
              key={wish.id}
              colors={colors}
              t={t}
              onEdit={onGoalEdit ? () => onGoalEdit(wish) : undefined}
              onDelete={() => onRemoveWish(wish.id)}
              onSwipeOpen={handleSwipeOpen}
              onSwipeClose={handleSwipeClose}
            >
              {renderWithLongPress(cardContent)}
            </SwipeableGoalRow>
          );
        }
        const cardContent = (
          <View style={[styles.wishCard, { backgroundColor: colors.card }] }>
            <View style={styles.wishHeader}>
              <Text style={[styles.wishTitle, { color: colors.text }]}>{wish.title}</Text>
              <View style={styles.wishBadge}>
                <Text style={{ color: colors.muted }}>{badgeText}</Text>
              </View>
            </View>
            <Text style={[styles.wishMeta, { color: colors.muted }]}>{progressLabel}</Text>
            <View style={[styles.wishProgressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.wishProgressFill,
                  { backgroundColor: colors.text, width: `${progress * 100}%` },
                ]}
              />
            </View>
            {!isPrimaryGoal && (
              <TouchableOpacity
                style={[styles.wishButtonGhost, { borderColor: colors.border, marginTop: 12 }]}
                onPress={() => onRemoveWish(wish.id)}
              >
                <Text style={{ color: colors.muted }}>{t("wishlistRemove")}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
        return (
          <SwipeableGoalRow
            key={wish.id}
            colors={colors}
            t={t}
            onEdit={onGoalEdit ? () => onGoalEdit(wish) : undefined}
            onDelete={() => onRemoveWish(wish.id)}
            onSwipeOpen={handleSwipeOpen}
            onSwipeClose={handleSwipeClose}
          >
            {renderWithLongPress(cardContent)}
          </SwipeableGoalRow>
        );
      })}
      </ScrollView>
    </View>
  );
}

function PendingScreen({ items, currency, t, colors, onResolve }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.decisionDue || 0) - (b.decisionDue || 0)),
    [items]
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
        const daysLeft = Math.ceil(diff / DAY_MS);
        const overdue = diff <= 0;
        const dueLabel = overdue
          ? t("pendingExpired")
          : daysLeft <= 1
          ? t("pendingDueToday")
          : t("pendingDaysLeft", { days: daysLeft });
        const priceLabel = formatCurrency(convertToCurrency(item.priceUSD || 0, currency), currency);
        return (
          <View key={item.id} style={[styles.pendingCard, { backgroundColor: colors.card }] }>
            <View style={styles.pendingHeader}>
              <Text style={[styles.pendingTitle, { color: colors.text }]}>{item.title}</Text>
              <Text
                style={[
                  styles.pendingDue,
                  { color: overdue ? "#D9534F" : colors.muted },
                ]}
              >
                {dueLabel}
              </Text>
            </View>
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
    copy: {
      ru: { title: "Взвешенный выбор", desc: "Разобрался с 5 хотелками из «думаем»." },
      en: { title: "Clear-headed", desc: "Closed out 5 Thinking decisions with intent." },
    },
  },
];

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
    [ACHIEVEMENT_METRIC_TYPES.REFUSE_COUNT]: declineCount,
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
    };
  });
};

function RewardsScreen({
  achievements = [],
  t,
  colors,
  savedTotalUSD = 0,
  currency = DEFAULT_PROFILE.currency,
}) {
  const isDarkTheme = colors.background === THEMES.dark.background;
  const tierInfo = getTierProgress(savedTotalUSD || 0);
  const nextSpan = tierInfo.nextTargetUSD
    ? Math.max(tierInfo.nextTargetUSD - (tierInfo.prevTargetUSD || 0), 1)
    : 1;
  const baseProgress = tierInfo.nextTargetUSD
    ? (savedTotalUSD - (tierInfo.prevTargetUSD || 0)) / nextSpan
    : 1;
  const levelProgress = Math.min(Math.max(baseProgress, 0), 1);
  const remainingUSD = tierInfo.nextTargetUSD
    ? Math.max(tierInfo.nextTargetUSD - savedTotalUSD, 0)
    : 0;
  const remainingLabel = formatCurrency(convertToCurrency(remainingUSD, currency), currency);
  const nextTargetLabel = tierInfo.nextTargetUSD
    ? formatCurrency(convertToCurrency(tierInfo.nextTargetUSD, currency), currency)
    : "";
  const levelPalette = isDarkTheme
    ? {
        background: "rgba(7,29,23,0.95)",
        border: "rgba(117,255,210,0.35)",
        text: "#E7FFF5",
        subtext: "rgba(231,255,245,0.8)",
        track: "rgba(255,255,255,0.15)",
        fill: "#58E0B5",
        badgeBg: "rgba(255,255,255,0.08)",
      }
    : {
        background: "#E6FFF2",
        border: "rgba(27,140,96,0.25)",
        text: "#063820",
        subtext: "rgba(6,56,32,0.75)",
        track: "rgba(6,56,32,0.15)",
        fill: "#1BA361",
        badgeBg: "rgba(255,255,255,0.65)",
      };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 200, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.levelWidget,
          { backgroundColor: levelPalette.background, borderColor: levelPalette.border },
        ]}
      >
        <View style={styles.levelWidgetHeader}>
          <Text style={[styles.levelWidgetTitle, { color: levelPalette.text }]}>
            {t("levelWidgetTitle")}
          </Text>
          <View style={[styles.levelWidgetBadge, { backgroundColor: levelPalette.badgeBg }]}>
            <Text style={[styles.levelWidgetBadgeText, { color: levelPalette.text }]}>
              {t("levelWidgetCurrent", { level: tierInfo.level })}
            </Text>
          </View>
        </View>
        <Text style={[styles.levelWidgetSubtitle, { color: levelPalette.subtext }]}>
          {tierInfo.nextTargetUSD
            ? t("levelWidgetSubtitle", { amount: remainingLabel })
            : t("levelWidgetMaxed")}
        </Text>
        <View style={[styles.levelWidgetBar, { backgroundColor: levelPalette.track }]}>
          <View
            style={[
              styles.levelWidgetFill,
              {
                width: `${levelProgress * 100}%`,
                backgroundColor: levelPalette.fill,
              },
            ]}
          />
        </View>
        {tierInfo.nextTargetUSD && (
          <Text style={[styles.levelWidgetMeta, { color: levelPalette.subtext }]}>
            {t("levelWidgetTarget", { amount: nextTargetLabel })}
          </Text>
        )}
      </View>
      <View>
        <Text style={[styles.header, { color: colors.text }]}>{t("purchasesTitle")}</Text>
        <Text style={[styles.purchasesSubtitle, { color: colors.muted }]}>
          {t("purchasesSubtitle")}
        </Text>
      </View>
      {achievements.map((reward) => {
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
        return (
          <View
            key={reward.id}
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
                <View style={[styles.rewardBadge, { backgroundColor: rewardPalette.badgeBg }]}>
                  <Text style={[styles.rewardBadgeText, { color: rewardPalette.badgeText }]}>
                    {t("rewardBadgeClaimed")}
                  </Text>
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
                ? t("rewardUnlocked")
                : reward.remainingLabel || t("rewardLockedGeneric", { count: 1 })}
            </Text>
          </View>
        );
      })}
      {!achievements.some((item) => item.unlocked) && (
        <Text style={[styles.historyEmpty, { color: colors.muted }]}>{t("rewardsEmpty")}</Text>
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
}) {
  const currentCurrency = currencyValue || profile.currency || DEFAULT_PROFILE.currency;
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
  const historyPreview = (history || []).slice(0, 5);
  const locale = language === "ru" ? "ru-RU" : "en-US";
  const formatLocalAmount = (valueUSD = 0) =>
    formatCurrency(convertToCurrency(valueUSD || 0, currentCurrency), currentCurrency);
  const [goalTargetInputs, setGoalTargetInputs] = useState({});
  useEffect(() => {
    const nextInputs = {};
    primaryGoalsList.forEach((goal) => {
      nextInputs[goal.id] = formatNumberInputValue(
        convertToCurrency(goal.targetUSD || 0, currentCurrency)
      );
    });
    setGoalTargetInputs(nextInputs);
  }, [primaryGoalsList, currentCurrency]);
  const handleGoalTargetInputChange = (goalId, text) => {
    setGoalTargetInputs((prev) => ({ ...prev, [goalId]: text }));
    const parsed = parseNumberInputValue(text);
    if (Number.isFinite(parsed) && parsed > 0) {
      const updatedGoals = primaryGoalsList.map((goal) =>
        goal.id === goalId
          ? { ...goal, targetUSD: convertFromCurrency(parsed, currentCurrency) }
          : goal
      );
      onFieldChange?.("primaryGoals", updatedGoals);
      onFieldChange?.("goalCelebrated", false);
    }
  };
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
  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.profileScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card }] }>
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
              <Text style={[styles.profileAvatarHint, { color: colors.muted }]}>
                {t("photoTapHint")}
              </Text>
            )}
          </TouchableOpacity>
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
                { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
              ]}
              value={profile.subtitle}
              onChangeText={(text) => onFieldChange("subtitle", text)}
              placeholder="Tagline"
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
            <Text style={[styles.profileSubtitle, { color: colors.muted }]}>
              {profile.subtitle}
            </Text>
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
                const active = primaryGoalsList.some((entry) => entry.id === goal.id);
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
            {isEditing && (
              <View
                style={[
                  styles.goalTargetBlock,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <View style={styles.goalTargetHeader}>
                  <Text style={[styles.goalTargetTitle, { color: colors.text }]}>
                    {t("goalTargetLabel")}
                  </Text>
                  <Text style={[styles.goalTargetHint, { color: colors.muted }]}>
                    {t("goalTargetHint")}
                  </Text>
                </View>
                {primaryGoalsList.map((goal) => {
                  const preset = getGoalPreset(goal.id);
                  const goalLabel = preset?.[language] || preset?.en || goal.id;
                  return (
                    <View key={goal.id} style={styles.goalTargetRow}>
                      <Text style={[styles.goalTargetLabel, { color: colors.muted }]}>{goalLabel}</Text>
                      <View
                        style={[
                          styles.goalTargetInputWrap,
                          { borderColor: colors.border, backgroundColor: colors.card },
                        ]}
                      >
                        <TextInput
                          style={[styles.goalTargetInput, { color: colors.text }]}
                          value={goalTargetInputs[goal.id] || ""}
                          onChangeText={(text) => handleGoalTargetInputChange(goal.id, text)}
                          keyboardType="decimal-pad"
                          placeholder={t("goalTargetPlaceholder")}
                          placeholderTextColor={colors.muted}
                        />
                        <Text style={[styles.goalTargetCurrency, { color: colors.muted }]}>
                          {currentCurrency}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
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
          {historyPreview.length === 0 ? (
            <Text style={[styles.historyEmpty, { color: colors.muted }]}>{t("historyEmpty")}</Text>
          ) : (
            historyPreview.map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.historyItem,
                  {
                    borderColor: colors.border,
                    borderBottomWidth: index === historyPreview.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.historyItemTitle, { color: colors.text }]}>
                  {describeHistory(entry)}
                </Text>
                <Text style={[styles.historyItemMeta, { color: colors.muted }]}>
                  {formatHistoryMeta(entry)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function App() {
  const [wishes, setWishes] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("feed");
  const [catalogOverrides, setCatalogOverrides] = useState({});
  const [titleOverrides, setTitleOverrides] = useState({});
  const [temptations, setTemptations] = useState(DEFAULT_TEMPTATIONS);
  const [quickTemptations, setQuickTemptations] = useState([]);
  const [priceEditor, setPriceEditor] = useState({ visible: false, item: null, value: "", title: "" });
  const [savedTotalUSD, setSavedTotalUSD] = useState(0);
  const [declineCount, setDeclineCount] = useState(0);
  const [pendingList, setPendingList] = useState([]);
  const [freeDayStats, setFreeDayStats] = useState({ ...INITIAL_FREE_DAY_STATS });
  const [decisionStats, setDecisionStats] = useState({ ...INITIAL_DECISION_STATS });
  const [historyEvents, setHistoryEvents] = useState([]);
  const products = temptations;
  const [activeCategory, setActiveCategory] = useState("all");
  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE });
  const [profileDraft, setProfileDraft] = useState({ ...DEFAULT_PROFILE });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("ru");
  const [overlay, setOverlay] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const overlayTimer = useRef(null);
  const overlayQueueRef = useRef([]);
  const overlayActiveRef = useRef(false);
  const cartBadgeScale = useRef(new Animated.Value(1)).current;
  const [onboardingStep, setOnboardingStep] = useState("logo");
  const [registrationData, setRegistrationData] = useState(INITIAL_REGISTRATION);
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [showImageSourceSheet, setShowImageSourceSheet] = useState(false);
  const [showCustomSpend, setShowCustomSpend] = useState(false);
  const [quickSpendDraft, setQuickSpendDraft] = useState({ title: "", amount: "" });
  const imagePickerResolver = useRef(null);
  const [refuseStats, setRefuseStats] = useState({});
  const [cardFeedback, setCardFeedback] = useState({});
  const cardFeedbackTimers = useRef({});
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [spendPrompt, setSpendPrompt] = useState({ visible: false, item: null });
  const [stormActive, setStormActive] = useState(false);
  const [analyticsOptOut, setAnalyticsOptOutState] = useState(false);
  const stormTimerRef = useRef(null);
  const [rewardCelebratedMap, setRewardCelebratedMap] = useState({});
  const [rewardsReady, setRewardsReady] = useState(false);
  const [temptationGoalMap, setTemptationGoalMap] = useState({});
  const [goalLinkPrompt, setGoalLinkPrompt] = useState({ visible: false, item: null, intent: null });
  const [goalTemptationPrompt, setGoalTemptationPrompt] = useState({ visible: false, wish: null });
  const [goalEditorPrompt, setGoalEditorPrompt] = useState({ visible: false, wish: null, name: "", target: "" });
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
        return await Notifications.scheduleNotificationAsync({
          content: {
            title: t("pendingNotificationTitle"),
            body: t("pendingNotificationBody", { title }),
          },
          trigger,
        });
      } catch (error) {
        console.warn("pending reminder", error);
        return null;
      }
    },
    [ensureNotificationPermission, t]
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

  const colors = THEMES[theme];
  const isDarkTheme = theme === "dark";
  const overlayDimColor = isDarkTheme ? "rgba(0,0,0,0.65)" : "rgba(5,6,15,0.2)";
  const overlayCardBackground = isDarkTheme ? lightenColor(colors.card, 0.18) : colors.card;
  const overlayBorderColor = isDarkTheme ? lightenColor(colors.border, 0.25) : colors.border;
  const assignableGoals = useMemo(
    () => (wishes || []).filter((wish) => wish.status !== "done"),
    [wishes]
  );
  const resolveTemptationGoalId = useCallback(
    (templateId) => {
      if (!templateId) return null;
      const assigned = temptationGoalMap[templateId];
      if (assigned && wishes.some((wish) => wish.id === assigned)) {
        return assigned;
      }
      return null;
    },
    [temptationGoalMap, wishes]
  );
  const getFallbackGoalId = useCallback(() => {
    if (assignableGoals.length > 0) return assignableGoals[0].id;
    return wishes[0]?.id || null;
  }, [assignableGoals, wishes]);
  const assignTemptationGoal = useCallback((templateId, wishId = null) => {
    if (!templateId) return;
    setTemptationGoalMap((prev) => {
      const next = { ...prev };
      if (wishId) {
        next[templateId] = wishId;
      } else {
        delete next[templateId];
      }
      return next;
    });
  }, []);
  const applySavingsToWish = useCallback((wishId, amountUSD) => {
    if (!wishId || !Number.isFinite(amountUSD) || amountUSD <= 0) return 0;
    let applied = 0;
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
        if (
          nextSaved !== current ||
          wish.status !== status ||
          wish.autoManaged !== false
        ) {
          changed = true;
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
    return applied;
  }, []);
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
  const priceEditorAssignedGoalTitle = priceEditorAssignedGoalId
    ? getWishTitleById(priceEditorAssignedGoalId)
    : "";
  const goalLinkCurrentGoalId = goalLinkPrompt.item
    ? resolveTemptationGoalId(goalLinkPrompt.item.id)
    : null;
  const activeGender = profile.gender || registrationData.gender || DEFAULT_PROFILE.gender || "none";

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

  const achievements = useMemo(
    () =>
      buildAchievements({
        savedTotalUSD,
        declineCount,
        freeDayStats,
        pendingCount: pendingList.length,
        decisionStats,
        currency: profile.currency || DEFAULT_PROFILE.currency,
        t,
        language,
      }),
    [
      savedTotalUSD,
      declineCount,
      freeDayStats,
      pendingList.length,
      decisionStats,
      profile.currency,
      t,
      language,
    ]
  );

  const unlockedRewards = useMemo(
    () => achievements.filter((item) => item.unlocked),
    [achievements]
  );

  const profileStats = useMemo(() => {
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const totalSavedConverted = formatCurrency(
      convertToCurrency(savedTotalUSD, currencyCode),
      currencyCode
    );
    const completed = wishes.filter((wish) => wish.status === "done").length;
    return [
      { label: t("statsSaved"), value: totalSavedConverted },
      { label: t("statsItems"), value: `${completed}/${wishes.length}` },
      { label: t("statsDeclines"), value: `${declineCount}` },
      { label: t("statsFreeDays"), value: `${freeDayStats.current}🔥` },
    ];
  }, [savedTotalUSD, wishes, declineCount, freeDayStats.current, t, profile.currency]);

  const analyticsStats = useMemo(
    () => [
      { label: t("analyticsPendingToBuy"), value: `${wishes.length}` },
      { label: t("analyticsPendingToDecline"), value: `${declineCount}` },
      { label: t("analyticsFridgeCount"), value: `${pendingList.length}` },
    ],
    [wishes.length, declineCount, pendingList.length, t]
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
        savedTotalRaw,
        declinesRaw,
        freeDayRaw,
        decisionStatsRaw,
        historyRaw,
        refuseStatsRaw,
        rewardsCelebratedRaw,
        analyticsOptOutRaw,
        goalMapRaw,
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
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_TOTAL),
        AsyncStorage.getItem(STORAGE_KEYS.DECLINES),
        AsyncStorage.getItem(STORAGE_KEYS.FREE_DAY),
        AsyncStorage.getItem(STORAGE_KEYS.DECISION_STATS),
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.REFUSE_STATS),
        AsyncStorage.getItem(STORAGE_KEYS.REWARDS_CELEBRATED),
        AsyncStorage.getItem(STORAGE_KEYS.ANALYTICS_OPT_OUT),
        AsyncStorage.getItem(STORAGE_KEYS.TEMPTATION_GOALS),
      ]);
      if (wishesRaw) setWishes(JSON.parse(wishesRaw));
      if (pendingRaw) setPendingList(JSON.parse(pendingRaw));
      if (purchasesRaw) setPurchases(JSON.parse(purchasesRaw));
      let parsedProfile = null;
      if (profileRaw) {
        parsedProfile = { ...DEFAULT_PROFILE, ...JSON.parse(profileRaw) };
        const normalizedPrimaryGoals = Array.isArray(parsedProfile.primaryGoals)
          ? parsedProfile.primaryGoals
              .map((entry) => ({
                id: entry?.id || parsedProfile.goal || DEFAULT_PROFILE.goal,
                targetUSD:
                  Number.isFinite(entry?.targetUSD) && entry.targetUSD > 0
                    ? entry.targetUSD
                    : getGoalDefaultTargetUSD(entry?.id || parsedProfile.goal || DEFAULT_PROFILE.goal),
              }))
              .filter((entry) => entry.id)
          : [];
        if (!normalizedPrimaryGoals.length) {
          const fallbackId = parsedProfile.goal || DEFAULT_PROFILE.goal;
          normalizedPrimaryGoals.push({
            id: fallbackId,
            targetUSD:
              Number.isFinite(parsedProfile.goalTargetUSD) && parsedProfile.goalTargetUSD > 0
                ? parsedProfile.goalTargetUSD
                : getGoalDefaultTargetUSD(fallbackId),
          });
        }
        parsedProfile.primaryGoals = normalizedPrimaryGoals;
        parsedProfile.goal = normalizedPrimaryGoals[0]?.id || DEFAULT_PROFILE.goal;
        parsedProfile.goalTargetUSD = normalizedPrimaryGoals.reduce(
          (sum, goal) => sum + (Number.isFinite(goal.targetUSD) ? goal.targetUSD : 0),
          0
        );
        parsedProfile.goalCelebrated = !!parsedProfile.goalCelebrated;
        parsedProfile.spendingProfile = {
          baselineMonthlyWasteUSD: Math.max(
            0,
            Number(parsedProfile.spendingProfile?.baselineMonthlyWasteUSD) || 0
          ),
          baselineStartAt: parsedProfile.spendingProfile?.baselineStartAt || null,
        };
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
        setActiveCurrency(DEFAULT_PROFILE.currency);
      }
      if (themeRaw) setTheme(themeRaw);
      if (languageRaw) setLanguage(languageRaw);
      if (catalogRaw) setCatalogOverrides(JSON.parse(catalogRaw));
      if (titleRaw) setTitleOverrides(JSON.parse(titleRaw));
      if (savedTotalRaw) setSavedTotalUSD(Number(savedTotalRaw) || 0);
      if (declinesRaw) setDeclineCount(Number(declinesRaw) || 0);
      if (freeDayRaw) {
        setFreeDayStats({ ...INITIAL_FREE_DAY_STATS, ...JSON.parse(freeDayRaw) });
      }
      if (decisionStatsRaw) {
        setDecisionStats({ ...INITIAL_DECISION_STATS, ...JSON.parse(decisionStatsRaw) });
      }
      if (historyRaw) {
        setHistoryEvents(JSON.parse(historyRaw));
      }
      if (refuseStatsRaw) {
        setRefuseStats(JSON.parse(refuseStatsRaw));
      }
      if (rewardsCelebratedRaw) {
        setRewardCelebratedMap(JSON.parse(rewardsCelebratedRaw));
      }
      if (analyticsOptOutRaw) {
        setAnalyticsOptOutState(analyticsOptOutRaw === "1");
      }
      if (goalMapRaw) {
        try {
          setTemptationGoalMap(JSON.parse(goalMapRaw));
        } catch (err) {
          console.warn("goal map parse", err);
        }
      }
      if (onboardingRaw === "done" || parsedProfile?.goal) {
        setOnboardingStep("done");
      } else if (parsedProfile?.firstName) {
        setOnboardingStep("logo");
      } else {
        setOnboardingStep("logo");
      }
    } catch (error) {
      console.warn("load error", error);
    } finally {
      setRewardsReady(true);
    }
  };

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    if ((registrationData.goalSelections?.length || 0) !== selectedGoals.length) {
      setSelectedGoals(registrationData.goalSelections || []);
    }
  }, [registrationData.goalSelections, selectedGoals.length]);

  useEffect(() => {
    if (onboardingStep === "done" && (profile.primaryGoals || []).length) {
      ensurePrimaryGoalWish(profile.primaryGoals, language);
    }
  }, [ensurePrimaryGoalWish, onboardingStep, profile.primaryGoals, language]);

  useEffect(() => {
    const goalId = profile.goal || DEFAULT_PROFILE.goal;
    const targetUSD =
      (Number.isFinite(profile.goalTargetUSD) && profile.goalTargetUSD > 0
        ? profile.goalTargetUSD
        : getGoalDefaultTargetUSD(goalId));
    const hasMetGoal = targetUSD > 0 && savedTotalUSD >= targetUSD;
    if (hasMetGoal && !profile.goalCelebrated) {
      const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
      const targetLabel = formatCurrency(convertToCurrency(targetUSD, currencyCode), currencyCode);
      setProfile((prev) => ({ ...prev, goalCelebrated: true }));
      setProfileDraft((prev) => ({ ...prev, goalCelebrated: true }));
      triggerOverlayState(
        "goal_complete",
        {
          title: t("goalCelebrationTitle"),
          subtitle: t("goalCelebrationSubtitle"),
          targetLabel: t("goalCelebrationTarget", { amount: targetLabel }),
        },
        5200
      );
    }
  }, [
    profile.goal,
    profile.goalTargetUSD,
    profile.goalCelebrated,
    profile.currency,
    savedTotalUSD,
    triggerOverlayState,
    t,
  ]);

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
    setActiveCurrency(profile.currency || DEFAULT_PROFILE.currency);
  }, [profile.currency]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.THEME, theme).catch(() => {});
  }, [theme]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language).catch(() => {});
  }, [language]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalogOverrides)).catch(() => {});
  }, [catalogOverrides]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.TITLE_OVERRIDES, JSON.stringify(titleOverrides)).catch(() => {});
  }, [titleOverrides]);

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
    if (!rewardsReady || !achievements.length) return;
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
  }, [achievements, rewardCelebratedMap, rewardsReady]);

  useEffect(() => {
    setWishes((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.slice();
      let manualReserved = 0;
      const manualEntries = [];
      prev.forEach((wish, index) => {
        if (wish.autoManaged === false) {
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
        if (wish.autoManaged === false) {
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
  }, [savedTotalUSD, wishes]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.DECISION_STATS, JSON.stringify(decisionStats)).catch(() => {});
  }, [decisionStats]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(historyEvents)).catch(() => {});
  }, [historyEvents]);

  useEffect(() => {
    const nextList = DEFAULT_TEMPTATIONS.map((item) => ({
      ...item,
      priceUSD: catalogOverrides[item.id] ?? item.basePriceUSD,
      titleOverride: titleOverrides[item.id] || null,
    })).sort(
      (a, b) =>
        (a.priceUSD ?? a.basePriceUSD ?? 0) - (b.priceUSD ?? b.basePriceUSD ?? 0)
    );
    const personalized = buildPersonalizedTemptations(profile, nextList).map((card) => ({
      ...card,
      titleOverride: titleOverrides[card.id] ?? card.titleOverride ?? null,
    }));
    const quickAdjusted = quickTemptations.map((card) => ({
      ...card,
      priceUSD: catalogOverrides[card.id] ?? card.priceUSD ?? card.basePriceUSD,
      titleOverride: titleOverrides[card.id] ?? card.titleOverride ?? null,
    }));
    setTemptations([...quickAdjusted, ...personalized]);
  }, [catalogOverrides, profile, titleOverrides, quickTemptations]);

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

  const handleProfileCurrencyChange = (code) => {
    if (!CURRENCIES.includes(code) || profile.currency === code) return;
    triggerHaptic();
    setProfile((prev) => ({ ...prev, currency: code }));
    setProfileDraft((prev) => ({ ...prev, currency: code }));
    setRegistrationData((prev) => ({ ...prev, currency: code }));
    setActiveCurrency(code);
  };

  const handleAnalyticsToggle = (enabled) => {
    triggerHaptic();
    setAnalyticsOptOutState(!enabled);
  };

  const handleProfileGoalChange = (goalId) => {
    if (!goalId) return;
    triggerHaptic();
    const toggleGoals = (currentGoals = []) => {
      const list = Array.isArray(currentGoals) ? currentGoals : [];
      const exists = list.some((goal) => goal.id === goalId);
      let nextGoals = exists
        ? list.filter((goal) => goal.id !== goalId)
        : [...list, { id: goalId, targetUSD: getGoalDefaultTargetUSD(goalId) }];
      if (!nextGoals.length) {
        const fallbackId = DEFAULT_PROFILE.goal;
        nextGoals = [{ id: fallbackId, targetUSD: getGoalDefaultTargetUSD(fallbackId) }];
      }
      return nextGoals;
    };
    const nextPrimaryGoals = toggleGoals(profile.primaryGoals);
    const aggregatedTarget = nextPrimaryGoals.reduce(
      (sum, goal) => sum + (Number.isFinite(goal.targetUSD) ? goal.targetUSD : 0),
      0
    );
    setProfile((prev) => ({
      ...prev,
      primaryGoals: nextPrimaryGoals,
      goal: nextPrimaryGoals[0]?.id || DEFAULT_PROFILE.goal,
      goalTargetUSD: aggregatedTarget,
      goalCelebrated: false,
    }));
    setProfileDraft((prev) => ({
      ...prev,
      primaryGoals: nextPrimaryGoals,
      goal: nextPrimaryGoals[0]?.id || DEFAULT_PROFILE.goal,
      goalTargetUSD: aggregatedTarget,
      goalCelebrated: false,
    }));
    ensurePrimaryGoalWish(nextPrimaryGoals, language);
  };

  const handleLanguageContinue = () => {
    triggerHaptic();
    setOnboardingStep("guide");
  };

  const handleGuideContinue = () => {
    triggerHaptic();
    setOnboardingStep("register");
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
    (goalEntries = [], lng) => {
      const entries = Array.isArray(goalEntries) ? goalEntries : [];
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
        const nextPrimary = entries
          .filter((entry) => entry?.id)
          .map((entry) => {
            const goalPreset = getGoalPreset(entry.id);
            const title = goalPreset
              ? `${goalPreset.emoji} ${goalPreset[languageKey] || goalPreset.en}`
              : `${entry.id}`;
            const targetUSD =
              Number.isFinite(entry.targetUSD) && entry.targetUSD > 0
                ? entry.targetUSD
                : getGoalDefaultTargetUSD(entry.id);
            const existing = existingMap.get(entry.id) || existingMap.get("legacy");
            return {
              id: getPrimaryGoalWishId(entry.id),
              templateId: `goal_${entry.id}`,
              title,
              targetUSD,
              savedUSD: existing?.savedUSD || 0,
              status: existing?.status || "active",
              createdAt: existing?.createdAt || Date.now(),
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
    setOnboardingStep("persona");
  };

  const handleQuickCustomChange = (field, value) => {
    setQuickSpendDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuickCustomSubmit = (customData) => {
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const parsedAmount = parseFloat((customData.amount || "").replace(",", "."));
    if (!customData.title?.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Almost", t("customSpendTitle"));
      return;
    }
    const amountUSD = convertFromCurrency(parsedAmount, currencyCode);
    const newCustom = {
      title: customData.title.trim(),
      amountUSD,
      currency: currencyCode,
      emoji: customData.emoji || "✨",
      id: customData.id || `custom_habit_${Date.now()}`,
    };
    const card = createCustomHabitTemptation(newCustom, currencyCode);
    if (card) {
      setQuickTemptations((prev) => [card, ...prev]);
    }
    setQuickSpendDraft({ title: "", amount: "" });
    setShowCustomSpend(false);
    triggerOverlayState("cart", t("wishAdded", { title: newCustom.title }));
  };

  const handleQuickCustomCancel = () => {
    setQuickSpendDraft({ title: "", amount: "" });
    setShowCustomSpend(false);
  };

  const handlePersonaSubmit = () => {
    if (!registrationData.persona) {
      Alert.alert("Almost", t("personaHabitLabel"));
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setOnboardingStep("habit");
  };

  const handleHabitSubmit = (skip = false) => {
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
    } else {
      setRegistrationData((prev) => ({
        ...prev,
        customSpendTitle: "",
        customSpendAmount: "",
      }));
    }
    const customAmountLocal = parseFloat((registrationData.customSpendAmount || "").replace(",", "."));
    const hasCustom = !skip && registrationData.customSpendTitle.trim() && Number.isFinite(customAmountLocal) && customAmountLocal > 0;
    const customAmountUSD = hasCustom
      ? convertFromCurrency(customAmountLocal, registrationData.currency || DEFAULT_PROFILE.currency)
      : 0;
    logEvent("onboarding_custom_spend", {
      has_custom: !!hasCustom,
      price_usd: customAmountUSD || 0,
    });
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setOnboardingStep("baseline");
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
    setOnboardingStep("goal");
  };

  const handleBaselineSetupPrompt = () => {
    triggerHaptic();
    setRegistrationData((prev) => ({
      ...prev,
      currency: profile.currency || prev.currency || DEFAULT_PROFILE.currency,
      baselineMonthlyWaste: "",
      baselineCapturedAt: null,
    }));
    setOnboardingStep("baseline");
  };

  const handleGoalToggle = (goalId) => {
    triggerHaptic();
    const wasSelected = selectedGoals.includes(goalId);
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((id) => id !== goalId) : [...prev, goalId]
    );
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
        const defaultTargetUSD = getGoalDefaultTargetUSD(goalId);
        const defaultLocal = formatNumberInputValue(convertToCurrency(defaultTargetUSD, currencyCode));
        nextTargetMap[goalId] = nextTargetMap[goalId] || defaultLocal;
      }
      return {
        ...prev,
        goalSelections: nextSelections,
        goalTargetMap: nextTargetMap,
      };
    });
    if (!wasSelected && onboardingStep !== "done") {
      const preset = getGoalPreset(goalId);
      logEvent("onboarding_goal_chosen", {
        goal_id: goalId,
        target_usd: preset?.targetUSD || 0,
      });
    }
  };

  const handleGoalStageContinue = () => {
    const selections =
      (registrationData.goalSelections && registrationData.goalSelections.length > 0
        ? registrationData.goalSelections
        : selectedGoals) || [];
    if (!selections.length) {
      Alert.alert("Almost", t("goalTitle"));
      return;
    }
    triggerHaptic();
    setOnboardingStep("goal_target");
  };

  const handleGoalTargetSubmit = async () => {
    const selections =
      (registrationData.goalSelections && registrationData.goalSelections.length > 0
        ? registrationData.goalSelections
        : selectedGoals) || [];
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
    await handleGoalComplete(targets);
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

  const handleGoalComplete = async (targetsOverride = null) => {
    const selections =
      (registrationData.goalSelections && registrationData.goalSelections.length > 0
        ? registrationData.goalSelections
        : selectedGoals) || [];
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
    const primaryGoals = targets.map((entry) => ({
      id: entry.id,
      targetUSD: entry.usd > 0 ? entry.usd : getGoalDefaultTargetUSD(entry.id),
    }));
    const aggregatedGoalTargetUSD = primaryGoals.reduce(
      (sum, goal) => sum + (Number.isFinite(goal.targetUSD) ? goal.targetUSD : 0),
      0
    );
    const displayName = `${registrationData.firstName} ${registrationData.lastName}`.trim()
      || registrationData.firstName.trim()
      || DEFAULT_PROFILE.name;
    const personaId = registrationData.persona || DEFAULT_PERSONA_ID;
    const gender = registrationData.gender || "none";
    let customSpend = null;
    const customName = registrationData.customSpendTitle?.trim();
    const customAmount = parseFloat((registrationData.customSpendAmount || "").replace(",", "."));
    if (customName && Number.isFinite(customAmount) && customAmount > 0) {
      const amountUSD = convertFromCurrency(customAmount, registrationData.currency);
      customSpend = {
        title: customName,
        amountUSD,
        currency: registrationData.currency,
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
      goalTargetUSD: aggregatedGoalTargetUSD,
      goalCelebrated: false,
      persona: personaId,
      gender,
      customSpend,
      spendingProfile,
    };
    setProfile(updatedProfile);
    setProfileDraft(updatedProfile);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile)).catch(() => {});
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, "done").catch(() => {});
    setActiveCurrency(updatedProfile.currency);
    ensurePrimaryGoalWish(primaryGoals, language);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    triggerOverlayState("completion", t("goalCompleteMessage"), 2400);
    logEvent("onboarding_completed", {
      persona_id: personaId,
      goal_id: primaryGoals[0]?.id || selections[0] || DEFAULT_PROFILE.goal,
    });
    setTimeout(() => {
      setOnboardingStep("done");
      setSelectedGoals([]);
      setRegistrationData(INITIAL_REGISTRATION);
    }, 500);
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

  const logHistoryEvent = useCallback((kind, meta = {}) => {
    setHistoryEvents((prev) => {
      const entry = {
        id: `history-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        kind,
        meta,
        timestamp: Date.now(),
      };
      const next = [entry, ...prev];
      return next.slice(0, MAX_HISTORY_EVENTS);
    });
  }, []);

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
    },
    [language, logHistoryEvent]
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

  const handleTemptationAction = useCallback(
    async (type, item, options = {}) => {
      const { skipPrompt = false, goalId: forcedGoalId = null, shouldAssign = false } = options || {};
      const priceUSD = item.priceUSD || item.basePriceUSD || 0;
      const title = `${item.emoji || "✨"} ${
        item.title?.[language] || item.title?.en || item.title || "wish"
      }`;
      if (type === "spend") {
        logEvent("temptation_spend", buildTemptationPayload(item, { total_saved_usd: savedTotalUSD }));
        setSpendPrompt({ visible: true, item });
        return;
      }
      if (type === "want") {
        logEvent("temptation_want", buildTemptationPayload(item));
        const newWish = {
          id: `wish-${item.id}-${Date.now()}`,
          templateId: item.id,
          title,
          targetUSD: priceUSD,
          savedUSD: 0,
          status: "active",
          createdAt: Date.now(),
          autoManaged: true,
        };
        setWishes((prev) => insertWishAfterPrimary(prev, newWish));
        logHistoryEvent("wish_added", { title, targetUSD: priceUSD, templateId: item.id });
        triggerOverlayState("purchase", t("wishAdded", { title }));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }
      if (type === "save") {
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
        if (targetGoalId) {
          applySavingsToWish(targetGoalId, priceUSD);
        }
        const timestamp = Date.now();
        setSavedTotalUSD((prev) => prev + priceUSD);
        setDeclineCount((prev) => prev + 1);
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
        triggerCardFeedback(item.id);
        triggerCoinHaptics();
        triggerOverlayState("save", title);
        return;
      }
      if (type === "maybe") {
        logEvent(
          "temptation_think_later",
          buildTemptationPayload(item, { reminder_days: REMINDER_DAYS })
        );
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
        logHistoryEvent("pending_added", { title, amountUSD: priceUSD });
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
      resolveTemptationGoalId,
      assignableGoals.length,
      assignTemptationGoal,
      applySavingsToWish,
      setGoalLinkPrompt,
      getFallbackGoalId,
      wishes.length,
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
        name: wish.title || "",
        target: targetLocal,
      });
    },
    [profile.currency]
  );

  const closeGoalEditorPrompt = useCallback(() => {
    setGoalEditorPrompt({ visible: false, wish: null, name: "", target: "" });
  }, []);

  const handleGoalEditorNameChange = useCallback((value) => {
    setGoalEditorPrompt((prev) => ({ ...prev, name: value }));
  }, []);

  const handleGoalEditorTargetChange = useCallback((value) => {
    setGoalEditorPrompt((prev) => ({ ...prev, target: value }));
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
    const currencyCode = profile.currency || DEFAULT_PROFILE.currency;
    const nextTargetUSD = convertFromCurrency(parsed, currencyCode);
    setWishes((prev) =>
      prev.map((wish) => {
        if (wish.id !== goalEditorPrompt.wish.id) return wish;
        const nextSaved = Math.min(wish.savedUSD || 0, nextTargetUSD);
        const nextStatus = nextSaved >= nextTargetUSD ? "done" : "active";
        return {
          ...wish,
          title: trimmedName,
          targetUSD: nextTargetUSD,
          savedUSD: nextSaved,
          status: nextStatus,
        };
      })
    );
    if (
      goalEditorPrompt.wish.kind === PRIMARY_GOAL_KIND &&
      goalEditorPrompt.wish.goalId
    ) {
      setProfile((prev) =>
        updatePrimaryGoalTargetInProfile(prev, goalEditorPrompt.wish.goalId, nextTargetUSD)
      );
      setProfileDraft((prev) =>
        updatePrimaryGoalTargetInProfile(prev, goalEditorPrompt.wish.goalId, nextTargetUSD)
      );
    }
    closeGoalEditorPrompt();
  }, [closeGoalEditorPrompt, goalEditorPrompt, profile.currency, setProfile, setProfileDraft, t]);

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

  const openPriceEditor = (item) => {
    const currentValue = convertToCurrency(item.priceUSD || item.basePriceUSD || 0);
    setPriceEditor({
      visible: true,
      item,
      value: String(Math.round(currentValue * 100) / 100),
      title: resolveTemptationTitle(item, language, titleOverrides[item.id]),
    });
  };

  const closePriceEditor = () => {
    setPriceEditor({ visible: false, item: null, value: "", title: "" });
  };

  const handlePriceInputChange = (value) => {
    setPriceEditor((prev) => ({ ...prev, value }));
  };

  const handlePriceTitleChange = (value) => {
    setPriceEditor((prev) => ({ ...prev, title: value }));
  };

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
    closePriceEditor();
  };

  const resetPriceEdit = () => {
    persistPriceOverride(null);
    persistTitleOverride(null);
    closePriceEditor();
  };

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
          autoManaged: true,
        };
        setWishes((prev) => insertWishAfterPrimary(prev, newWish));
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
        logHistoryEvent("pending_to_wish", { title, targetUSD });
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
      (next.type === "cart" ? 1800 : next.type === "level" ? 3200 : next.type === "reward" ? 3200 : 2600);
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

  const triggerCelebration = () => {
    const messages = getCelebrationMessages(language, activeGender);
    if (!messages.length) return;
    triggerOverlayState("purchase", messages[Math.floor(Math.random() * messages.length)]);
  };

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
            setWishes([]);
            setPendingList([]);
            setPurchases([]);
            setSavedTotalUSD(0);
            setDeclineCount(0);
            setCatalogOverrides({});
            setTitleOverrides({});
            setQuickTemptations([]);
            setFreeDayStats({ ...INITIAL_FREE_DAY_STATS });
            setDecisionStats({ ...INITIAL_DECISION_STATS });
            setHistoryEvents([]);
            setRefuseStats({});
            setProfile({ ...DEFAULT_PROFILE });
            setProfileDraft({ ...DEFAULT_PROFILE });
            setRegistrationData(INITIAL_REGISTRATION);
            setSelectedGoals([]);
            setOnboardingStep("logo");
            setActiveCategory("all");
            setActiveTab("feed");
            setOverlay(null);
            setTheme("light");
            setLanguage("ru");
            setActiveCurrency(DEFAULT_PROFILE.currency);
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
      ? profileDraft.primaryGoals.map((entry) => ({
          id: entry?.id || profileDraft.goal || profile.goal || DEFAULT_PROFILE.goal,
          targetUSD:
            Number.isFinite(entry?.targetUSD) && entry.targetUSD > 0
              ? entry.targetUSD
              : getGoalDefaultTargetUSD(entry?.id || profileDraft.goal || profile.goal || DEFAULT_PROFILE.goal),
        }))
      : [
          {
            id: profileDraft.goal || profile.goal || DEFAULT_PROFILE.goal,
            targetUSD: getGoalDefaultTargetUSD(profileDraft.goal || profile.goal || DEFAULT_PROFILE.goal),
          },
        ];
    const aggregatedTarget = normalizedGoals.reduce(
      (sum, goal) => sum + (Number.isFinite(goal.targetUSD) ? goal.targetUSD : 0),
      0
    );
    const hasMetTarget = aggregatedTarget > 0 && savedTotalUSD >= aggregatedTarget;
    const nextProfile = {
      ...profileDraft,
      primaryGoals: normalizedGoals,
      goal: normalizedGoals[0]?.id || DEFAULT_PROFILE.goal,
      goalTargetUSD: aggregatedTarget,
      goalCelebrated: hasMetTarget ? profileDraft.goalCelebrated : false,
    };
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
          />
        );
      case "purchases":
        return (
          <RewardsScreen
            achievements={achievements}
            t={t}
            colors={colors}
            savedTotalUSD={savedTotalUSD}
            currency={profile.currency || DEFAULT_PROFILE.currency}
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
            freeDayStats={freeDayStats}
            rewardBadges={unlockedRewards}
            analyticsOptOut={analyticsOptOut}
            onAnalyticsToggle={handleAnalyticsToggle}
            t={t}
            colors={colors}
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
            onEditPrice={openPriceEditor}
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
            onLevelCelebrate={(level) => triggerOverlayState("level", level)}
            onBaselineSetup={handleBaselineSetupPrompt}
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
    };
    const screen = onboardingScreens[onboardingStep];
    if (screen) {
      logScreenView(screen);
    }
  }, [onboardingStep]);

  if (onboardingStep !== "done") {
    let onboardContent = null;
    if (onboardingStep === "logo") {
      onboardContent = <LogoSplash onDone={() => setOnboardingStep("language")} />;
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
        />
      );
    } else if (onboardingStep === "guide") {
      onboardContent = (
        <HowItWorksScreen colors={colors} t={t} onContinue={handleGuideContinue} />
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
        />
      );
    } else if (onboardingStep === "goal") {
      onboardContent = (
        <GoalScreen
          selectedGoals={registrationData.goalSelections || selectedGoals}
          onToggle={handleGoalToggle}
          onSubmit={handleGoalStageContinue}
          colors={colors}
          t={t}
          language={language}
        />
      );
    } else if (onboardingStep === "goal_target") {
      onboardContent = (
        <GoalTargetScreen
          selections={registrationData.goalSelections || selectedGoals}
          values={registrationData.goalTargetMap || {}}
          currency={registrationData.currency || profile.currency || DEFAULT_PROFILE.currency}
          onChange={handleGoalTargetDraftChange}
          onSubmit={handleGoalTargetSubmit}
          onBack={() => setOnboardingStep("goal")}
          colors={colors}
          t={t}
          language={language}
        />
      );
    }
    const onboardingBackground = onboardingStep === "logo" ? "#fff" : colors.background;
    return (
      <>
        <SafeAreaView style={[styles.appShell, { backgroundColor: onboardingBackground }] }>
          {onboardContent || <LogoSplash onDone={() => setOnboardingStep("language")} />}
        </SafeAreaView>
        <ImageSourceSheet
          visible={showImageSourceSheet}
          colors={colors}
          t={t}
          onClose={closeImagePickerSheet}
          onSelect={handleImageSourceChoice}
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
      <SafeAreaView style={[styles.appShell, { backgroundColor: colors.background }] }>
        <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }] }>
          {["feed", "cart", "pending", "purchases", "profile"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabButton}
              onPress={() => handleTabChange(tab)}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: activeTab === tab ? colors.text : colors.muted,
                    fontWeight: activeTab === tab ? "700" : "500",
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
          ))}
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
          onPress={() => {
            Keyboard.dismiss();
            triggerHaptic();
            setQuickSpendDraft({ title: "", amount: "" });
            setShowCustomSpend(true);
          }}
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

        {overlay &&
          overlay.type !== "level" &&
          overlay.type !== "save" &&
          overlay.type !== "reward" &&
          overlay.type !== "goal_complete" && (
          <View style={styles.confettiLayer} pointerEvents="none">
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
              {(overlay.type === "cancel" || overlay.type === "purchase" || overlay.type === "completion") && (
                <Image
                  source={CAT_IMAGE}
                  style={[
                    styles.celebrationCat,
                    overlay.type === "purchase" || overlay.type === "completion" ? styles.catHappy : styles.catSad,
                  ]}
                />
              )}
              <Text style={[styles.celebrationText, { color: colors.text }]}>
                {overlay.message}
              </Text>
            </View>
          </View>
        )}
        {overlay?.type === "level" && (
          <LevelUpCelebration colors={colors} message={overlay.message} level={overlay.message} t={t} />
        )}
        {overlay?.type === "save" && (
          <View style={styles.saveOverlay} pointerEvents="none">
            <View
              style={[
                styles.overlayDim,
                { backgroundColor: overlayDimColor },
              ]}
            />
            <View
              style={[
                styles.saveCard,
                { backgroundColor: overlayCardBackground, borderColor: overlayBorderColor },
              ]}
            >
              <Image source={CAT_HAPPY_GIF} style={styles.saveGif} />
              <Text style={[styles.saveTitle, { color: colors.text }]}>
                {t("saveCelebrateTitle", { title: overlay.message })}
              </Text>
              <Text style={[styles.saveSubtitle, { color: colors.muted }]}>
                {t("saveCelebrateSubtitle")}
              </Text>
            </View>
          </View>
        )}
        {overlay?.type === "reward" && (
          <RewardCelebration colors={colors} message={overlay.message} t={t} />
        )}
        {overlay?.type === "goal_complete" && (
          <GoalCelebration colors={colors} payload={overlay.message} t={t} />
        )}

        <Modal visible={priceEditor.visible} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={closePriceEditor}>
            <View style={styles.priceModalBackdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.priceModalCard, { backgroundColor: colors.card }] }>
                  <Text style={[styles.priceModalTitle, { color: colors.text }]}>
                    {priceEditor.item
                      ? priceEditor.item.title?.[language] ||
                        priceEditor.item.title?.en ||
                        t("priceEditTitle")
                      : t("priceEditTitle")}
                  </Text>
                  <Text style={[styles.priceModalLabel, { color: colors.muted, marginTop: 0 }]}>
                    {t("priceEditNameLabel")}
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
                    value={priceEditor.title}
                    onChangeText={handlePriceTitleChange}
                    placeholder={t("priceEditNameLabel")}
                    placeholderTextColor={colors.muted}
                  />
                  <Text style={[styles.priceModalLabel, { color: colors.muted }]}>
                    {t("priceEditAmountLabel", {
                      currency: profile.currency || DEFAULT_PROFILE.currency,
                    })}
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
                    value={priceEditor.value}
                    onChangeText={handlePriceInputChange}
                    placeholder={t("priceEditPlaceholder")}
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.priceModalLabel, { color: colors.muted }]}>
                    {t("goalAssignFieldLabel")}
                  </Text>
                  <TouchableOpacity
                    style={[styles.goalPickerButton, { borderColor: colors.border }]}
                    onPress={() => {
                      if (!priceEditor.item) return;
                      setGoalLinkPrompt({ visible: true, item: priceEditor.item, intent: "edit" });
                    }}
                  >
                    <Text style={[styles.goalPickerButtonText, { color: colors.text }]}>
                      {priceEditorAssignedGoalTitle || t("goalAssignNone")}
                    </Text>
                  </TouchableOpacity>
                  {priceEditorAssignedGoalId && priceEditor.item && (
                    <TouchableOpacity
                      style={styles.goalPickerReset}
                      onPress={() => assignTemptationGoal(priceEditor.item.id, null)}
                    >
                      <Text style={[styles.goalPickerResetText, { color: colors.muted }]}>
                        {t("goalAssignClear")}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.priceModalButtons}>
                    <TouchableOpacity
                      style={[styles.priceModalPrimary, { backgroundColor: colors.text }]}
                      onPress={savePriceEdit}
                    >
                      <Text style={[styles.priceModalPrimaryText, { color: colors.background }]}>
                        {t("priceEditSave")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.priceModalSecondary, { borderColor: colors.border }]}
                      onPress={resetPriceEdit}
                    >
                      <Text style={[styles.priceModalSecondaryText, { color: colors.muted }]}>
                        {t("priceEditReset")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={closePriceEditor}>
                      <Text style={[styles.priceModalCancel, { color: colors.muted }]}>
                        {t("priceEditCancel")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal visible={goalLinkPrompt.visible} transparent animationType="fade">
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

        <Modal visible={goalTemptationPrompt.visible} transparent animationType="fade">
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

        <Modal visible={goalEditorPrompt.visible} transparent animationType="fade">
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
      </TouchableWithoutFeedback>
    </SavingsProvider>
  );
}

export default Sentry.wrap(App);

const styles = StyleSheet.create({
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
  heroTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  appName: {
    fontSize: 44,
    fontWeight: "800",
  },
  heroTagline: {
    fontSize: 18,
    marginTop: 6,
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
    marginTop: 18,
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
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
    lineHeight: 18,
    width: "100%",
  },
  savedHeroLevelBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    position: "absolute",
    top: -6,
    right: 0,
    zIndex: 1,
  },
  savedHeroLevelText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  savedHeroAmountWrap: {
    marginTop: 4,
    marginBottom: 10,
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
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroPotentialValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  heroPotentialSubtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  heroPotentialTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  heroPotentialFill: {
    height: "100%",
  },
  heroPotentialHint: {
    fontSize: 12,
    fontWeight: "600",
  },
  heroPotentialStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  heroPotentialButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  heroPotentialButtonText: {
    fontWeight: "700",
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
    fontSize: 12,
    fontWeight: "700",
  },
  savedHeroGoalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  savedHeroGoalLabel: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  goalCompleteBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  goalCompleteBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  savedHeroNextText: {
    marginTop: 6,
  },
  savedHeroNextRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
    fontSize: 18,
    fontWeight: "700",
  },
  progressHeroAmount: {
    fontSize: 24,
    fontWeight: "800",
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
  },
  freeDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  freeDayLabel: {
    fontSize: 12,
    textTransform: "uppercase",
  },
  freeDayValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  freeDayStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  freeDayStat: {
    flex: 1,
  },
  freeDayStatLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  freeDayStatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  freeDayButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  freeDayButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  freeDaySummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  freeDayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  freeDayChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  freeDayToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freeDayToggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  freeDayLockedPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  freeDayLockedText: {
    fontSize: 12,
    fontWeight: "600",
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
    borderRadius: 32,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 24,
  },
  temptationSwipeIcon: {
    fontSize: 28,
  },
  temptationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  temptationEmoji: {
    fontSize: 28,
  },
  temptationTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    flexWrap: "wrap",
  },
  temptationDesc: {
    lineHeight: 20,
  },
  temptationPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  temptationPrice: {
    fontSize: 20,
    fontWeight: "700",
  },
  temptationGoalLabel: {
    fontSize: 12,
    marginTop: 6,
  },
  editPriceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  temptationRefuseMeta: {
    fontSize: 12,
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
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButtonClear: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryButtonClearText: {
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
  closeButton: {
    alignSelf: "flex-end",
  },
  closeButtonText: {
    fontSize: 28,
  },
  header: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 16,
  },
  subheader: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyStateText: {
    marginTop: 6,
    textAlign: "center",
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
    fontSize: 22,
    fontWeight: "700",
  },
  cartEmptySubtitle: {
    fontSize: 16,
    textAlign: "center",
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
  },
  wishHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wishTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    paddingRight: 12,
  },
  wishBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  wishMeta: {
    fontSize: 13,
    marginBottom: 4,
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
  wishButtonGhost: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 14,
    fontWeight: "600",
  },
  goalSwipeContent: {
    width: "100%",
    zIndex: 1,
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
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  primaryGoalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  primaryGoalSubtitle: {
    fontSize: 13,
    marginTop: 6,
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
    fontSize: 16,
    fontWeight: "800",
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
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  pendingDue: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  pendingPrice: {
    fontSize: 16,
    fontWeight: "600",
  },
  pendingButtons: {
    flexDirection: "row",
    gap: 10,
  },
  pendingButtonPrimary: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  pendingButtonPrimaryText: {
    fontWeight: "700",
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
    fontSize: 18,
    fontWeight: "600",
  },
  cartTotalAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  buyAllButton: {
    marginTop: 18,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  buyAllButtonText: {
    fontWeight: "700",
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
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  levelWidgetSubtitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  levelWidgetBar: {
    height: 14,
    borderRadius: 16,
    overflow: "hidden",
  },
  levelWidgetFill: {
    height: "100%",
    borderRadius: 16,
  },
  levelWidgetMeta: {
    fontSize: 13,
    fontWeight: "600",
  },
  goalCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    gap: 12,
  },
  goalTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  goalDesc: {
    marginTop: 4,
  },
  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rewardBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rewardBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
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
  goalBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    fontSize: 12,
    textTransform: "uppercase",
  },
  profileCard: {
    borderRadius: 30,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  profileScrollContent: {
    paddingTop: 4,
    paddingBottom: 200,
    flexGrow: 1,
  },
  profileAvatarWrap: {
    alignItems: "center",
    marginBottom: 12,
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
    fontSize: 12,
    fontWeight: "600",
  },
  profileAvatarHint: {
    fontSize: 12,
    marginTop: 8,
  },
  profileName: {
    fontSize: 28,
    fontWeight: "800",
  },
  profileSubtitle: {
    marginTop: 4,
  },
  profileBio: {
    marginTop: 10,
    textAlign: "center",
    lineHeight: 20,
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
    fontWeight: "700",
  },
  profileStatLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    marginTop: 4,
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
    fontWeight: "700",
  },
  profileActionSecondary: {
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  profileActionSecondaryText: {
    fontWeight: "600",
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
  historyItem: {
    paddingVertical: 12,
  },
  historyItemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  historyItemMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  resetButtonText: {
    fontWeight: "600",
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
  tabButtonText: {
    fontSize: 13,
    textTransform: "uppercase",
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
    marginVertical: 12,
    textAlign: "center",
  },
  appleButton: {
    paddingVertical: 16,
    borderRadius: 26,
    alignItems: "center",
    marginTop: 12,
  },
  appleButtonText: {
    fontWeight: "700",
    fontSize: 16,
  },
  payCancel: {
    textAlign: "center",
    marginTop: 12,
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
    fontWeight: "700",
  },
  languageMascot: {
    width: 240,
    height: 240,
    alignSelf: "center",
    marginBottom: 10,
  },
  confettiLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    fontSize: 28,
    fontWeight: "900",
  },
  levelSubtitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
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
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(18,15,40,0.08)",
    marginHorizontal: 24,
  },
  saveGif: {
    width: 120,
    height: 120,
    borderRadius: 28,
    resizeMode: "contain",
  },
  saveTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  saveSubtitle: {
    fontSize: 14,
    fontWeight: "600",
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
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  sheetSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  sheetButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  sheetCancel: {
    textAlign: "center",
    fontWeight: "600",
    marginTop: 4,
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
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  priceModalLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  priceModalInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    textAlign: "center",
  },
  goalPickerButton: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  goalPickerButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  goalPickerReset: {
    marginTop: 6,
  },
  goalPickerResetText: {
    fontSize: 13,
    fontWeight: "600",
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
    fontSize: 32,
    fontWeight: "800",
  },
  onboardSubtitle: {
    fontSize: 16,
    lineHeight: 22,
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
    fontSize: 14,
    lineHeight: 20,
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
    fontWeight: "700",
    fontSize: 15,
  },
  personaSubtitleCard: {
    fontSize: 13,
    lineHeight: 18,
  },
  goalEmoji: {
    fontSize: 28,
  },
  goalText: {
    fontWeight: "600",
    textAlign: "center",
  },
  languageButtons: {
    flexDirection: "row",
    gap: 14,
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
    fontWeight: "600",
  },
  languageButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
  },
  languageHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
  },
  goalTargetBack: {
    marginBottom: 16,
  },
  goalTargetBackText: {
    fontSize: 13,
    fontWeight: "600",
  },
  goalTargetHint: {
    marginTop: 8,
    marginBottom: 22,
    fontSize: 13,
  },
  logoSplash: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoSplashText: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#111",
  },
});
function ImageSourceSheet({ visible, colors, t, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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

function RegistrationScreen({ data, onChange, onSubmit, onPickImage, colors, t }) {
  const fade = useFadeIn();

  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView
        contentContainerStyle={styles.onboardContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        <Text style={[styles.currencyLabel, { color: colors.muted }]}>{t("currencyLabel")}</Text>
        <View style={styles.currencyGrid}>
          {CURRENCIES.map((currency) => {
            const active = currency === data.currency;
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
                onPress={() => onChange("currency", currency)}
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

        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={onSubmit}>
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>{t("nextButton")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

function GoalScreen({ selectedGoals = [], onToggle, onSubmit, colors, t, language }) {
  const fade = useFadeIn();
  const selection = Array.isArray(selectedGoals) ? selectedGoals : [];
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false}>
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
}) {
  const fade = useFadeIn();
  const selectionList = Array.isArray(selections) ? selections : [];
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.goalTargetBack} onPress={onBack}>
          <Text style={[styles.goalTargetBackText, { color: colors.muted }]}>{t("goalTargetBack")}</Text>
        </TouchableOpacity>
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("goalTargetTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("goalTargetSubtitle")}</Text>
        {selectionList.map((goalId) => {
          const preset = getGoalPreset(goalId);
          const goalLabel = preset?.[language] || preset?.en || goalId;
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

function SpendingBaselineScreen({ value, currency, onChange, onSubmit, colors, t }) {
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("baselineTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("baselineSubtitle")}</Text>
        <View style={styles.baselineInputGroup}>
          <TextInput
            style={[
              styles.primaryInput,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.card },
            ]}
            placeholder={`${t("baselinePlaceholder")} (${currency})`}
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

function PersonaScreen({ data, onChange, onSubmit, colors, t, language }) {
  const fade = useFadeIn();
  const personaList = Object.values(PERSONA_PRESETS);
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false}>
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

function CustomHabitScreen({ data, onChange, onSubmit, colors, t, currency }) {
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false}>
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
            placeholder={`${t("customSpendAmountPlaceholder")} (${currency})`}
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={data.customSpendAmount}
            onChangeText={(text) => onChange("customSpendAmount", text)}
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
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

function HowItWorksScreen({ colors, t, onContinue }) {
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView
        contentContainerStyle={[styles.onboardContent, { gap: 18 }]}
        showsVerticalScrollIndicator={false}
      >
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
}) {
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <View style={styles.onboardContent}>
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
