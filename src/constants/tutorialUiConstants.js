export const FAB_TUTORIAL_STATUS = {
  DONE: "done",
  PENDING: "pending",
  SHOWING: "showing",
};

export const QUEUED_MODAL_TYPES = {
  FAB_TUTORIAL: "fab_tutorial",
  DID_YOU_KNOW: "did_you_know",
  DAILY_CHALLENGE: "daily_challenge",
  DAILY_CHALLENGE_COMPLETE: "daily_challenge_complete",
  FOCUS_DIGEST: "focus_digest",
  IMPULSE_ALERT: "impulse_alert",
  DAILY_SUMMARY: "daily_summary",
  INCOME_PROMPT: "income_prompt",
  CYCLE_SAVINGS_REVOKED: "cycle_savings_revoked",
  NO_GOAL_SAVE_PROMPT: "no_goal_save_prompt",
  TYCOON_AUTOSAVE_HUNGRY: "tycoon_autosave_hungry",
  TYCOON_AUTOSAVE: "tycoon_autosave",
};

// Attention prompts are deferred until a successful save/spend and share one
// presentation slot. Transactional and safety-critical modals stay outside this set.
export const POST_ACTION_PROMPT_MODAL_TYPES = new Set([
  QUEUED_MODAL_TYPES.DAILY_CHALLENGE_COMPLETE,
  QUEUED_MODAL_TYPES.IMPULSE_ALERT,
  QUEUED_MODAL_TYPES.DAILY_CHALLENGE,
  QUEUED_MODAL_TYPES.FOCUS_DIGEST,
  QUEUED_MODAL_TYPES.DID_YOU_KNOW,
  QUEUED_MODAL_TYPES.NO_GOAL_SAVE_PROMPT,
  QUEUED_MODAL_TYPES.INCOME_PROMPT,
]);

export const POST_ACTION_PROMPT_MODAL_PRIORITY = Object.freeze({
  [QUEUED_MODAL_TYPES.DAILY_CHALLENGE_COMPLETE]: 10,
  [QUEUED_MODAL_TYPES.IMPULSE_ALERT]: 20,
  [QUEUED_MODAL_TYPES.DAILY_CHALLENGE]: 30,
  [QUEUED_MODAL_TYPES.FOCUS_DIGEST]: 40,
  [QUEUED_MODAL_TYPES.DAILY_SUMMARY]: 50,
  [QUEUED_MODAL_TYPES.DID_YOU_KNOW]: 60,
  [QUEUED_MODAL_TYPES.NO_GOAL_SAVE_PROMPT]: 70,
  [QUEUED_MODAL_TYPES.INCOME_PROMPT]: 80,
  [QUEUED_MODAL_TYPES.TYCOON_AUTOSAVE_HUNGRY]: 90,
  [QUEUED_MODAL_TYPES.TYCOON_AUTOSAVE]: 100,
});

// Explicit taps/deep links must never wait for the background prompt budget.
export const USER_INITIATED_QUEUED_MODAL_TYPES = new Set([
  QUEUED_MODAL_TYPES.DAILY_SUMMARY,
]);

export const CARD_TEXTURE_ACCENTS = ["#8AB9FF", "#FFA4C0", "#8CE7CF", "#FFD48A", "#BBA4FF", "#7FD8FF"];
export const TEMPTATION_CARD_RADIUS = 16;
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
export const BACK_GESTURE_EDGE_WIDTH = 32;
export const BACK_GESTURE_TRIGGER_DISTANCE = 60;
export const BACK_GESTURE_VERTICAL_SLOP = 60;
export const MAX_TAB_HISTORY = 12;
