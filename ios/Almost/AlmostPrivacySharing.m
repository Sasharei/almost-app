#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

// Keep the activity controller alive until UIKit has returned ownership of the
// app window. An activity's completion callback can precede its dismissal.
@interface AlmostPrivacyActivityController : UIActivityViewController
@property(nonatomic, copy) void (^onDismissed)(void);
@end
@implementation AlmostPrivacyActivityController
- (void)viewDidDisappear:(BOOL)animated
{
  [super viewDidDisappear:animated];
  if ((self.isBeingDismissed || self.presentingViewController == nil) && self.onDismissed) {
    self.onDismissed();
  }
}
@end

@interface AlmostPrivacySharing : NSObject <RCTBridgeModule, UIAdaptivePresentationControllerDelegate>
@property(nonatomic, strong) AlmostPrivacyActivityController *activityController;
@property(nonatomic, weak) UIWindow *ownerWindow;
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@property(nonatomic, strong) NSError *activityError;
@property(nonatomic, copy) NSDictionary *result;
@end

@implementation AlmostPrivacySharing
RCT_EXPORT_MODULE();
+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }

// The scene delegate owns the React window. Do not present from a temporary
// Alert window or from another scene's key window.
- (UIWindow *)applicationWindow
{
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class] ||
        (scene.activationState != UISceneActivationStateForegroundActive &&
         scene.activationState != UISceneActivationStateForegroundInactive)) continue;
    UIWindowScene *windowScene = (UIWindowScene *)scene;
    id<UIWindowSceneDelegate> delegate = (id<UIWindowSceneDelegate>)windowScene.delegate;
    if ([delegate respondsToSelector:@selector(window)] && delegate.window.rootViewController) return delegate.window;
    for (UIWindow *window in windowScene.windows) {
      if (window.isKeyWindow && window.windowLevel == UIWindowLevelNormal && window.rootViewController) return window;
    }
  }
  return nil;
}

- (void)cancelReactTouches:(UIView *)view
{
  // Toggling the React recognizer invokes its cancellation/reset path. Leave
  // native scroll recognizers, enabled states and content offsets untouched.
  for (UIGestureRecognizer *recognizer in view.gestureRecognizers) {
    NSString *name = NSStringFromClass(recognizer.class);
    if (recognizer.enabled && ([name isEqualToString:@"RCTSurfaceTouchHandler"] || [name isEqualToString:@"RCTTouchHandler"])) {
      recognizer.enabled = NO;
      recognizer.enabled = YES;
    }
  }
  for (UIView *child in view.subviews) [self cancelReactTouches:child];
}

- (void)finishDismissal
{
  if (!self.activityController) return;
  UIWindow *window = self.ownerWindow;
  NSDictionary *result = self.result ?: @{ @"action": @"dismissedAction" };
  RCTPromiseResolveBlock resolve = self.resolve;
  RCTPromiseRejectBlock reject = self.reject;
  NSError *activityError = self.activityError;
  self.activityController.onDismissed = nil;
  self.activityController.completionWithItemsHandler = nil;
  self.activityController = nil;
  self.ownerWindow = nil;
  self.resolve = nil;
  self.reject = nil;
  self.activityError = nil;
  self.result = nil;
  if (window && window.windowScene.activationState == UISceneActivationStateForegroundActive) {
    [self cancelReactTouches:window.rootViewController.view];
    // A system activity may have temporarily taken key-window ownership.
    BOOL anotherVisibleKeyWindow = NO;
    for (UIWindow *candidate in window.windowScene.windows) {
      if (candidate != window && candidate.isKeyWindow && !candidate.hidden) anotherVisibleKeyWindow = YES;
    }
    if (!window.isKeyWindow && !window.hidden && !anotherVisibleKeyWindow) [window makeKeyWindow];
  }
  if (activityError && reject) reject(@"E_SHARE_ACTIVITY", @"The request could not be shared", activityError);
  else if (resolve) resolve(result);
}

- (void)completeAfterDismissal
{
  AlmostPrivacyActivityController *controller = self.activityController;
  if (!controller) return;
  if (!controller.presentingViewController) { [self finishDismissal]; return; }
  __weak AlmostPrivacySharing *weakSelf = self;
  if (controller.isBeingDismissed) {
    [controller.transitionCoordinator animateAlongsideTransition:nil completion:^(id<UIViewControllerTransitionCoordinatorContext> context) {
      [weakSelf finishDismissal];
    }];
    // viewDidDisappear / presentationControllerDidDismiss also cover a
    // dismissal whose transition has already completed.
    return;
  }
  [controller dismissViewControllerAnimated:YES completion:^{ [weakSelf finishDismissal]; }];
}

- (void)presentationControllerDidDismiss:(UIPresentationController *)presentationController
{
  if (presentationController.presentedViewController == self.activityController) [self finishDismissal];
}

RCT_EXPORT_METHOD(share:(NSDictionary *)request
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.activityController) { reject(@"E_SHARE_BUSY", @"A request is already being shared", nil); return; }
  NSString *message = request[@"message"];
  if (![message isKindOfClass:NSString.class] || message.length == 0) {
    reject(@"E_SHARE_CONTENT", @"Missing request", nil); return;
  }
  UIWindow *window = [self applicationWindow];
  UIViewController *presenter = window.rootViewController;
  while (presenter.presentedViewController && !presenter.presentedViewController.isBeingDismissed) {
    presenter = presenter.presentedViewController;
  }
  if (!window || !presenter.view.window || presenter.isBeingDismissed || presenter.isBeingPresented || presenter.presentedViewController) {
    reject(@"E_SHARE_PRESENTATION", @"The application is not ready to share", nil); return;
  }
  [self cancelReactTouches:window.rootViewController.view];
  AlmostPrivacyActivityController *controller = [[AlmostPrivacyActivityController alloc] initWithActivityItems:@[message] applicationActivities:nil];
  if ([request[@"subject"] isKindOfClass:NSString.class]) [controller setValue:request[@"subject"] forKey:@"subject"];
  if ([request[@"title"] isKindOfClass:NSString.class]) controller.title = request[@"title"];
  // iPhone uses UIKit's standard sheet presentation. Only iPad needs a popover.
  if (UIDevice.currentDevice.userInterfaceIdiom == UIUserInterfaceIdiomPad) {
    controller.modalPresentationStyle = UIModalPresentationPopover;
    controller.popoverPresentationController.sourceView = presenter.view;
    controller.popoverPresentationController.sourceRect = CGRectMake(CGRectGetMidX(presenter.view.bounds), CGRectGetMidY(presenter.view.bounds), 1, 1);
    controller.popoverPresentationController.permittedArrowDirections = 0;
  }
  self.activityController = controller;
  self.ownerWindow = window;
  self.resolve = resolve;
  self.reject = reject;
  __weak AlmostPrivacySharing *weakSelf = self;
  controller.onDismissed = ^{ [weakSelf finishDismissal]; };
  controller.completionWithItemsHandler = ^(UIActivityType type, BOOL completed, NSArray *items, NSError *error) {
    void (^recordResult)(void) = ^{
      AlmostPrivacySharing *strongSelf = weakSelf;
      if (!strongSelf || !strongSelf.activityController) return;
      strongSelf.activityError = error;
      // Choosing an app is not proof that the deletion request was submitted.
      strongSelf.result = @{ @"action": completed ? @"sharedAction" : @"dismissedAction", @"activityType": type ?: @"" };
      // UIKit may have already completed dismissal before delivering this callback.
      [strongSelf completeAfterDismissal];
    };
    if (NSThread.isMainThread) recordResult();
    else dispatch_async(dispatch_get_main_queue(), recordResult);
  };
  [presenter presentViewController:controller animated:YES completion:nil];
  controller.presentationController.delegate = self;
}
@end
