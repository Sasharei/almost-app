#import <React/RCTViewManager.h>
#import <React/RCTComponent.h>

@interface RCT_EXTERN_MODULE(NativeLiquidTabBarManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(items, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedKey, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectorOnly, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onTabPress, RCTBubblingEventBlock)
@end
