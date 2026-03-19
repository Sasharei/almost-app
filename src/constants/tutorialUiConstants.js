export const APP_TUTORIAL_BASE_STEPS = [
  {
    id: "feed",
    icon: "⚡",
    titleKey: "tutorialFeedTitle",
    descriptionKey: "tutorialFeedDesc",
    tabs: ["feed"],
    featureKeys: ["feedTab", "coinEntrySaveLabel", "quickCustomTitle"],
    visualBars: [0.92, 0.58, 0.8, 0.66, 0.84],
    palette: {
      primary: "#62AEFF",
      secondary: "#7FE3C7",
      glow: "#79A9FF",
    },
  },
  {
    id: "goals",
    icon: "📊",
    titleKey: "tutorialGoalsTitle",
    descriptionKey: "tutorialGoalsDesc",
    tabs: ["cart"],
    featureKeys: ["wishlistTab", "budgetWidgetTitle", "challengeTabTitle"],
    visualBars: [0.86, 0.48, 0.72, 0.94, 0.61],
    palette: {
      primary: "#FFB169",
      secondary: "#FFD98E",
      glow: "#FFB784",
    },
  },
  {
    id: "rewards",
    icon: "🎁",
    titleKey: "tutorialRewardsTitle",
    descriptionKey: "tutorialRewardsDesc",
    tabs: ["purchases"],
    requiresRewards: true,
    featureKeys: ["purchasesTitle", "dailyRewardButtonLabel", "challengeRewardsTabTitle"],
    visualBars: [0.68, 0.92, 0.56, 0.79, 0.88],
    palette: {
      primary: "#9E8CFF",
      secondary: "#FF9EC7",
      glow: "#A498FF",
    },
  },
  {
    id: "profile",
    icon: "🛠️",
    titleKey: "tutorialProfileTitle",
    descriptionKey: "tutorialProfileDesc",
    tabs: ["profile"],
    featureKeys: ["profileTab", "languageTitle", "themeLabel", "soundLabel"],
    visualBars: [0.72, 0.54, 0.88, 0.64, 0.77],
    palette: {
      primary: "#7FD5FF",
      secondary: "#A7F0BC",
      glow: "#7FCBFF",
    },
  },
];

export const TEMPTATION_TUTORIAL_STEPS = [
  {
    id: "actions",
    icon: "✅",
    titleKey: "temptationTutorialActionsTitle",
    descriptionKey: "temptationTutorialActionsDesc",
    featureKeys: ["coinEntrySaveLabel", "coinEntrySpendLabel", "newPendingTitle"],
    visualBars: [0.62, 0.91, 0.73, 0.55, 0.84],
    palette: {
      primary: "#65C1FF",
      secondary: "#8BE2C8",
      glow: "#7DB8FF",
    },
  },
  {
    id: "swipe",
    icon: "↔️",
    titleKey: "temptationTutorialSwipeTitle",
    descriptionKey: "temptationTutorialSwipeDesc",
    featureKeys: ["temptationTutorialSwipeTitle", "tutorialFeedTitle"],
    visualBars: [0.9, 0.52, 0.77, 0.68, 0.59],
    palette: {
      primary: "#FFB96E",
      secondary: "#FFC9A0",
      glow: "#FFBE7D",
    },
  },
];

export const FAB_TUTORIAL_STATUS = {
  DONE: "done",
  PENDING: "pending",
  SHOWING: "showing",
};

export const FEED_FIRST_TUTORIAL_STAGE = {
  IDLE: "idle",
  WELCOME: "welcome",
  SAVE: "save",
  ADD_PENDING: "add_pending",
  ADD: "add",
  DONE: "done",
};

export const QUEUED_MODAL_TYPES = {
  FAB_TUTORIAL: "fab_tutorial",
  DID_YOU_KNOW: "did_you_know",
  DAILY_CHALLENGE: "daily_challenge",
  DAILY_CHALLENGE_COMPLETE: "daily_challenge_complete",
  FOCUS_DIGEST: "focus_digest",
  DAILY_SUMMARY: "daily_summary",
  INCOME_PROMPT: "income_prompt",
};

export const CARD_TEXTURE_ACCENTS = ["#8AB9FF", "#FFA4C0", "#8CE7CF", "#FFD48A", "#BBA4FF", "#7FD8FF"];
export const TEMPTATION_CARD_RADIUS = 28;
export const ANDROID_TUTORIAL_HIGHLIGHT_OFFSET = 6;
export const TAB_BAR_BASE_HEIGHT = 64;
export const TAB_BAR_BASE_HEIGHT_COMPACT = 56;
export const HERO_MASCOT_SIZE = 96;
export const ALMI_MASCOT_BORDER_RADIUS = 28;
export const ALMI_MASCOT_IMAGE_OFFSET_X = -4;
export const FAB_BUTTON_SIZE = 64;
export const FAB_CONTAINER_BOTTOM = 96;
export const FAB_CONTAINER_SIDE = 24;
export const FAB_HIDE_TRANSLATE = FAB_BUTTON_SIZE + FAB_CONTAINER_SIDE + 12;
export const FAB_TUTORIAL_MIN_SESSIONS = 2;
export const FAB_TUTORIAL_HALO_SIZE = 128;
export const FAB_TUTORIAL_CARD_SPACING = 140;
export const FAB_TUTORIAL_HALO_INSET = (FAB_TUTORIAL_HALO_SIZE - FAB_BUTTON_SIZE) / 2;
export const TUTORIAL_HIGHLIGHT_INSET = { top: 0, right: 0, bottom: 0, left: 0 };
export const BACK_GESTURE_EDGE_WIDTH = 32;
export const BACK_GESTURE_TRIGGER_DISTANCE = 60;
export const BACK_GESTURE_VERTICAL_SLOP = 60;
export const MAX_TAB_HISTORY = 12;
