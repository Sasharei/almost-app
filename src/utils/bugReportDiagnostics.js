import { AppState, Dimensions, PixelRatio, Platform } from "react-native";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Localization from "expo-localization";

const SESSION_STARTED_AT = Date.now();
const UNKNOWN_VALUE = "unknown";

const DEVICE_TYPE_NAMES = {
  [Device.DeviceType.UNKNOWN]: "unknown",
  [Device.DeviceType.PHONE]: "phone",
  [Device.DeviceType.TABLET]: "tablet",
  [Device.DeviceType.DESKTOP]: "desktop",
  [Device.DeviceType.TV]: "tv",
};

const IOS_RELEASE_TYPE_NAMES = {
  [Application.ApplicationReleaseType.UNKNOWN]: "unknown",
  [Application.ApplicationReleaseType.SIMULATOR]: "simulator",
  [Application.ApplicationReleaseType.ENTERPRISE]: "enterprise",
  [Application.ApplicationReleaseType.DEVELOPMENT]: "development",
  [Application.ApplicationReleaseType.AD_HOC]: "ad-hoc",
  [Application.ApplicationReleaseType.APP_STORE]: "App Store",
};

const safeAsync = async (getter, fallback = null) => {
  if (typeof getter !== "function") return fallback;
  try {
    const value = await getter();
    return value ?? fallback;
  } catch (_error) {
    return fallback;
  }
};

const safeSync = (getter, fallback = null) => {
  if (typeof getter !== "function") return fallback;
  try {
    const value = getter();
    return value ?? fallback;
  } catch (_error) {
    return fallback;
  }
};

const cleanValue = (value) =>
  String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 320);

const hasValue = (value) =>
  value !== null &&
  typeof value !== "undefined" &&
  value !== "" &&
  !(typeof value === "number" && !Number.isFinite(value));

const formatBoolean = (value) => {
  if (value === true) return "yes";
  if (value === false) return "no";
  return UNKNOWN_VALUE;
};

const formatBytes = (bytes) => {
  const normalized = Number(bytes);
  if (!Number.isFinite(normalized) || normalized <= 0) return null;
  const gibibytes = normalized / 1024 ** 3;
  if (gibibytes >= 1) return `${gibibytes.toFixed(gibibytes >= 10 ? 1 : 2)} GiB`;
  return `${(normalized / 1024 ** 2).toFixed(0)} MiB`;
};

const formatDuration = (milliseconds) => {
  const normalized = Number(milliseconds);
  if (!Number.isFinite(normalized) || normalized < 0) return null;
  const totalSeconds = Math.floor(normalized / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  return days ? `${days}d ${time}` : time;
};

const formatUtcOffset = (date) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
  const minutes = String(absoluteMinutes % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
};

const formatReactNativeVersion = () => {
  const version = Platform.constants?.reactNativeVersion;
  if (!version) return null;
  const base = [version.major, version.minor, version.patch].join(".");
  return version.prerelease ? `${base}-${version.prerelease}` : base;
};

const formatDisplayMetrics = (metrics) => {
  const width = Number(metrics?.width);
  const height = Number(metrics?.height);
  const scale = Number(metrics?.scale) || PixelRatio.get() || 1;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return `${Math.round(width)}x${Math.round(height)} pt (${Math.round(width * scale)}x${Math.round(
    height * scale
  )} px)`;
};

const addField = (lines, label, value) => {
  if (!hasValue(value)) return;
  const cleaned = cleanValue(value);
  if (!cleaned) return;
  lines.push(`${label}: ${cleaned}`);
};

const buildInterfaceName = () => {
  if (Platform.OS === "ios") {
    const idiom = Platform.constants?.interfaceIdiom;
    const catalyst = Platform.constants?.isMacCatalyst ? "Mac Catalyst" : null;
    return [idiom, catalyst].filter(Boolean).join(", ") || null;
  }
  return Platform.constants?.uiMode || null;
};

const getLocalTime = (date, localeTag) => {
  try {
    return new Intl.DateTimeFormat(localeTag || undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch (_error) {
    return date.toString();
  }
};

export const collectBugReportDiagnostics = async ({
  screen = null,
  screenDetails = null,
  appLanguage = null,
  theme = null,
  themeAccent = null,
  accessTier = null,
  reduceMotion = null,
  reportOpenedAt = null,
  appState = null,
} = {}) => {
  const now = new Date();
  const windowMetrics = Dimensions.get("window");
  const screenMetrics = Dimensions.get("screen");
  const locales = safeSync(() => Localization.getLocales(), []);
  const calendars = safeSync(() => Localization.getCalendars(), []);
  const locale = locales?.[0] || null;
  const calendar = calendars?.[0] || null;
  const reportOpenedTimestamp = hasValue(reportOpenedAt) ? Number(reportOpenedAt) : null;

  const [
    asyncDeviceType,
    deviceUptime,
    maxAppMemory,
    iosReleaseType,
  ] = await Promise.all([
    safeAsync(() => Device.getDeviceTypeAsync()),
    safeAsync(() => Device.getUptimeAsync()),
    Platform.OS === "android" ? safeAsync(() => Device.getMaxMemoryAsync()) : null,
    Platform.OS === "ios"
      ? safeAsync(() => Application.getIosApplicationReleaseTypeAsync())
      : null,
  ]);

  // Privacy boundary: model families and OS builds are useful for reproduction, but custom
  // device names, IP addresses, serials, Android IDs, IDFV, ad IDs, and build fingerprints are not.
  const deviceType = Device.deviceType ?? asyncDeviceType;
  const deviceName = [Device.manufacturer, Device.modelName]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" ");
  const deviceCodes = [
    Device.modelId ? `model ${Device.modelId}` : null,
    Device.designName ? `design ${Device.designName}` : null,
    Device.productName ? `product ${Device.productName}` : null,
  ].filter(Boolean);
  const osName = Device.osName || Platform.constants?.systemName || Platform.OS;
  const osVersion = Device.osVersion || Platform.Version;
  const osBuilds = [Device.osBuildId, Device.osInternalBuildId]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" / ");
  const appVersion = Application.nativeApplicationVersion || UNKNOWN_VALUE;
  const buildVersion = Application.nativeBuildVersion || UNKNOWN_VALUE;
  const preferredLocaleTags = locales
    .slice(0, 3)
    .map((entry) => entry?.languageTag)
    .filter(Boolean)
    .join(", ");
  const timeZone = calendar?.timeZone || safeSync(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    null
  );
  const orientation =
    Number(windowMetrics?.width) > Number(windowMetrics?.height) ? "landscape" : "portrait";
  const lines = [];

  lines.push("[App]");
  addField(lines, "Version", `${appVersion} (build ${buildVersion})`);
  addField(lines, "Application", Application.applicationName);
  addField(lines, "Build mode", __DEV__ ? "development" : "release");
  if (Platform.OS === "ios") {
    addField(lines, "Distribution", IOS_RELEASE_TYPE_NAMES[iosReleaseType] || UNKNOWN_VALUE);
  }
  addField(lines, "React Native", formatReactNativeVersion());
  addField(lines, "UI architecture", globalThis.nativeFabricUIManager ? "Fabric" : "Paper");

  lines.push("", "[Report context]");
  addField(lines, "Screen", screen);
  addField(lines, "Screen state", screenDetails);
  addField(lines, "App state", appState || AppState.currentState);
  addField(lines, "Theme", theme);
  addField(lines, "Theme accent", themeAccent);
  addField(lines, "App language", appLanguage);
  addField(lines, "Access tier", accessTier);
  addField(lines, "Reduced motion", formatBoolean(reduceMotion));
  if (Number.isFinite(reportOpenedTimestamp) && reportOpenedTimestamp > 0) {
    const openedDate = new Date(reportOpenedTimestamp);
    addField(lines, "Report opened UTC", openedDate.toISOString());
    addField(lines, "Time in report form", formatDuration(now.getTime() - reportOpenedTimestamp));
  }
  addField(lines, "Report submitted UTC", now.toISOString());
  addField(lines, "Report submitted local", getLocalTime(now, locale?.languageTag));
  addField(lines, "App session age", formatDuration(now.getTime() - SESSION_STARTED_AT));

  lines.push("", "[Device and OS]");
  addField(lines, "OS", `${osName} ${osVersion}`);
  addField(lines, "OS build", osBuilds);
  addField(lines, "Platform API level", Device.platformApiLevel);
  addField(lines, "Device", deviceName || Device.brand);
  addField(lines, "Device codes", deviceCodes.join(", "));
  addField(lines, "Device type", DEVICE_TYPE_NAMES[deviceType] || UNKNOWN_VALUE);
  addField(lines, "Physical device", formatBoolean(Device.isDevice));
  addField(lines, "Device year class", Device.deviceYearClass);
  addField(lines, "Interface", buildInterfaceName());
  addField(lines, "CPU architectures", Device.supportedCpuArchitectures?.join(", "));
  addField(lines, "Device memory", formatBytes(Device.totalMemory));
  if (Platform.OS === "android") {
    addField(lines, "Android app memory limit", formatBytes(maxAppMemory));
  }
  addField(lines, "Device uptime", formatDuration(deviceUptime));

  lines.push("", "[Display and locale]");
  addField(lines, "Window", formatDisplayMetrics(windowMetrics));
  addField(lines, "Screen size", formatDisplayMetrics(screenMetrics));
  addField(lines, "Orientation", orientation);
  addField(lines, "Pixel ratio", Number(PixelRatio.get()).toFixed(2));
  addField(lines, "Font scale", Number(PixelRatio.getFontScale()).toFixed(2));
  addField(lines, "System locales", preferredLocaleTags);
  addField(lines, "System region", locale?.regionCode);
  addField(lines, "Text direction", locale?.textDirection);
  addField(lines, "Measurement / temperature", [locale?.measurementSystem, locale?.temperatureUnit].filter(Boolean).join(" / "));
  addField(
    lines,
    "Number separators",
    locale
      ? `decimal ${JSON.stringify(locale.decimalSeparator)}, grouping ${JSON.stringify(
          locale.digitGroupingSeparator
        )}`
      : null
  );
  addField(lines, "Calendar", calendar?.calendar);
  addField(lines, "24-hour clock", formatBoolean(calendar?.uses24hourClock));
  addField(lines, "First weekday", calendar?.firstWeekday);
  addField(lines, "Time zone", timeZone);
  addField(lines, "UTC offset", formatUtcOffset(now));

  return lines.join("\n");
};
