# MLImage simulator compatibility and full-app gradient review

## Change

`ios/patches/mlkit-simulator.rb` is applied by the Podfile. It removes the generated simulator arm64 exclusion and adds a simulator-only preparation phase and framework search location. `mlkit-simulator.py` copies the original ML Kit frameworks to the current build-products directory, then changes only the copies' arm64 LC_BUILD_VERSION platform markers. Instructions, symbols, offsets, x86 slices and OCR resources are preserved. The prelinked model object without a platform marker is copied unchanged. Malformed/unsupported inputs fail explicitly.

The original Pods binaries are never relabeled. All 11 original framework root files remained SHA-256 identical before/after pod installation, simulator build and runtime OCR. Release/iphoneos build settings resolve the original frameworks and contain no simulator-copy search path. No SDK/module/model/language or application feature was removed, and Android configuration was not changed.

## Verification

- Selected stable Xcode: 27.2 (27B52).
- `pod install`: pass. Simulator destinations now include the task's native arm64 iPhone 17 / iOS 26.5.
- Full application Debug build, installation and launch: pass using Almost.xcworkspace / Almost scheme. This run used the actual app entry and native modules, with no component-preview replacement or OCR stub.
- Build used ARCHS=arm64 and CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES=YES. An existing glob/minimatch incompatibility in React Native codegen required a temporary process-local glob adapter for pod installation/build. No dependency/security adapter source was changed for that unrelated issue; the temporary adapter is removed during cleanup.
- Real native OCR in the running application read the generated fixture exactly as `Transfer complete` and `Amount USD 123.45`, with two text blocks.
- Six binary-converter regressions pass: platform-only differences, universal/BSD archives and x86 preservation, platform-neutral model preservation, malformed/unsupported input rejection, immutable originals with cache reuse, device invocation doing no work. Included in `npm run test:ios-lifecycle` and `npm run verify`.
- Baseline/final functional parity, localization (all 12 languages and native resources) and themes (light/dark/PRO, six accents): pass.
- `npm run verify`: pass, including attribution/native analytics, security, types, lint, backend and runtime parity. Existing lint warnings and the size growth warning remain. Size checking used the existing release AAB, not this Debug build.

## Native visual and UX review

Full app on iPhone 17, iOS 26.5:

- Light/dark Today and Profile, scrolling cards/avatar content beneath the status edge: continuous fade, readable status icons and upper controls, no reversed-opacity stripe or abrupt blur boundary.
- PRO Indigo/Aqua Today under scrolling: same result. All six PRO accents reviewed in the real accent-picker modal and underlying Profile background. PRO access was a local in-memory presentation fixture in this disposable simulator; no store purchase or entitlement mutation was performed.
- Notification prompt, shopping-pause introduction, PRO picker, their dismissal paths and return to Today: verified. Existing modal dimming, navigation and relevant actions remain available.

Apple Design, the five UX principles and all seven UX laws reviewed within the affected scope. No new UI, actions or copy were introduced by this build fix. Existing hierarchy, targets, grouping, progress and primary/secondary actions are preserved. Localization is unchanged by this task. No release performance improvement is claimed.

Limits: no physical-device/release runtime, actual purchase/restore, all-script OCR corpus, iPad, RTL or enlarged-text visual validation in this follow-up. Simulator binary relabeling is a compatibility integration, not evidence of upstream native simulator support. The earlier component review remains in status-bar-gradient-2026-11-02.md.

Cleanup complete: stopped the task Metro server and debugger connections, removed the task simulator and its application/fixture/Premium-preview state, and deleted the dedicated temporary directory with Debug build products, adapted framework copies, result bundle, raw logs, OCR image, scripts and compiler caches. Original Pods, shared generated inputs, existing devices, signing data and other tasks were preserved. Only maintained source/tests, build integration documentation and concise QA summaries remain.
