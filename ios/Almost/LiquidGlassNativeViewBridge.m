#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(NativeSwiftUISurfaceManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(cornerRadius, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(tintColorHex, NSString)
RCT_EXPORT_VIEW_PROPERTY(darkAppearance, BOOL)
RCT_EXPORT_VIEW_PROPERTY(tintOpacity, NSNumber)
@end

@interface RCT_EXTERN_MODULE(LiquidGlassNativeViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(cornerRadius, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(tintAlpha, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(strokeOpacity, NSNumber)
@end

@interface RCT_EXTERN_MODULE(NativeLiquidGlassButtonManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(enabled, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onPress, RCTBubblingEventBlock)
@end

@interface RCT_EXTERN_MODULE(NativeEdgeBackGestureManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(isRTL, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onEdgeBackProgress, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onBack, RCTBubblingEventBlock)
@end
