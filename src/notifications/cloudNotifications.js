import { AppState, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";

export const ANNOUNCEMENTS_CHANNEL_ID = "app-announcements";
const STORE_URLS = {
  ios: "https://apps.apple.com/app/id6756276744",
  android: "https://play.google.com/store/apps/details?id=com.sasarei.almostclean",
};
let initialNotificationConsumed = false;
let initialNotificationPromise;
let lastStoreOpenAt = 0;
// An old effect's token deletion must finish before a replacement can register again.
let registrationQueue = Promise.resolve();
// Keep reservations outside the effect so language/permission restarts cannot replay a banner.
const foregroundAnnouncements = new Map();
const IDENTICAL_ANNOUNCEMENT_WINDOW_MS = 90000;
const MESSAGE_ID_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_FOREGROUND_DEDUPE_ENTRIES = 128;

function reserveForegroundAnnouncement(message) {
  const now = Date.now();
  for (const [key, entry] of foregroundAnnouncements) {
    if (now - entry.at >= entry.windowMs) foregroundAnnouncements.delete(key);
  }
  const keys = [[`content:${JSON.stringify([
    message.notification.title || "", message.notification.body || "", message.data?.kind || "",
  ])}`, IDENTICAL_ANNOUNCEMENT_WINDOW_MS]];
  if (message.messageId) keys.push([`id:${message.messageId}`, MESSAGE_ID_RETENTION_MS]);
  if (keys.some(([key]) => foregroundAnnouncements.has(key))) return null;
  const reservation = {};
  // Reserve synchronously before the native await: concurrent deliveries see this entry.
  for (const [key, windowMs] of keys) foregroundAnnouncements.set(key, { at: now, windowMs, reservation });
  while (foregroundAnnouncements.size > MAX_FOREGROUND_DEDUPE_ENTRIES) {
    foregroundAnnouncements.delete(foregroundAnnouncements.keys().next().value);
  }
  return () => {
    for (const [key] of keys) {
      if (foregroundAnnouncements.get(key)?.reservation === reservation) foregroundAnnouncements.delete(key);
    }
  };
}

// Only a fixed store destination is supported. Remote payloads cannot open arbitrary URLs.
export function openCloudAnnouncement(data) {
  if (data?.kind !== "app_update") return false;
  const url = STORE_URLS[Platform.OS];
  if (url && Date.now() - lastStoreOpenAt > 2000) {
    lastStoreOpenAt = Date.now();
    Linking.openURL(url).catch(() => {
      lastStoreOpenAt = 0;
      console.warn("Could not open the app store from the announcement");
    });
  }
  return true;
}

// Register before React mounts. Visible background notifications are rendered by FCM/APNs;
// do not schedule a second copy and do not process arbitrary data-only commands.
export function configureCloudNotificationBackgroundHandler() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const api = require("@react-native-firebase/messaging");
    api.setBackgroundMessageHandler(api.getMessaging(), async () => {});
  } catch {
    // Expo Go/older native binaries do not include FCM.
  }
}

// Reuse the existing permission flow; never prompt on startup or depend on analytics/ATT.
export function startCloudNotifications({ channelName, scheduleNotification = Notifications.scheduleNotificationAsync }) {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return undefined;
  let api;
  let messaging;
  try {
    // Keep older native builds usable until they are rebuilt with the messaging module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    api = require("@react-native-firebase/messaging");
    messaging = api.getMessaging();
  } catch {
    console.warn("Cloud messaging requires a new native build");
    return undefined;
  }
  let stopped = false;
  let syncing = false;
  let syncRequested = false;
  let retryTimer;
  const permissionAllowsCloud = (permission) => permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const revokeRegistration = async () => {
    await api.setAutoInitEnabled(messaging, false);
    try {
      await api.deleteToken(messaging);
    } finally {
      // Still stop APNs delivery when FCM deletion needs a network retry.
      if (Platform.OS === "ios" && messaging.isDeviceRegisteredForRemoteMessages) {
        await api.unregisterDeviceForRemoteMessages(messaging);
      }
    }
  };
  const sync = async () => {
    if (stopped) return;
    if (syncing) { syncRequested = true; return; }
    syncing = true;
    syncRequested = false;
    clearTimeout(retryTimer);
    try {
      const pending = registrationQueue.then(async () => {
        if (stopped) return;
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync(ANNOUNCEMENTS_CHANNEL_ID, {
            name: channelName,
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
        const permission = await Notifications.getPermissionsAsync();
        if (stopped) return;
        if (!permissionAllowsCloud(permission)) {
          await revokeRegistration();
          return;
        }
        // A granted OS permission enables cloud messages by default, including when
        // a previous native configuration persisted FCM auto-init as disabled.
        await api.setAutoInitEnabled(messaging, true);
        if (stopped) return;
        if (Platform.OS === "ios" && !messaging.isDeviceRegisteredForRemoteMessages) {
          await api.registerDeviceForRemoteMessages(messaging);
        }
        if (stopped) return;
        // FCM enrolls this installation for Firebase Console campaigns. No token is logged,
        // stored in analytics, or sent to the purchase backend.
        await api.getToken(messaging);
        // Permission can change while native registration is in flight.
        if (stopped) return;
        const latestPermission = await Notifications.getPermissionsAsync();
        if (!stopped && !permissionAllowsCloud(latestPermission)) await revokeRegistration();
      });
      registrationQueue = pending.catch(() => {});
      await pending;
    } catch {
      if (!stopped) retryTimer = setTimeout(() => void sync(), 30000);
      console.warn("Cloud messaging synchronization deferred; will retry");
    } finally {
      syncing = false;
      if (syncRequested && !stopped) void sync();
    }
  };
  const unsubscribeMessage = api.onMessage(messaging, async (message) => {
    // iOS presents its remote banner natively; creating another would duplicate it.
    if (stopped || Platform.OS !== "android" || !message.notification) return;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (stopped || !permission.granted) return;
    } catch {
      return;
    }
    const releaseReservation = reserveForegroundAnnouncement(message);
    if (!releaseReservation) return;
    try {
      await scheduleNotification({
        identifier: message.messageId,
        content: {
          title: message.notification.title,
          body: message.notification.body,
          data: { ...message.data, notificationSource: "cloud" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1, channelId: ANNOUNCEMENTS_CHANNEL_ID },
      });
    } catch {
      releaseReservation();
      console.warn("Could not present the cloud announcement");
    }
  });
  const unsubscribeOpen = api.onNotificationOpenedApp(messaging, (message) => {
    if (!stopped) openCloudAnnouncement(message.data);
  });
  if (!initialNotificationConsumed) {
    // Preserve a cold-start tap if language/permission hydration restarts this effect.
    initialNotificationPromise ||= api.getInitialNotification(messaging);
    initialNotificationPromise.then((message) => {
      if (stopped) return;
      initialNotificationConsumed = true;
      if (message) openCloudAnnouncement(message.data);
    }).catch(() => { initialNotificationPromise = undefined; });
  }
  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") void sync();
  });
  void sync();
  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    unsubscribeMessage();
    unsubscribeOpen();
    appStateSubscription.remove();
  };
}
