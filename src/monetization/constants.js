import { LANGUAGE_MAP_FALLBACK_TRANSLATIONS } from "../constants/languageMapFallback.generated.js";

export const PREMIUM_ENTITLEMENT_ID = "premium";

export const PREMIUM_PRODUCT_IDS = {
  monthly: "almost_premium_monthly",
  yearly: "almost_premium_yearly",
  lifetime: "almost_premium_lifetime",
};

export const PREMIUM_PLAN_ORDER = ["yearly", "monthly"];

export const FREE_PLAN_LIMITS = {
  activeGoals: 1,
  activePendingCards: 2,
  customTemptationCards: 10,
  historyDays: 7,
  challengeClaims: 3,
  reportsWeeks: 4,
  reportsMonths: 1,
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
  es: "En los últimos {{days}} días, podrías haber ahorrado {{amount}} más.",
  fr: "Sur les {{days}} derniers jours, tu aurais pu économiser {{amount}} de plus.",
  de: "In den letzten {{days}} Tagen hättest du weitere {{amount}} sparen können.",
  ar: "خلال آخر {{days}} يوماً كان بإمكانك ادخار {{amount}} إضافية.",
  zh: "在过去 {{days}} 天里，你本可以再省下 {{amount}}。",
};
const SOFT_FRESH_START_TITLE_BY_LANGUAGE = {
  ru: "Отличный старт. С Premium можно сохранить до {{percent}}% больше за следующие {{days}} дней.",
  en: "Great start. With Premium, you can save up to {{percent}}% more over the next {{days}} days.",
  es: "Buen comienzo. Con Premium puedes ahorrar hasta un {{percent}}% más en los próximos {{days}} días.",
  fr: "Très bon départ. Avec Premium, tu peux économiser jusqu'à {{percent}}% de plus sur les {{days}} prochains jours.",
  de: "Starker Start. Mit Premium kannst du in den nächsten {{days}} Tagen bis zu {{percent}}% mehr sparen.",
  ar: "بداية ممتازة. مع Premium يمكنك ادخار حتى {{percent}}٪ أكثر خلال {{days}} يوماً القادمة.",
  zh: "开局很棒。使用 Premium，你在接下来的 {{days}} 天内最多可多省 {{percent}}%。",
};

const HARD_TITLE_BY_LANGUAGE = {
  ru: "Ты уже экономишь. Но ещё {{amount}} за {{days}} дней можно было не потерять.",
  en: "You are already saving. But {{amount}} over {{days}} days could still be kept.",
  es: "Ya estás ahorrando. Pero aún podrías conservar {{amount}} en {{days}} días.",
  fr: "Tu économises déjà. Mais tu pourrais encore conserver {{amount}} sur {{days}} jours.",
  de: "Du sparst bereits. Trotzdem könntest du in {{days}} Tagen noch {{amount}} zusätzlich behalten.",
  ar: "أنت تدّخر بالفعل، لكن كان يمكن الاحتفاظ بـ {{amount}} إضافية خلال {{days}} يوماً.",
  zh: "你已经在省钱了，但在 {{days}} 天内仍可再留住 {{amount}}。",
};

const FEATURE_TITLE_BY_LANGUAGE = {
  ru: "Эта функция возвращает деньги, которые обычно утекают незаметно",
  en: "This feature helps recover money that usually slips away unnoticed",
  es: "Esta función te ayuda a recuperar dinero que suele escaparse sin darte cuenta",
  fr: "Cette fonctionnalité aide à récupérer l'argent qui s'échappe souvent sans s'en rendre compte",
  de: "Diese Funktion hilft dir, Geld zurückzuholen, das sonst unbemerkt verloren geht",
  ar: "تساعدك هذه الميزة على استرجاع الأموال التي تتسرب عادةً دون ملاحظة",
  zh: "这个功能可帮助你找回那些常常悄悄流失的钱",
};

const BASE_FEATURES_BY_LANGUAGE = {
  ru: [
    "Умная аналитика бюджета и лимиты по категориям",
    "Недельные и месячные умные анализы расходов с инсайтами",
    "Неограниченное количество целей",
    "Impulse-карта с триггерами и точками срыва",
    "Неограниченные карточки искушений",
    "Больше челленджей и наград",
    "Home Screen виджеты и слайдер",
    "Мгновенная разблокировка всех функций, закрытых уровнем",
    "Неограниченное количество кастомных категорий",
    "Расширенная очередь карточек «Думаю»",
    "Кастомизация кота + полная кастомизация Pro-темы",
  ],
  en: [
    "Smart budget analytics with category limits",
    "Weekly and monthly smart spending analysis with insights",
    "Unlimited goals",
    "Impulse map with trigger and slip-zone insights",
    "Unlimited temptation cards",
    "More challenges and rewards",
    "Home screen widgets and slider",
    "Instant unlock of all level-gated features",
    "Unlimited custom categories",
    "Extended Think queue",
    "Cat customization + full Pro theme customization",
  ],
  es: [
    "Analítica inteligente del presupuesto con límites por categoría",
    "Análisis semanales y mensuales de gastos con insights",
    "Metas ilimitadas",
    "Mapa de impulsos con disparadores y zonas de riesgo",
    "Tarjetas de tentación ilimitadas",
    "Más desafíos y recompensas",
    "Widgets y deslizador en pantalla de inicio",
    "Desbloqueo instantáneo de todas las funciones por nivel",
    "Categorías personalizadas ilimitadas",
    "Cola de \"Pensar\" ampliada",
    "Personalización del gato + personalización completa del tema Pro",
  ],
  fr: [
    "Analyse intelligente du budget avec limites par catégorie",
    "Analyses hebdomadaires et mensuelles des dépenses avec insights",
    "Objectifs illimités",
    "Carte des impulsions avec déclencheurs et zones à risque",
    "Cartes de tentation illimitées",
    "Plus de défis et de récompenses",
    "Widgets et curseur sur l'écran d'accueil",
    "Déverrouillage instantané de toutes les fonctions bloquées par niveau",
    "Catégories personnalisées illimitées",
    "File \"Je réfléchis\" étendue",
    "Personnalisation du chat + personnalisation complète du thème Pro",
  ],
};

BASE_FEATURES_BY_LANGUAGE.de = [...BASE_FEATURES_BY_LANGUAGE.en];
BASE_FEATURES_BY_LANGUAGE.ar = [...BASE_FEATURES_BY_LANGUAGE.en];
BASE_FEATURES_BY_LANGUAGE.zh = [...BASE_FEATURES_BY_LANGUAGE.en];

const FEATURE_NAME_BY_KEY = {
  catCustomization: {
    ru: "кастомизация кота",
    en: "cat customization",
    es: "personalización del gato",
    fr: "personnalisation du chat",
  },
  impulseMap: {
    ru: "impulse-карта",
    en: "impulse map",
    es: "mapa de impulsos",
    fr: "carte des impulsions",
  },
  reports: {
    ru: "умные анализы расходов",
    en: "smart spending analysis",
    es: "análisis inteligente de gastos",
    fr: "analyses intelligentes des dépenses",
  },
  customCategories: {
    ru: "кастомные категории",
    en: "custom categories",
    es: "categorías personalizadas",
    fr: "catégories personnalisées",
  },
  thinkingQueue: {
    ru: "больше карточек «Думаю»",
    en: "more Think cards",
    es: "más tarjetas de «Pensar»",
    fr: "plus de cartes «Je réfléchis»",
  },
  homeWidget: {
    ru: "домашний виджет",
    en: "home widget",
    es: "widget de inicio",
    fr: "widget d'accueil",
  },
  widgetSlider: {
    ru: "слайдер виджетов",
    en: "widget slider",
    es: "deslizador de widgets",
    fr: "curseur de widgets",
  },
  budgetAuto: {
    ru: "умную аналитику бюджета",
    en: "smart budget analytics",
    es: "analítica inteligente del presupuesto",
    fr: "analyse intelligente du budget",
  },
  multipleGoals: {
    ru: "несколько целей",
    en: "multiple goals",
    es: "varias metas",
    fr: "plusieurs objectifs",
  },
  fullHistory: {
    ru: "полная история",
    en: "full history",
    es: "historial completo",
    fr: "historique complet",
  },
  customTemptationCards: {
    ru: "дополнительные карточки искушений",
    en: "extra temptation cards",
    es: "tarjetas de tentación extra",
    fr: "cartes de tentation supplémentaires",
  },
  unlimitedChallenges: {
    ru: "больше челленджей",
    en: "more challenge claims",
    es: "más desafíos",
    fr: "plus de défis",
  },
  proTheme: {
    ru: "полная кастомизация Pro-темы",
    en: "full Pro theme customization",
    es: "personalización completa del tema Pro",
    fr: "personnalisation complète du thème Pro",
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
      id: "budgetAuto",
      label: "Умная аналитика бюджета и лимиты по категориям",
      featureKeys: [PREMIUM_FEATURE_KEYS.budgetAuto],
      free: false,
      premium: true,
      lossTitle: "Умный бюджет может сохранить {{amount}} за {{days}} дней.",
      lossSubtitle: "Авто-лимиты по категориям помогают сократить перерасход до конца месяца.",
    },
    {
      id: "reports",
      label: "Недельные и месячные персональные отчёты",
      featureKeys: [PREMIUM_FEATURE_KEYS.reports],
      free: false,
      premium: true,
      lossTitle:
        "Люди, которые видят персональные отчёты и советы по оптимизации расходов, экономят в среднем на 30% больше.",
      lossSubtitle:
        "Отчёты показывают конкретные шаги по твоим категориям, а не общие советы.",
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
      id: "impulseMap",
      label: "Impulse-карта: триггеры и точки срыва",
      featureKeys: [PREMIUM_FEATURE_KEYS.impulseMap],
      free: false,
      premium: true,
      lossTitle: "Impulse-карта может вернуть {{amount}} за {{days}} дней.",
      lossSubtitle:
        "Карта показывает, где и в какие моменты ты чаще срываешься, чтобы перехватить трату до оплаты.",
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
      id: "widgets",
      label: "Home Screen виджеты и слайдер",
      featureKeys: [PREMIUM_FEATURE_KEYS.homeWidget, PREMIUM_FEATURE_KEYS.widgetSlider],
      free: false,
      premium: true,
      lossTitle: "Пользователи с Home Screen виджетами в среднем сохраняют в 1.4x больше денег.",
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
      id: "thinkingQueue",
      label: "Расширенная очередь карточек «Думаю»",
      featureKeys: [PREMIUM_FEATURE_KEYS.thinkingQueue],
      free: false,
      premium: true,
      lossTitle: "Без очереди «Думаю» сложнее переждать импульс, и лишние траты случаются чаще.",
      lossSubtitle: "Отложенные решения дают время остыть и не терять деньги на эмоциях.",
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
      id: "budgetAuto",
      label: "Smart budget analytics and category limits",
      featureKeys: [PREMIUM_FEATURE_KEYS.budgetAuto],
      free: false,
      premium: true,
      lossTitle: "Smart budget can protect {{amount}} in {{days}} days.",
      lossSubtitle: "Auto category limits reduce overspending before month-end.",
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
      id: "impulseMap",
      label: "Impulse map: triggers and slip zones",
      featureKeys: [PREMIUM_FEATURE_KEYS.impulseMap],
      free: false,
      premium: true,
      lossTitle: "Impulse map can recover {{amount}} in {{days}} days.",
      lossSubtitle:
        "It shows when and where urges spike so you can stop overspending before checkout.",
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
      id: "widgets",
      label: "Home screen widgets and slider",
      featureKeys: [PREMIUM_FEATURE_KEYS.homeWidget, PREMIUM_FEATURE_KEYS.widgetSlider],
      free: false,
      premium: true,
      lossTitle: "Users with home widgets save about 1.4x more money.",
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
      id: "thinkingQueue",
      label: "Extended “Think” queue",
      featureKeys: [PREMIUM_FEATURE_KEYS.thinkingQueue],
      free: false,
      premium: true,
      lossTitle: "Without a longer Think queue, impulse urges are harder to cool off in time.",
      lossSubtitle: "Delayed decisions create a pause that protects your budget.",
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
  es: [
    {
      id: "basicTracker",
      label: "Rastreador básico de impulsos",
      free: true,
      premium: true,
      interactive: false,
    },
    {
      id: "budgetAuto",
      label: "Analítica inteligente del presupuesto y límites por categoría",
      featureKeys: [PREMIUM_FEATURE_KEYS.budgetAuto],
      free: false,
      premium: true,
      lossTitle: "El presupuesto inteligente puede proteger {{amount}} en {{days}} días.",
      lossSubtitle: "Los límites automáticos por categoría reducen el gasto excesivo antes de fin de mes.",
    },
    {
      id: "reports",
      label: "Informes personales semanales y mensuales",
      featureKeys: [PREMIUM_FEATURE_KEYS.reports],
      free: false,
      premium: true,
      lossTitle:
        "Quienes usan informes personales y consejos de optimización ahorran en promedio un 30% más.",
      lossSubtitle: "Los informes te dan pasos claros según tus categorías y hábitos.",
    },
    {
      id: "multipleGoals",
      label: "Metas ilimitadas",
      featureKeys: [PREMIUM_FEATURE_KEYS.multipleGoals],
      free: false,
      premium: true,
      lossTitle:
        "Cuando el dinero se reparte entre varias metas, bajan las compras impulsivas y el progreso acelera.",
      lossSubtitle: "Sigue varias metas en paralelo y mantén la motivación.",
    },
    {
      id: "impulseMap",
      label: "Mapa de impulsos: disparadores y zonas de riesgo",
      featureKeys: [PREMIUM_FEATURE_KEYS.impulseMap],
      free: false,
      premium: true,
      lossTitle: "El mapa de impulsos puede recuperar {{amount}} en {{days}} días.",
      lossSubtitle: "Muestra cuándo y dónde suben los impulsos para frenar el gasto antes de pagar.",
    },
    {
      id: "unlimitedChallenges",
      label: "Más desafíos y recompensas",
      featureKeys: [PREMIUM_FEATURE_KEYS.unlimitedChallenges],
      free: false,
      premium: true,
      lossTitle:
        "Las rutinas con desafíos mejoran la disciplina: los usuarios activos suelen retener más dinero en las primeras semanas.",
      lossSubtitle: "Más desafíos significan más puntos de control para frenar gastos.",
    },
    {
      id: "customTemptationCards",
      label: "Tarjetas de tentación ilimitadas",
      featureKeys: [PREMIUM_FEATURE_KEYS.customTemptationCards],
      free: false,
      premium: true,
      lossTitle: "Sin tarjetas extra, las fugas pequeñas y repetidas pasan desapercibidas.",
      lossSubtitle: "Las tarjetas ilimitadas te ayudan a cerrar nuevas fugas de gasto en cuanto aparecen.",
    },
    {
      id: "widgets",
      label: "Widgets y deslizador en pantalla de inicio",
      featureKeys: [PREMIUM_FEATURE_KEYS.homeWidget, PREMIUM_FEATURE_KEYS.widgetSlider],
      free: false,
      premium: true,
      lossTitle: "Los usuarios con widgets de inicio ahorran alrededor de 1.4x más dinero.",
      lossSubtitle: "Ves tus límites antes de comprar y haces menos compras en piloto automático.",
    },
    {
      id: "levelUnlocks",
      label: "Desbloqueo instantáneo de todas las herramientas por nivel",
      free: false,
      premium: true,
      lossTitle:
        "Mientras las herramientas clave sigan bloqueadas por nivel, pierdes ahorros que podrían sumar {{amount}} en {{days}} días.",
      lossSubtitle: "Premium lo desbloquea todo al instante.",
    },
    {
      id: "customCategories",
      label: "Categorías personalizadas ilimitadas",
      featureKeys: [PREMIUM_FEATURE_KEYS.customCategories],
      free: false,
      premium: true,
      lossTitle:
        "Las categorías personalizadas hacen visibles las fugas y pueden recuperar hasta {{amount}} en {{days}} días.",
      lossSubtitle: "Mejores categorías dan informes y recomendaciones más precisos.",
    },
    {
      id: "thinkingQueue",
      label: "Cola de «Pensar» ampliada",
      featureKeys: [PREMIUM_FEATURE_KEYS.thinkingQueue],
      free: false,
      premium: true,
      lossTitle: "Sin una cola «Pensar» más larga, es más difícil enfriar impulsos a tiempo.",
      lossSubtitle: "Aplazar decisiones crea una pausa que protege tu presupuesto.",
    },
    {
      id: "catCustomization",
      label: "Skins del gato + tema Pro",
      featureKeys: [PREMIUM_FEATURE_KEYS.catCustomization, PREMIUM_FEATURE_KEYS.proTheme],
      free: false,
      premium: true,
      isCosmetic: true,
      interactive: false,
    },
  ],
  fr: [
    {
      id: "basicTracker",
      label: "Suivi d'impulsions de base",
      free: true,
      premium: true,
      interactive: false,
    },
    {
      id: "budgetAuto",
      label: "Analyse intelligente du budget et limites par catégorie",
      featureKeys: [PREMIUM_FEATURE_KEYS.budgetAuto],
      free: false,
      premium: true,
      lossTitle: "Le budget intelligent peut protéger {{amount}} en {{days}} jours.",
      lossSubtitle: "Les limites automatiques par catégorie réduisent les dépassements avant la fin du mois.",
    },
    {
      id: "reports",
      label: "Rapports personnels hebdomadaires et mensuels",
      featureKeys: [PREMIUM_FEATURE_KEYS.reports],
      free: false,
      premium: true,
      lossTitle:
        "Les personnes qui utilisent des rapports personnels et des conseils d'optimisation économisent en moyenne 30% de plus.",
      lossSubtitle: "Les rapports donnent des actions concrètes selon tes catégories et habitudes.",
    },
    {
      id: "multipleGoals",
      label: "Objectifs illimités",
      featureKeys: [PREMIUM_FEATURE_KEYS.multipleGoals],
      free: false,
      premium: true,
      lossTitle:
        "Quand l'argent est réparti sur plusieurs objectifs, les achats impulsifs baissent et la progression s'accélère.",
      lossSubtitle: "Suis plusieurs objectifs en parallèle et garde la motivation.",
    },
    {
      id: "impulseMap",
      label: "Carte des impulsions : déclencheurs et zones à risque",
      featureKeys: [PREMIUM_FEATURE_KEYS.impulseMap],
      free: false,
      premium: true,
      lossTitle: "La carte des impulsions peut récupérer {{amount}} en {{days}} jours.",
      lossSubtitle: "Elle montre quand et où les envies montent pour arrêter les dépenses avant le paiement.",
    },
    {
      id: "unlimitedChallenges",
      label: "Plus de défis et de récompenses",
      featureKeys: [PREMIUM_FEATURE_KEYS.unlimitedChallenges],
      free: false,
      premium: true,
      lossTitle:
        "Les routines basées sur des défis améliorent la discipline : les utilisateurs actifs gardent généralement plus d'argent dès les premières semaines.",
      lossSubtitle: "Plus de défis = plus de points de contrôle pour interrompre les dépenses.",
    },
    {
      id: "customTemptationCards",
      label: "Cartes de tentation illimitées",
      featureKeys: [PREMIUM_FEATURE_KEYS.customTemptationCards],
      free: false,
      premium: true,
      lossTitle: "Sans cartes supplémentaires, les petites fuites récurrentes restent invisibles.",
      lossSubtitle: "Les cartes illimitées aident à bloquer les nouvelles fuites dès qu'elles apparaissent.",
    },
    {
      id: "widgets",
      label: "Widgets et curseur sur l'écran d'accueil",
      featureKeys: [PREMIUM_FEATURE_KEYS.homeWidget, PREMIUM_FEATURE_KEYS.widgetSlider],
      free: false,
      premium: true,
      lossTitle: "Les utilisateurs avec des widgets d'accueil économisent environ 1.4x plus d'argent.",
      lossSubtitle: "Tu vois tes limites avant d'acheter, donc moins d'achats en pilote automatique.",
    },
    {
      id: "levelUnlocks",
      label: "Déverrouillage instantané de tous les outils bloqués par niveau",
      free: false,
      premium: true,
      lossTitle:
        "Tant que les outils clés restent bloqués par niveau, tu rates des économies qui pourraient ajouter {{amount}} sur {{days}} jours.",
      lossSubtitle: "Premium débloque tout immédiatement.",
    },
    {
      id: "customCategories",
      label: "Catégories personnalisées illimitées",
      featureKeys: [PREMIUM_FEATURE_KEYS.customCategories],
      free: false,
      premium: true,
      lossTitle:
        "Les catégories personnalisées rendent les fuites visibles et peuvent récupérer jusqu'à {{amount}} sur {{days}} jours.",
      lossSubtitle: "De meilleures catégories donnent des rapports et recommandations plus précis.",
    },
    {
      id: "thinkingQueue",
      label: "File «Je réfléchis» étendue",
      featureKeys: [PREMIUM_FEATURE_KEYS.thinkingQueue],
      free: false,
      premium: true,
      lossTitle: "Sans file «Je réfléchis» plus longue, il est plus difficile de laisser retomber l'impulsion à temps.",
      lossSubtitle: "Reporter une décision crée une pause qui protège ton budget.",
    },
    {
      id: "catCustomization",
      label: "Skins du chat + thème Pro",
      featureKeys: [PREMIUM_FEATURE_KEYS.catCustomization, PREMIUM_FEATURE_KEYS.proTheme],
      free: false,
      premium: true,
      isCosmetic: true,
      interactive: false,
    },
  ],
};

const cloneComparisonRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    featureKeys: Array.isArray(row?.featureKeys) ? [...row.featureKeys] : row?.featureKeys,
  }));

COMPARISON_ROWS_BY_LANGUAGE.de = cloneComparisonRows(COMPARISON_ROWS_BY_LANGUAGE.en);
COMPARISON_ROWS_BY_LANGUAGE.ar = cloneComparisonRows(COMPARISON_ROWS_BY_LANGUAGE.en);
COMPARISON_ROWS_BY_LANGUAGE.zh = cloneComparisonRows(COMPARISON_ROWS_BY_LANGUAGE.en);

const SOFT_PSYCHOLOGY_LINE_BY_LANGUAGE = {
  ru: "Цена Premium = стоимость одного отказа от импульсивной покупки.",
  en: "Premium costs the price of a single impulse you choose to skip.",
  es: "Premium cuesta lo mismo que un solo impulso que decides evitar.",
  fr: "Premium coûte le prix d'une seule impulsion que tu décides d'éviter.",
  de: "Premium kostet ungefähr so viel wie ein einziger Impuls, den du bewusst auslässt.",
  ar: "تكلفة Premium تساوي تقريباً تكلفة نزوة واحدة تتجاوزها.",
  zh: "Premium 的价格大致等于你主动放弃的一次冲动消费。",
};
const SOFT_FRESH_START_PSYCHOLOGY_LINE_BY_LANGUAGE = {
  ru: "С Premium проще закрепить привычку контролировать траты с первого дня.",
  en: "Premium helps lock in your spending-control habit from day one.",
  es: "Premium te ayuda a fijar el hábito de controlar gastos desde el primer día.",
  fr: "Premium aide à ancrer l'habitude de contrôler les dépenses dès le premier jour.",
  de: "Mit Premium verankerst du die Gewohnheit, Ausgaben zu steuern, von Tag eins an.",
  ar: "يساعدك Premium على ترسيخ عادة التحكم بالمصروفات من اليوم الأول.",
  zh: "Premium 可帮助你从第一天就建立并稳定控支习惯。",
};

const SOFT_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Premium стоит {{monthly}}. С инструментами контроля ты можешь вернуть до {{amount}} за следующие {{days}} дней.",
  en: "Premium is {{monthly}}. With the full toolkit, you can recover up to {{amount}} over the next {{days}} days.",
  es: "Premium cuesta {{monthly}}. Con el kit completo, puedes recuperar hasta {{amount}} en los próximos {{days}} días.",
  fr: "Premium coûte {{monthly}}. Avec tous les outils, tu peux récupérer jusqu'à {{amount}} sur les {{days}} prochains jours.",
  de: "Premium kostet {{monthly}}. Mit dem kompletten Toolkit kannst du in den nächsten {{days}} Tagen bis zu {{amount}} zurückholen.",
  ar: "سعر Premium هو {{monthly}}. ومع الأدوات الكاملة يمكنك استعادة ما يصل إلى {{amount}} خلال {{days}} يوماً القادمة.",
  zh: "Premium 价格为 {{monthly}}。使用完整工具，你在接下来的 {{days}} 天内最多可挽回 {{amount}}。",
};
const SOFT_FRESH_START_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Сейчас лучший момент настроить систему трат: лимиты, отчёты и контроль с первого дня.",
  en: "Now is the best moment to set your spending system: limits, reports, and control from day one.",
  es: "Ahora es el mejor momento para ordenar tu sistema de gasto: límites, informes y control desde el primer día.",
  fr: "C'est le meilleur moment pour structurer ton système de dépenses : limites, rapports et contrôle dès le premier jour.",
  de: "Jetzt ist der beste Moment, dein Ausgabensystem aufzubauen: Limits, Berichte und Kontrolle von Anfang an.",
  ar: "الآن هو أفضل وقت لبناء نظام مصروفاتك: حدود وتقارير وتحكم من اليوم الأول.",
  zh: "现在是建立消费系统的最佳时机：从第一天开始设置限额、报告与控制。",
};

const HARD_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Almost уже помог сохранить {{saved}}. Premium закрывает оставшиеся утечки и помогает удерживать прогресс.",
  en: "Almost has already helped you save {{saved}}. Premium closes remaining leaks and keeps momentum going.",
  es: "Almost ya te ayudó a ahorrar {{saved}}. Premium cierra las fugas restantes y mantiene el impulso.",
  fr: "Almost t'a déjà aidé à économiser {{saved}}. Premium ferme les fuites restantes et maintient l'élan.",
  de: "Almost hat dir bereits geholfen, {{saved}} zu sparen. Premium schließt verbleibende Lecks und hält den Fortschritt stabil.",
  ar: "ساعدك Almost بالفعل على ادخار {{saved}}. يعمل Premium على إغلاق التسريبات المتبقية والحفاظ على الزخم.",
  zh: "Almost 已帮助你省下 {{saved}}。Premium 可补上剩余漏损并保持你的进度势头。",
};
const SAVE_LIMIT_REACHED_TITLE_BY_LANGUAGE = {
  ru: "Вау! Вы сохранили {{saved}}. Поздравляем!",
  en: "Wow! You've saved {{saved}}. Congratulations!",
  es: "¡Guau! Has ahorrado {{saved}}. ¡Felicidades!",
  fr: "Waouh ! Tu as économisé {{saved}}. Félicitations !",
  de: "Wow! Du hast {{saved}} gespart. Glückwunsch!",
  ar: "رائع! لقد وفّرت {{saved}}. تهانينا!",
  zh: "太棒了！你已经节省了 {{saved}}。恭喜！",
};
const SAVE_LIMIT_REACHED_SUBTITLE_BY_LANGUAGE = {
  ru: "Вы достигли лимита бесплатных сохранений. Чтобы продолжить, перейдите на Premium.",
  en: "You've reached the free save limit. To continue, join Premium.",
  es: "Has alcanzado el límite de guardados gratuitos. Para continuar, únete a Premium.",
  fr: "Tu as atteint la limite de sauvegardes gratuites. Pour continuer, passe à Premium.",
  de: "Du hast das kostenlose Speicherlimit erreicht. Um fortzufahren, wechsle zu Premium.",
  ar: "لقد وصلت إلى حد الحفظ المجاني. للمتابعة، انضم إلى Premium.",
  zh: "你已达到免费保存上限。要继续，请加入 Premium。",
};
const TRIAL_10_SAVES_TITLE_BY_LANGUAGE = {
  ru: "Вау! Вы сохранили {{saved}}. Поздравляем!",
  en: "Wow! You've saved {{saved}}. Congratulations!",
  es: "¡Guau! Has ahorrado {{saved}}. ¡Felicidades!",
  fr: "Waouh ! Tu as économisé {{saved}}. Félicitations !",
  de: "Wow! Du hast {{saved}} gespart. Glückwunsch!",
  ar: "رائع! لقد وفّرت {{saved}}. تهانينا!",
  zh: "太棒了！你已经节省了 {{saved}}。恭喜！",
};
const TRIAL_10_SAVES_SUBTITLE_BY_LANGUAGE = {
  ru: "Вы достигли лимита бесплатных сохранений. Чтобы продолжить, перейдите на Premium.",
  en: "You've reached the free save limit. To continue, join Premium.",
  es: "Has alcanzado el límite de guardados gratuitos. Para continuar, únete a Premium.",
  fr: "Tu as atteint la limite de sauvegardes gratuites. Pour continuer, passe à Premium.",
  de: "Du hast das kostenlose Speicherlimit erreicht. Um fortzufahren, wechsle zu Premium.",
  ar: "لقد وصلت إلى حد الحفظ المجاني. للمتابعة، انضم إلى Premium.",
  zh: "你已达到免费保存上限。要继续，请加入 Premium。",
};
const GROUP_C_SUPPORT_INTRO_BADGE_BY_LANGUAGE = {
  ru: "ЛИЧНОЕ СООБЩЕНИЕ",
  en: "PERSONAL NOTE",
  es: "MENSAJE PERSONAL",
  fr: "MESSAGE PERSONNEL",
  de: "PERSÖNLICHE NACHRICHT",
  ar: "رسالة شخصية",
  zh: "开发者来信",
};
const GROUP_C_SUPPORT_5_SAVES_TITLE_BY_LANGUAGE = {
  ru: "Ты уже сэкономил(а) {{saved}}! Это мощный старт.",
  en: "You've already saved {{saved}}! That's an incredible start.",
  es: "Ya has ahorrado {{saved}}. ¡Es un comienzo increíble!",
  fr: "Tu as déjà économisé {{saved}}. C'est un départ incroyable !",
  de: "Du hast schon {{saved}} gespart. Das ist ein starker Start!",
  ar: "لقد وفّرت بالفعل {{saved}}! هذه بداية رائعة.",
  zh: "你已经省下了 {{saved}}！这是非常棒的开始。",
};
const GROUP_C_SUPPORT_5_SAVES_SUBTITLE_BY_LANGUAGE = {
  ru: "Ты большой молодец. Прочитай личное сообщение от создателя и продолжай в том же духе.",
  en: "You're doing great. Read a personal note from the creator and keep going.",
  es: "Lo estás haciendo muy bien. Lee un mensaje personal del creador y sigue así.",
  fr: "Tu te débrouilles très bien. Lis un message personnel du créateur et continue comme ça.",
  de: "Du machst das großartig. Lies die persönliche Nachricht vom Gründer und bleib dran.",
  ar: "أنت تقوم بعمل رائع. اقرأ رسالة شخصية من المؤسس وواصل التقدم.",
  zh: "你做得很棒。读一条创始人的个人消息，然后继续前进。",
};
const GROUP_C_SUPPORT_AUTHOR_BY_LANGUAGE = {
  ru: "Александр, создатель Almost",
  en: "Alexander, creator of Almost",
  es: "Alexander, creador de Almost",
  fr: "Alexandre, créateur d'Almost",
  de: "Alexander, Gründer von Almost",
  ar: "ألكسندر، مؤسس Almost",
  zh: "Alexander，Almost 创始人",
};
const GROUP_C_SUPPORT_STATUS_BY_LANGUAGE = {
  ru: "только что",
  en: "just now",
  es: "ahora mismo",
  fr: "à l'instant",
  de: "gerade eben",
  ar: "الآن",
  zh: "刚刚",
};
const GROUP_C_SUPPORT_MESSAGE_BY_LANGUAGE = {
  ru: "Привет! Это Александр, создатель Almost. Я вижу, что ты уже делаешь первые шаги на пути к своей финансовой цели, и поздравляю тебя с этим! Желаю тебе успехов в этом непростом пути, и уверен, что у тебя всё получится. Также надеюсь, что и у меня получится развивать Almost и выполнить миссию: создать лучший инструмент, который помогает людям. Буду очень признателен, если у тебя будет возможность поддержать Almost подпиской. Almost Premium даёт много полезных и классных инструментов для достижения финансовых целей, и я продолжу развивать проект. Все подписчики Premium автоматически будут получать новые фишки приложения. Заранее спасибо!",
  en: "Hi! I'm Alexander, the creator of Almost. I can see you are already taking your first steps toward your financial goal, and I want to congratulate you. I wish you success on this difficult path, and I truly believe you can do it. I also hope I can keep growing Almost and fulfill the mission of building the best tool that helps people. I would be very grateful if you could support Almost with a subscription. Almost Premium includes many useful and powerful tools for reaching financial goals, and I will keep improving the project. All Premium subscribers automatically get every new feature in the app. Thank you in advance!",
  es: "Hola, soy Alexander, el creador de Almost. Veo que ya estás dando tus primeros pasos hacia tu meta financiera y quiero felicitarte por ello. Te deseo mucho éxito en este camino, y de verdad creo que lo vas a lograr. También espero poder seguir desarrollando Almost y cumplir la misión de crear la mejor herramienta para ayudar a las personas. Te agradecería muchísimo si puedes apoyar Almost con una suscripción. Almost Premium incluye muchas funciones útiles y potentes para alcanzar metas financieras, y yo seguiré mejorando el proyecto. Todos los suscriptores Premium reciben automáticamente cada nueva función de la app. ¡Gracias de antemano!",
  fr: "Salut ! Je suis Alexandre, le créateur d'Almost. Je vois que tu fais déjà tes premiers pas vers ton objectif financier, et je tiens à te féliciter. Je te souhaite beaucoup de réussite sur ce chemin exigeant, et je crois sincèrement que tu vas y arriver. J'espère aussi pouvoir continuer à faire grandir Almost et à accomplir notre mission : créer le meilleur outil pour aider les gens. Je te serais très reconnaissant si tu pouvais soutenir Almost avec un abonnement. Almost Premium donne accès à de nombreux outils utiles et puissants pour atteindre tes objectifs financiers, et je continuerai à faire évoluer le projet. Tous les abonnés Premium reçoivent automatiquement chaque nouvelle fonctionnalité de l'application. Merci d'avance !",
  de: "Hi! Ich bin Alexander, der Gründer von Almost. Ich sehe, dass du bereits die ersten Schritte zu deinem finanziellen Ziel machst, und möchte dir dazu gratulieren. Ich wünsche dir viel Erfolg auf diesem anspruchsvollen Weg, und ich bin überzeugt, dass du es schaffen kannst. Ich hoffe auch, Almost weiter ausbauen zu können und unsere Mission zu erfüllen: das beste Tool zu entwickeln, das Menschen wirklich hilft. Ich wäre dir sehr dankbar, wenn du Almost mit einem Abo unterstützen würdest. Almost Premium bietet viele nützliche und starke Funktionen, um finanzielle Ziele zu erreichen, und ich werde das Projekt weiter verbessern. Alle Premium-Abonnenten erhalten automatisch jedes neue App-Feature. Vielen Dank im Voraus!",
  ar: "مرحباً! أنا ألكسندر، مؤسس Almost. أرى أنك بدأت بالفعل أولى خطواتك نحو هدفك المالي، وأهنئك على ذلك. أتمنى لك التوفيق في هذا الطريق الصعب، وأنا واثق أنك ستنجح. وآمل أيضاً أن أنجح أنا في تطوير Almost وتحقيق رسالته: بناء أفضل أداة تساعد الناس. سأكون ممتناً جداً إذا استطعت دعم Almost عبر الاشتراك. يمنحك Almost Premium الكثير من الأدوات المفيدة والقوية للوصول إلى أهدافك المالية، وسأواصل تطوير المشروع. جميع مشتركي Premium يحصلون تلقائياً على كل الميزات الجديدة في التطبيق. شكراً مقدماً!",
  zh: "你好！我是 Almost 的创始人 Alexander。我看到你已经在为自己的财务目标迈出第一步，真心为你高兴。祝你在这条不容易的路上持续进步，我也相信你一定可以做到。同时，我也希望自己能继续把 Almost 做得更好，完成我们的使命：打造最能帮助用户的工具。如果你愿意通过订阅来支持 Almost，我会非常感激。Almost Premium 提供了很多实用又强大的功能，帮助你更快达成财务目标，我也会持续迭代项目。所有 Premium 订阅用户都会自动获得应用的全部新功能。提前谢谢你！",
};
const GROUP_C_SUPPORT_PRIMARY_CTA_BY_LANGUAGE = {
  ru: "Поддержать Almost",
  en: "Support Almost",
  es: "Apoyar Almost",
  fr: "Soutenir Almost",
  de: "Almost unterstützen",
  ar: "ادعم Almost",
  zh: "支持 Almost",
};
const GROUP_C_SUPPORT_HINT_BY_LANGUAGE = {
  ru: "На следующем экране выбери подходящий план Premium.",
  en: "On the next screen, choose the Premium plan that fits you.",
  es: "En la siguiente pantalla, elige el plan Premium que mejor te encaje.",
  fr: "Sur l'écran suivant, choisis l'abonnement Premium qui te convient.",
  de: "Wähle im nächsten Schritt den Premium-Plan, der zu dir passt.",
  ar: "في الشاشة التالية اختر خطة Premium المناسبة لك.",
  zh: "下一步请选择最适合你的 Premium 方案。",
};
const GROUP_C_SUPPORT_PLAN_TITLE_BY_LANGUAGE = {
  ru: "Поддержи Almost и усили свой прогресс.",
  en: "Support Almost and boost your progress.",
  es: "Apoya Almost y acelera tu progreso.",
  fr: "Soutiens Almost et accélère tes progrès.",
  de: "Unterstütze Almost und beschleunige deinen Fortschritt.",
  ar: "ادعم Almost وعزّز تقدّمك.",
  zh: "支持 Almost，让你的进步更快。",
};
const GROUP_C_SUPPORT_PLAN_SUBTITLE_BY_LANGUAGE = {
  ru: "Premium открывает мощные инструменты для целей, аналитики и контроля импульсов.",
  en: "Premium unlocks powerful tools for goals, analytics, and impulse control.",
  es: "Premium desbloquea herramientas potentes para metas, analítica y control de impulsos.",
  fr: "Premium débloque des outils puissants pour les objectifs, l'analyse et le contrôle des impulsions.",
  de: "Premium schaltet starke Tools für Ziele, Analysen und Impulskontrolle frei.",
  ar: "Premium يفتح أدوات قوية للأهداف والتحليلات والتحكم في الاندفاع.",
  zh: "Premium 提供强大的目标、分析和冲动控制工具。",
};
const ONBOARDING_HARD_GATE_TITLE_BY_LANGUAGE = {
  ru: "Пользователи Almost Pro в среднем сохраняют около ≈ $350 в месяц.",
  en: "Almost Pro users save around ≈ $350 per month on average.",
  es: "Los usuarios de Almost Pro ahorran alrededor de ≈ $350 al mes en promedio.",
  fr: "Les utilisateurs d'Almost Pro économisent en moyenne environ ≈ 350 $ par mois.",
  de: "Almost Pro Nutzer sparen im Durchschnitt etwa ≈ $350 pro Monat.",
  ar: "يحفظ مستخدمو Almost Pro في المتوسط حوالي ≈ 350$ شهرياً.",
  zh: "Almost Pro 用户平均每月可节省约 ≈ $350。",
};
const ONBOARDING_HARD_GATE_SUBTITLE_BY_LANGUAGE = {
  ru: "Премиум-лимиты, отчёты и контроль импульсов помогают стабильно сохранять больше каждый месяц.",
  en: "Premium limits, reports, and impulse control tools help keep more money every month.",
  es: "Los límites, informes y herramientas de control de impulsos de Premium te ayudan a guardar más cada mes.",
  fr: "Les limites, rapports et outils de contrôle des impulsions de Premium aident à conserver plus d'argent chaque mois.",
  de: "Premium-Limits, Berichte und Impulskontrolle helfen dir, jeden Monat mehr Geld zu behalten.",
  ar: "حدود Premium والتقارير وأدوات التحكم بالاندفاع تساعدك على ادخار المزيد كل شهر.",
  zh: "Premium 的限额、报告与冲动控制工具可帮助你每个月稳定留住更多钱。",
};
const TRANSACTION_ABANDONED_TITLE_BY_LANGUAGE = {
  ru: "Спец-условия активированы.",
  en: "Special offer unlocked.",
  es: "Oferta especial activada.",
  fr: "Offre spéciale activée.",
  de: "Sonderangebot aktiviert.",
  ar: "تم تفعيل العرض الخاص.",
  zh: "专属优惠已开启。",
};
const TRANSACTION_ABANDONED_SUBTITLE_BY_LANGUAGE = {
  ru: "Вы были в шаге от оформления. Держим для вас более выгодный вариант прямо сейчас.",
  en: "You were one step away from checkout. Here is a better option right now.",
  es: "Estabas a un paso de finalizar. Aquí tienes una mejor opción ahora mismo.",
  fr: "Tu étais à un pas de l'achat. Voici une meilleure option dès maintenant.",
  de: "Du warst nur einen Schritt vom Checkout entfernt. Hier ist jetzt ein besseres Angebot.",
  ar: "كنت على بُعد خطوة واحدة من إتمام الشراء. إليك الآن عرضاً أفضل.",
  zh: "你刚才距离完成购买只差一步。现在给你一个更划算的选择。",
};
const TRANSACTION_ABANDONED_POPUP_BADGE_BY_LANGUAGE = {
  ru: "ОДНОРАЗОВОЕ ПРЕДЛОЖЕНИЕ",
  en: "ONE-TIME OFFER",
  es: "OFERTA POR TIEMPO LIMITADO",
  fr: "OFFRE LIMITEE",
  de: "EINMALIGES ANGEBOT",
  ar: "عرض لمرة واحدة",
  zh: "限时专享",
};
const TRANSACTION_ABANDONED_POPUP_TITLE_BY_LANGUAGE = {
  ru: "Скидка 35%",
  en: "35% OFF",
  es: "35% DE DESCUENTO",
  fr: "-35%",
  de: "35% RABATT",
  ar: "خصم 35٪",
  zh: "立减 35%",
};
const TRANSACTION_ABANDONED_POPUP_SUBTITLE_BY_LANGUAGE = {
  ru: "Вы почти оформили Premium. Заберите скидку прямо сейчас, пока она активна.",
  en: "You almost subscribed to Premium. Claim your discount now while it is active.",
  es: "Estuviste a punto de activar Premium. Aprovecha tu descuento ahora mientras está activo.",
  fr: "Tu étais sur le point de passer à Premium. Profite de ta remise maintenant tant qu'elle est active.",
  de: "Du warst kurz vor Premium. Hol dir den Rabatt jetzt, solange er aktiv ist.",
  ar: "كنت على وشك الاشتراك في Premium. احصل على خصمك الآن طالما أنه متاح.",
  zh: "你刚刚差一点开通 Premium。趁优惠还在，立即领取折扣。",
};
const TRANSACTION_ABANDONED_POPUP_PRIMARY_CTA_BY_LANGUAGE = {
  ru: "Забрать скидку",
  en: "Claim discount",
  es: "Aprovechar descuento",
  fr: "Profiter de la remise",
  de: "Rabatt nutzen",
  ar: "احصل على الخصم",
  zh: "立即领取折扣",
};
const TRANSACTION_ABANDONED_POPUP_SECONDARY_CTA_BY_LANGUAGE = {
  ru: "Позже",
  en: "Maybe later",
  es: "Tal vez después",
  fr: "Plus tard",
  de: "Vielleicht später",
  ar: "لاحقاً",
  zh: "稍后",
};

const FEATURE_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Открой Premium, чтобы получить полный набор инструментов и сохранять больше каждый месяц.",
  en: "Unlock Premium for the full toolkit and keep more money every month.",
  es: "Desbloquea Premium para tener el kit completo y conservar más dinero cada mes.",
  fr: "Débloque Premium pour obtenir la boîte à outils complète et garder plus d'argent chaque mois.",
  de: "Schalte Premium frei, um das komplette Toolkit zu erhalten und jeden Monat mehr Geld zu behalten.",
  ar: "افتح Premium لتحصل على المجموعة الكاملة من الأدوات وتحتفظ بمزيد من المال كل شهر.",
  zh: "开通 Premium，获得完整工具集，每个月稳定留住更多钱。",
};

const FEATURE_SUBTITLE_BY_LANGUAGE = {
  ru: "Открой Premium, чтобы получить {{featureName}} и полный набор инструментов.",
  en: "Unlock Premium to access {{featureName}} and get the full toolkit.",
  es: "Desbloquea Premium para acceder a {{featureName}} y obtener el kit completo.",
  fr: "Débloque Premium pour accéder à {{featureName}} et obtenir tous les outils.",
  de: "Schalte Premium frei, um {{featureName}} und das vollständige Toolkit zu nutzen.",
  ar: "افتح Premium للوصول إلى {{featureName}} والحصول على المجموعة الكاملة من الأدوات.",
  zh: "开通 Premium，解锁 {{featureName}} 并获取完整工具集。",
};

const LEVEL_UNLOCK_LINE_BY_LANGUAGE = {
  ru: "Premium сразу откроет все функции, которые закрыты уровнями.",
  en: "Premium instantly unlocks all features gated by user levels.",
  es: "Premium desbloquea al instante todas las funciones bloqueadas por nivel.",
  fr: "Premium débloque instantanément toutes les fonctions bloquées par niveau.",
  de: "Premium schaltet sofort alle Funktionen frei, die durch Level gesperrt sind.",
  ar: "يفتح Premium فوراً جميع الميزات المقفلة بالمستويات.",
  zh: "Premium 可立即解锁所有受等级限制的功能。",
};

const PLAN_SECTION_TITLE_BY_LANGUAGE = {
  ru: "Выберите план Premium",
  en: "Choose your Premium plan",
  es: "Elige tu plan Premium",
  fr: "Choisis ton plan Premium",
  de: "Wähle deinen Premium-Plan",
  ar: "اختر خطة Premium الخاصة بك",
  zh: "选择你的 Premium 方案",
};

const PLAN_HINT_BY_LANGUAGE = {
  ru: "Выберите тариф и нажмите кнопку ниже",
  en: "Select a plan and tap the button below",
  es: "Selecciona un plan y pulsa el botón de abajo",
  fr: "Choisis un plan puis appuie sur le bouton ci-dessous",
  de: "Wähle einen Plan und tippe unten auf die Taste",
  ar: "اختر خطة ثم اضغط الزر بالأسفل",
  zh: "选择一个方案并点击下方按钮",
};

const FREE_LABEL_BY_LANGUAGE = {
  ru: "БЕСПЛ.",
  en: "FREE",
  es: "GRATIS",
  fr: "GRATUIT",
  de: "KOSTENLOS",
  ar: "مجاني",
  zh: "免费",
};

const PRO_LABEL_BY_LANGUAGE = {
  ru: "PRO",
  en: "PRO",
  es: "PRO",
  fr: "PRO",
  de: "PRO",
  ar: "PRO",
  zh: "PRO",
};

const COMPARISON_TAP_HINT_BY_LANGUAGE = {
  ru: "Нажми на функцию и увидишь её влияние на экономию.",
  en: "Tap a feature to see its savings impact.",
  es: "Toca una función para ver su impacto en tus ahorros.",
  fr: "Touche une fonction pour voir son impact sur tes économies.",
  de: "Tippe auf eine Funktion, um ihren Spareffekt zu sehen.",
  ar: "اضغط على الميزة لمعرفة تأثيرها على الادخار.",
  zh: "点击某个功能即可查看它对节省的影响。",
};

const PLAN_UNAVAILABLE_LABEL_BY_LANGUAGE = {
  ru: "Недоступно",
  en: "Unavailable",
  es: "No disponible",
  fr: "Indisponible",
  de: "Nicht verfügbar",
  ar: "غير متاح",
  zh: "不可用",
};

const PAYWALL_BILLING_NOTICE_BY_LANGUAGE = {
  ru: {
    ios: "Ежемесячный и годовой планы — автопродлеваемые подписки. Управлять и отменять можно в App Store.",
    android:
      "Ежемесячный и годовой планы — автопродлеваемые подписки. Управлять и отменять можно в Google Play.",
    default:
      "Ежемесячный и годовой планы — автопродлеваемые подписки. Управлять и отменять можно в App Store / Google Play.",
  },
  en: {
    ios: "Monthly and yearly plans are auto-renewable subscriptions. Manage or cancel anytime in App Store.",
    android:
      "Monthly and yearly plans are auto-renewable subscriptions. Manage or cancel anytime in Google Play.",
    default:
      "Monthly and yearly plans are auto-renewable subscriptions. Manage or cancel anytime in App Store / Google Play.",
  },
  es: {
    ios: "Los planes mensual y anual son suscripciones con renovación automática. Puedes gestionarlas o cancelarlas en App Store.",
    android:
      "Los planes mensual y anual son suscripciones con renovación automática. Puedes gestionarlas o cancelarlas en Google Play.",
    default:
      "Los planes mensual y anual son suscripciones con renovación automática. Puedes gestionarlas o cancelarlas en App Store / Google Play.",
  },
  fr: {
    ios: "Les plans mensuel et annuel sont des abonnements à renouvellement automatique. Gérez-les ou annulez-les à tout moment dans l'App Store.",
    android:
      "Les plans mensuel et annuel sont des abonnements à renouvellement automatique. Gérez-les ou annulez-les à tout moment dans Google Play.",
    default:
      "Les plans mensuel et annuel sont des abonnements à renouvellement automatique. Gérez-les ou annulez-les à tout moment dans l'App Store / Google Play.",
  },
  de: {
    ios: "Monats- und Jahrespläne sind automatisch verlängerbare Abos. Verwalten oder kündigen kannst du jederzeit im App Store.",
    android:
      "Monats- und Jahrespläne sind automatisch verlängerbare Abos. Verwalten oder kündigen kannst du jederzeit in Google Play.",
    default:
      "Monats- und Jahrespläne sind automatisch verlängerbare Abos. Verwalten oder kündigen kannst du jederzeit im App Store / Google Play.",
  },
  ar: {
    ios: "الخطتان الشهرية والسنوية اشتراكات تتجدد تلقائياً. يمكنك الإدارة أو الإلغاء في أي وقت من App Store.",
    android:
      "الخطتان الشهرية والسنوية اشتراكات تتجدد تلقائياً. يمكنك الإدارة أو الإلغاء في أي وقت من Google Play.",
    default:
      "الخطتان الشهرية والسنوية اشتراكات تتجدد تلقائياً. يمكنك الإدارة أو الإلغاء في أي وقت من App Store / Google Play.",
  },
  zh: {
    ios: "月度和年度方案均为自动续订订阅。你可随时在 App Store 管理或取消。",
    android: "月度和年度方案均为自动续订订阅。你可随时在 Google Play 管理或取消。",
    default: "月度和年度方案均为自动续订订阅。你可随时在 App Store / Google Play 管理或取消。",
  },
};

const PAYWALL_LEGAL_NOTICE_BY_LANGUAGE = {
  ru: {
    ios: "Продолжая, вы соглашаетесь с Условиями использования (EULA) и Политикой конфиденциальности.",
    android: "Продолжая, вы соглашаетесь с Условиями использования и Политикой конфиденциальности.",
    default: "Продолжая, вы соглашаетесь с Условиями использования и Политикой конфиденциальности.",
  },
  en: {
    ios: "By continuing, you agree to the Terms of Use (EULA) and Privacy Policy.",
    android: "By continuing, you agree to the Terms of Use and Privacy Policy.",
    default: "By continuing, you agree to the Terms of Use and Privacy Policy.",
  },
  es: {
    ios: "Al continuar, aceptas los Términos de uso (EULA) y la Política de privacidad.",
    android: "Al continuar, aceptas los Términos de uso y la Política de privacidad.",
    default: "Al continuar, aceptas los Términos de uso y la Política de privacidad.",
  },
  fr: {
    ios: "En continuant, vous acceptez les Conditions d'utilisation (EULA) et la Politique de confidentialité.",
    android: "En continuant, vous acceptez les Conditions d'utilisation et la Politique de confidentialité.",
    default: "En continuant, vous acceptez les Conditions d'utilisation et la Politique de confidentialité.",
  },
  de: {
    ios: "Wenn du fortfährst, stimmst du den Nutzungsbedingungen (EULA) und der Datenschutzrichtlinie zu.",
    android: "Wenn du fortfährst, stimmst du den Nutzungsbedingungen und der Datenschutzrichtlinie zu.",
    default: "Wenn du fortfährst, stimmst du den Nutzungsbedingungen und der Datenschutzrichtlinie zu.",
  },
  ar: {
    ios: "بالمتابعة فإنك توافق على شروط الاستخدام (EULA) وسياسة الخصوصية.",
    android: "بالمتابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.",
    default: "بالمتابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.",
  },
  zh: {
    ios: "继续即表示你同意《使用条款》(EULA) 和《隐私政策》。",
    android: "继续即表示你同意《使用条款》和《隐私政策》。",
    default: "继续即表示你同意《使用条款》和《隐私政策》。",
  },
};

const CTA_PRIMARY_TRIAL_BY_LANGUAGE = {
  ru: "Продолжить бесплатно",
  en: "Continue free",
  es: "Continuar gratis",
  fr: "Continuer gratuitement",
  de: "Kostenlos fortfahren",
  ar: "المتابعة مجاناً",
  zh: "免费继续",
};

const CTA_PRIMARY_REGULAR_BY_LANGUAGE = {
  ru: "Начать мой путь сейчас",
  en: "Start my journey now",
  es: "Comenzar mi camino ahora",
  fr: "Commencer mon parcours maintenant",
  de: "Meine Reise jetzt starten",
  ar: "ابدأ رحلتي الآن",
  zh: "立即开启我的旅程",
};
const CTA_PRIMARY_UNLOCK_FEATURE_BY_LANGUAGE = {
  ru: "Разблокировать: {{featureName}}",
  en: "Unlock {{featureName}}",
  es: "Desbloquear {{featureName}}",
  fr: "Débloquer {{featureName}}",
  de: "{{featureName}} freischalten",
  ar: "فتح {{featureName}}",
  zh: "解锁 {{featureName}}",
};
const CTA_PRIMARY_UNLOCK_SAVINGS_BY_LANGUAGE = {
  ru: "Разблокировать экономию ≈ {{amount}} в год",
  en: "Unlock ≈ {{amount}} Yearly Savings",
  es: "Desbloquea ≈ {{amount}} de ahorro anual",
  fr: "Débloquer ≈ {{amount}} d'économies annuelles",
  de: "≈ {{amount}} jährliche Ersparnis freischalten",
  ar: "افتح توفيراً سنوياً بقيمة ≈ {{amount}}",
  zh: "解锁每年约 ≈ {{amount}} 节省",
};
const CTA_START_JOURNEY_BY_LANGUAGE = {
  ru: "Начать бесплатный 7-дневный пробный период",
  en: "Start Free 7-Day Trial",
  es: "Comenzar prueba gratis de 7 días",
  fr: "Commencer l'essai gratuit de 7 jours",
  de: "7-Tage-Testversion kostenlos starten",
  ar: "ابدأ تجربة مجانية لمدة 7 أيام",
  zh: "开始 7 天免费试用",
};
const PAYWALL_TITLE_FREE_WORD_BY_LANGUAGE = {
  ru: "бесплатно",
  en: "free",
  es: "gratis",
  fr: "gratuitement",
  de: "kostenlos",
  ar: "مجاناً",
  zh: "免费",
};
const PAYWALL_UNIFIED_TITLE_BY_LANGUAGE = {
  ru: "Мы хотим, чтобы ты попробовал Almost {{freeWord}}!",
  en: "We want you to try Almost for {{freeWord}}!",
  es: "Queremos que pruebes Almost {{freeWord}}!",
  fr: "Nous voulons que tu essaies Almost {{freeWord}} !",
  de: "Wir möchten, dass du Almost {{freeWord}} ausprobierst!",
  ar: "نريدك أن تجرّب Almost {{freeWord}}!",
  zh: "我们希望你{{freeWord}}试用 Almost！",
};
const PAYWALL_UNIFIED_TITLE_NO_TRIAL_BY_LANGUAGE = {
  ru: "Выбери подходящий Premium-план для Almost",
  en: "Choose the Premium plan that fits you",
  es: "Elige el plan Premium que mejor te encaje",
  fr: "Choisis l'abonnement Premium qui te convient",
  de: "Wähle den Premium-Plan, der zu dir passt",
  ar: "اختر خطة Premium الأنسب لك",
  zh: "选择最适合你的 Premium 方案",
};
const PAYWALL_UNIFIED_FEATURE_FALLBACK_BY_LANGUAGE = {
  ru: "виджеты, аналитику и отчёты",
  en: "widgets, analytics, and reports",
  es: "widgets, analítica e informes",
  fr: "les widgets, l'analyse et les rapports",
  de: "Widgets, Analysen und Berichte",
  ar: "الويدجت والتحليلات والتقارير",
  zh: "小组件、分析和报告",
};
const PAYWALL_UNIFIED_SUBTITLE_BY_LANGUAGE = {
  ru: "Разблокируй {{featureName}} и другие Premium-функции. Можно сохранить до {{amount}} за {{days}} дней (до {{percent}}% больше).",
  en: "Unlock {{featureName}} and more Premium tools. You can save up to {{amount}} in {{days}} days (up to {{percent}}% more).",
  es: "Desbloquea {{featureName}} y más herramientas Premium. Puedes ahorrar hasta {{amount}} en {{days}} días (hasta {{percent}}% más).",
  fr: "Débloque {{featureName}} et d'autres outils Premium. Tu peux économiser jusqu'à {{amount}} sur {{days}} jours (jusqu'à {{percent}}% de plus).",
  de: "Schalte {{featureName}} und weitere Premium-Tools frei. Du kannst in {{days}} Tagen bis zu {{amount}} sparen (bis zu {{percent}}% mehr).",
  ar: "افتح {{featureName}} والمزيد من أدوات Premium. يمكنك توفير ما يصل إلى {{amount}} خلال {{days}} يوماً (حتى {{percent}}٪ أكثر).",
  zh: "解锁 {{featureName}} 等 Premium 工具。你可在 {{days}} 天内最多节省 {{amount}}（最多多省 {{percent}}%）。",
};
const BENEFITS_TITLE_BY_LANGUAGE = {
  ru: "Что входит в Premium",
  en: "What you unlock with Premium",
  es: "Lo que desbloqueas con Premium",
  fr: "Ce que Premium débloque",
  de: "Was Premium freischaltet",
  ar: "ما الذي يفتحه Premium",
  zh: "Premium 解锁内容",
};
const BENEFITS_FOOTNOTE_BY_LANGUAGE = {
  ru: "и многое другое",
  en: "and much more",
  es: "y mucho más",
  fr: "et bien plus",
  de: "und vieles mehr",
  ar: "والمزيد",
  zh: "以及更多",
};
const UNLIMITAGE_USAGE_BULLET_BY_LANGUAGE = {
  ru: "Неограниченное использование",
  en: "Unlimitage usage",
  es: "Uso ilimitado",
  fr: "Utilisation illimitée",
  de: "Unbegrenzte Nutzung",
  ar: "استخدام غير محدود",
  zh: "无限使用",
};
const SOCIAL_PROOF_LINE_BY_LANGUAGE = {
  ru: "Присоединяйся к 5K+ людей, которые уже экономят.",
  en: "Join 5K+ savers",
  es: "Únete a más de 5K ahorradores",
  fr: "Rejoins 5K+ personnes qui économisent",
  de: "Schließe dich 5K+ Sparern an",
  ar: "انضم إلى أكثر من 5 آلاف شخص يدّخرون",
  zh: "加入 5K+ 省钱用户",
};
const LIMITED_OFFER_LABEL_BY_LANGUAGE = {
  ru: "Ограниченное предложение",
  en: "Limited-time offer",
  es: "Oferta por tiempo limitado",
  fr: "Offre à durée limitée",
  de: "Zeitlich begrenztes Angebot",
  ar: "عرض لفترة محدودة",
  zh: "限时优惠",
};
const LIMITED_OFFER_TIMER_PREFIX_BY_LANGUAGE = {
  ru: "Закончится через",
  en: "Ends in",
  es: "Termina en",
  fr: "Se termine dans",
  de: "Endet in",
  ar: "ينتهي خلال",
  zh: "结束于",
};

const CTA_RESTORE_BY_LANGUAGE = {
  ru: "Восстановить покупки",
  en: "Restore purchases",
  es: "Restaurar compras",
  fr: "Restaurer les achats",
  de: "Käufe wiederherstellen",
  ar: "استعادة المشتريات",
  zh: "恢复购买",
};

const CTA_CLOSE_BY_LANGUAGE = {
  ru: "Позже",
  en: "Maybe later",
  es: "Quizás más tarde",
  fr: "Plus tard",
  de: "Vielleicht später",
  ar: "لاحقاً",
  zh: "稍后",
};

const CTA_MANAGE_BY_LANGUAGE = {
  ru: "Управлять подпиской",
  en: "Manage subscription",
  es: "Gestionar suscripción",
  fr: "Gérer l'abonnement",
  de: "Abo verwalten",
  ar: "إدارة الاشتراك",
  zh: "管理订阅",
};

const NO_COMMITMENT_LINE_BY_LANGUAGE = {
  ru: "Без обязательств, отмена в любое время",
  en: "No commitment cancel any time",
  es: "Sin compromiso, cancela en cualquier momento",
  fr: "Sans engagement, annule à tout moment",
  de: "Keine Bindung, jederzeit kündbar",
  ar: "بدون التزام، يمكنك الإلغاء في أي وقت",
  zh: "无承诺，随时可取消",
};

const LEGAL_TERMS_LABEL_BY_LANGUAGE = {
  ru: "Условия",
  en: "Terms",
  es: "Términos",
  fr: "Conditions",
  de: "AGB",
  ar: "الشروط",
  zh: "条款",
};

const LEGAL_PRIVACY_LABEL_BY_LANGUAGE = {
  ru: "Конфиденциальность",
  en: "Privacy",
  es: "Privacidad",
  fr: "Confidentialité",
  de: "Datenschutz",
  ar: "الخصوصية",
  zh: "隐私",
};

const DEFAULT_PLAN_LABELS_BY_LANGUAGE = {
  yearly: {
    ru: "Год",
    en: "Yearly",
    es: "Anual",
    fr: "Annuel",
    de: "Jährlich",
    ar: "سنوي",
    zh: "年付",
  },
  monthly: {
    ru: "Месяц",
    en: "Monthly",
    es: "Mensual",
    fr: "Mensuel",
    de: "Monatlich",
    ar: "شهري",
    zh: "月付",
  },
  lifetime: {
    ru: "Навсегда",
    en: "Lifetime",
    es: "De por vida",
    fr: "À vie",
    de: "Lebenslang",
    ar: "مدى الحياة",
    zh: "终身",
  },
};

const SAVE_BADGE_TEMPLATE_BY_LANGUAGE = {
  ru: "Экономия {{percent}}%",
  en: "Save {{percent}}%",
  es: "Ahorra {{percent}}%",
  fr: "Économisez {{percent}}%",
  de: "Spare {{percent}}%",
  ar: "وفّر {{percent}}%",
  zh: "省 {{percent}}%",
};

const LIFETIME_BADGE_BY_LANGUAGE = {
  ru: "Навсегда",
  en: "Lifetime",
  es: "De por vida",
  fr: "À vie",
  de: "Lebenslang",
  ar: "مدى الحياة",
  zh: "终身",
};

const PAYWALL_BADGE_BY_KIND = {
  soft: "ALMOST PRO",
  hard: "ALMOST PRO",
  feature: "ALMOST PRO",
};

const resolveLanguage = (language) => {
  const normalized = String(language || "")
    .trim()
    .toLowerCase();
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("en")) return "en";
  return "en";
};

const template = (value, replacements = {}) => {
  let nextValue = String(value || "");
  Object.entries(replacements).forEach(([token, tokenValue]) => {
    nextValue = nextValue.replace(`{{${token}}}`, String(tokenValue));
  });
  return nextValue;
};

const localizeTemplateString = (value, language = "en") => {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "";
  return localizeFallbackString(raw, language);
};

const resolveTemplateSource = (dictionary, language = "en") => {
  const direct = typeof dictionary?.[language] === "string" ? dictionary[language] : "";
  if (direct) return direct;
  const english = typeof dictionary?.en === "string" ? dictionary.en : "";
  if (!english) return "";
  return localizeTemplateString(english, language) || english;
};

const localizeFallbackString = (value, language = "en") => {
  if (typeof value !== "string" || !value.length) return value;
  const lang = resolveLanguage(language);
  const dictionary = LANGUAGE_MAP_FALLBACK_TRANSLATIONS?.[lang];
  if (!dictionary || typeof dictionary !== "object") return value;
  return dictionary[value] || value;
};

const LOCALIZE_FALLBACK_MAX_DEPTH = 80;

const localizeFallbackStructure = (value, language = "en", visited = null, depth = 0) => {
  if (typeof value === "string") {
    return localizeFallbackString(value, language);
  }
  if (depth >= LOCALIZE_FALLBACK_MAX_DEPTH) {
    return value;
  }
  if (Array.isArray(value)) {
    const seen = visited || new WeakSet();
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
    let changed = false;
    const localized = value.map((entry) => {
      const next = localizeFallbackStructure(entry, language, seen, depth + 1);
      if (next !== entry) {
        changed = true;
      }
      return next;
    });
    seen.delete(value);
    return changed ? localized : value;
  }
  if (value && typeof value === "object") {
    const seen = visited || new WeakSet();
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
    let changed = false;
    const localized = Object.entries(value).reduce((acc, [key, entry]) => {
      const next = localizeFallbackStructure(entry, language, seen, depth + 1);
      acc[key] = next;
      if (next !== entry) {
        changed = true;
      }
      return acc;
    }, {});
    seen.delete(value);
    return changed ? localized : value;
  }
  return value;
};

const localizeFallbackBadge = (badge, language = "en") => {
  const lang = resolveLanguage(language);
  const raw = typeof badge === "string" ? badge.trim() : "";
  if (!raw) return null;
  if (/^lifetime$/i.test(raw)) {
    return LIFETIME_BADGE_BY_LANGUAGE[lang] || LIFETIME_BADGE_BY_LANGUAGE.en;
  }
  const saveMatch = raw.match(/^save\s+(\d+)%$/i);
  if (saveMatch) {
    return localizeFallbackString(
      template(
      SAVE_BADGE_TEMPLATE_BY_LANGUAGE[lang] || SAVE_BADGE_TEMPLATE_BY_LANGUAGE.en,
      { percent: saveMatch[1] }
      ),
      lang
    );
  }
  return localizeFallbackString(raw, lang);
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

const resolveFreshStartGainPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 37.4;
  const clamped = Math.min(68.9, Math.max(16.3, parsed));
  const rounded = Math.round(clamped * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
    return Math.round((rounded + 0.4) * 10) / 10;
  }
  return rounded;
};

const formatPercentToken = (value) => {
  const normalized = Math.round((Number(value) || 0) * 10) / 10;
  if (Math.abs(normalized - Math.round(normalized)) < 0.001) {
    return String(Math.round(normalized));
  }
  return normalized.toFixed(1);
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
    const localizedLabel =
      typeof row?.label === "string" && row.label.trim().length > 0
        ? localizeTemplateString(row.label, lang)
        : row?.label;
    const localizedLossTitleTemplate =
      typeof row?.lossTitle === "string" && row.lossTitle.trim().length > 0
        ? localizeTemplateString(row.lossTitle, lang)
        : "";
    const localizedLossSubtitleTemplate =
      typeof row?.lossSubtitle === "string" && row.lossSubtitle.trim().length > 0
        ? localizeTemplateString(row.lossSubtitle, lang)
        : "";
    const lossTitle = localizedLossTitleTemplate ? template(localizedLossTitleTemplate, replacements) : null;
    const lossSubtitle = localizedLossSubtitleTemplate
      ? template(localizedLossSubtitleTemplate, replacements)
      : null;
    const explicitInteractive = typeof row?.interactive === "boolean" ? row.interactive : null;
    const interactive =
      explicitInteractive !== null ? explicitInteractive : !row?.isCosmetic && !!lossTitle;
    return {
      ...row,
      label: localizedLabel,
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

const buildBenefitBullets = ({
  rows = [],
  activeFeatureKey = null,
  language = "en",
  maxItems = 4,
} = {}) => {
  const lang = resolveLanguage(language);
  const normalizedActiveFeatureKey = normalizeFeatureToken(activeFeatureKey || "");
  const normalizedMaxItems = Math.max(1, Math.round(Number(maxItems) || 4));
  const premiumRows = (Array.isArray(rows) ? rows : []).filter(
    (row) =>
      row?.premium &&
      !row?.free &&
      !row?.isCosmetic &&
      String(row?.id || "").trim() !== "multipleGoals" &&
      typeof row?.label === "string" &&
      row.label.trim().length > 0
  );
  const activeRowIndex = normalizedActiveFeatureKey
    ? premiumRows.findIndex((row) =>
        Array.isArray(row?.featureKeys) && row.featureKeys.includes(normalizedActiveFeatureKey)
      )
    : -1;
  const orderedRows =
    activeRowIndex > 0
      ? [premiumRows[activeRowIndex], ...premiumRows.filter((_, index) => index !== activeRowIndex)]
      : premiumRows;

  const seen = new Set();
  const bullets = [];
  const unlimitedUsageLabel =
    UNLIMITAGE_USAGE_BULLET_BY_LANGUAGE[lang] || UNLIMITAGE_USAGE_BULLET_BY_LANGUAGE.en;
  if (unlimitedUsageLabel) {
    seen.add("unlimitage_usage");
    bullets.push({
      id: "unlimitage_usage",
      label: unlimitedUsageLabel,
      featureKey: PREMIUM_FEATURE_KEYS.multipleGoals,
      featureKeys: [PREMIUM_FEATURE_KEYS.multipleGoals],
      interactive: false,
    });
  }
  for (const row of orderedRows) {
    if (bullets.length >= normalizedMaxItems) break;
    const id = String(row?.id || row?.featureKey || row?.label || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    bullets.push({
      id,
      label: row.label.trim(),
      featureKey: row?.featureKey || null,
      featureKeys: Array.isArray(row?.featureKeys) ? row.featureKeys : [],
      interactive: !!row?.interactive,
    });
  }
  return bullets.slice(0, normalizedMaxItems);
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
  hasTrialOffer = true,
  monthlyPriceLabel = "$5.99/mo",
  savedAmountLabel = "$0",
  lossAmountLabel = "",
  ctaSavingsAmountLabel = "",
  lossAmountByFeature = {},
  lossWindowDays = DEFAULT_LOSS_WINDOW_DAYS,
  freshStartGainPercent = null,
  featureKey = null,
  trigger = "manual",
  platform = "unknown",
} = {}) => {
  const lang = resolveLanguage(language);
  const normalizedHasTrialOffer = hasTrialOffer !== false;
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
  const featureNameEntry = normalizedFeatureKey
    ? FEATURE_NAME_BY_KEY[normalizedFeatureKey] ||
      Object.entries(FEATURE_NAME_BY_KEY).find(
        ([candidateKey]) => normalizeFeatureToken(candidateKey) === normalizedFeatureKey
      )?.[1] ||
      null
    : null;
  const localizedFeatureName = localizeFallbackString(featureNameEntry?.[lang] || featureNameEntry?.en || null, lang);
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
    percent: formatPercentToken(resolveFreshStartGainPercent(freshStartGainPercent)),
  };
  const normalizedTrigger =
    typeof trigger === "string" && trigger.trim().length ? trigger.trim() : "manual";
  const isSaveLimitHardTrigger =
    normalizedTrigger === "save_daily_limit_reached" ||
    normalizedTrigger === "save_daily_limit_blocked";
  const isTrialSavesHardTrigger = normalizedTrigger === "trial_10_saves_reached";
  const isGroupCSupportSoftTrigger = normalizedTrigger === "group_c_support_after_5_saves";
  const isOnboardingHardGateTrigger = normalizedTrigger === "onboarding_completed_hard_gate";
  const isTransactionAbandonedTrigger = normalizedTrigger === "transaction_abandoned";
  const comparisonRowsForPaywall = isOnboardingHardGateTrigger
    ? comparisonRows.filter((row) => String(row?.id || "") !== "levelUnlocks")
    : comparisonRows;
  const benefitBullets = buildBenefitBullets({
    rows: comparisonRowsForPaywall,
    activeFeatureKey: normalizedFeatureKey,
    language: lang,
    maxItems: 4,
  });
  const isFreshStartSoftPaywall =
    effectiveKind === "soft" &&
    (normalizedTrigger === "first_action_after_onboarding" ||
      normalizedTrigger === "first_save_after_onboarding" ||
      normalizedTrigger === "onboarding_completed");

  let title = template(resolveTemplateSource(SOFT_TITLE_BY_LANGUAGE, lang), copyTokens);
  let subtitle = template(resolveTemplateSource(SOFT_MARKETING_LINE_BY_LANGUAGE, lang), copyTokens);
  let psychologyLine = resolveTemplateSource(SOFT_PSYCHOLOGY_LINE_BY_LANGUAGE, lang);
  if (isFreshStartSoftPaywall) {
    title = template(resolveTemplateSource(SOFT_FRESH_START_TITLE_BY_LANGUAGE, lang), copyTokens);
    subtitle = template(
      resolveTemplateSource(SOFT_FRESH_START_MARKETING_LINE_BY_LANGUAGE, lang),
      copyTokens
    );
    psychologyLine = resolveTemplateSource(SOFT_FRESH_START_PSYCHOLOGY_LINE_BY_LANGUAGE, lang);
  }

  if (effectiveKind === "hard") {
    title = template(resolveTemplateSource(HARD_TITLE_BY_LANGUAGE, lang), copyTokens);
    subtitle = template(resolveTemplateSource(HARD_MARKETING_LINE_BY_LANGUAGE, lang), copyTokens);
    psychologyLine = null;
  } else if (effectiveKind === "feature") {
    title = resolveTemplateSource(FEATURE_TITLE_BY_LANGUAGE, lang);
    subtitle = localizedFeatureName
      ? template(resolveTemplateSource(FEATURE_SUBTITLE_BY_LANGUAGE, lang), { featureName: localizedFeatureName })
      : resolveTemplateSource(FEATURE_MARKETING_LINE_BY_LANGUAGE, lang);
    psychologyLine = null;
  }
  if (isSaveLimitHardTrigger) {
    title = template(resolveTemplateSource(SAVE_LIMIT_REACHED_TITLE_BY_LANGUAGE, lang), copyTokens);
    subtitle = template(resolveTemplateSource(SAVE_LIMIT_REACHED_SUBTITLE_BY_LANGUAGE, lang), copyTokens);
    psychologyLine = null;
  }
  if (isTrialSavesHardTrigger) {
    title = template(resolveTemplateSource(TRIAL_10_SAVES_TITLE_BY_LANGUAGE, lang), copyTokens);
    subtitle = template(resolveTemplateSource(TRIAL_10_SAVES_SUBTITLE_BY_LANGUAGE, lang), copyTokens);
    psychologyLine = null;
  }
  if (isOnboardingHardGateTrigger) {
    title = template(resolveTemplateSource(ONBOARDING_HARD_GATE_TITLE_BY_LANGUAGE, lang), copyTokens);
    subtitle = template(resolveTemplateSource(ONBOARDING_HARD_GATE_SUBTITLE_BY_LANGUAGE, lang), copyTokens);
    psychologyLine = null;
  }
  if (isTransactionAbandonedTrigger) {
    title = resolveTemplateSource(TRANSACTION_ABANDONED_TITLE_BY_LANGUAGE, lang);
    subtitle = resolveTemplateSource(TRANSACTION_ABANDONED_SUBTITLE_BY_LANGUAGE, lang);
    psychologyLine = null;
  }
  if (isGroupCSupportSoftTrigger && effectiveKind === "soft") {
    title = template(resolveTemplateSource(GROUP_C_SUPPORT_PLAN_TITLE_BY_LANGUAGE, lang), copyTokens);
    subtitle = template(resolveTemplateSource(GROUP_C_SUPPORT_PLAN_SUBTITLE_BY_LANGUAGE, lang), copyTokens);
    psychologyLine = null;
  }
  if (activeFeatureInsightRow?.lossTitle && !isTransactionAbandonedTrigger) {
    title = activeFeatureInsightRow.lossTitle;
    subtitle = activeFeatureInsightRow?.lossSubtitle || subtitle;
    psychologyLine = null;
  }

  const ctaFeatureName =
    (typeof activeFeatureInsightRow?.label === "string" && activeFeatureInsightRow.label.trim().length
      ? activeFeatureInsightRow.label.trim()
      : localizedFeatureName) || "";
  const titleHighlightToken =
    resolveTemplateSource(PAYWALL_TITLE_FREE_WORD_BY_LANGUAGE, lang) ||
    PAYWALL_TITLE_FREE_WORD_BY_LANGUAGE.en;
  const unifiedFeatureName =
    ctaFeatureName ||
    resolveTemplateSource(PAYWALL_UNIFIED_FEATURE_FALLBACK_BY_LANGUAGE, lang) ||
    PAYWALL_UNIFIED_FEATURE_FALLBACK_BY_LANGUAGE.en;
  const unifiedTitle = normalizedHasTrialOffer
    ? template(resolveTemplateSource(PAYWALL_UNIFIED_TITLE_BY_LANGUAGE, lang), {
        freeWord: titleHighlightToken,
      })
    : resolveTemplateSource(PAYWALL_UNIFIED_TITLE_NO_TRIAL_BY_LANGUAGE, lang);
  const unifiedSubtitle = template(
    resolveTemplateSource(PAYWALL_UNIFIED_SUBTITLE_BY_LANGUAGE, lang),
    {
      featureName: unifiedFeatureName,
      amount: resolvedLossAmountLabel,
      days: resolvedLossWindowDays,
      percent: copyTokens.percent,
    }
  );
  const ctaPrimaryUnified = normalizedHasTrialOffer
    ? CTA_START_JOURNEY_BY_LANGUAGE[lang] || CTA_START_JOURNEY_BY_LANGUAGE.en
    : CTA_PRIMARY_REGULAR_BY_LANGUAGE[lang] || CTA_PRIMARY_REGULAR_BY_LANGUAGE.en;
  const ctaPrimaryTrial = ctaPrimaryUnified;
  const ctaPrimaryRegular = CTA_PRIMARY_REGULAR_BY_LANGUAGE[lang] || CTA_PRIMARY_REGULAR_BY_LANGUAGE.en;
  const psychologyLineForPaywall = null;
  const isLimitReachedHardTrigger = isSaveLimitHardTrigger || isTrialSavesHardTrigger;
  const shouldUseUnifiedHeroCopy = !isLimitReachedHardTrigger;
  const resolvedHeaderTitle = shouldUseUnifiedHeroCopy ? unifiedTitle || title : title;
  const resolvedHeaderSubtitle = shouldUseUnifiedHeroCopy ? unifiedSubtitle || subtitle : subtitle;
  const savedAmountHighlightToken = String(copyTokens.saved || "").trim();
  const resolvedTitleHighlightToken = shouldUseUnifiedHeroCopy
    ? normalizedHasTrialOffer
      ? titleHighlightToken
      : ""
    : savedAmountHighlightToken;

  return localizeFallbackStructure({
    badgeLabel: PAYWALL_BADGE_BY_KIND[effectiveKind] || PAYWALL_BADGE_BY_KIND.soft,
    trigger: normalizedTrigger,
    title: resolvedHeaderTitle,
    subtitle: resolvedHeaderSubtitle,
    titleHighlightToken: resolvedTitleHighlightToken,
    supportIntroEnabled: isGroupCSupportSoftTrigger && effectiveKind === "soft",
    supportIntroBadge:
      GROUP_C_SUPPORT_INTRO_BADGE_BY_LANGUAGE[lang] || GROUP_C_SUPPORT_INTRO_BADGE_BY_LANGUAGE.en,
    supportIntroTitle: resolvedHeaderTitle,
    supportIntroSavedHighlight: resolvedTitleHighlightToken,
    supportIntroSubtitle: resolvedHeaderSubtitle,
    supportIntroAuthor:
      GROUP_C_SUPPORT_AUTHOR_BY_LANGUAGE[lang] || GROUP_C_SUPPORT_AUTHOR_BY_LANGUAGE.en,
    supportIntroStatus:
      GROUP_C_SUPPORT_STATUS_BY_LANGUAGE[lang] || GROUP_C_SUPPORT_STATUS_BY_LANGUAGE.en,
    supportIntroMessage:
      GROUP_C_SUPPORT_MESSAGE_BY_LANGUAGE[lang] || GROUP_C_SUPPORT_MESSAGE_BY_LANGUAGE.en,
    supportIntroPrimaryCta:
      GROUP_C_SUPPORT_PRIMARY_CTA_BY_LANGUAGE[lang] || GROUP_C_SUPPORT_PRIMARY_CTA_BY_LANGUAGE.en,
    supportIntroHint: GROUP_C_SUPPORT_HINT_BY_LANGUAGE[lang] || GROUP_C_SUPPORT_HINT_BY_LANGUAGE.en,
    transactionAbandonedPopupBadge:
      TRANSACTION_ABANDONED_POPUP_BADGE_BY_LANGUAGE[lang] ||
      TRANSACTION_ABANDONED_POPUP_BADGE_BY_LANGUAGE.en,
    transactionAbandonedPopupTitle:
      TRANSACTION_ABANDONED_POPUP_TITLE_BY_LANGUAGE[lang] ||
      TRANSACTION_ABANDONED_POPUP_TITLE_BY_LANGUAGE.en,
    transactionAbandonedPopupSubtitle:
      TRANSACTION_ABANDONED_POPUP_SUBTITLE_BY_LANGUAGE[lang] ||
      TRANSACTION_ABANDONED_POPUP_SUBTITLE_BY_LANGUAGE.en,
    transactionAbandonedPopupPrimaryCta:
      TRANSACTION_ABANDONED_POPUP_PRIMARY_CTA_BY_LANGUAGE[lang] ||
      TRANSACTION_ABANDONED_POPUP_PRIMARY_CTA_BY_LANGUAGE.en,
    transactionAbandonedPopupSecondaryCta:
      TRANSACTION_ABANDONED_POPUP_SECONDARY_CTA_BY_LANGUAGE[lang] ||
      TRANSACTION_ABANDONED_POPUP_SECONDARY_CTA_BY_LANGUAGE.en,
    psychologyLine: psychologyLineForPaywall,
    activeFeatureKey: normalizedFeatureKey,
    savedAmountLabel: savedAmountLabel || "$0",
    lossAmountLabel: resolvedLossAmountLabel,
    lossAmountByFeature: normalizedLossAmountByFeature,
    lossWindowDays: resolvedLossWindowDays,
    features: BASE_FEATURES_BY_LANGUAGE[lang] || BASE_FEATURES_BY_LANGUAGE.en,
    comparisonRows: comparisonRowsForPaywall,
    benefitsTitle: BENEFITS_TITLE_BY_LANGUAGE[lang] || BENEFITS_TITLE_BY_LANGUAGE.en,
    benefitBullets,
    benefitsFootnote: BENEFITS_FOOTNOTE_BY_LANGUAGE[lang] || BENEFITS_FOOTNOTE_BY_LANGUAGE.en,
    socialProofLine: SOCIAL_PROOF_LINE_BY_LANGUAGE[lang] || SOCIAL_PROOF_LINE_BY_LANGUAGE.en,
    limitedOfferLabel: LIMITED_OFFER_LABEL_BY_LANGUAGE[lang] || LIMITED_OFFER_LABEL_BY_LANGUAGE.en,
    limitedOfferTimerPrefix:
      LIMITED_OFFER_TIMER_PREFIX_BY_LANGUAGE[lang] || LIMITED_OFFER_TIMER_PREFIX_BY_LANGUAGE.en,
    limitedOfferDurationSeconds: 15 * 60,
    unlockLevelsLine: isOnboardingHardGateTrigger
      ? null
      : LEVEL_UNLOCK_LINE_BY_LANGUAGE[lang] || LEVEL_UNLOCK_LINE_BY_LANGUAGE.en,
    planSectionTitle: PLAN_SECTION_TITLE_BY_LANGUAGE[lang] || PLAN_SECTION_TITLE_BY_LANGUAGE.en,
    planHint: PLAN_HINT_BY_LANGUAGE[lang] || PLAN_HINT_BY_LANGUAGE.en,
    freeColumnLabel: FREE_LABEL_BY_LANGUAGE[lang] || FREE_LABEL_BY_LANGUAGE.en,
    proColumnLabel: PRO_LABEL_BY_LANGUAGE[lang] || PRO_LABEL_BY_LANGUAGE.en,
    comparisonTapHint: COMPARISON_TAP_HINT_BY_LANGUAGE[lang] || COMPARISON_TAP_HINT_BY_LANGUAGE.en,
    planUnavailableLabel: PLAN_UNAVAILABLE_LABEL_BY_LANGUAGE[lang] || PLAN_UNAVAILABLE_LABEL_BY_LANGUAGE.en,
    ctaPrimary: ctaPrimaryTrial,
    ctaPrimaryTrial,
    ctaPrimaryRegular,
    ctaRestore: CTA_RESTORE_BY_LANGUAGE[lang] || CTA_RESTORE_BY_LANGUAGE.en,
    ctaClose: CTA_CLOSE_BY_LANGUAGE[lang] || CTA_CLOSE_BY_LANGUAGE.en,
    ctaManage: CTA_MANAGE_BY_LANGUAGE[lang] || CTA_MANAGE_BY_LANGUAGE.en,
    noCommitmentLine: NO_COMMITMENT_LINE_BY_LANGUAGE[lang] || NO_COMMITMENT_LINE_BY_LANGUAGE.en,
    legalNotice:
      PAYWALL_LEGAL_NOTICE_BY_LANGUAGE[lang]?.[normalizedPlatform] ||
      PAYWALL_LEGAL_NOTICE_BY_LANGUAGE[lang]?.default ||
      PAYWALL_LEGAL_NOTICE_BY_LANGUAGE.en?.[normalizedPlatform] ||
      PAYWALL_LEGAL_NOTICE_BY_LANGUAGE.en?.default ||
      "",
    billingNotice:
      PAYWALL_BILLING_NOTICE_BY_LANGUAGE[lang]?.[normalizedPlatform] ||
      PAYWALL_BILLING_NOTICE_BY_LANGUAGE[lang]?.default ||
      PAYWALL_BILLING_NOTICE_BY_LANGUAGE.en?.[normalizedPlatform] ||
      PAYWALL_BILLING_NOTICE_BY_LANGUAGE.en?.default ||
      "",
    legalTermsLabel: LEGAL_TERMS_LABEL_BY_LANGUAGE[lang] || LEGAL_TERMS_LABEL_BY_LANGUAGE.en,
    legalPrivacyLabel: LEGAL_PRIVACY_LABEL_BY_LANGUAGE[lang] || LEGAL_PRIVACY_LABEL_BY_LANGUAGE.en,
  }, lang);
};

export const buildDefaultPlanCards = (currencyCode = "USD", language = "en") => {
  const lang = resolveLanguage(language);
  const pricing = resolveFallbackPlanPricing(currencyCode);
  const resolvePlanLabel = (planId) =>
    DEFAULT_PLAN_LABELS_BY_LANGUAGE?.[planId]?.[lang] ||
    DEFAULT_PLAN_LABELS_BY_LANGUAGE?.[planId]?.en ||
    "Premium";
  return localizeFallbackStructure([
    {
      id: "yearly",
      label: resolvePlanLabel("yearly"),
      priceLabel: pricing.yearly.label,
      secondaryLabel: pricing.yearly.perMonth,
      badge: localizeFallbackBadge(pricing.yearly.badge, lang),
      recommended: true,
    },
    {
      id: "monthly",
      label: resolvePlanLabel("monthly"),
      priceLabel: pricing.monthly.label,
      secondaryLabel: pricing.monthly.perMonth,
      badge: localizeFallbackBadge(pricing.monthly.badge, lang),
      recommended: false,
    },
  ], lang);
};
