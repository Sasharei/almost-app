import React, { useEffect, useMemo, useRef, useState } from "react";
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
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";

const STORAGE_KEYS = {
  CART: "@almost_cart",
  PURCHASES: "@almost_purchases",
  PROFILE: "@almost_profile",
  THEME: "@almost_theme",
  LANGUAGE: "@almost_language",
};

const PURCHASE_GOAL = 20000;
const CAT_IMAGE = "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=600&q=80";
const AMAZON_FEED_URL = null; // plug your backend endpoint once ready.
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

const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
  Haptics.impactAsync(style).catch(() => {});
};

const TRANSLATIONS = {
  ru: {
    appTagline: "витрина умных замен, которые экономят бюджет",
    syncAmazon: "подтянуть amazon",
    syncingAmazon: "обновляю…",
    heroAwaiting: "в листе желаний",
    heroSpendLine: "уже сэкономлено {{amount}} — красота без ущерба бюджету",
    feedEmptyTitle: "Фильтр пуст",
    feedEmptySubtitle: "Попробуй другой тег или обнови каталог",
    buyNow: "Оплатить через  Pay",
    addToCart: "Отложить и подумать",
    cartTitle: "Корзина",
    cartEmptyTitle: "Грустно без твоих хотелок",
    cartEmptySubtitle: "Добавь то, что реально нужно — приложению нравится спасать бюджет",
    buyLabel: "Взять",
    buyAllLabel: "Оформить всё и экономить",
    totalLabel: "Сумма",
    feedTab: "Лента",
    profileTab: "Профиль",
    payButton: "Оплатить",
    cartOverlay: "Экономия ждёт в корзине",
    purchasesTitle: "История",
    purchasesSubtitle: "Потенциально сэкономлено ещё {{amount}} — меньше лишних чеков",
    progressLabel: "уровень осознанности",
    progressGoal: "{{current}} / {{goal}}",
    progressHint: "осталось {{amount}} до титула ‘герой финансового дзена’",
    emptyPurchases: "Пока чисто — значит, ты в плюсе",
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
    statsSpent: "сэкономлено",
    statsSaved: "буфер",
    statsItems: "сделок",
    statsCart: "в листе",
    goalsTitle: "Цели и награды",
    rewardUnlocked: "достигнуто",
    rewardLocked: "осталось {{amount}}",
    rainMessage: "Как же так? Спаси денежки.",
    developerReset: "Сбросить данные",
    developerResetConfirm: "Очистить корзину, покупки и профиль?",
    developerResetCancel: "Оставить",
    developerResetApply: "Сбросить",
    defaultDealTitle: "Сделка",
    defaultDealDesc: "Умная замена без описания",
  },
  en: {
    appTagline: "a showcase of mindful deals that protect savings",
    syncAmazon: "sync amazon",
    syncingAmazon: "refreshing…",
    heroAwaiting: "on the wish list",
    heroSpendLine: "already saved {{amount}} — glow without overspending",
    feedEmptyTitle: "Nothing here",
    feedEmptySubtitle: "Try another tag or refresh the catalog",
    buyNow: "Pay with  Pay",
    addToCart: "Save for later",
    cartTitle: "Cart",
    cartEmptyTitle: "Empty without your smart cravings",
    cartEmptySubtitle: "Add something purposeful—the app loves saving cash",
    buyLabel: "Grab",
    buyAllLabel: "Check out everything",
    totalLabel: "Total",
    feedTab: "Feed",
    profileTab: "Profile",
    payButton: "Pay",
    cartOverlay: "Savings are waiting in the cart",
    purchasesTitle: "History",
    purchasesSubtitle: "Another {{amount}} can stay in your pocket",
    progressLabel: "mindful level",
    progressGoal: "{{current}} / {{goal}}",
    progressHint: "{{amount}} left until ‘budget zen master’",
    emptyPurchases: "Nothing yet — which already saves money",
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
    statsSpent: "saved",
    statsSaved: "buffer",
    statsItems: "deals",
    statsCart: "wishlist",
    goalsTitle: "Goals & rewards",
    rewardUnlocked: "unlocked",
    rewardLocked: "{{amount}} to go",
    rainMessage: "Oh no! Protect the cash.",
    developerReset: "Reset data",
    developerResetConfirm: "Clear cart, purchases and profile?",
    developerResetCancel: "Keep",
    developerResetApply: "Reset",
    defaultDealTitle: "Deal",
    defaultDealDesc: "Mindful deal without details",
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
};

const DEFAULT_PROFILE = {
  name: "Nina Cleanova",
  subtitle: "Управляю хотелками и бюджетом",
  bio: "Люблю красивые вещи, но больше люблю финансовый план",
  avatar: "https://i.pravatar.cc/150?img=47",
};

const PRODUCTS = [
  {
    id: "iphone",
    image:
      "https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#F6DFFF" },
    categories: ["tech", "flagship", "iphone"],
    variants: [
      { label: "128 GB", price: 4499 },
      { label: "256 GB", price: 4899 },
      { label: "1 TB", price: 5799 },
    ],
    copy: {
      ru: {
        title: "iPhone 15 Pro",
        tagline: "Титановые нервы бюджета",
        desc: "Меняем импульсный апгрейд на плановый: выбери память и знай, что это осознанная инвестиция, а не лишний чек.",
      },
      en: {
        title: "iPhone 15 Pro",
        tagline: "Titan-level self control",
        desc: "Pick the storage, skip the impulse. This deal keeps the plan on track instead of draining the wallet.",
      },
    },
  },
  {
    id: "macbook",
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#D9F7FF" },
    categories: ["tech", "laptop", "work"],
    variants: [
      { label: "8/256", price: 5299 },
      { label: "16/512", price: 6499 },
    ],
    copy: {
      ru: {
        title: "MacBook Air M3",
        tagline: "Лёгкий способ не тратить лишнего",
        desc: "Работает шустрее, чем появляются желания купить что-то ещё. Берёшь один гаджет вместо кучи мелких.",
      },
      en: {
        title: "MacBook Air M3",
        tagline: "Lightweight, heavy on savings",
        desc: "One strong laptop beats many random buys. Upgrade once and ignore every tiny temptation after.",
      },
    },
  },
  {
    id: "airpods",
    image:
      "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#FFE8D7" },
    categories: ["audio", "tech", "style"],
    variants: [
      { label: "Basalt Grey", price: 2899 },
      { label: "Candy Pink", price: 2999 },
    ],
    copy: {
      ru: {
        title: "AirPods Max",
        tagline: "Изоляция от ненужных трат",
        desc: "Фокус на любимой музыке и бюджете. Эта покупка заменяет десяток импульсных аксессуаров.",
      },
      en: {
        title: "AirPods Max",
        tagline: "Noise canceling for impulsive buys",
        desc: "Dial into sound and out of FOMO. One premium accessory instead of a drawer full of meh.",
      },
    },
  },
  {
    id: "watch",
    image:
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#FFE5F1" },
    categories: ["tech", "wearable", "sport"],
    variants: [
      { label: "Trail Loop", price: 3299 },
      { label: "Ocean Band", price: 3499 },
    ],
    copy: {
      ru: {
        title: "Apple Watch Ultra",
        tagline: "Контроль не только пульса",
        desc: "Следит за шагами и тратами. Один гаджет заменяет фитнес-подписку, новый трекер и кучу оправданий.",
      },
      en: {
        title: "Apple Watch Ultra",
        tagline: "Coaching your budget too",
        desc: "Tracks runs and receipts. One wearable instead of subscriptions, trackers, and excuses.",
      },
    },
  },
  {
    id: "speaker",
    image:
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#E3F6E8" },
    categories: ["audio", "home", "wow"],
    variants: [
      { label: "White Aura", price: 1599 },
      { label: "Midnight Mood", price: 1699 },
    ],
    copy: {
      ru: {
        title: "HomePod",
        tagline: "Домашний концерт вместо баров",
        desc: "Создаёт настроение дома — значит, меньше соблазнов уходить в дорогие развлечения.",
      },
      en: {
        title: "HomePod",
        tagline: "House parties over pricey nights",
        desc: "Fill the living room with sound and skip a few expensive outings.",
      },
    },
  },
  {
    id: "card",
    image:
      "https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#FFF4D5" },
    categories: ["gift", "wow"],
    variants: [
      { label: "$500", price: 500 },
      { label: "$1000", price: 1000 },
      { label: "$2000", price: 2000 },
    ],
    copy: {
      ru: {
        title: "Almost Gift Card",
        tagline: "Подушка для будущих свопов",
        desc: "Пополняй баланс сам себе и закрывай желания, когда это вписывается в план.",
      },
      en: {
        title: "Almost Gift Card",
        tagline: "Budget buffer for later",
        desc: "Top up your own wish-fund and deal when it makes sense.",
      },
    },
  },
  {
    id: "coffee",
    image:
      "https://images.unsplash.com/photo-1459257868276-5e65389e2722?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#FDEBD0" },
    categories: ["coffee", "home", "eco"],
    variants: [
      { label: "250 g", price: 39 },
      { label: "1 kg", price: 99 },
    ],
    copy: {
      ru: {
        title: "Ethiopian Bloom",
        tagline: "Кофе дома дешевле кофеен",
        desc: "Пара пакетов — и минус десяток походов за латте.",
      },
      en: {
        title: "Ethiopian Bloom",
        tagline: "Cafe taste, home budget",
        desc: "Brew at home and skip a week of pricey lattes.",
      },
    },
  },
  {
    id: "croissant",
    image:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#F8F1FF" },
    categories: ["food", "wow", "coffee"],
    variants: [
      { label: "1 pc", price: 12 },
      { label: "6 pack", price: 65 },
    ],
    copy: {
      ru: {
        title: "Матча круассан",
        tagline: "Дессерт вместо спонтанного ужина",
        desc: "Маленькая радость, которая напоминает: можно баловать себя без марафона из ресторанов.",
      },
      en: {
        title: "Matcha Croissant",
        tagline: "Treat, not overspend",
        desc: "Sweet ritual that replaces yet another overpriced dinner.",
      },
    },
  },
  {
    id: "candle",
    image:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#FAF0E6" },
    categories: ["home", "wellness"],
    variants: [
      { label: "Medium", price: 49 },
      { label: "Large", price: 69 },
    ],
    copy: {
      ru: {
        title: "Свеча Calm Hustle",
        tagline: "Атмосфера спа без подписки",
        desc: "Зажёг и остался дома — экономия на походах в расслабляющие места.",
      },
      en: {
        title: "Calm Hustle Candle",
        tagline: "Spa vibes minus subscription",
        desc: "Light it, stay in, save on fancy wellness trips.",
      },
    },
  },
  {
    id: "vinyl",
    image:
      "https://images.unsplash.com/photo-1454922915609-78549ad709bb?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#FEECEC" },
    categories: ["audio", "home", "retro"],
    variants: [
      { label: "Classic", price: 499 },
      { label: "Studio", price: 699 },
    ],
    copy: {
      ru: {
        title: "Виниловый проигрыватель",
        tagline: "Ретро-настроение вместо шопинга",
        desc: "Один предмет, который украшает дом и отвлекает от бессмысленных покупок.",
      },
      en: {
        title: "Retro Vinyl Player",
        tagline: "Retro mood over retail therapy",
        desc: "Let analog beats replace random checkout sessions.",
      },
    },
  },
  {
    id: "bottle",
    image:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#E6F7FF" },
    categories: ["eco", "lifestyle"],
    variants: [
      { label: "500 ml", price: 59 },
      { label: "1 L", price: 79 },
    ],
    copy: {
      ru: {
        title: "Стальная бутылка",
        tagline: "Забота, которая окупается",
        desc: "Пей чаще воду, покупай реже одноразовое. Осознанность за копейки.",
      },
      en: {
        title: "Steel Bottle",
        tagline: "Hydration that pays back",
        desc: "Reusable style that cuts random cafe bottle buys.",
      },
    },
  },
  {
    id: "notebook",
    image:
      "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=600&q=80",
    colors: { card: "#FFF1E0" },
    categories: ["work", "stationery"],
    variants: [
      { label: "Daily", price: 35 },
      { label: "Undated", price: 38 },
    ],
    copy: {
      ru: {
        title: "Планер Minimal",
        tagline: "Планируй траты красиво",
        desc: "Каждая запись напоминает: у тебя есть стратегия, а не хаос.",
      },
      en: {
        title: "Minimal Planner",
        tagline: "Plan spending beautifully",
        desc: "Writing goals beats doom-shopping.",
      },
    },
  },
];

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

const formatCurrency = (value = 0) => `$${Number(value || 0).toLocaleString("en-US")}`;

const getCopyForPurchase = (item, language, t) => {
  if (item.copy?.[language]) return item.copy[language];
  const product = PRODUCTS.find((prod) => prod.id === item.productId);
  if (product?.copy?.[language]) return product.copy[language];
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

function ProductCard({ product, onPress, language, colors }) {
  return (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: product.colors.card }]}
      onPress={() => onPress(product)}
      activeOpacity={0.85}
    >
      <Text style={styles.productTagline}>{product.copy[language].tagline}</Text>
      <Image source={{ uri: product.image }} style={styles.productImage} />
      <Text style={styles.productTitle}>{product.copy[language].title}</Text>
      <Text style={styles.productPrice}>
        от {formatCurrency(product.variants?.[0]?.price || 0)}
      </Text>
    </TouchableOpacity>
  );
}

function FeedScreen({
  products,
  categories,
  activeCategory,
  onCategorySelect,
  cartCount,
  purchases,
  onAddToCart,
  onCheckoutRequest,
  onCancelDetail,
  onRefreshCatalog,
  loadingCatalog,
  t,
  language,
  colors,
}) {
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const totalSaved = useMemo(
    () => purchases.reduce((sum, item) => sum + (item.paidAmount || 0), 0),
    [purchases]
  );

  const openProduct = (product) => {
    setActiveProduct(product);
    setSelectedVariant(product.variants[0]);
    setShowDetail(true);
  };

  const closeDetail = (withSad = false) => {
    setShowDetail(false);
    setActiveProduct(null);
    if (withSad && onCancelDetail) {
      onCancelDetail();
    }
  };

  const handleAddToCart = () => {
    if (!activeProduct || !selectedVariant) return;
    onAddToCart(activeProduct, selectedVariant);
    closeDetail(false);
  };

  const handleBuyNow = () => {
    if (!activeProduct || !selectedVariant) return;
    onCheckoutRequest(
      {
        productId: activeProduct.id,
        variant: selectedVariant.label,
        price: selectedVariant.price,
        image: activeProduct.image,
        copy: activeProduct.copy,
      },
      "feed"
    );
    closeDetail(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }] }>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ justifyContent: "space-between", marginBottom: 18 }}
        contentContainerStyle={{ paddingBottom: 160, paddingTop: 4 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{t("feedEmptyTitle")}</Text>
            <Text style={[styles.emptyStateText, { color: colors.muted }]}>
              {t("feedEmptySubtitle")}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.feedHero}>
            <View style={styles.feedHeroTop}>
              <View style={styles.heroTextWrap}>
                <Text style={[styles.appName, { color: colors.text }]}>Almost</Text>
                <Text style={[styles.heroTagline, { color: colors.muted }]}>{t("appTagline")}</Text>
              </View>
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: colors.text }]}
                onPress={onRefreshCatalog}
                disabled={loadingCatalog}
              >
                <Text style={styles.syncButtonText}>
                  {loadingCatalog ? t("syncingAmazon") : t("syncAmazon")}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.heroStatCard, { backgroundColor: colors.card }] }>
              <View style={styles.heroStatRow}>
                <Text style={[styles.heroStatLabel, { color: colors.muted }]}>{t("heroAwaiting")}</Text>
                <Text style={[styles.heroStatValue, { color: colors.text }]}>{cartCount}</Text>
              </View>
              <Text style={[styles.heroSpendLine, { color: colors.text }]}>
                {t("heroSpendLine", { amount: formatCurrency(totalSaved) })}
              </Text>
            </View>
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
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={openProduct}
            language={language}
            colors={colors}
          />
        )}
      />

      <Modal visible={showDetail} transparent animationType="fade">
        <View style={styles.detailBackdrop}>
          <View style={[styles.detailCard, { backgroundColor: colors.card }] }>
            <TouchableOpacity style={styles.closeButton} onPress={() => closeDetail(true)}>
              <Text style={[styles.closeButtonText, { color: colors.muted }]}>×</Text>
            </TouchableOpacity>
            {activeProduct && (
              <>
                <View
                  style={[styles.detailHero, { backgroundColor: activeProduct.colors.card }]}
                >
                  <Image source={{ uri: activeProduct.image }} style={styles.detailImage} />
                </View>
                <Text style={[styles.detailTitle, { color: colors.text }]}>
                  {activeProduct.copy[language].title}
                </Text>
                <Text style={[styles.detailTagline, { color: colors.text }]}>
                  {activeProduct.copy[language].tagline}
                </Text>
                <Text style={[styles.detailDesc, { color: colors.muted }]}>
                  {activeProduct.copy[language].desc}
                </Text>

                <View style={styles.variantRow}>
                  {activeProduct.variants.map((variant) => (
                    <TouchableOpacity
                      key={variant.label}
                      style={[
                        styles.variantPill,
                        {
                          backgroundColor:
                            selectedVariant?.label === variant.label
                              ? colors.text
                              : colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setSelectedVariant(variant)}
                    >
                      <Text
                        style={[
                          styles.variantText,
                          {
                            color:
                              selectedVariant?.label === variant.label
                                ? colors.background
                                : colors.text,
                          },
                        ]}
                      >
                        {variant.label}
                      </Text>
                      <Text style={[styles.variantPrice, { color: colors.muted }]}>
                        {formatCurrency(variant.price)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text }]} onPress={handleBuyNow}>
                  <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                    {t("buyNow")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.text }]}
                  onPress={handleAddToCart}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                    {t("addToCart")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CartScreen({ cart, onCheckout, onCheckoutAll, t, language, colors }) {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <Text style={[styles.header, { color: colors.text }]}>{t("cartTitle")}</Text>
      {cart.length === 0 ? (
        <View style={styles.cartEmptyState}>
          <Image source={{ uri: CAT_IMAGE }} style={styles.catImage} />
          <Text style={[styles.cartEmptyTitle, { color: colors.text }]}>{t("cartEmptyTitle")}</Text>
          <Text style={[styles.cartEmptySubtitle, { color: colors.muted }]}>
            {t("cartEmptySubtitle")}
          </Text>
        </View>
      ) : (
        <>
          {cart.map((item) => {
            const copy = getCopyForPurchase(item, language, t);
            return (
              <View key={item.cartId} style={[styles.cartCard, { backgroundColor: colors.card }] }>
                <View style={styles.cartImageWrap}>
                  <Image source={{ uri: item.image }} style={{ width: 48, height: 48 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cartTitleText, { color: colors.text }]}>
                    {copy.title}
                  </Text>
                  <Text style={[styles.cartVariant, { color: colors.muted }]}>{item.variant}</Text>
                </View>
                <View style={styles.cartRight}>
                  <Text style={[styles.cartPrice, { color: colors.text }]}>
                    {formatCurrency(item.price)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.cartBuyButton, { backgroundColor: colors.text }]}
                    onPress={() => onCheckout(item, "cart")}
                  >
                    <Text style={[styles.cartBuyText, { color: colors.background }]}>
                      {t("buyLabel")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <View style={styles.cartTotalRow}>
            <Text style={[styles.cartTotalText, { color: colors.text }]}>{t("totalLabel")}</Text>
            <Text style={[styles.cartTotalAmount, { color: colors.text }]}>
              {formatCurrency(total)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.buyAllButton, { backgroundColor: colors.text }]}
            onPress={onCheckoutAll}
          >
            <Text style={[styles.buyAllButtonText, { color: colors.background }]}>
              {t("buyAllLabel")}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function PurchasesScreen({ purchases, t, language, colors }) {
  const total = purchases.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
  const saved = Math.max(PURCHASE_GOAL - total, 0);
  const progress = Math.min(total / PURCHASE_GOAL, 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }] }
      contentContainerStyle={{ paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.header, { color: colors.text }]}>{t("purchasesTitle")}</Text>
      <Text style={[styles.purchasesSubtitle, { color: colors.muted }]}>
        {t("purchasesSubtitle", { amount: formatCurrency(saved) })}
      </Text>

      <View style={[styles.progressCard, { backgroundColor: colors.card }] }>
        <View style={styles.progressTextRow}>
          <View>
            <Text style={[styles.progressLabel, { color: colors.muted }]}>
              {t("progressLabel")}
            </Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <Text style={[styles.progressGoal, { color: colors.text }]}>
            {t("progressGoal", {
              current: formatCurrency(total),
              goal: formatCurrency(PURCHASE_GOAL),
            })}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.text }]}
          />
        </View>
        <Text style={[styles.progressHint, { color: colors.muted }]}>
          {t("progressHint", { amount: formatCurrency(saved) })}
        </Text>
      </View>

      {purchases.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.muted }]}>{t("emptyPurchases")}</Text>
      ) : (
        purchases.map((item) => {
          const copy = getCopyForPurchase(item, language, t);
          return (
            <View key={item.id} style={[styles.purchaseCard, { backgroundColor: colors.card }] }>
              <View style={styles.purchaseInfo}>
                <Text style={[styles.purchaseTitle, { color: colors.text }]}>
                  ✅ {copy.title} · {item.variant}
                </Text>
                <Text style={[styles.purchaseDesc, { color: colors.muted }]}>
                  {copy.desc}
                </Text>
              </View>
              <Text style={[styles.purchasePrice, { color: colors.text }]}>
                {formatCurrency(item.paidAmount || item.price)} / {formatCurrency(item.price)}
              </Text>
            </View>
          );
        })
      )}

      <Text style={[styles.subheader, { color: colors.text }]}>{t("goalsTitle")}</Text>
      {GOALS.map((goal) => {
        const unlocked = total >= goal.target;
        const remaining = Math.max(goal.target - total, 0);
        return (
          <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.card }] }>
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalTitle, { color: colors.text }]}>
                {goal.copy[language].title}
              </Text>
              <Text style={[styles.goalDesc, { color: colors.muted }]}>
                {goal.copy[language].desc}
              </Text>
            </View>
            <Text
              style={[
                styles.goalBadge,
                {
                  backgroundColor: unlocked ? colors.text : "transparent",
                  color: unlocked ? colors.background : colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              {unlocked
                ? t("rewardUnlocked")
                : t("rewardLocked", { amount: formatCurrency(remaining) })}
            </Text>
          </View>
        );
      })}
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
  onResetData,
  theme,
  language,
  t,
  colors,
}) {
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }] }
      contentContainerStyle={{ paddingBottom: 200 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.profileCard, { backgroundColor: colors.card }] }>
        <Image source={{ uri: profile.avatar }} style={styles.profileAvatar} />
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
            <TextInput
              style={[styles.profileInput, { borderColor: colors.border, color: colors.text }]}
              value={profile.avatar}
              onChangeText={(text) => onFieldChange("avatar", text)}
              placeholder="Avatar URL"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
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
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: colors.border }]}
          onPress={onResetData}
        >
          <Text style={[styles.resetButtonText, { color: colors.muted }]}>
            {t("developerReset")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function App() {
  const [cart, setCart] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState("feed");
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkoutSource, setCheckoutSource] = useState("feed");
  const [showApplePay, setShowApplePay] = useState(false);
  const [purchaseType, setPurchaseType] = useState("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [products, setProducts] = useState(PRODUCTS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [profile, setProfile] = useState({ ...DEFAULT_PROFILE });
  const [profileDraft, setProfileDraft] = useState({ ...DEFAULT_PROFILE });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("ru");
  const [overlay, setOverlay] = useState(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const overlayTimer = useRef(null);
  const cartBadgeScale = useRef(new Animated.Value(0)).current;

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
    const totalSaved = purchases.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
    return [
      { label: t("statsSpent"), value: formatCurrency(totalSaved) },
      { label: t("statsItems"), value: `${purchases.length}` },
      { label: t("statsCart"), value: `${cart.length}` },
    ];
  }, [purchases, cart, t]);

  const loadStoredData = async () => {
    try {
      const [cartRaw, purchasesRaw, profileRaw, themeRaw, languageRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CART),
        AsyncStorage.getItem(STORAGE_KEYS.PURCHASES),
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
      ]);
      if (cartRaw) setCart(JSON.parse(cartRaw));
      if (purchasesRaw) setPurchases(JSON.parse(purchasesRaw));
      if (profileRaw) {
        setProfile(JSON.parse(profileRaw));
        setProfileDraft(JSON.parse(profileRaw));
      }
      if (themeRaw) setTheme(themeRaw);
      if (languageRaw) setLanguage(languageRaw);
    } catch (error) {
      console.warn("load error", error);
    }
  };

  useEffect(() => {
    loadStoredData();
    refreshCatalog();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)).catch(() => {});
  }, [cart]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases)).catch(() => {});
  }, [purchases]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)).catch(() => {});
  }, [profile]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.THEME, theme).catch(() => {});
  }, [theme]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language).catch(() => {});
  }, [language]);

  useEffect(() => {
    return () => {
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
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
  }, [cart.length, cartBadgeScale]);

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

  const refreshCatalog = async () => {
    if (!AMAZON_FEED_URL) {
      setProducts(PRODUCTS);
      return;
    }
    try {
      setLoadingCatalog(true);
      const response = await fetch(AMAZON_FEED_URL);
      const json = await response.json();
      setProducts(normalizeAmazonItems(json));
    } catch (error) {
      console.warn("catalog", error);
      setProducts(PRODUCTS);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleManualSync = () => {
    triggerHaptic();
    refreshCatalog();
  };

  const handleAddToCart = (product, variant) => {
    triggerHaptic();
    const cartItem = {
      cartId: `${product.id}-${variant.label}-${Date.now()}`,
      productId: product.id,
      variant: variant.label,
      price: variant.price,
      image: product.image,
      copy: product.copy,
    };
    setCart((prev) => [...prev, cartItem]);
    triggerOverlayState("cart", t("cartOverlay"));
  };

  const handleCheckoutRequest = (item, source = "feed") => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setCheckoutItem({
      ...item,
      id: item.id || item.cartId || `${Date.now()}`,
    });
    setCheckoutSource(source);
    setPurchaseType("full");
    setPartialAmount("");
    setShowApplePay(true);
  };

  const handleBulkCheckout = () => {
    if (!cart.length) return;
    handleCheckoutRequest(
      {
        id: `bulk-${Date.now()}`,
        price: cart.reduce((sum, item) => sum + item.price, 0),
        variant: `${cart.length} items`,
        title: "Cart bundle",
        items: cart.map((item) => ({ ...item })),
      },
      "cart"
    );
  };

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

  const handleCancelDetail = () => {
    triggerOverlayState("cancel", t("rainMessage"));
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
            setCart([]);
            setPurchases([]);
            setProfile({ ...DEFAULT_PROFILE });
            setProfileDraft({ ...DEFAULT_PROFILE });
            setActiveCategory("all");
            setActiveTab("feed");
            setCheckoutItem(null);
            setOverlay(null);
            setTheme("light");
            setLanguage("ru");
          },
        },
      ]
    );
  };

  const confirmPurchase = () => {
    if (!checkoutItem) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    const isBulk = checkoutItem.items && checkoutItem.items.length > 0;

    if (isBulk) {
      const bulkRecords = checkoutItem.items.map((item, index) => ({
        ...item,
        id: `${item.productId || item.cartId}-${Date.now()}-${index}`,
        paidAmount: item.price,
      }));
      setPurchases((prev) => [...prev, ...bulkRecords]);
      if (checkoutSource === "cart") {
        const removeIds = new Set(checkoutItem.items.map((item) => item.cartId));
        setCart((prev) => prev.filter((item) => !removeIds.has(item.cartId)));
      }
      triggerCelebration();
      Keyboard.dismiss();
      setShowApplePay(false);
      setCheckoutItem(null);
      return;
    }

    let paid = checkoutItem.price;
    if (purchaseType === "partial") {
      const parsed = Number(partialAmount);
      if (!parsed || parsed <= 0 || parsed > checkoutItem.price) {
        Alert.alert("Oops", t("partialError"));
        return;
      }
      paid = parsed;
    }

    const record = {
      ...checkoutItem,
      id: `${checkoutItem.id}-${Date.now()}`,
      paidAmount: Math.round(paid * 100) / 100,
      copy: checkoutItem.copy,
    };
    setPurchases((prev) => [...prev, record]);

    if (checkoutSource === "cart" && checkoutItem.cartId) {
      setCart((prev) => prev.filter((item) => item.cartId !== checkoutItem.cartId));
    }

    triggerCelebration();
    Keyboard.dismiss();
    setShowApplePay(false);
    setCheckoutItem(null);
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

  const canUsePartial = !checkoutItem?.items || checkoutItem.items.length === 0;

  const renderActiveScreen = () => {
    switch (activeTab) {
      case "cart":
        return (
          <CartScreen
            cart={cart}
            onCheckout={handleCheckoutRequest}
            onCheckoutAll={handleBulkCheckout}
            t={t}
            language={language}
            colors={colors}
          />
        );
      case "purchases":
        return <PurchasesScreen purchases={purchases} t={t} language={language} colors={colors} />;
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
            onResetData={handleResetData}
            theme={theme}
            language={language}
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
            cartCount={cart.length}
            purchases={purchases}
            onAddToCart={handleAddToCart}
            onCheckoutRequest={handleCheckoutRequest}
            onCancelDetail={handleCancelDetail}
            onRefreshCatalog={handleManualSync}
            loadingCatalog={loadingCatalog}
            t={t}
            language={language}
            colors={colors}
          />
        );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={[styles.appShell, { backgroundColor: colors.background }] }>
        <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderTopColor: colors.border }] }>
          {["feed", "cart", "purchases", "profile"].map((tab) => (
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
                  ? t("cartTitle")
                  : tab === "purchases"
                  ? t("purchasesTitle")
                  : t("profileTab")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Modal visible={showApplePay} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={[styles.paySheet, { backgroundColor: colors.card }] }>
                <Text style={[styles.modalTitle, { color: colors.text }]}> Pay</Text>
                {checkoutItem && (
                  <>
                    <View style={[styles.payCard, { backgroundColor: colors.text }]}>
                      <View>
                        <Text style={[styles.payLabel, { color: colors.background }]}>
                          {checkoutItem.copy?.[language]?.title || t("defaultDealTitle")}
                        </Text>
                        <Text style={[styles.payDigits, { color: colors.background }]}>
                          {checkoutItem.variant}
                        </Text>
                      </View>
                      <Text style={[styles.payAmount, { color: colors.background }]}>
                        {formatCurrency(checkoutItem.price)}
                      </Text>
                    </View>
                    {canUsePartial ? (
                      <>
                        <View style={styles.payOptions}>
                          <TouchableOpacity
                            style={[
                              styles.payOptionChip,
                              {
                                backgroundColor: purchaseType === "full" ? colors.text : "transparent",
                                borderColor: colors.border,
                              },
                            ]}
                            onPress={() => setPurchaseType("full")}
                          >
                            <Text
                              style={{
                                color: purchaseType === "full" ? colors.background : colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("buyFull")}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.payOptionChip,
                              {
                                backgroundColor: purchaseType === "partial" ? colors.text : "transparent",
                                borderColor: colors.border,
                              },
                            ]}
                            onPress={() => setPurchaseType("partial")}
                          >
                            <Text
                              style={{
                                color: purchaseType === "partial" ? colors.background : colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t("buyPartial")}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {purchaseType === "partial" && (
                          <View style={styles.partialInputWrap}>
                            <Text style={[styles.partialLabel, { color: colors.muted }]}>
                              {t("partialLabel", { amount: formatCurrency(checkoutItem.price) })}
                            </Text>
                            <TextInput
                              style={[styles.partialInput, { borderColor: colors.border, color: colors.text }]}
                              value={partialAmount}
                              onChangeText={setPartialAmount}
                              placeholder="$0.00"
                              keyboardType="numeric"
                              placeholderTextColor={colors.muted}
                            />
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={[styles.partialInfo, { color: colors.muted }]}>{t("partialInfo")}</Text>
                    )}
                    <TouchableOpacity
                      style={[styles.appleButton, { backgroundColor: colors.text }]}
                      onPress={confirmPurchase}
                    >
                      <Text style={[styles.appleButtonText, { color: colors.background }]}>
                        {t("payButton")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowApplePay(false);
                      }}
                    >
                      <Text style={[styles.payCancel, { color: colors.muted }]}>{t("thinkLater")}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>

        {cart.length > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cartBadge,
              {
                backgroundColor: colors.text,
                transform: [{ scale: cartBadgeScale }],
              },
            ]}
          >
            <Text style={[styles.cartBadgeIcon, { color: colors.background }]}>🛒</Text>
            <Text style={[styles.cartBadgeCount, { color: colors.background }]}>
              {cart.length}
            </Text>
          </Animated.View>
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
                  borderWidth: overlay.type === "cart" || overlay.type === "cancel" ? 1 : 0,
                },
              ]}
            >
              {overlay.type === "cancel" && (
                <Image source={{ uri: CAT_IMAGE }} style={styles.celebrationCat} />
              )}
              <Text style={[styles.celebrationText, { color: colors.text }]}>
                {overlay.message}
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    paddingHorizontal: 8,
  },
  screenWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
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
  syncButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 22,
    flexShrink: 0,
    marginLeft: 12,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 12,
    textTransform: "uppercase",
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
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 16,
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
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
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
  profileBioInput: {
    height: 90,
    textAlignVertical: "top",
  },
  settingsCard: {
    borderRadius: 26,
    padding: 20,
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
    top: 18,
    right: 24,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
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
  rainLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  rainDrop: {
    width: 2,
    borderRadius: 1,
    position: "absolute",
    top: 0,
  },
});
