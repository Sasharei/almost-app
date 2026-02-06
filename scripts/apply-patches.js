#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const patches = [
  {
    src: 'patches/expo/android/src/main/java/expo/modules/ExpoReactHostFactory.kt',
    dest: 'node_modules/expo/android/src/main/java/expo/modules/ExpoReactHostFactory.kt',
  },
  {
    src: 'patches/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsPlugin.kt',
    dest: 'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsPlugin.kt',
  },
  {
    src: 'patches/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsExtension.kt',
    dest: 'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/src/main/kotlin/expo/modules/plugin/ExpoAutolinkingSettingsExtension.kt',
  },
  {
    src: 'patches/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/src/main/kotlin/expo/modules/plugin/AutolinkigCommandBuilder.kt',
    dest: 'node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin-shared/src/main/kotlin/expo/modules/plugin/AutolinkigCommandBuilder.kt',
  },
  {
    src: 'patches/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/gradle/ExpoGradleHelperExtension.kt',
    dest: 'node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/gradle/ExpoGradleHelperExtension.kt',
  },
  {
    src: 'patches/expo/scripts/autolinking.gradle',
    dest: 'node_modules/expo/scripts/autolinking.gradle',
  },
  {
    src: 'patches/expo-file-system/ios/FileSystemModule.swift',
    dest: 'node_modules/expo-file-system/ios/FileSystemModule.swift',
  },
  {
    src: 'patches/expo-constants/scripts/get-app-config-android.gradle',
    dest: 'node_modules/expo-constants/scripts/get-app-config-android.gradle',
  },
  {
    src: 'patches/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/BundleHermesCTask.kt',
    dest: 'node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/BundleHermesCTask.kt',
  },
  {
    src: 'patches/react-native-gesture-handler/android/build.gradle',
    dest: 'node_modules/react-native-gesture-handler/android/build.gradle',
  },
  {
    src: 'patches/react-native-svg/android/build.gradle',
    dest: 'node_modules/react-native-svg/android/build.gradle',
  },
  {
    src: 'patches/react-native-fbsdk-next/android/src/main/java/com/facebook/reactnative/androidsdk/FBAppEventsLoggerModule.java',
    dest: 'node_modules/react-native-fbsdk-next/android/src/main/java/com/facebook/reactnative/androidsdk/FBAppEventsLoggerModule.java',
  },
  {
    src: 'patches/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/JavaScriptValue.kt',
    dest: 'node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/JavaScriptValue.kt',
  },
  {
    src: 'patches/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/decorators/CSSProps.kt',
    dest: 'node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/decorators/CSSProps.kt',
  },
  {
    src: 'patches/expo-modules-core/android/src/main/java/expo/modules/rncompatibility/ReactNativeFeatureFlags.kt',
    dest: 'node_modules/expo-modules-core/android/src/main/java/expo/modules/rncompatibility/ReactNativeFeatureFlags.kt',
  },
  {
    src: 'patches/expo-modules-core/src/sweet/setUpJsLogger.fx.ts',
    dest: 'node_modules/expo-modules-core/src/sweet/setUpJsLogger.fx.ts',
  },
  {
    src: 'patches/expo-modules-core/common/cpp/fabric/ExpoViewComponentDescriptor.cpp',
    dest: 'node_modules/expo-modules-core/common/cpp/fabric/ExpoViewComponentDescriptor.cpp',
  },
  {
    src: 'patches/expo-modules-core/ios/JSI/EXJSIConversions.mm',
    dest: 'node_modules/expo-modules-core/ios/JSI/EXJSIConversions.mm',
  },
  {
    src: 'patches/react-native/ReactCommon/jsitooling/React-jsitooling.podspec',
    dest: 'node_modules/react-native/ReactCommon/jsitooling/React-jsitooling.podspec',
  },
  {
    src: 'patches/react-native/ReactCommon/react/runtime/platform/ios/React-RuntimeApple.podspec',
    dest: 'node_modules/react-native/ReactCommon/react/runtime/platform/ios/React-RuntimeApple.podspec',
  },
  {
    src: 'patches/react-native/ReactAndroid/src/main/java/com/facebook/react/internal/featureflags/ReactNativeFeatureFlags.kt',
    dest: 'node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/internal/featureflags/ReactNativeFeatureFlags.kt',
  },
  {
    src: 'patches/@sentry/react-native/ios/RNSentry.mm',
    dest: 'node_modules/@sentry/react-native/ios/RNSentry.mm',
  },
  {
    src: 'patches/@sentry/react-native/RNSentry.podspec',
    dest: 'node_modules/@sentry/react-native/RNSentry.podspec',
  },
];

let applied = 0;

for (const { src, dest } of patches) {
  const absoluteSrc = path.join(projectRoot, src);
  const absoluteDest = path.join(projectRoot, dest);

  if (!fs.existsSync(absoluteSrc)) {
    console.warn(`[patches] Source file missing: ${src}`);
    continue;
  }

  const destDir = path.dirname(absoluteDest);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(absoluteSrc, absoluteDest);
  applied += 1;
}

console.log(`[patches] Applied ${applied} custom patches.`);
