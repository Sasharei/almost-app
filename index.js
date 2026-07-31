import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Text, TextInput } from "react-native";
import App from "./App";
import {
  initAttribution,
  setAppScopedInstallIdentity,
  setAppsFlyerPartnerSharingAllowed,
} from "./analytics";
import { STORAGE_KEYS } from "./src/constants/appBehavior";
import { ensurePremiumInstallId } from "./src/analytics/installIdentity";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { shouldWaitForAttPrompt } = require("./src/analytics/consentPolicy");

let TrackingTransparency = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  TrackingTransparency = require("expo-tracking-transparency");
} catch (_error) {
  TrackingTransparency = null;
}

const parseStoredBoolean = (value) => {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
};

const bootstrapAttribution = async () => {
  let partnerSharingAllowed = false;
  let onboardingComplete = false;
  try {
    const storedPairs = await AsyncStorage.multiGet([
      STORAGE_KEYS.APPSFLYER_PARTNER_SHARING_ALLOWED,
      STORAGE_KEYS.ANDROID_APPSFLYER_ENABLED,
      STORAGE_KEYS.ONBOARDING,
    ]);
    const storedMap = Object.fromEntries(storedPairs || []);
    const storedPreference =
      storedMap[STORAGE_KEYS.APPSFLYER_PARTNER_SHARING_ALLOWED] ??
      storedMap[STORAGE_KEYS.ANDROID_APPSFLYER_ENABLED];
    partnerSharingAllowed = parseStoredBoolean(storedPreference) ?? false;
    onboardingComplete = storedMap[STORAGE_KEYS.ONBOARDING] === "done";
  } catch (error) {
    console.warn("AppsFlyer partner sharing preference unavailable", error);
  }
  const premiumInstallId = await ensurePremiumInstallId();
  await setAppScopedInstallIdentity(premiumInstallId);
  await setAppsFlyerPartnerSharingAllowed(partnerSharingAllowed);
  let trackingStatus = null;
  if (
    Platform.OS === "ios" &&
    typeof TrackingTransparency?.getTrackingPermissionsAsync === "function"
  ) {
    try {
      const permission = await TrackingTransparency.getTrackingPermissionsAsync();
      trackingStatus = permission?.status || null;
    } catch (_error) {}
  }
  const attWaitSeconds = shouldWaitForAttPrompt({
    platform: Platform.OS,
    onboardingComplete,
    trackingStatus,
  })
    ? 60
    : 0;
  void initAttribution({
    timeToWaitForATTUserAuthorization: attWaitSeconds,
  }).catch((error) => {
    console.warn("AppsFlyer initialization failed", error);
  });
};

const applyFixedFontScaling = () => {
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.maxFontSizeMultiplier = 1;

  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.maxFontSizeMultiplier = 1;
};

applyFixedFontScaling();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
void bootstrapAttribution()
  .catch((error) => {
    console.warn("AppsFlyer attribution bootstrap failed", error);
  });

registerRootComponent(App);
