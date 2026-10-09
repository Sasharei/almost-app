import subprocess,pathlib,json,sys,hashlib,shutil
uid='46C39996-F57E-401F-87F6-15ADCD2DDC2A';app='com.sasarei.almostclean';theme=sys.argv[1]
assert theme in ['light','dark','pro']
subprocess.run(['xcrun','simctl','terminate',uid,app],capture_output=True)
c=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data']).decode().strip());s=c/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1'
b=pathlib.Path(__file__).parent/'fixture-backup'
if not b.exists():shutil.copytree(s,b)
m=json.loads((s/'manifest.json').read_text());m['@almost_theme']=theme
if len(sys.argv)>2:
 assert sys.argv[2] in ['indigo','emerald','sunset','gold','violet','aqua']
 m['@almost_pro_theme_accent']=sys.argv[2]
m['@almost_premium_state_cache']=json.dumps({'version':1,'savedAt':__import__('time').time()*1000,'isPremium':True,'entitlement':{'identifier':'premium','isActive':True,'source':'cache','expirationDate':'2099-10-03T00:00:00Z'}})
key='@almost_daily_challenge_state';state=json.loads(m[key] if m.get(key)!=None else (s/hashlib.md5(key.encode()).hexdigest()).read_text());state.update(status='offer',offerDismissed=False,selectedDrawIndex=None,deferUntilKey=None);m[key]=json.dumps(state,ensure_ascii=False)
(s/'manifest.json').write_text(json.dumps(m,ensure_ascii=False))
subprocess.run(['xcrun','simctl','launch',uid,app],check=True)
