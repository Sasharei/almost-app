export const CLASSIC_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/Cat_idle.gif"),
  curious: require("../../assets/Cat_curious.gif"),
  follow: require("../../assets/Cat_follows.gif"),
  speak: require("../../assets/Cat_speaks.gif"),
  happy: require("../../assets/Cat_happy.gif"),
  happyHeadshake: require("../../assets/Cat_happy_headshake.gif"),
  sad: require("../../assets/Cat_sad.gif"),
  ohno: require("../../assets/Cat_oh_oh.gif"),
  cry: require("../../assets/Cat_cry.gif"),
  waving: require("../../assets/Cat_waving.gif"),
};

export const GREEN_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/tamagotchi_skins/green/Cat_idle.gif"),
  curious: require("../../assets/tamagotchi_skins/green/Cat_curious.gif"),
  follow: require("../../assets/tamagotchi_skins/green/Cat_follows.gif"),
  speak: require("../../assets/tamagotchi_skins/green/Cat_speaks.gif"),
  happy: require("../../assets/tamagotchi_skins/green/Cat_happy.gif"),
  happyHeadshake: require("../../assets/tamagotchi_skins/green/Cat_happy_headshake.gif"),
  sad: require("../../assets/tamagotchi_skins/green/Cat_sad.gif"),
  ohno: require("../../assets/tamagotchi_skins/green/Cat_oh_oh.gif"),
  cry: require("../../assets/tamagotchi_skins/green/Cat_cry.gif"),
  waving: require("../../assets/tamagotchi_skins/green/Cat_waving.gif"),
};

export const TEAL_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/tamagotchi_skins/teal/Cat_idle.gif"),
  curious: require("../../assets/tamagotchi_skins/teal/Cat_curious.gif"),
  follow: require("../../assets/tamagotchi_skins/teal/Cat_follows.gif"),
  speak: require("../../assets/tamagotchi_skins/teal/Cat_speaks.gif"),
  happy: require("../../assets/tamagotchi_skins/teal/Cat_happy.gif"),
  happyHeadshake: require("../../assets/tamagotchi_skins/teal/Cat_happy_headshake.gif"),
  sad: require("../../assets/tamagotchi_skins/teal/Cat_sad.gif"),
  ohno: require("../../assets/tamagotchi_skins/teal/Cat_oh_oh.gif"),
  cry: require("../../assets/tamagotchi_skins/teal/Cat_cry.gif"),
  waving: require("../../assets/tamagotchi_skins/teal/Cat_waving.gif"),
};

export const YELLOW_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/tamagotchi_skins/yellow/Cat_idle.gif"),
  curious: require("../../assets/tamagotchi_skins/yellow/Cat_curious.gif"),
  follow: require("../../assets/tamagotchi_skins/yellow/Cat_follows.gif"),
  speak: require("../../assets/tamagotchi_skins/yellow/Cat_speaks.gif"),
  happy: require("../../assets/tamagotchi_skins/yellow/Cat_happy.gif"),
  happyHeadshake: require("../../assets/tamagotchi_skins/yellow/Cat_happy_headshake.gif"),
  sad: require("../../assets/tamagotchi_skins/yellow/Cat_sad.gif"),
  ohno: require("../../assets/tamagotchi_skins/yellow/Cat_oh_oh.gif"),
  cry: require("../../assets/tamagotchi_skins/yellow/Cat_cry.gif"),
  waving: require("../../assets/tamagotchi_skins/yellow/Cat_waving.gif"),
};

export const PURPLE_TAMAGOTCHI_ANIMATIONS = {
  idle: require("../../assets/tamagotchi_skins/purple/Cat_idle.gif"),
  curious: require("../../assets/tamagotchi_skins/purple/Cat_curious.gif"),
  follow: require("../../assets/tamagotchi_skins/purple/Cat_follows.gif"),
  speak: require("../../assets/tamagotchi_skins/purple/Cat_speaks.gif"),
  happy: require("../../assets/tamagotchi_skins/purple/Cat_happy.gif"),
  happyHeadshake: require("../../assets/tamagotchi_skins/purple/Cat_happy_headshake.gif"),
  sad: require("../../assets/tamagotchi_skins/purple/Cat_sad.gif"),
  ohno: require("../../assets/tamagotchi_skins/purple/Cat_oh_oh.gif"),
  cry: require("../../assets/tamagotchi_skins/purple/Cat_cry.gif"),
  waving: require("../../assets/tamagotchi_skins/purple/Cat_waving.gif"),
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
  },
  {
    id: "green",
    label: { ru: "Лесной", en: "Forest", es: "Verde bosque", fr: "Forêt" },
    description: {
      ru: "Мятный исследователь",
      en: "Mint explorer",
      es: "Explorador mentolado",
      fr: "Exploratrice mentholée",
    },
    preview: require("../../assets/tamagotchi_skins/green/Cat_idle.gif"),
    avatar: require("../../assets/tamagotchi_skins/green/Cat_idle.gif"),
    animations: GREEN_TAMAGOTCHI_ANIMATIONS,
  },
  {
    id: "teal",
    label: { ru: "Лазурный", en: "Teal breeze", es: "Brisa turquesa", fr: "Brise turquoise" },
    description: {
      ru: "Свежий морской оттенок",
      en: "Ocean breeze palette",
      es: "Paleta brisa marina",
      fr: "Palette brise océane",
    },
    preview: require("../../assets/tamagotchi_skins/teal/Cat_idle.gif"),
    avatar: require("../../assets/tamagotchi_skins/teal/Cat_idle.gif"),
    animations: TEAL_TAMAGOTCHI_ANIMATIONS,
  },
  {
    id: "yellow",
    label: { ru: "Солнечный", en: "Sunny", es: "Amarillo brillante", fr: "Ensoleillé" },
    description: {
      ru: "Тёплый и энергичный",
      en: "Bright and energising",
      es: "Cálido y lleno de energía",
      fr: "Chaud et plein d'énergie",
    },
    preview: require("../../assets/tamagotchi_skins/yellow/Cat_idle.gif"),
    avatar: require("../../assets/tamagotchi_skins/yellow/Cat_idle.gif"),
    animations: YELLOW_TAMAGOTCHI_ANIMATIONS,
  },
  {
    id: "purple",
    label: { ru: "Сиреневый", en: "Lavender", es: "Lavanda", fr: "Lavande" },
    description: {
      ru: "Немного загадочный",
      en: "A dreamy violet vibe",
      es: "Un toque violeta soñador",
      fr: "Une touche violette rêveuse",
    },
    preview: require("../../assets/tamagotchi_skins/purple/Cat_idle.gif"),
    avatar: require("../../assets/tamagotchi_skins/purple/Cat_idle.gif"),
    animations: PURPLE_TAMAGOTCHI_ANIMATIONS,
  },
];

export const TAMAGOTCHI_SKINS = TAMAGOTCHI_SKIN_OPTIONS.reduce((acc, skin) => {
  acc[skin.id] = skin;
  return acc;
}, {});

export const DEFAULT_TAMAGOTCHI_SKIN = "classic";
