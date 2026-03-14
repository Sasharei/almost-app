export const FEATURE_UNLOCK_STEPS = [
  { level: 2, messageKey: "level2UnlockMessage" },
  { level: 3, messageKey: "level3UnlockMessage" },
  { level: 4, messageKey: "level4UnlockMessage" },
  { level: 5, messageKey: "level5UnlockMessage" },
  { level: 6, messageKey: "level6UnlockMessage" },
  { level: 7, messageKey: "level7UnlockMessage" },
];

export const FEATURE_UNLOCK_VARIANT_MAP = {
  level2UnlockMessage: "rewardsDaily",
  level3UnlockMessage: "thinkingList",
  level4UnlockMessage: "impulseMap",
  level5UnlockMessage: "rewardsCustomization",
  level6UnlockMessage: "reports",
  level7UnlockMessage: "freeDay",
};

export const FEATURE_UNLOCK_PREMIUM_MESSAGE_MAP = {
  level2UnlockMessage: "level2UnlockMessagePremium",
  level3UnlockMessage: "level3UnlockMessagePremium",
  level4UnlockMessage: "level4UnlockMessagePremium",
  level5UnlockMessage: "level5UnlockMessagePremium",
  level6UnlockMessage: "level6UnlockMessagePremium",
  level7UnlockMessage: "level7UnlockMessagePremium",
};

export const FEATURE_UNLOCK_VARIANT_CONFIG = {
  rewardsDaily: {
    titleKey: "featureUnlockRewardsDailyTitle",
    descriptionKey: "featureUnlockRewardsDailyDescription",
    premiumDescriptionKey: "featureUnlockRewardsDailyPremiumDescription",
    previewLabelKey: "featureUnlockRewardsDailyPreview",
  },
  feedFocus: {
    titleKey: "featureUnlockFeedFocusTitle",
    descriptionKey: "featureUnlockFeedFocusDescription",
    premiumDescriptionKey: "featureUnlockFeedFocusPremiumDescription",
    previewLabelKey: "featureUnlockFeedFocusPreview",
  },
  rewardsCustomization: {
    titleKey: "featureUnlockRewardsCustomizationTitle",
    descriptionKey: "featureUnlockRewardsCustomizationDescription",
    premiumDescriptionKey: "featureUnlockRewardsCustomizationPremiumDescription",
    previewLabelKey: "featureUnlockRewardsCustomizationPreview",
  },
  catCustomization: {
    titleKey: "featureUnlockCatCustomizationTitle",
    descriptionKey: "featureUnlockCatCustomizationDescription",
    premiumDescriptionKey: "featureUnlockCatCustomizationPremiumDescription",
    previewLabelKey: "featureUnlockCatCustomizationPreview",
  },
  reports: {
    titleKey: "featureUnlockReportsTitle",
    descriptionKey: "featureUnlockReportsDescription",
    premiumDescriptionKey: "featureUnlockReportsPremiumDescription",
    previewLabelKey: "featureUnlockReportsPreview",
  },
  rewardsChallenges: {
    titleKey: "featureUnlockRewardsChallengesTitle",
    descriptionKey: "featureUnlockRewardsChallengesDescription",
    premiumDescriptionKey: "featureUnlockRewardsChallengesPremiumDescription",
    previewLabelKey: "featureUnlockRewardsChallengesPreview",
  },
  impulseMap: {
    titleKey: "featureUnlockImpulseMapTitle",
    descriptionKey: "featureUnlockImpulseMapDescription",
    premiumDescriptionKey: "featureUnlockImpulseMapPremiumDescription",
    previewLabelKey: "featureUnlockImpulseMapPreview",
  },
  thinkingList: {
    titleKey: "featureUnlockThinkingTitle",
    descriptionKey: "featureUnlockThinkingDescription",
    premiumDescriptionKey: "featureUnlockThinkingPremiumDescription",
    previewLabelKey: "featureUnlockThinkingPreview",
  },
  freeDay: {
    titleKey: "featureUnlockFreeDayTitle",
    descriptionKey: "featureUnlockFreeDayDescription",
    premiumDescriptionKey: "featureUnlockFreeDayPremiumDescription",
    previewLabelKey: "featureUnlockFreeDayTitle",
  },
};

export const FEATURE_UNLOCK_LEVELS = {
  rewardsDaily: 2,
  feedFocus: 3,
  rewardsCustomization: 5,
  catCustomization: 6,
  reports: 6,
  rewardsChallenges: 1,
  impulseMap: 4,
  thinkingList: 3,
  freeDay: 7,
};

export const FEATURE_UNLOCK_PREMIUM_VARIANTS = new Set(["impulseMap", "reports", "catCustomization"]);
