# Status bar gradient refinement

The shared StatusGlass overlay now uses a monotonic smoothstep opacity falloff. The former safe-edge stop multiplied opacity by 0.55 and the following stop increased it again, creating a visible stripe. The fade extends 44 dp below the Android status inset and 24 pt on iOS, previously capped at 12 on both platforms. Solid mode keeps the system icon backing opaque and skips the covered blur passes, eliminating their hard lower boundary. Theme backgrounds and existing icon styles are preserved.

Scope: decorative system chrome on the main app, onboarding and shared modal overlays. Existing primary/secondary screen actions, loading/empty/error/success states, navigation, gestures, Back/cancel, modal dimming, hit areas and handlers are unchanged. The layer retains pointerEvents="none". Apple Design, the five UX principles and seven UX laws were reviewed within this scope. No new text, controls or animations were added; reduced-motion behavior is unchanged.

Verification:

- Baseline and final functional parity: pass, 268 contracts at baseline.
- Localization: pass, all 12 dictionaries plus native permissions and shortcut checks. This task changes no user-facing strings.
- Themes: pass, light/dark/PRO with six accents.
- Full `npm run verify`: pass, including analytics/native attribution, security, types, lint and backend tests. Existing lint warnings and the app-size growth warning remain. Size validation used the existing release AAB, not the temporary Debug APK.
- Executed the actual component through a temporary Babel/React element harness for Android and iOS with 24/44/62 safe insets and solid/translucent variants: ordered positions, non-increasing opacity, opaque solid safe area and transparent endpoint all pass.
- Android API 36, 1080x2400, ARM64 Debug: build and full-app launch pass. Inspected light/dark Today, content scrolling beneath the status edge and notification-modal dismissal. System icons remain readable, the fade is continuous, and the existing upper controls remain available.
- Android native component stand: visually inspected light/dark and all six actual PRO palettes over scrolled content. PRO coverage uses the component stand, not a purchased entitlement or a full-app Premium flow.
- iPhone 17, iOS 26.5: the exact current StatusGlass component was rendered in Expo Go SDK 54 and inspected during scrolling in light/dark and all six PRO palettes (indigo, emerald, sunset, gold, violet, aqua). This is native component evidence, not a full iOS app pass.
- Stable Xcode selected: 27.2 (27B52). Full iOS simulator linking is blocked by the existing device-only MLImage framework. Earlier build attempts also exposed simulator architecture settings and the current glob/minimatch codegen incompatibility. Android build used a temporary process-local codegen glob adapter; no dependency or native project source was changed for these workarounds.

Coverage limits: no full iOS application, iPad/tablet, physical-device, enlarged-text, RTL, production/release performance, attribution-install or purchase-path runtime validation. No measured performance improvement is claimed. Shared generated native outputs used by concurrent work are preserved; this task does not clean other tasks' caches or build state.

Cleanup complete: removed the temporary component entry, proxy/Metro processes, standalone iOS/Android test devices and their fixture data, downloaded Expo Go, screenshots, raw logs, failed result bundles, temporary Debug APK/CMake outputs and the dedicated temporary directory. Shared pre-existing native generation/build inputs are retained for concurrent work. Only this concise verification summary is retained.

Follow-up: the MLImage simulator link blocker was repaired and the full native iOS application was built, launched and visually reviewed. Native OCR also passed. See [MLImage full-app follow-up](mlimage-ios-simulator-2026-11-02.md) for exact coverage and remaining limits.
