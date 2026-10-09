# Cloud announcements (8.0.0 / build 128)

Firebase Cloud Messaging is integrated on iOS and Android alongside the existing Expo local reminders. This sends notifications, not over-the-air code updates. EAS Updates remains disabled.

## Before sending

1. Build and install the new native app. Existing 7.x installations do not include the iOS FCM integration and cannot be retroactively enrolled by this code. A returning user enrolls after updating, opening the app, and permitting notifications. Cloud announcements are enabled by default once OS notification permission is granted; there is no separate cloud opt-in. Registration also re-enables FCM auto-init if a previous native configuration disabled it. The existing notification permission flow is retained; startup never presents an extra permission dialog.
2. In the existing Firebase project, open **Project settings → Cloud Messaging**, select the iOS app `com.sasarei.almostclean`, and upload the Apple APNs authentication key with its Key ID and Team ID. The `.p8` key stays in Firebase; never commit it. Enable Push Notifications on the Apple App ID and regenerate signing profiles if they lack it. The checked-in development entitlement is intentional: distribution signing must produce the production APNs entitlement. The Expo config declares production for generated release projects.
3. Android uses the existing `android/app/google-services.json`. Confirm its application ID and Firebase project match the console. No Expo push credentials or app backend endpoint are used.
4. Perform a real release-build delivery test on both platforms before publishing: app open, background, and cold start; permission allowed/denied and permission restored in system settings; offline launch followed by reconnect; existing local reminder actions. Simulators were not launched as part of this change.

## Send a campaign

In Firebase Console, open **Messaging**, create a **Firebase Notification message**, and enter the title and body. Select the registered iOS/Android app as the target. Send a test first, then schedule or publish the campaign when ready.

For an update announcement, add custom data `kind` = `app_update` under additional options. Tapping opens the fixed App Store or Google Play listing. Omit that field for a general announcement that simply opens Almost. Do not send arbitrary links; custom URLs are intentionally ignored. On Android, use channel ID `app-announcements` (also configured as the FCM default).

Campaign copy is entered in Firebase, not the app's dictionaries. Create separate translated campaigns for each target language; Firebase's device-language targeting refers to device language and may differ from the selected in-app language. All app-owned channel labels are localized for the 11 supported languages.

Firebase Console supports app-version targeting for future update announcements. Version/audience targeting and campaign metrics may depend on Firebase Analytics data, which remains subject to the app's analytics consent. FCM registration and notification display do not depend on analytics consent or ATT. For precise older/newer cohorts independent of analytics, a separate authenticated token registry and sending service would be needed; it is not part of this console-based integration.

## Implementation and boundaries

- FCM owns Android remote reception; Expo continues to own local scheduling and actions. The Expo FCM service is removed from the merged manifest to avoid competing remote receivers.
- On Android, foreground FCM notification messages produce one Expo banner. Background notifications are displayed by FCM. On iOS, native notification presentation handles banners; JavaScript does not create a duplicate.
- Registration retries after transient errors and when the app becomes active. FCM manages token refresh; there is no server-side token registry to keep in sync.
- No token or financial content is sent to product analytics or the purchase backend. AppsFlyer startup and RevenueCat purchase postbacks are unchanged.
- Re-check the Android manifest override if regenerating native projects with Expo prebuild; this repository maintains native projects directly.

References: [RNFirebase messaging](https://rnfirebase.io/messaging/usage), [iOS setup](https://rnfirebase.io/messaging/usage/ios-setup), [Firebase Console campaigns](https://firebase.google.com/docs/cloud-messaging/send/firebase-console).
