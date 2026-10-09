# Shopping Pause: release configuration

The native implementation is present in the release archive, including the Device Activity monitor, shield configuration and shield action extensions. The main app and all three extensions already have registered explicit App IDs. Entitlements request Family Controls and the shared App Group `group.com.sasarei.almostclean`.

The owner explicitly confirmed the Apple Family Controls Terms and Conditions in this conversation. **Get Entitlement was submitted successfully on 2026-10-09.** Apple displayed: “Thank you for your submission.” and said it will review the request and contact the account with a status update. The portal immediately updated Family Controls (Distribution) to **Assigned**, and the new Distribution capability became available.

## Completed release setup

Family Controls Distribution enabled and saved on all four App IDs. Four new App Store profiles contain the capability and shared App Group, verified after download. A manual Widget distribution profile was also created. The IPA export succeeded; codesign deep/strict validation passed. All five embedded profiles match their exact App IDs and have get-task-allow disabled; main app push environment is production. See `checks/ios-ipa-entitlements.json`.

## Validation and reproducible setup

1. Verify Family Controls distribution is enabled for the main App ID and all three ShoppingBlocker App IDs; verify their shared App Group.
2. Create App Store distribution profiles for all targets, using the existing Apple Distribution certificate. Keep the widget profile and push notification capability.
3. Download and install profiles; export the completed archive with explicit profile mappings if automatic signing cannot access an Xcode account.
4. Inspect the signed IPA's embedded profile entitlements on every target, including Family Controls and App Groups.
5. Validate on a physical release iPhone: individual Screen Time authorization, selected app shields, cancellation, goal progress, single-app 30-minute pass, expiry while Almost is closed, permission revocation and reauthorization. The user explicitly authorized installation and launch on iPhone Рей in this conversation.

Shopping Pause uses individual device management. Selection tokens stay in the local App Group. The implementation does not request category or website restrictions, does not read app usage history, and does not forward Screen Time selection tokens to advertising systems.

The initial IPA export failed because store profiles lacked Family Controls and extension distribution profiles were absent; the final export now succeeds with regenerated profiles. Removing the entitlement or extensions would disable the requested feature and is not an acceptable release fix.

## Physical test

On iPhone Рей (iPhone Air, iOS 27.2), the signed Release build 128 restored existing authorization and ten selected shopping apps. A EUR 1 test goal started with EUR 0 credit. Amazon displayed the Almost Savings Screen Time shield; Close returned to Home. The shield Close label had poor contrast on this OS, so its color pair has been corrected in source and iOS build 129 is signed, uploaded and installed; its readable Close label and action passed a physical retest. See `checks/physical-shopping-pause.md` for actual coverage and pending stop/expiry checks. No savings history entries were added.
