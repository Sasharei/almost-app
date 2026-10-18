# Physical iPhone Air layout fix installation — 2026-10-17

- Fresh signed Release: Almost Savings 8.0.1 (135), com.sasarei.almostclean, arm64 iPhoneOS.
- Device: physical iPhone Air (iPhone Рей), UDID ending 1E40401C. Updated in place from build 134; no uninstall/data reset.
- Built with xcodebuild workspace ios/Almost.xcworkspace, scheme Almost, configuration Release, destination physical iPhone Air, dedicated task DerivedData, jobs 8, automatic provisioning and CURRENT_PROJECT_VERSION=135 override. BUILD SUCCEEDED. No source version setting changed.
- Confirmed both FAB-sized right offsets absent before build. Captured hashes of App.js, historyDecisionRollback.js and AppDelegate.swift remained identical after build.
- codesign --verify --deep --strict: PASS. Embedded JS bundle: 14,501,686 bytes, independent of Metro.
- devicectl installation: PASS. Launch with --terminate-existing: PASS. Installed app inventory reports 8.0.1 (135). Process list confirms Almost.app/Almost running (PID 30995).
- No application source or user-facing text changed by this install task. Functional parity/localization/theme checks passed in the preceding layout fix; not rerun solely for installation. No visual theme or full device functional verification claimed; user is checking the restored layout.
- A precompiled-header RCTDeprecation diagnostic and build-phase warnings appeared; build recovered and succeeded. No unresolved build failure.
- Cleanup: removed /tmp/almost-air-layout-install.X15wQh with task DerivedData, build products, caches and raw logs. Retained five release dSYMs in qa/release-symbols/ios-8.0.1-135-air-2026-10-17-layout-restored.tar.gz for crash symbolication. App left open. Other tasks' processes/artifacts and user data preserved.

Build provenance:

```json
{
  "bundle_sha256": "6cb03234027e620d88f2707f3ec2a8dc5c22ca22695b779a802a1dde270c1810",
  "app_binary_sha256": "b67d346074f225cb0a49a597c9a68ff654e5886688bf2ab46cff16c9268eeb06",
  "binary_uuid": "UUID: 3B904BDF-3351-30EB-8D09-028501B7B3EB (arm64) /tmp/almost-air-layout-install.X15wQh/build/Build/Products/Release-iphoneos/Almost.app/Almost",
  "sources": {
    "App.js": "6fe1cb5aa35ea455e783424e22e83907db6af60005a81b4ffd23eec0d4118065",
    "src/utils/historyDecisionRollback.js": "ca17bfe0cbac549098de313c6938ef63f3a9eae50735ac3162d4b01ca1967bf0",
    "ios/Almost/AppDelegate.swift": "a08974c84c97dc3c688e2ddb56671ad70c647dcd9dfd8bf1ca065517a67e3d83"
  }
}
```
