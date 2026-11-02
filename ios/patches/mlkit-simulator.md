# ML Kit on Apple Silicon Simulator

`pod install` adds a simulator-only preparation phase to `Pods-Almost`. The phase
copies ML Kit frameworks into the current configuration's build products and
changes the copies' arm64 `LC_BUILD_VERSION.platform` fields from iOS to iOS
Simulator. The app searches these copies first only for `iphonesimulator`.

Original frameworks in `Pods` remain byte-identical. Device and archive builds
use those originals. The converter preserves instruction bytes, symbols, archive
offsets, x86 slices and bundled model resources. The prelinked OCR model object
without a platform load command remains unchanged. Unexpected platform commands
or malformed files fail the build instead of silently producing a partial copy.

This addresses the binary packaging limitation tracked in
[Google's issue](https://issuetracker.google.com/issues/178965151). The platform
relabeling approach is also used by the
[upstream Flutter ML Kit integration](https://github.com/flutter-ml/google_ml_kit_flutter/tree/develop/packages/google_mlkit_commons/ios/scripts).
Almost prepares separate copies so simulator and device builds do not mutate the
same SDK binary when running concurrently.

Run `npm run test:ios-lifecycle` for the converter regression checks. Generated
copies live with build intermediates and can be deleted with those intermediates.
No runtime OCR module, model or language is disabled by this build integration.
