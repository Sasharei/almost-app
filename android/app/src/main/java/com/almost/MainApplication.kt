package com.sasarei.almostclean

import android.app.Application
import android.content.res.Configuration
import android.util.Log

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.views.view.setEdgeToEdgeFeatureFlagOn
import com.facebook.soloader.SoLoader
import com.facebook.FacebookSdk
import com.google.firebase.crashlytics.FirebaseCrashlytics

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper
import com.sasarei.almostclean.share.LevelSharePackage
import com.sasarei.almostclean.widget.WidgetStoragePackage
import java.io.IOException

class MainApplication : Application(), ReactApplication {
  companion object {
    @Volatile
    private var runtimeNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

    @JvmStatic
    val isRuntimeNewArchEnabled: Boolean
      get() = runtimeNewArchEnabled
  }

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
              add(LevelSharePackage())
              add(WidgetStoragePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean
            get() = runtimeNewArchEnabled
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  private fun setCrashlyticsBooleanKey(key: String, value: Boolean) {
    runCatching {
      FirebaseCrashlytics.getInstance().setCustomKey(key, value)
    }
  }

  private fun recordFallbackException(error: Throwable) {
    runCatching {
      FirebaseCrashlytics.getInstance().recordException(
          RuntimeException("RN new architecture init failed; switched to legacy runtime", error)
      )
    }
  }

  private fun initializeMetaAttribution() {
    runCatching {
      // RevenueCat sends subscription Trial Started -> StartTrial and purchase/renewal events -> Subscribe.
      // Keep the Meta SDK available for attribution identifiers without client-side revenue auto logging.
      FacebookSdk.setAutoLogAppEventsEnabled(false)
      FacebookSdk.setAdvertiserIDCollectionEnabled(true)
      FacebookSdk.fullyInitialize()
      if (BuildConfig.DEBUG) {
        Log.d(
            "AttributionInit",
            "Meta SDK initialized; autoLogAppEvents=false advertiserIDCollection=true"
        )
      }
    }.onFailure { error ->
      if (BuildConfig.DEBUG) {
        Log.w("AttributionInit", "Meta SDK initialization failed.", error)
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    initializeMetaAttribution()
    setCrashlyticsBooleanKey("rn_new_arch_build_flag", BuildConfig.IS_NEW_ARCHITECTURE_ENABLED)
    setCrashlyticsBooleanKey("rn_new_arch_runtime_before_init", runtimeNewArchEnabled)
    setCrashlyticsBooleanKey("rn_new_arch_fallback_triggered", false)
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    try {
      SoLoader.init(this, OpenSourceMergedSoMapping)
    } catch (e: IOException) {
      throw RuntimeException(e)
    }
    if (runtimeNewArchEnabled) {
      // Keep TurboModules/Fabric, but force bridge mode to avoid null root view crashes on startup.
      try {
        DefaultNewArchitectureEntryPoint.load(
            turboModulesEnabled = true,
            fabricEnabled = true,
            bridgelessEnabled = false
        )
      } catch (t: Throwable) {
        runtimeNewArchEnabled = false
        setCrashlyticsBooleanKey("rn_new_arch_fallback_triggered", true)
        setCrashlyticsBooleanKey("rn_new_arch_runtime_after_init", runtimeNewArchEnabled)
        recordFallbackException(t)
        Log.e(
            "MainApplication",
            "Failed to initialize React Native New Architecture, falling back to legacy runtime.",
            t
        )
      }
    } else {
      setCrashlyticsBooleanKey("rn_new_arch_runtime_after_init", runtimeNewArchEnabled)
    }
    if (BuildConfig.IS_EDGE_TO_EDGE_ENABLED) {
      setEdgeToEdgeFeatureFlagOn()
    }
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
