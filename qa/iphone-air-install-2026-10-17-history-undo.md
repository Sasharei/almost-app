# Physical iPhone Air install — 2026-10-17

- Device: physical iPhone Air (iPhone Рей), UDID ending 1E40401C.
- Built current working tree with `xcodebuild -workspace ios/Almost.xcworkspace -scheme Almost -configuration Release -destination id=<physical iPhone Air> -derivedDataPath <task-temp>/build -jobs 4 -allowProvisioningUpdates CURRENT_PROJECT_VERSION=134 build`: BUILD SUCCEEDED.
- Version: 8.0.1 (134), bundle ID `com.sasarei.almostclean`, iPhoneOS arm64. Source version settings were not edited.
- `codesign --verify --deep --strict`: PASS. Embedded Hermes JavaScript bundle: 14,501,918 bytes; no Metro server required.
- Main executable UUID: 83D8880F-C4BF-35F5-A93A-9368CDD71A6E.
- Source hashes captured during native compilation matched after build, including App.js and the history-deletion fix.
- Installed in place with `devicectl device install app`: PASS. No uninstall or app-data reset.
- `devicectl device process launch --terminate-existing`: PASS. Device app inventory confirms installed 8.0.1 (134).
- No app source/UI/text changed during this installation task; functional parity, localization and theme gates passed during the preceding fix. No visual theme or full functional device test is claimed; the user will verify the app.
- Build emitted warnings and a precompiled-header RCTDeprecation diagnostic, then completed successfully. No unresolved build failure.
- Cleanup: removed task-specific DerivedData, build products, compiler caches, temporary files and raw build logs under `/tmp/almost-air-install.2xS97c`. Preserved the app and four extension dSYMs in `qa/release-symbols/ios-8.0.1-134-air-2026-10-17-history-undo.tar.gz` for crash symbolication of this installed Release. No other task's processes or artifacts were touched. App remains open for the user.

Build provenance:

```json
{
  "bundle_sha256": "0fb1637246fb26364b233ce8216e7937af9c89dc2f48754aa5a9f8647189293d",
  "app_binary_sha256": "2615a367dd759197877dd4327863bd4e730a540940bed9b00d75958f2f344cc5",
  "sources": {
    "App.js": "8604bfe9b0164eb9da71f89a081dbb06d2d3a27333997ad35a644d3e5b9cc211",
    "src/utils/historyDecisionRollback.js": "ca17bfe0cbac549098de313c6938ef63f3a9eae50735ac3162d4b01ca1967bf0",
    "ios/Almost/AppDelegate.swift": "a08974c84c97dc3c688e2ddb56671ad70c647dcd9dfd8bf1ca065517a67e3d83"
  }
}
```
