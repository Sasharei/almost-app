package expo.modules.rncompatibility

import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags as NativeFeatureFlags

/**
 * A compatibility helper of
 * `com.facebook.react.config.ReactFeatureFlags` and
 * `com.facebook.react.internal.featureflags.ReactNativeFeatureFlags`
 */
object ReactNativeFeatureFlags {
  val enableBridgelessArchitecture: Boolean by lazy {
    runCatching {
      val method =
        NativeFeatureFlags::class.java.methods.firstOrNull {
          it.name == "enableBridgelessArchitecture" && it.parameterCount == 0
        }
      if (method != null) {
        method.invoke(null) as? Boolean ?: false
      } else {
        false
      }
    }.getOrDefault(false)
  }
}
