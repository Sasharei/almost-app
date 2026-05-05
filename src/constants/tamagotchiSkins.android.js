const TAMAGOTCHI_ANIMATION_FILE_NAMES = {
  idle: "Cat_idle",
  curious: "Cat_curious",
  follow: "Cat_follows",
  speak: "Cat_speaks",
  happy: "Cat_happy",
  happyHeadshake: "Cat_happy_headshake",
  sad: "Cat_sad",
  ohno: "Cat_oh_oh",
  cry: "Cat_cry",
  waving: "Cat_waving",
};

const buildAnimationPaths = (skinId, extension = "webp") => {
  const result = {};
  Object.entries(TAMAGOTCHI_ANIMATION_FILE_NAMES).forEach(([key, fileName]) => {
    result[key] = `tamagotchi_skins/${skinId}/${fileName}.${extension}`;
  });
  return result;
};

const createRemoteSkinConfig = ({
  id,
  label,
  description,
  preview,
  avatar,
  progressColor,
  bundledFallbackAnimations,
  extension = "webp",
}) => {
  const animationPaths = buildAnimationPaths(id, extension);
  return {
    id,
    label,
    description,
    preview: preview || null,
    avatar: avatar || preview || null,
    progressColor: progressColor || "#9AB4F8",
    isRemote: true,
    bundledFallbackAnimations: bundledFallbackAnimations || null,
    previewPath: animationPaths.idle,
    avatarPath: animationPaths.idle,
    animationPaths,
  };
};

export const CLASSIC_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/Cat_idle.webp"),
  curious: require("../../assets/Cat_curious.webp"),
  follow: require("../../assets/Cat_follows.webp"),
  speak: require("../../assets/Cat_speaks.webp"),
  happy: require("../../assets/Cat_happy.webp"),
  happyHeadshake: require("../../assets/Cat_happy_headshake.webp"),
  sad: require("../../assets/Cat_sad.webp"),
  ohno: require("../../assets/Cat_oh_oh.webp"),
  cry: require("../../assets/Cat_cry.webp"),
  waving: require("../../assets/Cat_waving.webp"),
};

export const TAMAGOTCHI_ANIMATION_KEYS = Object.keys(TAMAGOTCHI_ANIMATION_FILE_NAMES);

const GREEN_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/tamagotchi_skins/green/Cat_idle.webp"),
  curious: require("../../assets/tamagotchi_skins/green/Cat_curious.webp"),
  follow: require("../../assets/tamagotchi_skins/green/Cat_follows.webp"),
  speak: require("../../assets/tamagotchi_skins/green/Cat_speaks.webp"),
  happy: require("../../assets/tamagotchi_skins/green/Cat_happy.webp"),
  happyHeadshake: require("../../assets/tamagotchi_skins/green/Cat_happy_headshake.webp"),
  sad: require("../../assets/tamagotchi_skins/green/Cat_sad.webp"),
  ohno: require("../../assets/tamagotchi_skins/green/Cat_oh_oh.webp"),
  cry: require("../../assets/tamagotchi_skins/green/Cat_cry.webp"),
  waving: require("../../assets/tamagotchi_skins/green/Cat_waving.webp"),
};

const TEAL_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/tamagotchi_skins/teal/Cat_idle.webp"),
  curious: require("../../assets/tamagotchi_skins/teal/Cat_curious.webp"),
  follow: require("../../assets/tamagotchi_skins/teal/Cat_follows.webp"),
  speak: require("../../assets/tamagotchi_skins/teal/Cat_speaks.webp"),
  happy: require("../../assets/tamagotchi_skins/teal/Cat_happy.webp"),
  happyHeadshake: require("../../assets/tamagotchi_skins/teal/Cat_happy_headshake.webp"),
  sad: require("../../assets/tamagotchi_skins/teal/Cat_sad.webp"),
  ohno: require("../../assets/tamagotchi_skins/teal/Cat_oh_oh.webp"),
  cry: require("../../assets/tamagotchi_skins/teal/Cat_cry.webp"),
  waving: require("../../assets/tamagotchi_skins/teal/Cat_waving.webp"),
};

const YELLOW_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/tamagotchi_skins/yellow/Cat_idle.webp"),
  curious: require("../../assets/tamagotchi_skins/yellow/Cat_curious.webp"),
  follow: require("../../assets/tamagotchi_skins/yellow/Cat_follows.webp"),
  speak: require("../../assets/tamagotchi_skins/yellow/Cat_speaks.webp"),
  happy: require("../../assets/tamagotchi_skins/yellow/Cat_happy.webp"),
  happyHeadshake: require("../../assets/tamagotchi_skins/yellow/Cat_happy_headshake.webp"),
  sad: require("../../assets/tamagotchi_skins/yellow/Cat_sad.webp"),
  ohno: require("../../assets/tamagotchi_skins/yellow/Cat_oh_oh.webp"),
  cry: require("../../assets/tamagotchi_skins/yellow/Cat_cry.webp"),
  waving: require("../../assets/tamagotchi_skins/yellow/Cat_waving.webp"),
};

const PURPLE_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/tamagotchi_skins/purple/Cat_idle.webp"),
  curious: require("../../assets/tamagotchi_skins/purple/Cat_curious.webp"),
  follow: require("../../assets/tamagotchi_skins/purple/Cat_follows.webp"),
  speak: require("../../assets/tamagotchi_skins/purple/Cat_speaks.webp"),
  happy: require("../../assets/tamagotchi_skins/purple/Cat_happy.webp"),
  happyHeadshake: require("../../assets/tamagotchi_skins/purple/Cat_happy_headshake.webp"),
  sad: require("../../assets/tamagotchi_skins/purple/Cat_sad.webp"),
  ohno: require("../../assets/tamagotchi_skins/purple/Cat_oh_oh.webp"),
  cry: require("../../assets/tamagotchi_skins/purple/Cat_cry.webp"),
  waving: require("../../assets/tamagotchi_skins/purple/Cat_waving.webp"),
};

export const TAMAGOTCHI_SKIN_OPTIONS = [
  {
    id: "classic",
    label: { ru: "Классический", en: "Classic", es: "Clásico", fr: "Classique" },
    description: {
      ru: "Знакомый образ Алми",
      en: "The original Almi look",
      es: "El estilo original de Almi",
      fr: "Le look original d'Almi",
    },
    preview: require("../../assets/Cat_mascot.png"),
    avatar: require("../../assets/Cat_mascot.png"),
    animations: CLASSIC_TAMAGOTCHI_ANIMATIONS,
    isRemote: false,
  },
  createRemoteSkinConfig({
    id: "green",
    label: { ru: "Лесной", en: "Forest", es: "Verde bosque", fr: "Forêt" },
    description: {
      ru: "Мятный исследователь",
      en: "Mint explorer",
      es: "Explorador mentolado",
      fr: "Exploratrice mentholée",
    },
    preview: require("../../assets/tamagotchi_skins/previews/green.png"),
    bundledFallbackAnimations: GREEN_TAMAGOTCHI_ANIMATIONS,
    progressColor: "#63CBA1",
  }),
  createRemoteSkinConfig({
    id: "teal",
    label: { ru: "Лазурный", en: "Teal breeze", es: "Brisa turquesa", fr: "Brise turquoise" },
    description: {
      ru: "Свежий морской оттенок",
      en: "Ocean breeze palette",
      es: "Paleta brisa marina",
      fr: "Palette brise océane",
    },
    preview: require("../../assets/tamagotchi_skins/previews/teal.png"),
    bundledFallbackAnimations: TEAL_TAMAGOTCHI_ANIMATIONS,
    progressColor: "#58BEDA",
  }),
  createRemoteSkinConfig({
    id: "yellow",
    label: { ru: "Солнечный", en: "Sunny", es: "Amarillo brillante", fr: "Ensoleillé" },
    description: {
      ru: "Тёплый и энергичный",
      en: "Bright and energising",
      es: "Cálido y lleno de energía",
      fr: "Chaud et plein d'énergie",
    },
    preview: require("../../assets/tamagotchi_skins/previews/yellow.png"),
    bundledFallbackAnimations: YELLOW_TAMAGOTCHI_ANIMATIONS,
    progressColor: "#E5C45C",
  }),
  createRemoteSkinConfig({
    id: "purple",
    label: { ru: "Сиреневый", en: "Lavender", es: "Lavanda", fr: "Lavande" },
    description: {
      ru: "Немного загадочный",
      en: "A dreamy violet vibe",
      es: "Un toque violeta soñador",
      fr: "Une touche violette rêveuse",
    },
    preview: require("../../assets/tamagotchi_skins/previews/purple.png"),
    bundledFallbackAnimations: PURPLE_TAMAGOTCHI_ANIMATIONS,
    progressColor: "#A785E3",
  }),
];

export const TAMAGOTCHI_SKINS = TAMAGOTCHI_SKIN_OPTIONS.reduce((acc, skin) => {
  acc[skin.id] = skin;
  return acc;
}, {});

export const DEFAULT_TAMAGOTCHI_SKIN = "classic";
