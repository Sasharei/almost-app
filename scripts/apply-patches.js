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
    src: 'patches/expo-constants/scripts/get-app-config-android.gradle',
    dest: 'node_modules/expo-constants/scripts/get-app-config-android.gradle',
  },
  {
    src: 'patches/expo-blur/android/src/main/java/expo/modules/blur/ExpoBlurView.kt',
    dest: 'node_modules/expo-blur/android/src/main/java/expo/modules/blur/ExpoBlurView.kt',
  },
  {
    src: 'patches/@react-native-community/blur/android/src/main/java/com/reactnativecommunity/blurview/BlurViewManagerImpl.java',
    dest: 'node_modules/@react-native-community/blur/android/src/main/java/com/reactnativecommunity/blurview/BlurViewManagerImpl.java',
  },
  {
    src: 'patches/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/BundleHermesCTask.kt',
    dest: 'node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/BundleHermesCTask.kt',
  },
  {
    src: 'patches/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/GenerateAutolinkingNewArchitecturesFileTask.kt',
    dest: 'node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/GenerateAutolinkingNewArchitecturesFileTask.kt',
  },
  {
    src: 'patches/react-native-gesture-handler/android/build.gradle',
    dest: 'node_modules/react-native-gesture-handler/android/build.gradle',
  },
  {
    src: 'patches/react-native-reanimated/android/build.gradle',
    dest: 'node_modules/react-native-reanimated/android/build.gradle',
  },
  {
    src: 'patches/react-native-reanimated/android/CMakeLists.txt',
    dest: 'node_modules/react-native-reanimated/android/CMakeLists.txt',
  },
  {
    src: 'patches/react-native-worklets/android/build.gradle',
    dest: 'node_modules/react-native-worklets/android/build.gradle',
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
    src: 'patches/react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake',
    dest: 'node_modules/react-native/ReactAndroid/cmake-utils/ReactNative-application.cmake',
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
    src: 'patches/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/share/ShareModule.kt',
    dest: 'node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/share/ShareModule.kt',
  },
  {
    src: 'patches/react-native/Libraries/Share/Share.js',
    dest: 'node_modules/react-native/Libraries/Share/Share.js',
  },
  {
    src: 'patches/react-native/Libraries/Text/TextNativeComponent.js',
    dest: 'node_modules/react-native/Libraries/Text/TextNativeComponent.js',
  },
  {
    src: 'patches/react-native/ReactAndroid/src/main/java/com/facebook/react/views/view/ReactViewGroup.kt',
    dest: 'node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/views/view/ReactViewGroup.kt',
  },
];

const contentPatches = [
  {
    dest: 'node_modules/metro/src/Assets.js',
    replacements: [
      [
        'var _imageSize = _interopRequireDefault(require("image-size"));',
        'var _imageSize = _interopRequireWildcard(require("image-size"));',
      ],
      [
        'function isAssetTypeAnImage(type) {',
        '(0, _imageSize.disableTypes)(["heif", "icns", "jxl", "jxl-stream"]);\nfunction isAssetTypeAnImage(type) {',
      ],
      [
        '    : assetInfo.files[0];',
        '    : _fs.default.readFileSync(assetInfo.files[0]);',
      ],
    ],
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

for (const { dest, replacements } of contentPatches) {
  const absoluteDest = path.join(projectRoot, dest);
  let content = fs.readFileSync(absoluteDest, 'utf8');

  for (const [before, after] of replacements) {
    if (content.includes(after)) {
      continue;
    }
    if (!content.includes(before)) {
      throw new Error(`[patches] Expected content missing in ${dest}: ${before}`);
    }
    content = content.replace(before, after);
  }

  fs.writeFileSync(absoluteDest, content);
  applied += 1;
}

console.log(`[patches] Applied ${applied} custom patches.`);
