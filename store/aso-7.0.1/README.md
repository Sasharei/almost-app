# Almost 7.0.1 ASO pack

This folder contains localized App Store and Google Play metadata plus the refreshed 7.0.1 visual system.

## Deliverables

- `copy/locales.json`: source copy for all 11 in-app locales.
- `exports/app-store-metadata.csv`: App Store fields with locale mapping.
- `exports/google-play-metadata.csv`: Google Play fields with locale mapping.
- `exports/google-play-release-notes.txt`: Play Console language-tag format.
- `visuals/app-store/iphone-6.9`: six 1290 x 2796 screenshots per source locale.
- `visuals/app-store/ipad-13`: six 2048 x 2732 screenshots per source locale.
- `visuals/google-play/phone`: six 1080 x 1920 screenshots per source locale.
- `visuals/google-play/feature-graphic.jpg`: 1024 x 500 feature graphic.
- `visuals/google-play/icon.png`: 512 x 512 Play Store icon.
- `validation-report.json`: metadata limits and image-dimension validation.

## Locale handling

The app has 11 source locales. App Store Connect provides one Arabic metadata localization, so `ar-sa` and `ar-ae` are kept as separate reviewed source sets but both map to `ar`. Google Play also uses one Arabic main-store localization; choose the market wording you want as the shared upload, or use country-specific custom store listings.

## Rebuild

Run with the bundled Codex Python runtime, which includes Pillow:

```sh
/Users/sasarei/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  store/aso-7.0.1/scripts/build_pack.py
```

The screenshot copy is read directly from the app's `premiumStory*` localization keys, so future dictionary changes flow into the visuals without duplicating translation strings.

## Upload notes

- Apple accepts one to ten screenshots per localization. The pack uses a current 6.9-inch accepted size and includes the required 13-inch iPad set because the app supports iPad.
- Google Play receives the 1080 x 1920 phone set, the 1024 x 500 feature graphic, and the 512 x 512 icon.
- The Google Play feature graphic intentionally contains no embedded copy so one master can be used across locales and survive Play surface crops.
- The visual renders use the actual 7.0.1 Premium Stories artwork and the localized copy shown by the app. Before upload, compare at least the first three frames with a release-build device capture; store assets must match the shipped experience.

## Source references

- Apple screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Apple metadata limits: https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- Google Play preview assets: https://support.google.com/googleplay/android-developer/answer/9866151
- Google Play store listing limits: https://support.google.com/googleplay/android-developer/answer/9859152
