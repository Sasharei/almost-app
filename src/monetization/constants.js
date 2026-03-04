export const PREMIUM_ENTITLEMENT_ID = "premium";

export const PREMIUM_PRODUCT_IDS = {
  monthly: "almost_premium_monthly",
  yearly: "almost_premium_yearly",
  lifetime: "almost_premium_lifetime",
};

export const PREMIUM_PLAN_ORDER = ["yearly", "monthly", "lifetime"];

export const FREE_PLAN_LIMITS = {
  activeGoals: 1,
  activePendingCards: 2,
  customTemptationCards: 10,
  historyDays: 7,
  challengeClaims: 3,
  reportsWeeks: 4,
  reportsMonths: 1,
  budgetAutoFreeDays: 30,
};

export const PREMIUM_FEATURE_KEYS = {
  catCustomization: "catCustomization",
  impulseMap: "impulseMap",
  reports: "reports",
  customCategories: "customCategories",
  thinkingQueue: "thinkingQueue",
  homeWidget: "homeWidget",
  widgetSlider: "widgetSlider",
  budgetAuto: "budgetAuto",
  multipleGoals: "multipleGoals",
  fullHistory: "fullHistory",
  customTemptationCards: "customTemptationCards",
  unlimitedChallenges: "unlimitedChallenges",
  proTheme: "proTheme",
};

export const FALLBACK_PRICES_BY_CURRENCY = {
  CAD: {
    monthly: {
      label: "CAD $6.99",
      perMonth: "CAD $6.99/mo",
      badge: null,
    },
    yearly: {
      label: "CAD $49.99",
      perMonth: "CAD $4.16/mo",
      badge: "Save 40%",
    },
    lifetime: {
      label: "CAD $99.99",
      perMonth: "One-time",
      badge: "Lifetime",
    },
  },
  USD: {
    monthly: {
      label: "USD $5.99",
      perMonth: "USD $5.99/mo",
      badge: null,
    },
    yearly: {
      label: "USD $44.99",
      perMonth: "USD $3.75/mo",
      badge: "Save 37%",
    },
    lifetime: {
      label: "USD $89.99",
      perMonth: "One-time",
      badge: "Lifetime",
    },
  },
  GBP: {
    monthly: {
      label: "GBP £4.99",
      perMonth: "GBP £4.99/mo",
      badge: null,
    },
    yearly: {
      label: "GBP £36.99",
      perMonth: "GBP £3.08/mo",
      badge: "Save 38%",
    },
    lifetime: {
      label: "GBP £74.99",
      perMonth: "One-time",
      badge: "Lifetime",
    },
  },
};

const REGION_BY_CURRENCY = {
  CAD: "CA",
  USD: "US",
  GBP: "UK",
};

const DEFAULT_LOSS_WINDOW_DAYS = 30;

const SOFT_TITLE_BY_LANGUAGE = {
  ru: "За последние {{days}} дней ты мог(ла) сохранить ещё {{amount}}.",
  en: "In the last {{days}} days, you could have saved {{amount}} more.",
};

const HARD_TITLE_BY_LANGUAGE = {
  ru: "Ты уже экономишь. Но ещё {{amount}} за {{days}} дней можно было не потерять.",
  en: "You are already saving. But {{amount}} over {{days}} days could still be kept.",
};

const FEATURE_TITLE_BY_LANGUAGE = {
  ru: "Эта функция возвращает деньги, которые обычно утекают незаметно",
  en: "This feature helps recover money that usually slips away unnoticed",
};

const BASE_FEATURES_BY_LANGUAGE = {
  ru: [
    "Поддержка разработчика",
    "Impulse-карта",
    "Кастомизация кота + полная кастомизация Pro-темы",
    "Недельные и месячные умные анализы расходов с инсайтами",
    "Автоматический бюджет на месяц с умной адаптацией",
    "Home Screen виджеты и слайдер",
    "Мгновенная разблокировка всех функций, закрытых уровнем",
    "Неограниченное количество кастомных категорий",
    "Неограниченное количество целей",
    "Неограниченные карточки искушений",
  ],
  en: [
    "Support the developer",
    "Impulse map",
    "Cat customization + full Pro theme customization",
    "Weekly and monthly smart spending analysis with insights",
    "Automatic monthly budget with smart adaptation",
    "Home screen widgets and slider",
    "Instant unlock of all level-gated features",
    "Unlimited custom categories",
    "Unlimited goals",
    "Unlimited temptation cards",
  ],
};

const FEATURE_NAME_BY_KEY = {
  catCustomization: {
    ru: "кастомизация кота",
    en: "cat customization",
  },
  impulseMap: {
    ru: "impulse-карта",
    en: "impulse map",
  },
  reports: {
    ru: "умные анализы расходов",
    en: "smart spending analysis",
  },
  customCategories: {
    ru: "кастомные категории",
    en: "custom categories",
  },
  thinkingQueue: {
    ru: "больше карточек «Думаю»",
    en: "more Think cards",
  },
  homeWidget: {
    ru: "домашний виджет",
    en: "home widget",
  },
  widgetSlider: {
    ru: "слайдер виджетов",
    en: "widget slider",
  },
  budgetAuto: {
    ru: "авторасчет бюджета",
    en: "automatic budget planning",
  },
  multipleGoals: {
    ru: "несколько целей",
    en: "multiple goals",
  },
  fullHistory: {
    ru: "полная история",
    en: "full history",
  },
  customTemptationCards: {
    ru: "дополнительные карточки искушений",
    en: "extra temptation cards",
  },
  unlimitedChallenges: {
    ru: "больше челленджей",
    en: "more challenge claims",
  },
  proTheme: {
    ru: "полная кастомизация Pro-темы",
    en: "full Pro theme customization",
  },
};

const COMPARISON_ROWS_BY_LANGUAGE = {
  ru: [
    {
      id: "basicTracker",
      label: "Базовый трекер импульсов",
      free: true,
      premium: true,
      interactive: false,
    },
    {
      id: "supportDeveloper",
      label: "Поддержка разработчика",
      free: false,
      premium: true,
      interactive: false,
    },
    {
      id: "impulseMap",
      label: "Impulse-карта",
      featureKeys: [PREMIUM_FEATURE_KEYS.impulseMap],
      free: false,
      premium: true,
      lossTitle: "Impulse-карта может вернуть {{amount}} за {{days}} дней.",
      lossSubtitle:
        "Impulse-карта показывает, где именно ты чаще всего срываешься, чтобы перехватить трату до оплаты.",
    },
    {
      id: "reports",
      label: "Недельные и месячные персональные отчёты",
      featureKeys: [PREMIUM_FEATURE_KEYS.reports],
      free: false,
      premium: true,
      lossTitle:
        "Люди, которые видят персональные отчёты и советы по оптимизации расходов, экономят в среднем на 30% больше.",
      lossSubtitle: "Отчёты показывают конкретные шаги по твоим категориям, а не общие советы.",
    },
    {
      id: "budgetAuto",
      label: "Автоматический бюджет на месяц",
      featureKeys: [PREMIUM_FEATURE_KEYS.budgetAuto],
      free: false,
      premium: true,
      lossTitle: "Автоплан бюджета помогает снизить перерасход примерно на 22% уже в первый месяц.",
      lossSubtitle: "Лимиты автоматически подстраиваются под твой реальный ритм трат.",
    },
    {
      id: "widgets",
      label: "Home Screen виджеты и слайдер",
      featureKeys: [PREMIUM_FEATURE_KEYS.homeWidget, PREMIUM_FEATURE_KEYS.widgetSlider],
      free: false,
      premium: true,
      lossTitle: "Виджеты на экране помогают сохранить {{amount}} за {{days}} дней.",
      lossSubtitle: "Ты видишь лимит до покупки и реже тратишь на автомате.",
    },
    {
      id: "levelUnlocks",
      label: "Мгновенная разблокировка уровневых функций",
      free: false,
      premium: true,
      lossTitle:
        "Пока функции закрыты уровнями, ты теряешь инструменты, которые могли вернуть ещё {{amount}} за {{days}} дней.",
      lossSubtitle: "Premium снимает все ограничения сразу, без ожидания.",
    },
    {
      id: "customCategories",
      label: "Неограниченные кастомные категории",
      featureKeys: [PREMIUM_FEATURE_KEYS.customCategories],
      free: false,
      premium: true,
      lossTitle:
        "С кастомными категориями легче находить денежные утечки: обычно это даёт до {{amount}} дополнительной экономии за {{days}} дней.",
      lossSubtitle: "Чем точнее категории, тем точнее отчёты и рекомендации.",
    },
    {
      id: "multipleGoals",
      label: "Неограниченные цели",
      featureKeys: [PREMIUM_FEATURE_KEYS.multipleGoals],
      free: false,
      premium: true,
      lossTitle: "Когда деньги распределены по нескольким целям, шанс импульсивной траты заметно ниже.",
      lossSubtitle: "Premium позволяет вести несколько целей параллельно и сохранять фокус.",
    },
    {
      id: "thinkingQueue",
      label: "Расширенная очередь карточек «Думаю»",
      featureKeys: [PREMIUM_FEATURE_KEYS.thinkingQueue],
      free: false,
      premium: true,
      lossTitle: "Без очереди «Думаю» сложнее переждать импульс, и лишние траты случаются чаще.",
      lossSubtitle: "Отложенные решения дают время остыть и не терять деньги на эмоциях.",
    },
    {
      id: "unlimitedChallenges",
      label: "Больше челленджей и наград",
      featureKeys: [PREMIUM_FEATURE_KEYS.unlimitedChallenges],
      free: false,
      premium: true,
      lossTitle: "Челленджи усиливают дисциплину: регулярные участники сохраняют заметно больше уже в первые недели.",
      lossSubtitle: "Больше челленджей = больше точек контроля, где ты не даёшь деньгам утечь.",
    },
    {
      id: "customTemptationCards",
      label: "Неограниченные карточки искушений",
      featureKeys: [PREMIUM_FEATURE_KEYS.customTemptationCards],
      free: false,
      premium: true,
      lossTitle: "Без дополнительных карточек мелкие повторяющиеся траты остаются незамеченными.",
      lossSubtitle: "Premium даёт безлимит карточек, чтобы перекрывать новые утечки сразу.",
    },
    {
      id: "catCustomization",
      label: "Кастомизация кота + Pro‑тема",
      featureKeys: [PREMIUM_FEATURE_KEYS.catCustomization, PREMIUM_FEATURE_KEYS.proTheme],
      free: false,
      premium: true,
      isCosmetic: true,
      interactive: false,
    },
  ],
  en: [
    {
      id: "basicTracker",
      label: "Basic impulse tracker",
      free: true,
      premium: true,
      interactive: false,
    },
    {
      id: "supportDeveloper",
      label: "Support the developer",
      free: false,
      premium: true,
      interactive: false,
    },
    {
      id: "impulseMap",
      label: "Impulse map",
      featureKeys: [PREMIUM_FEATURE_KEYS.impulseMap],
      free: false,
      premium: true,
      lossTitle: "Impulse map can recover {{amount}} in {{days}} days.",
      lossSubtitle:
        "The map shows your repeating triggers so you can intercept overspending before checkout.",
    },
    {
      id: "reports",
      label: "Weekly and monthly personal reports",
      featureKeys: [PREMIUM_FEATURE_KEYS.reports],
      free: false,
      premium: true,
      lossTitle:
        "People who use personal reports and optimization tips save around 30% more on average.",
      lossSubtitle: "Reports give clear next steps based on your own categories and behavior.",
    },
    {
      id: "budgetAuto",
      label: "Automatic monthly budget planning",
      featureKeys: [PREMIUM_FEATURE_KEYS.budgetAuto],
      free: false,
      premium: true,
      lossTitle: "Auto budget planning can cut overspending by roughly 22% in the first month.",
      lossSubtitle: "Your limits adapt automatically to your real spending rhythm.",
    },
    {
      id: "widgets",
      label: "Home screen widgets and slider",
      featureKeys: [PREMIUM_FEATURE_KEYS.homeWidget, PREMIUM_FEATURE_KEYS.widgetSlider],
      free: false,
      premium: true,
      lossTitle: "Home widgets can protect {{amount}} in {{days}} days.",
      lossSubtitle: "You see your limits before buying, so fewer purchases happen on autopilot.",
    },
    {
      id: "levelUnlocks",
      label: "Instant unlock of all level-gated tools",
      free: false,
      premium: true,
      lossTitle:
        "While core tools stay locked behind levels, you miss savings that could add {{amount}} over {{days}} days.",
      lossSubtitle: "Premium unlocks everything immediately.",
    },
    {
      id: "customCategories",
      label: "Unlimited custom categories",
      featureKeys: [PREMIUM_FEATURE_KEYS.customCategories],
      free: false,
      premium: true,
      lossTitle:
        "Custom categories make leaks obvious and can recover up to {{amount}} over {{days}} days.",
      lossSubtitle: "Better categories lead to more precise reports and recommendations.",
    },
    {
      id: "multipleGoals",
      label: "Unlimited goals",
      featureKeys: [PREMIUM_FEATURE_KEYS.multipleGoals],
      free: false,
      premium: true,
      lossTitle:
        "When money is split into multiple goals, impulse buys drop and progress accelerates.",
      lossSubtitle: "Track several goals in parallel and keep motivation high.",
    },
    {
      id: "thinkingQueue",
      label: "Extended “Think” queue",
      featureKeys: [PREMIUM_FEATURE_KEYS.thinkingQueue],
      free: false,
      premium: true,
      lossTitle: "Without a longer Think queue, impulse urges are harder to cool off in time.",
      lossSubtitle: "Delayed decisions create a pause that protects your budget.",
    },
    {
      id: "unlimitedChallenges",
      label: "More challenges and rewards",
      featureKeys: [PREMIUM_FEATURE_KEYS.unlimitedChallenges],
      free: false,
      premium: true,
      lossTitle:
        "Challenge-driven routines improve discipline: active users typically keep more money in the first weeks.",
      lossSubtitle: "More challenges mean more checkpoints where spending gets interrupted.",
    },
    {
      id: "customTemptationCards",
      label: "Unlimited temptation cards",
      featureKeys: [PREMIUM_FEATURE_KEYS.customTemptationCards],
      free: false,
      premium: true,
      lossTitle: "Without extra cards, small recurring leaks stay invisible.",
      lossSubtitle: "Unlimited cards help you patch new spending leaks as soon as they appear.",
    },
    {
      id: "catCustomization",
      label: "Cat skins + Pro theme",
      featureKeys: [PREMIUM_FEATURE_KEYS.catCustomization, PREMIUM_FEATURE_KEYS.proTheme],
      free: false,
      premium: true,
      isCosmetic: true,
      interactive: false,
    },
  ],
};

const SOFT_PSYCHOLOGY_LINE_BY_LANGUAGE = {
  ru: "Цена Premium = стоимость одного отказа от импульсивной покупки.",
  en: "Premium costs the price of a single impulse you choose to skip.",
};

const SOFT_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Premium стоит {{monthly}}. С инструментами контроля ты можешь вернуть до {{amount}} за следующие {{days}} дней.",
  en: "Premium is {{monthly}}. With the full toolkit, you can recover up to {{amount}} over the next {{days}} days.",
};

const HARD_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Almost уже помог сохранить {{saved}}. Premium закрывает оставшиеся утечки и помогает удерживать прогресс.",
  en: "Almost has already helped you save {{saved}}. Premium closes remaining leaks and keeps momentum going.",
};

const FEATURE_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Открой Premium, чтобы получить полный набор инструментов и сохранять больше каждый месяц.",
  en: "Unlock Premium for the full toolkit and keep more money every month.",
};

const LEVEL_UNLOCK_LINE_BY_LANGUAGE = {
  ru: "Premium сразу откроет все функции, которые закрыты уровнями.",
  en: "Premium instantly unlocks all features gated by user levels.",
};

const PLAN_SECTION_TITLE_BY_LANGUAGE = {
  ru: "Выберите план Premium",
  en: "Choose your Premium plan",
};

const PLAN_HINT_BY_LANGUAGE = {
  ru: "Выберите тариф и нажмите кнопку ниже",
  en: "Select a plan and tap the button below",
};

const FREE_LABEL_BY_LANGUAGE = {
  ru: "БЕСПЛ.",
  en: "FREE",
};

const PRO_LABEL_BY_LANGUAGE = {
  ru: "PRO",
  en: "PRO",
};

const COMPARISON_TAP_HINT_BY_LANGUAGE = {
  ru: "Нажми на функцию и увидишь её влияние на экономию.",
  en: "Tap a feature to see its savings impact.",
};

const PLAN_UNAVAILABLE_LABEL_BY_LANGUAGE = {
  ru: "Недоступно",
  en: "Unavailable",
};

const PAYWALL_BILLING_NOTICE_BY_LANGUAGE = {
  ru: {
    ios: "Ежемесячный и годовой планы — автопродлеваемые подписки. Управлять и отменять можно в App Store. Lifetime — разовая покупка.",
    android:
      "Ежемесячный и годовой планы — автопродлеваемые подписки. Управлять и отменять можно в Google Play. Lifetime — разовая покупка.",
    default:
      "Ежемесячный и годовой планы — автопродлеваемые подписки. Управлять и отменять можно в App Store / Google Play. Lifetime — разовая покупка.",
  },
  en: {
    ios: "Monthly and yearly plans are auto-renewable subscriptions. Manage or cancel anytime in App Store. Lifetime is a one-time purchase.",
    android:
      "Monthly and yearly plans are auto-renewable subscriptions. Manage or cancel anytime in Google Play. Lifetime is a one-time purchase.",
    default:
      "Monthly and yearly plans are auto-renewable subscriptions. Manage or cancel anytime in App Store / Google Play. Lifetime is a one-time purchase.",
  },
};

const PAYWALL_LEGAL_NOTICE_BY_LANGUAGE = {
  ru: "Продолжая, вы соглашаетесь с Условиями использования (EULA) и Политикой конфиденциальности.",
  en: "By continuing, you agree to the Terms of Use (EULA) and Privacy Policy.",
};

const PAYWALL_BADGE_BY_KIND = {
  soft: "ALMOST PRO",
  hard: "ALMOST PRO",
  feature: "ALMOST PRO",
};

const resolveLanguage = (language) => {
  if (language === "ru") return "ru";
  return "en";
};

const template = (value, replacements = {}) => {
  let nextValue = String(value || "");
  Object.entries(replacements).forEach(([token, tokenValue]) => {
    nextValue = nextValue.replace(`{{${token}}}`, String(tokenValue));
  });
  return nextValue;
};

const normalizeFeatureToken = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "";
};

const resolveLossWindowDays = (value) => {
  const parsed = Math.round(Number(value) || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LOSS_WINDOW_DAYS;
  return Math.min(180, Math.max(7, parsed));
};

const resolveLossAmountLabel = (lossAmountLabel, savedAmountLabel) => {
  if (typeof lossAmountLabel === "string" && lossAmountLabel.trim().length) {
    return lossAmountLabel.trim();
  }
  if (typeof savedAmountLabel === "string" && savedAmountLabel.trim().length) {
    return savedAmountLabel.trim();
  }
  return "$0";
};

const normalizeLossAmountByFeature = (value = {}) => {
  if (!value || typeof value !== "object") return {};
  return Object.entries(value).reduce((acc, [key, amount]) => {
    const normalizedKey = normalizeFeatureToken(key);
    const normalizedAmount = typeof amount === "string" ? amount.trim() : "";
    if (!normalizedKey || !normalizedAmount) return acc;
    acc[normalizedKey] = normalizedAmount;
    return acc;
  }, {});
};

const resolveComparisonRows = ({
  lang = "en",
  lossAmountLabel = "$0",
  lossAmountByFeature = {},
  lossWindowDays = DEFAULT_LOSS_WINDOW_DAYS,
} = {}) => {
  const rows = COMPARISON_ROWS_BY_LANGUAGE[lang] || COMPARISON_ROWS_BY_LANGUAGE.en;
  const normalizedLossAmountByFeature = normalizeLossAmountByFeature(lossAmountByFeature);
  return rows.map((row, index) => {
    const rawFeatureKeys = Array.isArray(row?.featureKeys)
      ? row.featureKeys
          .map((key) => (typeof key === "string" ? key.trim() : ""))
          .filter(Boolean)
      : typeof row?.featureKey === "string" && row.featureKey.trim().length
      ? [row.featureKey.trim()]
      : [];
    const featureKeys = rawFeatureKeys
      .map((key) => normalizeFeatureToken(key))
      .filter(Boolean);
    const rowLossAmountLabel =
      featureKeys
        .map((key) => normalizedLossAmountByFeature[key] || "")
        .find((value) => typeof value === "string" && value.trim().length > 0) || lossAmountLabel;
    const replacements = {
      amount: rowLossAmountLabel,
      days: lossWindowDays,
    };
    const lossTitle = row?.lossTitle ? template(row.lossTitle, replacements) : null;
    const lossSubtitle = row?.lossSubtitle ? template(row.lossSubtitle, replacements) : null;
    const explicitInteractive = typeof row?.interactive === "boolean" ? row.interactive : null;
    const interactive =
      explicitInteractive !== null ? explicitInteractive : !row?.isCosmetic && !!lossTitle;
    return {
      ...row,
      id: row?.id || `row_${index}`,
      featureKey: featureKeys[0] || null,
      featureKeys,
      lossAmountLabel: rowLossAmountLabel,
      lossTitle,
      lossSubtitle,
      interactive,
    };
  });
};

export const resolvePriceRegion = (currencyCode = "USD") => {
  const code = typeof currencyCode === "string" ? currencyCode.toUpperCase() : "USD";
  return REGION_BY_CURRENCY[code] || REGION_BY_CURRENCY.USD;
};

export const resolveFallbackPlanPricing = (currencyCode = "USD") => {
  const code = typeof currencyCode === "string" ? currencyCode.toUpperCase() : "USD";
  return FALLBACK_PRICES_BY_CURRENCY[code] || FALLBACK_PRICES_BY_CURRENCY.USD;
};

export const buildPaywallCopy = ({
  language = "en",
  kind = "soft",
  monthlyPriceLabel = "$5.99/mo",
  savedAmountLabel = "$0",
  lossAmountLabel = "",
  lossAmountByFeature = {},
  lossWindowDays = DEFAULT_LOSS_WINDOW_DAYS,
  featureKey = null,
  platform = "unknown",
} = {}) => {
  const lang = resolveLanguage(language);
  const normalizedKind = kind === "hard" ? "hard" : kind === "feature" ? "feature" : "soft";
  const normalizedPlatform = platform === "ios" ? "ios" : platform === "android" ? "android" : "default";
  const normalizedFeatureKey =
    typeof featureKey === "string" && featureKey.trim().length
      ? normalizeFeatureToken(featureKey)
      : null;
  const resolvedLossWindowDays = resolveLossWindowDays(lossWindowDays);
  const resolvedLossAmountLabel = resolveLossAmountLabel(lossAmountLabel, savedAmountLabel);
  const normalizedLossAmountByFeature = normalizeLossAmountByFeature(lossAmountByFeature);
  const effectiveKind = normalizedFeatureKey ? "feature" : normalizedKind;
  const featureName = normalizedFeatureKey
    ? FEATURE_NAME_BY_KEY[normalizedFeatureKey]?.[lang] ||
      (Object.entries(FEATURE_NAME_BY_KEY).find(
        ([candidateKey]) => normalizeFeatureToken(candidateKey) === normalizedFeatureKey
      )?.[1]?.[lang] || null)
    : null;
  const comparisonRows = resolveComparisonRows({
    lang,
    lossAmountLabel: resolvedLossAmountLabel,
    lossAmountByFeature: normalizedLossAmountByFeature,
    lossWindowDays: resolvedLossWindowDays,
  });
  const activeFeatureInsightRow = normalizedFeatureKey
    ? comparisonRows.find(
        (row) => row?.interactive && Array.isArray(row?.featureKeys) && row.featureKeys.includes(normalizedFeatureKey)
      ) || null
    : null;
  const copyTokens = {
    monthly: monthlyPriceLabel,
    saved: savedAmountLabel || "$0",
    amount: resolvedLossAmountLabel,
    days: resolvedLossWindowDays,
  };

  let title = template(SOFT_TITLE_BY_LANGUAGE[lang], copyTokens);
  let subtitle = template(SOFT_MARKETING_LINE_BY_LANGUAGE[lang], copyTokens);
  let psychologyLine = SOFT_PSYCHOLOGY_LINE_BY_LANGUAGE[lang];

  if (effectiveKind === "hard") {
    title = template(HARD_TITLE_BY_LANGUAGE[lang], copyTokens);
    subtitle = template(HARD_MARKETING_LINE_BY_LANGUAGE[lang], copyTokens);
    psychologyLine = null;
  } else if (effectiveKind === "feature") {
    title = FEATURE_TITLE_BY_LANGUAGE[lang];
    subtitle = featureName
      ? lang === "ru"
        ? `Открой Premium, чтобы получить ${featureName} и полный набор инструментов.`
        : `Unlock Premium to access ${featureName} and get the full toolkit.`
      : FEATURE_MARKETING_LINE_BY_LANGUAGE[lang];
    psychologyLine = null;
  }
  if (activeFeatureInsightRow?.lossTitle) {
    title = activeFeatureInsightRow.lossTitle;
    subtitle = activeFeatureInsightRow?.lossSubtitle || subtitle;
    psychologyLine = null;
  }

  return {
    badgeLabel: PAYWALL_BADGE_BY_KIND[effectiveKind] || PAYWALL_BADGE_BY_KIND.soft,
    title,
    subtitle,
    psychologyLine,
    activeFeatureKey: normalizedFeatureKey,
    lossAmountLabel: resolvedLossAmountLabel,
    lossAmountByFeature: normalizedLossAmountByFeature,
    lossWindowDays: resolvedLossWindowDays,
    features: BASE_FEATURES_BY_LANGUAGE[lang],
    comparisonRows,
    unlockLevelsLine: LEVEL_UNLOCK_LINE_BY_LANGUAGE[lang],
    planSectionTitle: PLAN_SECTION_TITLE_BY_LANGUAGE[lang],
    planHint: PLAN_HINT_BY_LANGUAGE[lang],
    freeColumnLabel: FREE_LABEL_BY_LANGUAGE[lang],
    proColumnLabel: PRO_LABEL_BY_LANGUAGE[lang],
    comparisonTapHint: COMPARISON_TAP_HINT_BY_LANGUAGE[lang],
    planUnavailableLabel: PLAN_UNAVAILABLE_LABEL_BY_LANGUAGE[lang],
    ctaPrimary: lang === "ru" ? "Открыть Premium" : "Unlock Premium",
    ctaRestore: lang === "ru" ? "Восстановить покупки" : "Restore purchases",
    ctaClose: lang === "ru" ? "Позже" : "Maybe later",
    ctaManage: lang === "ru" ? "Управлять подпиской" : "Manage subscription",
    legalNotice: PAYWALL_LEGAL_NOTICE_BY_LANGUAGE[lang],
    billingNotice:
      PAYWALL_BILLING_NOTICE_BY_LANGUAGE[lang]?.[normalizedPlatform] ||
      PAYWALL_BILLING_NOTICE_BY_LANGUAGE[lang]?.default ||
      "",
    legalTermsLabel: lang === "ru" ? "Условия" : "Terms",
    legalPrivacyLabel: lang === "ru" ? "Конфиденциальность" : "Privacy",
  };
};

export const buildDefaultPlanCards = (currencyCode = "USD") => {
  const pricing = resolveFallbackPlanPricing(currencyCode);
  return [
    {
      id: "yearly",
      label: "Yearly",
      priceLabel: pricing.yearly.label,
      secondaryLabel: pricing.yearly.perMonth,
      badge: pricing.yearly.badge,
      recommended: true,
    },
    {
      id: "monthly",
      label: "Monthly",
      priceLabel: pricing.monthly.label,
      secondaryLabel: pricing.monthly.perMonth,
      badge: pricing.monthly.badge,
      recommended: false,
    },
    {
      id: "lifetime",
      label: "Lifetime",
      priceLabel: pricing.lifetime.label,
      secondaryLabel: pricing.lifetime.perMonth,
      badge: pricing.lifetime.badge,
      recommended: false,
    },
  ];
};
