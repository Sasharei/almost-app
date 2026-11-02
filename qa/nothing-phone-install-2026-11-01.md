# Nothing Phone installation, 1 November 2026

Installed the fresh ARM64 release APK on the connected Nothing A059 running Android 16. Package `com.sasarei.almostclean`, version 8.0.2, versionCode 136, targetSdk 36. Almost was absent before installation; the existing Almost Crossed package was preserved. The requested Almost installation remains on the phone for manual QA.

- `app:assembleRelease`: PASS (4m18s), Sentry uploads disabled and Crashlytics mapping upload excluded.
- APK signature verification: PASS. APK SHA256 `5b89e9d9588bb277d74677556bc5d29aa2c59618bff50eda6f0a8ede0899e80a`, 83,734,004 bytes. Bundled App.js source-map content matches current workspace App.js exactly.
- Explicit USB-targeted `adb install -r`: Success.
- Installed version confirmed by Package Manager: 8.0.2 (136).
- `am start -W`: Status ok, COLD launch, MainActivity; reported TotalTime 1112 ms. This is a launch observation, not a general performance benchmark.
- Application process present after launch. Its initial process-specific log contained no FATAL EXCEPTION or OutOfMemoryError.
- The phone disconnected from USB before the foreground/first-screen visual check completed. No visual, theme, flicker, purchase or E2E pass is claimed. No onboarding choices or runtime permissions were accepted on the user's behalf.
- Fresh functional parity check: PASS (267 contracts, 2314 fragments, 45 reachability patterns). Localization: PASS in all 12 languages. Themes: PASS for light/dark/PRO and six accents. No source/UI changes in this installation task; visual theme review was not performed.

Cleanup complete: task logs, local APK/profiles, task-new build intermediates, generated bundles, dedicated temporary directory and pointer were removed. The requested phone installation remains. Crash mapping/native symbols/source maps are retained for subsequent manual-test crash investigation; shared pre-existing outputs/caches and other projects are preserved.
