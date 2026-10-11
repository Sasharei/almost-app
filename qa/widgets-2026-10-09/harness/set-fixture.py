import json,sys,time,pathlib,subprocess,os,shlex,plistlib
scene=sys.argv[1]; theme=sys.argv[2] if len(sys.argv)>2 else 'light'; lang=sys.argv[3] if len(sys.argv)>3 else 'en'; accent=sys.argv[4] if len(sys.argv)>4 else 'violet'
root=pathlib.Path(__file__).resolve().parents[3]
s=(root/'src/constants/almiWidgetCopy.js').read_text(); copies=json.loads(s[s.index('{'):s.rindex('}')+1]); now=int(time.time()*1000)
v=json.loads(pathlib.Path(__file__).with_name('fixture.json').read_text())
v.update(widget_theme_id=theme,widget_pro_theme_accent_id=accent,widget_almi_last_opened=now,widget_has_data=scene!='empty',widget_recent_events='+$7.25 Coffee||-$3.50 Snack')
context={'version':1,'financialUpdatedAt':now,'eventAt':now,'eventScene':scene,'rtl':lang=='ar','copy':copies[lang]}
if scene=='neglected': v['widget_almi_last_opened']=now-25*3600000; context['eventScene']='balance'
if scene=='expired': context['eventScene']='savings_guard'; context['eventAt']=now-7*3600000
if scene=='corrupt': v['widget_almi_context']='{broken'
else: v['widget_almi_context']=json.dumps(context,ensure_ascii=False)
payload=json.dumps(v,ensure_ascii=False)
env=dict(os.environ, SIMCTL_CHILD_QA_WIDGET_JSON=payload)
subprocess.run(['xcrun','simctl','launch','--terminate-running-process','34CFF13D-B0E8-43BC-A199-BBE4C16BCBDF','com.sasarei.almostclean'],env=env,check=True)
time.sleep(3)  # Allow the SwiftUI host to apply and synchronize the fixture before termination.
subprocess.run(['xcrun','simctl','terminate','34CFF13D-B0E8-43BC-A199-BBE4C16BCBDF','com.sasarei.almostclean'],check=True)
# Simulator fixture isolation: seed every QA-created suite file and invalidate daemon caches.
# This tests native rendering; it does not certify the production app-to-widget storage bridge.
simdata=pathlib.Path('/Users/sasarei/Library/Developer/CoreSimulator/Devices/34CFF13D-B0E8-43BC-A199-BBE4C16BCBDF/data')
for pref in simdata.rglob('group.com.sasarei.almostclean.plist'):
    pref.write_bytes(plistlib.dumps(v))
# Terminate only extension processes whose executable belongs to this disposable simulator.
for row in subprocess.check_output(['ps','-axo','pid,command'],text=True).splitlines():
    if '/CoreSimulator/Devices/34CFF13D-B0E8-43BC-A199-BBE4C16BCBDF/' in row and '/Almost WidgetExtension.appex/Almost WidgetExtension -BSServiceDomains' in row:
        os.kill(int(row.strip().split()[0]),15)
for service in ['com.apple.cfprefsd.xpc.daemon','com.apple.chronod']:

    subprocess.run(['xcrun','simctl','spawn','34CFF13D-B0E8-43BC-A199-BBE4C16BCBDF','launchctl','kickstart','-k','system/'+service],check=True)
subprocess.run(['adb','-s','emulator-5554','shell','am instrument -w -e fixture '+shlex.quote(payload)+' qa.widgets/qa.widgets.Fixture'],check=True)
print('Fixture',scene,theme,lang,accent)
