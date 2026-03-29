#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(LiquidGlassNativeViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(cornerRadius, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(tintAlpha, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(strokeOpacity, NSNumber)
@end
