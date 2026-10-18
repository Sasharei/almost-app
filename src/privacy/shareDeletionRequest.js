import { NativeModules, Platform, Share } from "react-native";

// Older installed shells and Android keep the existing complete-text transport.
// New iOS shells coordinate the app window, React touch cancellation and the
// actual dismissal of the system activity controller together.
export function shareDeletionRequest(content, options) {
  const nativeShare = NativeModules.AlmostPrivacySharing;
  if (Platform.OS === "ios" && typeof nativeShare?.share === "function") {
    return nativeShare.share({ ...content, subject: options?.subject });
  }
  return Share.share(content, options);
}
