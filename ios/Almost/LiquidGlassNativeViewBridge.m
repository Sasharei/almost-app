#import <React/RCTViewManager.h>

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
