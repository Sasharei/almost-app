#import <React/RCTViewManager.h>
#import <React/RCTComponent.h>

@interface RCT_EXTERN_MODULE(NativeLiquidTabBarManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(items, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedKey, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectorOnly, BOOL)
RCT_EXPORT_VIEW_PROPERTY(isDarkTheme, BOOL)
RCT_EXPORT_VIEW_PROPERTY(activeColorHex, NSString)
RCT_EXPORT_VIEW_PROPERTY(inactiveColorHex, NSString)
RCT_EXPORT_VIEW_PROPERTY(surfaceColorHex, NSString)
RCT_EXPORT_VIEW_PROPERTY(borderColorHex, NSString)
RCT_EXPORT_VIEW_PROPERTY(badgeTextColorHex, NSString)
RCT_EXPORT_VIEW_PROPERTY(onTabPress, RCTBubblingEventBlock)
@end
