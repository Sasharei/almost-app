"""Simulator-only appearance fixtures; original storage backed up before QA."""
import json, pathlib, subprocess, sys
uid='D06F6A5C-E069-4194-B6CC-CAAC59653090'; app='com.sasarei.almostclean'
subprocess.run(['xcrun','simctl','terminate',uid,app],capture_output=True)
root=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data']).decode().strip())
base=root/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1'
p=base/'manifest.json';m=json.loads(p.read_text())
m['@almost_theme']=sys.argv[1];m['@almost_language']=sys.argv[2] if len(sys.argv)>2 else 'en';m['@almost_ui_session']=''
m['@almost_feed_intro_shown']='0' if len(sys.argv)>3 and sys.argv[3]=='intro' else '1'
if len(sys.argv)>4:m['@almost_pro_theme_accent']=sys.argv[4]
p.write_text(json.dumps(m,ensure_ascii=False))
subprocess.run(['xcrun','simctl','launch',uid,app],check=True)
