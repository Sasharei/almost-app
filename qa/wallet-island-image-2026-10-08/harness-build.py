from pathlib import Path
import subprocess,plistlib,shutil
root=Path('/Users/sasarei/Downloads/almost_clean'); work=Path('/tmp/almost-wallet-image-qa'); work.mkdir(exist_ok=True)
app=work/'WalletImageQA.app'; ext=app/'PlugIns/WalletImageQAWidget.appex'; ext.mkdir(parents=True,exist_ok=True)
def run(args):subprocess.run(args,check=True)
def info(path,identifier,name,package,extra):
 data={'CFBundleIdentifier':identifier,'CFBundleName':name,'CFBundleExecutable':name,'CFBundlePackageType':package,'CFBundleVersion':'1','CFBundleShortVersionString':'1.0','MinimumOSVersion':'17.0','CFBundleInfoDictionaryVersion':'6.0','CFBundleSupportedPlatforms':['iPhoneSimulator'],'DTPlatformName':'iphonesimulator',**extra};(path/'Info.plist').write_bytes(plistlib.dumps(data))
info(app,'com.almost.walletimageqa','WalletImageQA','APPL',{'NSSupportsLiveActivities':True,'LSRequiresIPhoneOS':True,'UILaunchScreen':{},'UIDeviceFamily':[1],'UIApplicationSceneManifest':{'UIApplicationSupportsMultipleScenes':False,'UISceneConfigurations':{}}})
info(ext,'com.almost.walletimageqa.widget','WalletImageQAWidget','XPC!',{'NSExtension':{'NSExtensionPointIdentifier':'com.apple.widgetkit-extension'}})
(work/'Harness.swift').write_text('''import UIKit
import ActivityKit
@main class AppDelegate: UIResponder, UIApplicationDelegate {
 func application(_ application: UIApplication, configurationForConnecting session: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
  let c=UISceneConfiguration(name:"QA",sessionRole:session.role); c.delegateClass=SceneDelegate.self; return c
 }
}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
 var window: UIWindow?
 func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
  guard let scene=scene as? UIWindowScene else { return }
  let w=UIWindow(windowScene:scene); let vc=UIViewController(); vc.view.backgroundColor = .systemBackground
  let label=UILabel(frame: CGRect(x:20,y:180,width:350,height:160)); label.numberOfLines=0; label.text="Wallet image QA — synthetic 100 SAR. Production Live Activity view and assets."; vc.view.addSubview(label)
  w.rootViewController=vc; w.makeKeyAndVisible(); window=w
 }
 func sceneDidBecomeActive(_ scene: UIScene) {
  Task {
   for activity in Activity<WalletExpenseAttributes>.activities { await activity.end(nil,dismissalPolicy:.immediate) }
   let state=WalletExpenseAttributes.ContentState(title:"Расход записал",amount:"100 SAR",merchant:"Riyadh Metro",expiresAt:Date().addingTimeInterval(1800))
   do { let activity=try Activity.request(attributes:WalletExpenseAttributes(),content:ActivityContent(state:state,staleDate:state.expiresAt),pushType:nil); NSLog("LIVE_ACTIVITY_STARTED %@",activity.id) } catch { NSLog("LIVE_ACTIVITY_FAILED %@",String(describing:error)) }
  }
 }
}
''')
(work/'Bundle.swift').write_text('import SwiftUI\nimport WidgetKit\n@main struct BundleQA: WidgetBundle { var body: some Widget { WalletExpenseLiveActivity() } }\n')
# Compile the exact production view. Baseline changes only the image references back.
view=(root/'ios/Almost Widget/Almost_WidgetLiveActivity.swift').read_text()
import sys
if '--baseline' in sys.argv:
 for name in ['AlmiWalletLock','AlmiWalletExpanded','AlmiWalletCompact']:view=view.replace(name,'AlmiWidget')
(work/'View.swift').write_text(view)
# Build through Xcode: WidgetKit extensions need Xcode's extension entry-point flags.
run(['/opt/homebrew/opt/ruby/bin/ruby',str(root/'qa/wallet-island-image-2026-10-08/project.rb')])
run(['xcodebuild','-project',str(work/'QA.xcodeproj'),'-target','WalletImageQA','-configuration','Release','-sdk','iphonesimulator','build'])
print(work/'build/Release-iphonesimulator/WalletImageQA.app')
