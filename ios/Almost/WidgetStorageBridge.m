#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetStorage, NSObject)
RCT_EXTERN_METHOD(setWidgetData:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(hasInstalledHomeWidget:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
