const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  ALMOST_RELEASE_SCOPE,
  FORBIDDEN_RELEASE_IDS,
  assertAlmostReleaseScope,
} = require("../src/analytics/releaseScope");

const rootDir = path.resolve(__dirname, "..");
const failures = [];
const fail = (message) => failures.push(message);
const assert = (condition, message) => {
  if (!condition) fail(message);
};
const read = (relativePath) =>
  fs.readFileSync(path.join(rootDir, relativePath), "utf8");

const appConfig = JSON.parse(read("app.json"));
const facebookPlugin = (appConfig?.expo?.plugins || []).find(
  (entry) => Array.isArray(entry) && entry[0] === "react-native-fbsdk-next"
);
const facebookOptions = facebookPlugin?.[1] || {};
assert(
  facebookOptions.autoLogAppEventsEnabled === false,
  "app.json must disable Meta auto event logging."
);
assert(
  facebookOptions.isAutoInitEnabled === true,
  "app.json must use native Meta auto-init as the single startup owner."
);

const readPlistBoolean = (source, key) => {
  const expression = new RegExp(
    `<key>${key}</key>\\s*<(true|false)\\s*\\/>`,
    "m"
  );
  return source.match(expression)?.[1] || null;
};

const iosSourcePlist = read("ios/Almost/Info.plist");
assert(
  readPlistBoolean(iosSourcePlist, "FacebookAutoLogAppEventsEnabled") === "false",
  "iOS Info.plist must disable FacebookAutoLogAppEventsEnabled."
);
assert(
  readPlistBoolean(iosSourcePlist, "FacebookAutoInitEnabled") === "true",
  "iOS Info.plist must keep native FacebookAutoInitEnabled."
);

const androidSourceManifest = read("android/app/src/main/AndroidManifest.xml");
const readAndroidMetaBoolean = (source, key) => {
  const expression = new RegExp(
    `<meta-data[^>]*android:name="${key}"[^>]*android:value="(true|false)"`,
    "m"
  );
  return source.match(expression)?.[1] || null;
};
assert(
  readAndroidMetaBoolean(
    androidSourceManifest,
    "com.facebook.sdk.AutoLogAppEventsEnabled"
  ) === "false",
  "Android manifest must disable Meta auto event logging."
);
assert(
  readAndroidMetaBoolean(androidSourceManifest, "com.facebook.sdk.AutoInitEnabled") ===
    "true",
  "Android manifest must keep native Meta auto-init."
);

const validateFinalPlist = (plistPath) => {
  if (!plistPath) return;
  if (!fs.existsSync(plistPath)) {
    fail(`IOS_ARCHIVE_INFO_PLIST does not exist: ${plistPath}`);
    return;
  }
  const result = spawnSync(
    "plutil",
    ["-extract", "FacebookAutoLogAppEventsEnabled", "raw", plistPath],
    { encoding: "utf8" }
  );
  assert(
    result.status === 0 && String(result.stdout).trim() === "false",
    "Final iOS archive Info.plist enables Meta auto event logging."
  );
};

const validateMergedManifest = (manifestPath) => {
  if (!manifestPath) return;
  if (!fs.existsSync(manifestPath)) {
    fail(`ANDROID_MERGED_MANIFEST does not exist: ${manifestPath}`);
    return;
  }
  const source = fs.readFileSync(manifestPath, "utf8");
  assert(
    readAndroidMetaBoolean(
      source,
      "com.facebook.sdk.AutoLogAppEventsEnabled"
    ) === "false",
    "Merged Android manifest enables Meta auto event logging."
  );
};

validateFinalPlist(process.env.IOS_ARCHIVE_INFO_PLIST);
validateMergedManifest(process.env.ANDROID_MERGED_MANIFEST);

try {
  assertAlmostReleaseScope({
    iosBundleId: appConfig?.expo?.ios?.bundleIdentifier,
    iosAppStoreId: String(appConfig?.expo?.ios?.appStoreUrl || "").match(
      /id(\d+)/
    )?.[1],
    androidPackage: appConfig?.expo?.android?.package,
    tiktokAndroidAppId: ALMOST_RELEASE_SCOPE.tiktokAndroidAppId,
    tiktokIosAppId: ALMOST_RELEASE_SCOPE.tiktokIosAppId,
  });
} catch (error) {
  fail(error.message);
}

const releaseConfigSources = [
  "app.json",
  "analytics.js",
  "ios/Almost/Info.plist",
  "ios/Almost.xcodeproj/project.pbxproj",
  "android/app/build.gradle",
  "android/app/src/main/AndroidManifest.xml",
].map((relativePath) => `${relativePath}\n${read(relativePath)}`);
FORBIDDEN_RELEASE_IDS.forEach((forbiddenId) => {
  assert(
    !releaseConfigSources.some((source) => source.includes(forbiddenId)),
    `Forbidden Almost Crossed ID ${forbiddenId} is present in release config.`
  );
});

if (failures.length) {
  failures.forEach((message) => console.error(`[FAIL] ${message}`));
  process.exit(1);
}
console.log(
  "[OK] Native analytics config matches app.json (Meta auto-log off, native auto-init on, Almost release scope asserted)."
);
