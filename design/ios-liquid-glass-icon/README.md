# Almost native Liquid Glass icon

Editable source: `assets/AlmostGlass.icon`. Open in Apple Icon Composer. The synchronized native copy is `ios/Almost/AlmostGlass.icon`. After source edits, copy the full document to that location; Expo prebuild also copies it through `expo.ios.icon`.

Three visual planes: adaptive background, independent cyan vector halo, and transparent Almi holding the gold coin. The mascot and coin are one foreground image. Native glass groups enable specular lighting and subtle shadows, with 6% mascot translucency and 35% halo translucency. Background is pale blue-white by default and system dark in Dark appearance.

Almost Debug and Release select AlmostGlass, included in the Resources build phase. Existing PNG assets remain. Xcode generates legacy icon images from the native document.

## Verification

- Opened and inspected both groups and their enabled effects in Apple Icon Composer.
- Exported and visually reviewed Default, Dark, TintedDark and ClearLight with Apple's ictool. The PNGs here are native renderer previews, not device screenshots.
- actool compiled the icon and existing asset catalog for iPhone/iPad, minimum deployment 15.1, without warnings/errors. Metadata selects AlmostGlass. assetutil confirmed IconGroup and IconImageStack entries for light, dark and tintable appearances, plus legacy images.
- Xcode project parses and passes plutil lint. Source and native document copies match.
- Functional parity: passed, 243 contracts. Localization: passed, 12 supported languages; application text unchanged. Themes: passed, light/dark/pro and six PRO accents. In-app themes and interaction flows are unaffected.
- Full npm verify stopped at security audit: one critical backend dependency vulnerability. Widget, bank expenses, functional parity, analytics contract, native analytics config, attribution, cloud notifications, UI session, engagement and shopping blocker checks completed before failure. Later stages were not reached.
- No simulator, emulator or connected-device session launched. Home Screen motion, wallpaper interactions and installed device rendering remain unverified. No upload or publication.

## Foreground generation

Built-in image_gen, transparent background, current native icon as edit target. The AI-assisted extraction is not byte-identical segmentation. Its 1254px canvas is scaled by 0.817 in Icon Composer to match the original composition. No raster post-processing.

Exact prompt:

> Use case: background-extraction. Asset type: foreground PNG layer for native Apple Icon Composer app icon. Edit target: supplied current Almost icon. Remove only the white background and cyan glowing circular halo completely, leaving a genuinely transparent background. Preserve the blue fluffy cat holding gold dollar coin, expression, face, paws, tail, proportions, colors and fine details as faithfully as possible. Keep identical 1024x1024 square canvas and subject placement, including body running to bottom canvas edge. Do not redesign the cat, do not add glass effects, shine, shadows or a surrounding outline: native Icon Composer will provide dynamic lighting. Only background removal. No extra text.

The halo SVG recreates the existing cyan circular motif without baked glass lighting.
