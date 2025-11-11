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
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const STORAGE_KEYS = {
  PURCHASES: "@almost_purchases",
  PROFILE: "@almost_profile",
  THEME: "@almost_theme",
  LANGUAGE: "@almost_language",
  ONBOARDING: "@almost_onboarded",
  CATALOG: "@almost_catalog_overrides",
  WISHES: "@almost_wishes",
  SAVED_TOTAL: "@almost_saved_total",
  DECLINES: "@almost_declines",
  PENDING: "@almost_pending",
  FREE_DAY: "@almost_free_day_stats",
  DECISION_STATS: "@almost_decision_stats",
  HISTORY: "@almost_history",
};

const PURCHASE_GOAL = 20000;
const CAT_IMAGE = "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=600&q=80";
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
    background: "#0E0F16",
    card: "#1C1F2B",
    text: "#F5F6FA",
    muted: "#9AA1D0",
    border: "#2E3142",
    primary: "#F5F6FA",
  },
};

const CELEBRATION_MESSAGES = {
  ru: [
    "Хоп! Ещё одна осознанная экономия",
    "Меньше лишних покупок, больше плана",
    "Кошелёк вздохнул спокойно",
    "Ты снова выбрала умный своп вместо растрат",
  ],
  en: [
    "Boom! Another mindful deal",
    "Less impulse, more plan",
    "Wallet just sighed with relief",
    "Smart deal locked – savings are safe",
  ],
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
    appTagline: "витрина искушений, которые помогают копить",
    heroAwaiting: "в листе желаний",
    heroSpendLine: "уже сэкономлено {{amount}}. Красота без ущерба бюджету",
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
    wishlistTitle: "Мои хотелки",
    wishlistEmptyTitle: "Пока нет целей",
    wishlistEmptySubtitle: "Добавь мечту из ленты и начинай копить в своём темпе",
    wishlistTab: "Хотелки",
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
    freeDayStreakLabel: "Серия бесплатных дней",
    freeDayTotalLabel: "Всего: {{total}}",
    pendingTab: "Холодильник",
    pendingTitle: "Холодильник",
    pendingEmptyTitle: "В холодильнике пусто",
    pendingEmptySubtitle: "Отправляй хотелки «в холодильник» — вернёмся через 14 дней.",
    pendingDaysLeft: "осталось {{days}} д.",
    pendingExpired: "срок вышел",
    pendingDueToday: "реши сегодня",
    pendingActionWant: "Начать копить",
    pendingActionDecline: "Сэкономить",
    pendingNotificationTitle: "Прошло 14 дней",
    pendingNotificationBody: "Готов(а) решить, что делать с «{{title}}»?",
    pendingAdded: "Улетело в холодильник. Напомним вовремя.",
    feedTab: "Лента",
    profileTab: "Профиль",
    payButton: "Оплатить",
    cartOverlay: "Экономия пополнена",
    purchasesTitle: "Награды",
    purchasesSubtitle: "Следи за достижениями и напоминай себе, зачем копишь",
    progressLabel: "уровень осознанности",
    progressGoal: "{{current}} / {{goal}}",
    progressHint: "осталось {{amount}} до титула ‘герой финансового дзена’",
    emptyPurchases: "Пока чисто. Значит, ты в плюсе",
    profileEdit: "Редактировать",
    profileSave: "Сохранить",
    profileCancel: "Отмена",
    settingsTitle: "Настройки и персонализация",
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
    wantAction: "Хочу",
    declineAction: "Откажусь",
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
    wishAdded: "Добавлено в хотелки: {{title}}",
    wishDeclined: "+{{amount}} к копилке. Отличное решение!",
    statsSpent: "закрыто целей",
    statsSaved: "спасено",
    statsItems: "хотелок",
    statsCart: "в листе",
    statsDeclines: "отказов",
    statsFreeDays: "серия дней",
    analyticsTitle: "Прогресс",
    analyticsPendingToBuy: "Хотелки",
    analyticsPendingToDecline: "Отказы",
    analyticsBestStreak: "Бесплатных дней",
    historyTitle: "История событий",
    historyEmpty: "Тишина — добавь цель или отметь бесплатный день.",
    historyWishAdded: "Добавлена хотелка: {{title}}",
    historyWishProgress: "Прогресс по «{{title}}»: {{amount}} из {{target}}",
    historyWishDone: "Цель достигнута: {{title}}",
    historyDecline: "Отказ от {{title}} (+{{amount}})",
    historyPendingAdded: "Отложено на 14 дней: {{title}}",
    historyPendingWant: "После паузы решили копить: {{title}}",
    historyPendingDecline: "После паузы отказ: {{title}} (+{{amount}})",
    historyFreeDay: "Бесплатный день №{{total}}",
    historySpend: "Потратил(а): {{title}} (-{{amount}})",
    historyTimestamp: "{{date}} · {{time}}",
    historyUnknown: "событие",
    progressHeroTitle: "Спасено",
    progressHeroLevel: "уровень {{level}}",
    progressHeroNext: "До следующей цели {{amount}}",
    tileProgressLabel: "{{current}} из {{target}}",
    tileReady: "Можно брать",
    tileLocked: "Пока копим",
    spendWarning: "Потратишь {{amount}} — точно готов(а)?",
    rewardsEmpty: "Собери достижения — попробуй отказаться от пары лишних хотелок или отметь бесплатный день.",
    goalsTitle: "Цели и награды",
    rewardUnlocked: "достигнуто",
    rewardLocked: "осталось {{amount}}",
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
    inputFirstName: "Имя",
    inputLastName: "Фамилия",
    inputMotto: "Девиз дня",
    currencyLabel: "Валюта накоплений",
    nextButton: "Дальше",
    goalTitle: "Определим цель",
    goalSubtitle: "Выбери главное направление экономии",
    goalButton: "Готово",
    goalCompleteMessage: "Всё готово, погнали копить!",
  },
  en: {
    appTagline: "an offline temptation board that keeps savings safe",
    heroAwaiting: "on the wish list",
    heroSpendLine: "already saved {{amount}}. Glow without overspending",
    feedEmptyTitle: "Nothing here",
    feedEmptySubtitle: "Try another tag or refresh the catalog",
    buyNow: "Pay with {{pay}}",
    addToCart: "Save for later",
    buyExternal: "Open product page",
    wishlistTitle: "Wish list",
    wishlistEmptyTitle: "No goals yet",
    wishlistEmptySubtitle: "Pick a temptation from the feed and start saving for it",
    buyLabel: "Grab",
    buyAllLabel: "Check out everything",
    totalLabel: "Total",
    cartRemove: "Remove",
    wishlistTab: "Wishes",
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
    freeDayStreakLabel: "Free-day streak",
    freeDayTotalLabel: "Total: {{total}}",
    pendingTab: "Fridge",
    pendingTitle: "Fridge",
    pendingEmptyTitle: "Nothing in the fridge",
    pendingEmptySubtitle: "Park temptations in the fridge — we’ll remind you in 14 days.",
    pendingDaysLeft: "{{days}} days left",
    pendingExpired: "decision overdue",
    pendingDueToday: "decide today",
    pendingActionWant: "Start saving",
    pendingActionDecline: "Save it",
    pendingNotificationTitle: "14 days passed",
    pendingNotificationBody: "Ready to decide what to do with “{{title}}”?",
    pendingAdded: "Sent to the fridge. We’ll remind you in 2 weeks.",
    feedTab: "Feed",
    profileTab: "Profile",
    payButton: "Pay",
    cartOverlay: "Savings updated",
    purchasesTitle: "Rewards",
    purchasesSubtitle: "Track achievements and remind yourself why you save",
    progressLabel: "mindful level",
    progressGoal: "{{current}} / {{goal}}",
    progressHint: "{{amount}} left until ‘budget zen master’",
    emptyPurchases: "Nothing yet. Which already saves money",
    profileEdit: "Edit",
    profileSave: "Save",
    profileCancel: "Cancel",
    settingsTitle: "Settings & personalisation",
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
    wantAction: "Start saving",
    declineAction: "Skip it",
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
    wishAdded: "Added to wishes: {{title}}",
    wishDeclined: "+{{amount}} safely tucked away",
    freeDayButton: "Free day",
    freeDayLocked: "After 6 pm",
    freeDayLoggedToday: "Already logged today",
    freeDayConfirm: "Stayed away from impulse buys today?",
    freeDayCongrats: "{{days}} day streak! Budget loves it.",
    freeDayMilestone: "{{days}} days in a row! New badge unlocked.",
    freeDayStreakLabel: "Free-day streak",
    freeDayTotalLabel: "Total: {{total}}",
    statsSpent: "finished goals",
    statsSaved: "saved",
    statsItems: "wishes",
    statsCart: "in list",
    statsDeclines: "declines",
    statsFreeDays: "streak",
    analyticsTitle: "Progress",
    analyticsPendingToBuy: "Wishes",
    analyticsPendingToDecline: "Declines",
    analyticsBestStreak: "Free days",
    historyTitle: "Event log",
    historyEmpty: "Nothing yet — add a goal or mark a free day.",
    historyWishAdded: "Wish added: {{title}}",
    historyWishProgress: "Progress “{{title}}”: {{amount}} of {{target}}",
    historyWishDone: "Goal completed: {{title}}",
    historyDecline: "Declined {{title}} (+{{amount}} saved)",
    historyPendingAdded: "Queued for later: {{title}}",
    historyPendingWant: "Later decision → saving: {{title}}",
    historyPendingDecline: "Later decision → decline: {{title}} (+{{amount}})",
    historyFreeDay: "Free day #{{total}}",
    historySpend: "Spent on {{title}} (-{{amount}})",
    historyTimestamp: "{{date}} · {{time}}",
    historyUnknown: "event",
    progressHeroTitle: "Saved",
    progressHeroLevel: "level {{level}}",
    progressHeroNext: "Next target {{amount}}",
    tileProgressLabel: "{{current}} of {{target}}",
    tileReady: "Ready to enjoy",
    tileLocked: "Still saving",
    spendWarning: "Spending {{amount}} — sure about it?",
    rewardsEmpty: "Earn achievements by skipping temptations or logging a free day.",
    goalsTitle: "Goals & rewards",
    rewardUnlocked: "unlocked",
    rewardLocked: "{{amount}} to go",
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
    inputFirstName: "First name",
    inputLastName: "Last name",
    inputMotto: "Personal motto",
    currencyLabel: "Savings currency",
    nextButton: "Continue",
    goalTitle: "Pick a goal",
    goalSubtitle: "Where should your mindful deals lead?",
    goalButton: "Start saving",
    goalCompleteMessage: "You’re set—let’s start saving!",
  },
};

const CATEGORY_LABELS = {
  all: { ru: "все", en: "all" },
  tech: { ru: "техника", en: "tech" },
  flagship: { ru: "флагман", en: "flagship" },
  iphone: { ru: "iphone", en: "iphone" },
  laptop: { ru: "ноут", en: "laptop" },
  work: { ru: "work", en: "work" },
  audio: { ru: "аудио", en: "audio" },
  style: { ru: "стиль", en: "style" },
  wearable: { ru: "носимое", en: "wearable" },
  sport: { ru: "спорт", en: "sport" },
  home: { ru: "дом", en: "home" },
  wow: { ru: "вау", en: "wow" },
  gift: { ru: "подарки", en: "gift" },
  coffee: { ru: "кофе", en: "coffee" },
  eco: { ru: "eco", en: "eco" },
  food: { ru: "еда", en: "food" },
  wellness: { ru: "wellness", en: "wellness" },
  retro: { ru: "retro", en: "retro" },
  lifestyle: { ru: "лайф", en: "lifestyle" },
  stationery: { ru: "бумага", en: "stationery" },
  phone: { ru: "телефон", en: "phone" },
  travel: { ru: "путешествия", en: "travel" },
  dream: { ru: "мечты", en: "dream" },
};

const CURRENCIES = ["USD", "EUR", "RUB"];

const CURRENCY_LOCALES = {
  USD: "en-US",
  EUR: "de-DE",
  RUB: "ru-RU",
};

const GOAL_PRESETS = [
  { id: "travel", ru: "Путешествия", en: "Travel", emoji: "✈️" },
  { id: "tech", ru: "Техника", en: "Tech upgrade", emoji: "💻" },
  { id: "daily", ru: "Ежедневные хотелки", en: "Daily treats", emoji: "🍩" },
  { id: "save", ru: "Просто копить", en: "Rainy-day fund", emoji: "💰" },
];

const DEFAULT_PROFILE = {
  name: "Nina Cleanova",
  firstName: "Nina",
  lastName: "Cleanova",
  subtitle: "Управляю хотелками и бюджетом",
  motto: "Управляю хотелками и бюджетом",
  bio: "Люблю красивые вещи, но больше люблю финансовый план",
  avatar: "https://i.pravatar.cc/150?img=47",
  currency: "USD",
  goal: "save",
};

const INITIAL_REGISTRATION = {
  firstName: "",
  lastName: "",
  motto: "",
  avatar: "",
  currency: "USD",
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
      en: "Tracks your pulse and spending—if you resist wearing it daily.",
    },
  },
  {
    id: "console",
    emoji: "🎮",
    image:
      "https://images.unsplash.com/photo-1486401899868-0e435ed85128?auto=format&fit=crop&w=600&q=80",
    color: "#D9F7FF",
    categories: ["wow", "home"],
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
      en: "Spontaneous seaside flights before payday—or a mindful trip later.",
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
      ru: "Два дня архитектуры и кофе — или месячный запас сбережений.",
      en: "Two days of architecture and espresso — or a month of savings momentum.",
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
      en: "Fuel, van life and freedom — all waiting once the progress bar hits max.",
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

const normalizeAmazonItems = (payload) => {
  const items = payload?.items || payload || [];
  return items.map((item, index) => {
    const price = Number(item?.price?.amount ?? item?.price ?? 0);
    const label = item?.variantLabel || item?.price?.currency || "USD";
    const defaultCopy = {
      ru: {
        title: item.title || "Amazon товар",
        tagline: item.brand || "Найдена замена",
        desc: item.description || "Добавьте описание в своём API, чтобы вдохновлять осознанные покупки.",
      },
      en: {
        title: item.title || "Amazon item",
        tagline: item.brand || "Smart deal",
        desc: item.description || "Provide copy in your API to inspire mindful deals.",
      },
    };
    return {
      id: item.asin || item.id || `amazon-${index}`,
      image:
        item.image ||
        item.thumbnail ||
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
      colors: { card: AMAZON_DEFAULT_COLOR },
      categories: item.categories || ["tech"],
      variants:
        item.variants?.length > 0
          ? item.variants.map((v) => ({ label: v.label || label, price: Number(v.price || price || 0) }))
          : [{ label, price }],
      copy: defaultCopy,
    };
  });
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
  const r = Math.min(255, Math.round(((num >> 16) & 255) + 255 * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 255) + 255 * amount));
  const b = Math.min(255, Math.round((num & 255) + 255 * amount));
  return `rgb(${r}, ${g}, ${b})`;
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

function TemptationCard({
  item,
  language,
  colors,
  onEditPrice,
  onAction,
  t,
  savedTotalUSD = 0,
  currency = activeCurrency,
}) {
  const title = item.title?.[language] || item.title?.en || item.title || "Wish";
  const desc = item.description?.[language] || item.description?.en || "";
  const priceUSD = item.priceUSD || item.basePriceUSD || 0;
  const priceLabel = formatCurrency(convertToCurrency(priceUSD, currency), currency);
  const savedTowardUSD = Math.min(savedTotalUSD, priceUSD);
  const savedLabel = formatCurrency(convertToCurrency(savedTowardUSD, currency), currency);
  const progress = priceUSD ? Math.min(savedTotalUSD / priceUSD, 1) : 0;
  const unlocked = savedTotalUSD >= priceUSD && priceUSD > 0;
  const highlight = unlocked;
  const statusLabel = unlocked ? t("tileReady") : t("tileLocked");
  const progressLabel = t("tileProgressLabel", { current: savedLabel, target: priceLabel });
  const cardBackground =
    !highlight && !unlocked
      ? lightenColor(item.color || colors.card, 0.35)
      : item.color || colors.card;
  const actionConfig = unlocked
    ? [
        { type: "decline", label: t("declineAction"), variant: "ghost" },
        { type: "spend", label: t("spendAction"), variant: "ghost" },
        { type: "maybe", label: t("maybeAction"), variant: "outline" },
      ]
    : [
        { type: "decline", label: t("declineAction"), variant: "ghost" },
        { type: "want", label: t("wantAction"), variant: "ghost" },
        { type: "maybe", label: t("maybeAction"), variant: "outline" },
      ];

  return (
    <View
      style={[
        styles.temptationCard,
        {
          backgroundColor: cardBackground,
          borderColor: highlight ? colors.text : "transparent",
          borderWidth: highlight ? 2 : 1,
        },
      ]}
    >
      <View style={styles.temptationHeader}>
        <Text style={styles.temptationEmoji}>{item.emoji || "✨"}</Text>
        <Text style={[styles.temptationTitle, { color: colors.text }]}>{title}</Text>
        <View
          style={[
            styles.temptationBadge,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.temptationBadgeText, { color: colors.text }]}>{statusLabel}</Text>
        </View>
      </View>
      {desc ? <Text style={[styles.temptationDesc, { color: colors.muted }]}>{desc}</Text> : null}
      <View style={styles.temptationPriceRow}>
        <Text style={[styles.temptationPrice, { color: colors.text }]}>{priceLabel}</Text>
        <TouchableOpacity onPress={onEditPrice}>
          <Text style={[styles.editPriceText, { color: colors.muted }]}>{t("editPrice")}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tileProgressWrap}>
        <View style={[styles.tileProgressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.tileProgressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: highlight ? colors.text : colors.muted,
              },
            ]}
          />
        </View>
        <Text style={[styles.tileProgressLabel, { color: colors.muted }]}>{progressLabel}</Text>
      </View>
      <View style={styles.temptationActions}>
        {actionConfig.map((action) => {
          const buttonStyle =
            action.variant === "ghost"
              ? [styles.temptationButtonGhost, { borderColor: colors.text }]
              : [styles.temptationButtonOutline, { borderColor: colors.border }];
          const textStyle = [styles.temptationButtonGhostText, { color: colors.text }];
          if (action.variant === "outline") {
            textStyle.push({ color: colors.muted });
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
    </View>
  );
}

function FeedScreen({
  products,
  categories,
  activeCategory,
  onCategorySelect,
  savedTotalUSD,
  onTemptationAction,
  onEditPrice,
  t,
  language,
  colors,
  currency,
  freeDayStats,
  onFreeDayLog,
  analyticsStats = [],
}) {
  const heroSavedLabel = useMemo(
    () => formatCurrency(convertToCurrency(savedTotalUSD || 0, currency), currency),
    [savedTotalUSD, currency]
  );
  const tierInfo = getTierProgress(savedTotalUSD || 0);
  const span = Math.max(
    (tierInfo.nextTargetUSD ?? tierInfo.prevTargetUSD ?? 1) -
      (tierInfo.prevTargetUSD ?? 0),
    1
  );
  const tierProgress = tierInfo.nextTargetUSD
    ? (savedTotalUSD - tierInfo.prevTargetUSD) / span
    : 1;
  const progressPercent = Math.min(Math.max(tierProgress, 0), 1);
  const levelLabel = t("progressHeroLevel", { level: tierInfo.level });
  const nextLabel = tierInfo.nextTargetUSD
    ? t("progressHeroNext", {
        amount: formatCurrency(convertToCurrency(tierInfo.nextTargetUSD, currency), currency),
      })
    : t("tileReady");
  const todayKey = getDayKey(new Date());
  const isEvening = new Date().getHours() >= 18;
  const canLogFreeDay = isEvening && freeDayStats.lastDate !== todayKey;
  const bestLabel = `${freeDayStats.current} / ${freeDayStats.best}`;

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return products.filter((product) => product.categories?.includes(activeCategory));
  }, [activeCategory, products]);
  const analyticsPreview = analyticsStats.slice(0, 3);

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
            <View
              style={[
                styles.progressHeroCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.progressHeroHeader}>
                <Text style={[styles.progressHeroTitle, { color: colors.text }]}>
                  {t("progressHeroTitle")}
                </Text>
                <Text style={[styles.progressHeroLevel, { color: colors.muted }]}>{levelLabel}</Text>
              </View>
              <Text style={[styles.progressHeroAmount, { color: colors.text }]}>
                {heroSavedLabel}
              </Text>
              <View style={[styles.progressHeroBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressHeroFill,
                    { backgroundColor: colors.text, width: `${progressPercent * 100}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressHeroNext, { color: colors.muted }]}>{nextLabel}</Text>
            </View>
            {analyticsPreview.length > 0 && (
              <View style={styles.feedAnalyticsRow}>
                {analyticsPreview.map((stat) => (
                  <View
                    key={stat.label}
                    style={[
                      styles.feedAnalyticsItem,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.feedAnalyticsValue, { color: colors.text }]}>
                      {stat.value}
                    </Text>
                    <Text style={[styles.feedAnalyticsLabel, { color: colors.muted }]}>
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
              {categories.map((cat) => (
                <CategoryChip
                  key={cat}
                  label={(CATEGORY_LABELS[cat]?.[language] || cat).toUpperCase()}
                  isActive={cat === activeCategory}
                  onPress={() => onCategorySelect(cat)}
                  colors={colors}
                />
              ))}
            </ScrollView>
            <View style={[styles.freeDayCard, { backgroundColor: colors.card, borderColor: colors.border }] }>
              <View style={{ flex: 1 }}>
                <Text style={[styles.freeDayLabel, { color: colors.muted }]}>
                  {t("freeDayStreakLabel")}
                </Text>
                <Text style={[styles.freeDayValue, { color: colors.text }]}>{bestLabel}</Text>
                <Text style={{ color: colors.muted }}>
                  {t("freeDayTotalLabel", { total: freeDayStats.total })}
                </Text>
              </View>
              {canLogFreeDay ? (
                <TouchableOpacity
                  style={[styles.freeDayButton, { backgroundColor: colors.text }]}
                  onPress={onFreeDayLog}
                >
                  <Text style={[styles.freeDayButtonText, { color: colors.background }]}>
                    {t("freeDayButton")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.freeDayLocked, { color: colors.muted }]}>
                  {freeDayStats.lastDate === todayKey
                    ? t("freeDayLoggedToday")
                    : t("freeDayLocked")}
                </Text>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TemptationCard
            item={item}
            language={language}
            colors={colors}
            t={t}
            onEditPrice={() => onEditPrice(item)}
            savedTotalUSD={savedTotalUSD}
            currency={currency}
            onAction={async (type) => {
              await onTemptationAction(type, item);
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

function WishListScreen({
  wishes,
  currency = DEFAULT_PROFILE.currency,
  t,
  colors,
  onRemoveWish,
}) {
  if (wishes.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }] }>
        <Text style={[styles.header, { color: colors.text }]}>{t("wishlistTitle")}</Text>
        <View style={styles.cartEmptyState}>
          <Image source={{ uri: CAT_IMAGE }} style={styles.catImage} />
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }] }
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
        return (
          <View key={wish.id} style={[styles.wishCard, { backgroundColor: colors.card }] }>
            <View style={styles.wishHeader}>
              <Text style={[styles.wishTitle, { color: colors.text }]}>{wish.title}</Text>
              <View style={styles.wishBadge}>
                <Text style={{ color: colors.muted }}>
                  {wish.status === "done" ? t("wishlistDoneLabel") : `${Math.round(progress * 100)}%`}
                </Text>
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
            <TouchableOpacity
              style={[styles.wishButtonGhost, { borderColor: colors.border, marginTop: 12 }]}
              onPress={() => onRemoveWish(wish.id)}
            >
              <Text style={{ color: colors.muted }}>{t("wishlistRemove")}</Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
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
          <Image source={{ uri: CAT_IMAGE }} style={styles.catImage} />
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

const ACHIEVEMENT_DEFS = [
  {
    id: "saved_50",
    type: "savedUSD",
    threshold: 50,
    emoji: "💾",
    copy: {
      ru: { title: "Первые 50$", desc: "Ты уже отложил(а) на мини-подарок." },
      en: { title: "First $50", desc: "That's a mini gift already banked." },
    },
  },
  {
    id: "saved_500",
    type: "savedUSD",
    threshold: 500,
    emoji: "💎",
    copy: {
      ru: { title: "Полтысячи в копилке", desc: "Можно мечтать о крупной покупке." },
      en: { title: "Half a grand", desc: "Major purchase territory unlocked." },
    },
  },
  {
    id: "decline_10",
    type: "declines",
    threshold: 10,
    emoji: "🧊",
    copy: {
      ru: { title: "Ледяное сердце", desc: "10 хотелок в холодильнике и счёт растёт." },
      en: { title: "Ice cold focus", desc: "10 temptations declined already." },
    },
  },
  {
    id: "free_7",
    type: "freeDays",
    threshold: 7,
    emoji: "🗓️",
    copy: {
      ru: { title: "Неделя без трат", desc: "Серия бесплатных дней — гордимся." },
      en: { title: "7 free days", desc: "A whole week of mindful restraint." },
    },
  },
];

function RewardsScreen({
  savedTotalUSD,
  declineCount,
  freeDayStats,
  currency = DEFAULT_PROFILE.currency,
  t,
  language,
  colors,
}) {
  const achievements = useMemo(() => {
    const stats = {
      savedUSD: savedTotalUSD,
      declines: declineCount,
      freeDays: freeDayStats.total,
    };
    return ACHIEVEMENT_DEFS.map((def) => {
      const value = stats[def.type] || 0;
      const unlocked = value >= def.threshold;
      const progress = def.threshold ? Math.min(value / def.threshold, 1) : 1;
      const copy = def.copy[language] || def.copy.en;
      return {
        id: def.id,
        title: copy.title,
        desc: copy.desc,
        emoji: def.emoji,
        unlocked,
        threshold: def.threshold,
        value,
        progress,
      };
    });
  }, [savedTotalUSD, declineCount, freeDayStats.total, language]);

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
      {achievements.map((reward) => {
        const remaining = Math.max(reward.threshold - reward.value, 0);
        return (
          <View key={reward.id} style={[styles.goalCard, { backgroundColor: colors.card }] }>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 28 }}>{reward.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalTitle, { color: colors.text }]}>{reward.title}</Text>
                <Text style={[styles.goalDesc, { color: colors.muted }]}>{reward.desc}</Text>
              </View>
            </View>
            <View style={[styles.goalProgressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.goalProgressFill,
                  {
                    width: `${reward.progress * 100}%`,
                    backgroundColor: reward.unlocked ? colors.text : colors.muted,
                  },
                ]}
              />
            </View>
            <Text style={[styles.goalDesc, { color: colors.muted }]}>
              {reward.unlocked
                ? t("rewardUnlocked")
                : t("rewardLocked", {
                    amount: formatCurrency(convertToCurrency(remaining, currency), currency),
                  })}
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
  onResetData,
  onPickImage,
  theme,
  language,
  currencyValue,
  history = [],
  freeDayStats = INITIAL_FREE_DAY_STATS,
  t,
  colors,
}) {
  const currentCurrency = currencyValue || profile.currency || DEFAULT_PROFILE.currency;
  const historyPreview = (history || []).slice(0, 5);
  const locale = language === "ru" ? "ru-RU" : "en-US";
  const formatLocalAmount = (valueUSD = 0) =>
    formatCurrency(convertToCurrency(valueUSD || 0, currentCurrency), currentCurrency);
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
              source={{ uri: profile.avatar || DEFAULT_REMOTE_IMAGE }}
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
                style={[styles.profileInput, { borderColor: colors.border, color: colors.text }]}
                value={profile.name}
                onChangeText={(text) => onFieldChange("name", text)}
              placeholder="Name"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={[styles.profileInput, { borderColor: colors.border, color: colors.text }]}
              value={profile.subtitle}
              onChangeText={(text) => onFieldChange("subtitle", text)}
              placeholder="Tagline"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={[
                styles.profileInput,
                styles.profileBioInput,
                { borderColor: colors.border, color: colors.text },
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
            <Text style={[styles.profileName, { color: colors.text }]}>{profile.name}</Text>
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

export default function App() {
  const [wishes, setWishes] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("feed");
  const [catalogOverrides, setCatalogOverrides] = useState({});
  const [temptations, setTemptations] = useState(DEFAULT_TEMPTATIONS);
  const [priceEditor, setPriceEditor] = useState({ visible: false, item: null, value: "" });
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
  const cartBadgeScale = useRef(new Animated.Value(0)).current;
  const [onboardingStep, setOnboardingStep] = useState("logo");
  const [registrationData, setRegistrationData] = useState(INITIAL_REGISTRATION);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showImageSourceSheet, setShowImageSourceSheet] = useState(false);
  const imagePickerResolver = useRef(null);
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

  const t = (key, replacements = {}) => {
    let text = TRANSLATIONS[language][key] || key;
    Object.entries(replacements).forEach(([token, value]) => {
      text = text.replace(`{{${token}}}`, value);
    });
    return text;
  };

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
      { label: t("analyticsBestStreak"), value: `${freeDayStats.total}` },
    ],
    [wishes.length, declineCount, freeDayStats.total, t]
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
        savedTotalRaw,
        declinesRaw,
        freeDayRaw,
        decisionStatsRaw,
        historyRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.WISHES),
        AsyncStorage.getItem(STORAGE_KEYS.PENDING),
        AsyncStorage.getItem(STORAGE_KEYS.PURCHASES),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
        AsyncStorage.getItem(STORAGE_KEYS.CATALOG),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_TOTAL),
        AsyncStorage.getItem(STORAGE_KEYS.DECLINES),
        AsyncStorage.getItem(STORAGE_KEYS.FREE_DAY),
        AsyncStorage.getItem(STORAGE_KEYS.DECISION_STATS),
        AsyncStorage.getItem(STORAGE_KEYS.HISTORY),
      ]);
      if (wishesRaw) setWishes(JSON.parse(wishesRaw));
      if (pendingRaw) setPendingList(JSON.parse(pendingRaw));
      if (purchasesRaw) setPurchases(JSON.parse(purchasesRaw));
      let parsedProfile = null;
      if (profileRaw) {
        parsedProfile = JSON.parse(profileRaw);
        setProfile(parsedProfile);
        setProfileDraft(parsedProfile);
        setRegistrationData((prev) => ({
          ...prev,
          firstName: parsedProfile.firstName || prev.firstName,
          lastName: parsedProfile.lastName || prev.lastName,
          motto: parsedProfile.motto || parsedProfile.subtitle || prev.motto,
          avatar: parsedProfile.avatar || prev.avatar,
          currency: parsedProfile.currency || prev.currency,
        }));
        setActiveCurrency(parsedProfile.currency || DEFAULT_PROFILE.currency);
      } else {
        setActiveCurrency(DEFAULT_PROFILE.currency);
      }
      if (themeRaw) setTheme(themeRaw);
      if (languageRaw) setLanguage(languageRaw);
      if (catalogRaw) setCatalogOverrides(JSON.parse(catalogRaw));
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
      if (onboardingRaw === "done" || parsedProfile?.goal) {
        setOnboardingStep("done");
      } else if (parsedProfile?.firstName) {
        setOnboardingStep("logo");
      } else {
        setOnboardingStep("logo");
      }
    } catch (error) {
      console.warn("load error", error);
    }
  };

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.WISHES, JSON.stringify(wishes)).catch(() => {});
  }, [wishes]);

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
    setWishes((prev) => {
      let remaining = savedTotalUSD;
      let changed = false;
      const next = prev.map((wish) => {
        const autoManaged = wish.autoManaged !== false;
        if (!autoManaged) return wish;
        const target = wish.targetUSD || 0;
        const newSaved = Math.min(target, Math.max(remaining, 0));
        remaining = Math.max(0, remaining - newSaved);
        const status = newSaved >= target ? "done" : "active";
        if (newSaved !== (wish.savedUSD || 0) || status !== wish.status) {
          changed = true;
          return { ...wish, savedUSD: newSaved, status };
        }
        return wish;
      });
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
    })).sort(
      (a, b) =>
        (a.priceUSD ?? a.basePriceUSD ?? 0) - (b.priceUSD ?? b.basePriceUSD ?? 0)
    );
    setTemptations(nextList);
  }, [catalogOverrides]);

  useEffect(() => {
    return () => {
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, []);

  useEffect(() => {
    if (wishes.length > 0) {
      Animated.spring(cartBadgeScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 140,
      }).start();
    } else {
      Animated.timing(cartBadgeScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [wishes.length, cartBadgeScale]);

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
  };

  const handleProfileCurrencyChange = (code) => {
    if (!CURRENCIES.includes(code) || profile.currency === code) return;
    triggerHaptic();
    setProfile((prev) => ({ ...prev, currency: code }));
    setProfileDraft((prev) => ({ ...prev, currency: code }));
    setRegistrationData((prev) => ({ ...prev, currency: code }));
    setActiveCurrency(code);
  };

  const handleLanguageSelect = (lng) => {
    handleLanguageChange(lng);
    setTimeout(() => setOnboardingStep("register"), 150);
  };

  const updateRegistrationData = (field, value) => {
    if (field === "currency") {
      setActiveCurrency(value);
    }
    setRegistrationData((prev) => ({ ...prev, [field]: value }));
  };

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
    setOnboardingStep("goal");
  };

  const handleGoalSelect = (goalId) => {
    triggerHaptic();
    setSelectedGoal(goalId);
  };

  const handleGoalComplete = async () => {
    if (!selectedGoal) {
      Alert.alert("Almost", t("goalTitle"));
      return;
    }
    const displayName = `${registrationData.firstName} ${registrationData.lastName}`.trim()
      || registrationData.firstName.trim()
      || DEFAULT_PROFILE.name;
    const updatedProfile = {
      ...profile,
      name: displayName,
      firstName: registrationData.firstName,
      lastName: registrationData.lastName,
      subtitle: registrationData.motto || profile.subtitle,
      motto: registrationData.motto || profile.motto,
      avatar: registrationData.avatar || profile.avatar,
      currency: registrationData.currency,
      goal: selectedGoal,
    };
    setProfile(updatedProfile);
    setProfileDraft(updatedProfile);
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile)).catch(() => {});
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, "done").catch(() => {});
    setActiveCurrency(updatedProfile.currency);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    triggerOverlayState("completion", t("goalCompleteMessage"), 2400);
    setTimeout(() => {
      setOnboardingStep("done");
      setSelectedGoal(null);
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

  const handleTemptationAction = useCallback(
    async (type, item) => {
      const priceUSD = item.priceUSD || item.basePriceUSD || 0;
      const priceLocal = formatCurrency(convertToCurrency(priceUSD));
      const title = `${item.emoji || "✨"} ${
        item.title?.[language] || item.title?.en || item.title || "wish"
      }`;
      if (type === "spend") {
        const localAmount = formatCurrency(convertToCurrency(priceUSD));
        logHistoryEvent("spend", { title, amountUSD: priceUSD });
        triggerOverlayState("cart", t("spendWarning", { amount: localAmount }));
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
        return;
      }
      if (type === "want") {
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
        setWishes((prev) => [newWish, ...prev]);
        logHistoryEvent("wish_added", { title, targetUSD: priceUSD, templateId: item.id });
        triggerOverlayState("purchase", t("wishAdded", { title }));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }
      if (type === "decline") {
        setSavedTotalUSD((prev) => prev + priceUSD);
        setDeclineCount((prev) => prev + 1);
        logHistoryEvent("decline", { title, amountUSD: priceUSD, source: "feed" });
        triggerOverlayState("cart", t("wishDeclined", { amount: priceLocal }));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }
      if (type === "maybe") {
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
    [language, t, schedulePendingReminder, logHistoryEvent]
  );

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
          const message =
            newMilestones.length > 0
              ? t("freeDayMilestone", { days: current })
              : t("freeDayCongrats", { days: current });
          triggerOverlayState("purchase", message);
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }, [freeDayStats, t, logHistoryEvent]);

  const openPriceEditor = (item) => {
    const currentValue = convertToCurrency(item.priceUSD || item.basePriceUSD || 0);
    setPriceEditor({
      visible: true,
      item,
      value: String(Math.round(currentValue * 100) / 100),
    });
  };

  const closePriceEditor = () => {
    setPriceEditor({ visible: false, item: null, value: "" });
  };

  const handlePriceInputChange = (value) => {
    setPriceEditor((prev) => ({ ...prev, value }));
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

  const savePriceEdit = () => {
    if (!priceEditor.item) return;
    const parsed = parseFloat((priceEditor.value || "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Almost", t("priceEditError"));
      return;
    }
    const usdValue = parsed / (CURRENCY_RATES[activeCurrency] || 1);
    persistPriceOverride(usdValue);
    closePriceEditor();
  };

  const resetPriceEdit = () => {
    persistPriceOverride(null);
    closePriceEditor();
  };

  const handleRemoveWish = useCallback(
    (wishId) => {
      Alert.alert(t("wishlistTitle"), t("wishlistRemoveConfirm"), [
        { text: t("priceEditCancel"), style: "cancel" },
        {
          text: t("wishlistRemove"),
          style: "destructive",
          onPress: () => setWishes((prev) => prev.filter((wish) => wish.id !== wishId)),
        },
      ]);
    },
    [t]
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
        setWishes((prev) => [newWish, ...prev]);
        setDecisionStats((prev) => ({
          ...prev,
          resolvedToWishes: prev.resolvedToWishes + 1,
        }));
        logHistoryEvent("pending_to_wish", { title, targetUSD });
        triggerOverlayState("purchase", t("wishAdded", { title }));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        return;
      }
      if (decision === "decline") {
        const price = pendingItem.priceUSD || 0;
        const localAmount = formatCurrency(
          convertToCurrency(price, profile.currency || DEFAULT_PROFILE.currency)
        );
        setSavedTotalUSD((prev) => prev + price);
        setDeclineCount((prev) => prev + 1);
        setDecisionStats((prev) => ({
          ...prev,
          resolvedToDeclines: prev.resolvedToDeclines + 1,
        }));
        logHistoryEvent("pending_to_decline", { title, amountUSD: price });
        triggerOverlayState("cart", t("wishDeclined", { amount: localAmount }));
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [language, profile.currency, t, logHistoryEvent]
  );

  const triggerOverlayState = (type, message, duration) => {
    if (overlayTimer.current) {
      clearTimeout(overlayTimer.current);
    }
    if (type === "purchase") {
      setConfettiKey((prev) => prev + 1);
    }
    setOverlay({ type, message });
    overlayTimer.current = setTimeout(() => {
      setOverlay(null);
    }, duration ?? (type === "cart" ? 1800 : 2600));
  };

  const triggerCelebration = () => {
    const messages = CELEBRATION_MESSAGES[language];
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
            setFreeDayStats({ ...INITIAL_FREE_DAY_STATS });
            setDecisionStats({ ...INITIAL_DECISION_STATS });
            setHistoryEvents([]);
            setProfile({ ...DEFAULT_PROFILE });
            setProfileDraft({ ...DEFAULT_PROFILE });
            setRegistrationData(INITIAL_REGISTRATION);
            setSelectedGoal(null);
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
    setProfile(profileDraft);
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
            savedTotalUSD={savedTotalUSD}
            declineCount={declineCount}
            freeDayStats={freeDayStats}
            currency={profile.currency || DEFAULT_PROFILE.currency}
            t={t}
            language={language}
            colors={colors}
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
            onResetData={handleResetData}
            onPickImage={handlePickImage}
            theme={theme}
            language={language}
            currencyValue={profile.currency || DEFAULT_PROFILE.currency}
            history={historyEvents}
            freeDayStats={freeDayStats}
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
            onTemptationAction={handleTemptationAction}
            onEditPrice={openPriceEditor}
            t={t}
            language={language}
            colors={colors}
            currency={profile.currency || DEFAULT_PROFILE.currency}
            freeDayStats={freeDayStats}
            onFreeDayLog={handleLogFreeDay}
            analyticsStats={analyticsStats}
          />
        );
    }
  };

  if (onboardingStep !== "done") {
    let onboardContent = null;
    if (onboardingStep === "logo") {
      onboardContent = <LogoSplash onDone={() => setOnboardingStep("language")} />;
    } else if (onboardingStep === "language") {
      onboardContent = <LanguageScreen colors={colors} t={t} onSelect={handleLanguageSelect} />;
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
    } else if (onboardingStep === "goal") {
      onboardContent = (
        <GoalScreen
          selectedGoal={selectedGoal}
          onSelect={handleGoalSelect}
          onSubmit={handleGoalComplete}
          colors={colors}
          t={t}
          language={language}
        />
      );
    }
    const onboardingBackground = onboardingStep === "logo" ? "#fff" : colors.background;
    return (
      <SafeAreaView style={[styles.appShell, { backgroundColor: onboardingBackground }] }>
        {onboardContent || <LogoSplash onDone={() => setOnboardingStep("language")} />}
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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

        {wishes.length > 0 && (
          <AnimatedTouchableOpacity
            style={[
              styles.cartBadge,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                transform: [{ scale: cartBadgeScale }],
              },
            ]}
            onPress={() => handleTabChange("cart")}
          >
            <Text style={[styles.cartBadgeIcon, { color: colors.text }]}>🧊</Text>
            <Text style={[styles.cartBadgeCount, { color: colors.text }]}>
              {wishes.length}
            </Text>
          </AnimatedTouchableOpacity>
        )}

        {overlay && (
          <View style={styles.confettiLayer} pointerEvents="none">
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
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: overlay.type === "cart" ? 0 : 1,
                },
              ]}
            >
              {(overlay.type === "cancel" || overlay.type === "purchase" || overlay.type === "completion") && (
                <Image
                  source={{ uri: CAT_IMAGE }}
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
                  <TextInput
                    style={[
                      styles.priceModalInput,
                      { borderColor: colors.border, color: colors.text },
                    ]}
                    value={priceEditor.value}
                    onChangeText={handlePriceInputChange}
                    placeholder={t("priceEditPlaceholder")}
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                  />
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

        <Modal
          visible={showImageSourceSheet}
          transparent
          animationType="fade"
          onRequestClose={closeImagePickerSheet}
        >
          <TouchableWithoutFeedback onPress={closeImagePickerSheet}>
            <View style={styles.sheetBackdrop}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={[styles.sheetCard, { backgroundColor: colors.card }] }>
                  <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                  <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("photoPromptTitle")}</Text>
                  <Text style={[styles.sheetSubtitle, { color: colors.muted }]}>{t("photoPromptSubtitle")}</Text>
                  <TouchableOpacity
                    style={[styles.sheetButton, { borderColor: colors.border }]}
                    onPress={() => handleImageSourceChoice("library")}
                  >
                    <Text style={{ color: colors.text }}>{t("photoLibrary")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sheetButton, { borderColor: colors.border }]}
                    onPress={() => handleImageSourceChoice("camera")}
                  >
                    <Text style={{ color: colors.text }}>{t("photoCamera")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeImagePickerSheet}>
                    <Text style={[styles.sheetCancel, { color: colors.muted }]}>{t("profileCancel")}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

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
  },
  feedHero: {
    paddingBottom: 20,
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
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
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
  feedAnalyticsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  feedAnalyticsItem: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  feedAnalyticsValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  feedAnalyticsLabel: {
    fontSize: 12,
    marginTop: 6,
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
  freeDayCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  freeDayLabel: {
    fontSize: 12,
    textTransform: "uppercase",
  },
  freeDayValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 2,
  },
  freeDayButton: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  freeDayButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  freeDayLocked: {
    fontSize: 12,
    textAlign: "right",
    flexShrink: 1,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
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
  editPriceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tileProgressWrap: {
    gap: 6,
  },
  tileProgressBar: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  tileProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  tileProgressLabel: {
    fontSize: 12,
    fontWeight: "600",
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
  settingChoices: {
    flexDirection: "row",
    gap: 12,
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
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
  },
  cartBadgeIcon: {
    fontSize: 18,
  },
  cartBadgeCount: {
    fontWeight: "700",
    fontSize: 16,
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
  priceModalInput: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 18,
    textAlign: "center",
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
  languageButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
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
            <View style={[styles.avatarPlaceholder, { borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, fontSize: 32 }}>+</Text>
            </View>
          )}
          <Text style={{ color: colors.muted }}>{t("photoTapHint")}</Text>
        </TouchableOpacity>

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.profileInput,
            styles.profileInputHalf,
            { borderColor: colors.border, color: colors.text },
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
            { borderColor: colors.border, color: colors.text },
          ]}
          placeholder={t("inputLastName")}
          placeholderTextColor={colors.muted}
          value={data.lastName}
          onChangeText={(text) => onChange("lastName", text)}
        />
      </View>

        <TextInput
          style={[styles.profileInput, { borderColor: colors.border, color: colors.text }]}
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

function GoalScreen({ selectedGoal, onSelect, onSubmit, colors, t, language }) {
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <ScrollView contentContainerStyle={styles.onboardContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("goalTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("goalSubtitle")}</Text>

        <View style={styles.goalGrid}>
          {GOAL_PRESETS.map((goal) => {
            const active = goal.id === selectedGoal;
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
                onPress={() => onSelect(goal.id)}
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
function LanguageScreen({ colors, t, onSelect }) {
  const fade = useFadeIn();
  return (
    <Animated.View style={[styles.onboardContainer, { backgroundColor: colors.background, opacity: fade }]}>
      <View style={styles.onboardContent}>
        <Text style={[styles.onboardTitle, { color: colors.text }]}>{t("languageTitle")}</Text>
        <Text style={[styles.onboardSubtitle, { color: colors.muted }]}>{t("languageSubtitle")}</Text>
        <View style={styles.languageButtons}>
          {[
            { key: "ru", label: t("languageRussian") },
            { key: "en", label: t("languageEnglish") },
          ].map((lang) => (
            <TouchableOpacity
              key={lang.key}
              style={[styles.languageButton, { borderColor: colors.border }]}
              onPress={() => onSelect(lang.key)}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
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
