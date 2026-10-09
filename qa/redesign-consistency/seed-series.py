"""Synthetic ready series on the dedicated simulator; restore the QA backup afterwards."""
import datetime,json,pathlib,subprocess,time,sys
uid='D06F6A5C-E069-4194-B6CC-CAAC59653090';app='com.sasarei.almostclean'
subprocess.run(['xcrun','simctl','terminate',uid,app],capture_output=True)
root=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data']).decode().strip())
p=root/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1/manifest.json'
m=json.loads(p.read_text());now=int(time.time()*1000)
ids=['afternoon_coffee_refill','coffee_bakery_combo','coffee_to_go']
m['@almost_temptation_series']=json.dumps(dict(version=2,seriesId='qa-oct2-series',status='ready',dayKey=datetime.date.today().isoformat(),targetIds=ids,resolutions={key:dict(firstAction='save' if i<2 else 'spend',lastAction='save' if i<2 else 'spend',firstAt=now-60000,lastAt=now-60000,actionCount=1) for i,key in enumerate(ids)},pendingCoins=25,creditedCoins=0,claimedCoins=0,startedAt=now-120000,completedAt=now-60000,claimedAt=None,postClaimActionCount=0))
m['@almost_theme']=sys.argv[1] if len(sys.argv)>1 else 'light';m['@almost_language']='en';m['@almost_ui_session']='';m['@almost_feed_intro_shown']='1'
p.write_text(json.dumps(m,ensure_ascii=False))
subprocess.run(['xcrun','simctl','launch',uid,app],check=True)
