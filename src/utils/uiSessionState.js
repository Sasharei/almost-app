const UI_SESSION_VERSION = 1;
const UI_SESSION_HOME_RESET_MS = 5 * 60 * 1000;

const RESTORABLE_TABS = new Set(["feed", "cart", "pending", "purchases", "profile"]);
const RESTORABLE_PROFILE_EDIT_MODES = new Set(["profile", "settings"]);
const RESTORABLE_PROGRESS_PANES = new Set(["progress", "rewards"]);
const RESTORABLE_PROGRESS_SECTIONS = new Set([
  "overview",
  "goals",
  "insights",
  "challenges",
]);
const RESTORABLE_REWARDS_PANES = new Set(["rewards", "challenges"]);

const isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);

const normalizeString = (value, fallback = "") =>
  typeof value === "string" ? value : fallback;

const normalizeStringArray = (value, allowedValues = null, limit = 20) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.reduce((result, entry) => {
    if (result.length >= limit || typeof entry !== "string") return result;
    if (allowedValues && !allowedValues.has(entry)) return result;
    if (seen.has(entry)) return result;
    seen.add(entry);
    result.push(entry);
    return result;
  }, []);
};

const cloneSerializableRecord = (value) => {
  if (!isRecord(value)) return null;
  try {
    const clone = JSON.parse(JSON.stringify(value));
    return isRecord(clone) ? clone : null;
  } catch (_error) {
    return null;
  }
};

const shouldResetUiSessionNavigation = ({
  isColdStart = false,
  backgroundedAt = 0,
  resumedAt = Date.now(),
  resetAfterMs = UI_SESSION_HOME_RESET_MS,
} = {}) => {
  if (isColdStart) return true;
  const normalizedBackgroundedAt = Number(backgroundedAt) || 0;
  const normalizedResumedAt = Number(resumedAt) || 0;
  const normalizedResetAfterMs = Math.max(0, Number(resetAfterMs) || 0);
  if (normalizedBackgroundedAt <= 0 || normalizedResumedAt < normalizedBackgroundedAt) {
    return false;
  }
  return normalizedResumedAt - normalizedBackgroundedAt >= normalizedResetAfterMs;
};

const normalizeProfileEditor = (value) => {
  if (!isRecord(value)) return null;
  const mode = RESTORABLE_PROFILE_EDIT_MODES.has(value.mode) ? value.mode : null;
  const draft = cloneSerializableRecord(value.draft);
  if (!mode || !draft) return null;
  return { mode, draft };
};

const normalizePriceEditor = (value) => {
  if (!isRecord(value)) return null;
  const item = cloneSerializableRecord(value.item);
  if (!item || (typeof item.id !== "string" && typeof item.id !== "number")) return null;
  return {
    item,
    value: normalizeString(value.value),
    title: normalizeString(value.title),
    emoji: normalizeString(value.emoji),
    category: normalizeString(value.category),
    description: normalizeString(value.description),
    frequency: normalizeString(value.frequency, "daily"),
    frequencyCustom: cloneSerializableRecord(value.frequencyCustom),
    frequencyReminderHour: Number(value.frequencyReminderHour),
    frequencyReminderMinute: Number(value.frequencyReminderMinute),
    frequencyWeeklyDay: Number(value.frequencyWeeklyDay),
    frequencyMonthlyDay: Number(value.frequencyMonthlyDay),
    frequencyWeeklyDays: Array.isArray(value.frequencyWeeklyDays)
      ? value.frequencyWeeklyDays.map(Number).filter(Number.isFinite)
      : [],
    frequencyMonthlyDays: Array.isArray(value.frequencyMonthlyDays)
      ? value.frequencyMonthlyDays.map(Number).filter(Number.isFinite)
      : [],
    initialFrequency:
      value.initialFrequency === null ? null : normalizeString(value.initialFrequency) || null,
    scheduleConfigVisible: value.scheduleConfigVisible === true,
    isDuplicateCopy: value.isDuplicateCopy === true,
  };
};

const normalizeQuickTemptationEditor = (value) => {
  if (!isRecord(value) || value.visible !== true) return null;
  const draft = cloneSerializableRecord(value.draft);
  if (!draft) return null;
  return {
    visible: true,
    draft,
    lockedCategoryId:
      typeof value.lockedCategoryId === "string" ? value.lockedCategoryId : null,
  };
};

const normalizeModalEditor = (value) => {
  if (!isRecord(value) || value.visible !== true) return null;
  return cloneSerializableRecord(value);
};

const normalizeCategoryEditor = (value) => {
  if (!isRecord(value)) return null;
  const addVisible = value.addVisible === true;
  const manageVisible = value.manageVisible === true;
  if (!addVisible && !manageVisible) return null;
  return {
    addVisible,
    manageVisible,
    resumeManageAfterAdd: value.resumeManageAfterAdd === true,
    addName: normalizeString(value.addName),
    addEmoji: normalizeString(value.addEmoji, "✨"),
    editId: normalizeString(value.editId, "savings"),
    editName: normalizeString(value.editName),
    editEmoji: normalizeString(value.editEmoji),
  };
};

const normalizeUiSessionState = (rawValue) => {
  if (!rawValue) return null;
  let value = rawValue;
  if (typeof rawValue === "string") {
    try {
      value = JSON.parse(rawValue);
    } catch (_error) {
      return null;
    }
  }
  if (!isRecord(value) || Number(value.version) !== UI_SESSION_VERSION) return null;

  const activeTab = RESTORABLE_TABS.has(value.activeTab) ? value.activeTab : "feed";
  const navigation = isRecord(value.navigation) ? value.navigation : {};
  const progressHubPane = RESTORABLE_PROGRESS_PANES.has(navigation.progressHubPane)
    ? navigation.progressHubPane
    : "progress";
  const progressSection = RESTORABLE_PROGRESS_SECTIONS.has(navigation.progressSection)
    ? navigation.progressSection
    : "overview";
  const rewardsPane = RESTORABLE_REWARDS_PANES.has(navigation.rewardsPane)
    ? navigation.rewardsPane
    : "rewards";

  return {
    version: UI_SESSION_VERSION,
    updatedAt: Math.max(0, Number(value.updatedAt) || 0),
    activeTab,
    tabHistory: normalizeStringArray(value.tabHistory, RESTORABLE_TABS),
    navigation: {
      progressHubPane,
      progressSection,
      rewardsPane,
      heroCarouselIndex: Math.max(0, Math.round(Number(navigation.heroCarouselIndex) || 0)),
    },
    profileEditor: normalizeProfileEditor(value.profileEditor),
    priceEditor: normalizePriceEditor(value.priceEditor),
    quickTemptationEditor: normalizeQuickTemptationEditor(value.quickTemptationEditor),
    pendingEditor: normalizeModalEditor(value.pendingEditor),
    goalEditor: normalizeModalEditor(value.goalEditor),
    linkedGoalEditor: normalizeModalEditor(value.linkedGoalEditor),
    categoryEditor: normalizeCategoryEditor(value.categoryEditor),
  };
};

const createUiSessionState = ({
  activeTab,
  tabHistory,
  progressHubPane,
  progressSection,
  rewardsPane,
  heroCarouselIndex,
  profileEditMode,
  profileDraft,
  priceEditor,
  showCustomSpend,
  quickSpendDraft,
  quickCustomLockedCategoryId,
  newPendingModal,
  newGoalModal,
  goalEditorPrompt,
  addCategoryModalVisible,
  manageCategoriesVisible,
  resumeManageCategoriesAfterAdd,
  addCategoryName,
  addCategoryEmoji,
  categoryEditId,
  categoryEditName,
  categoryEditEmoji,
  now = Date.now(),
} = {}) =>
  normalizeUiSessionState({
    version: UI_SESSION_VERSION,
    updatedAt: now,
    activeTab,
    tabHistory,
    navigation: {
      progressHubPane,
      progressSection,
      rewardsPane,
      heroCarouselIndex,
    },
    profileEditor:
      profileEditMode && profileEditMode !== "none"
        ? { mode: profileEditMode, draft: profileDraft }
        : null,
    priceEditor: priceEditor?.item ? priceEditor : null,
    quickTemptationEditor: showCustomSpend
      ? {
          visible: true,
          draft: quickSpendDraft,
          lockedCategoryId: quickCustomLockedCategoryId,
        }
      : null,
    pendingEditor: newPendingModal?.visible ? newPendingModal : null,
    goalEditor: newGoalModal?.visible ? newGoalModal : null,
    linkedGoalEditor: goalEditorPrompt?.visible ? goalEditorPrompt : null,
    categoryEditor:
      addCategoryModalVisible || manageCategoriesVisible
        ? {
            addVisible: addCategoryModalVisible,
            manageVisible: manageCategoriesVisible,
            resumeManageAfterAdd: resumeManageCategoriesAfterAdd,
            addName: addCategoryName,
            addEmoji: addCategoryEmoji,
            editId: categoryEditId,
            editName: categoryEditName,
            editEmoji: categoryEditEmoji,
          }
        : null,
  });

module.exports = {
  UI_SESSION_HOME_RESET_MS,
  UI_SESSION_VERSION,
  createUiSessionState,
  normalizeUiSessionState,
  shouldResetUiSessionNavigation,
};
