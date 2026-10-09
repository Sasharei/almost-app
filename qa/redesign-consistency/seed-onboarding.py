"""Restart onboarding on the synthetic review simulator only; restore QA backup afterwards."""
import json,pathlib,subprocess,sys
uid='D06F6A5C-E069-4194-B6CC-CAAC59653090';app='com.sasarei.almostclean'
subprocess.run(['xcrun','simctl','terminate',uid,app],capture_output=True)
root=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data']).decode().strip())
p=root/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1/manifest.json'
m=json.loads(p.read_text());m['@almost_onboarded']='';m['@almost_theme']=sys.argv[1] if len(sys.argv)>1 else 'light';m['@almost_language']='en';m['@almost_ui_session']='';m['@almost_temptation_series']='';m['@almost_feed_intro_shown']='0'
p.write_text(json.dumps(m,ensure_ascii=False));subprocess.run(['xcrun','simctl','launch',uid,app],check=True)
