"""Synthetic simulator-only fixture. Backs up every touched AsyncStorage file."""
import hashlib, json, pathlib, subprocess, time
uid = 'D06F6A5C-E069-4194-B6CC-CAAC59653090'
app = 'com.sasarei.almostclean'
subprocess.run(['xcrun','simctl','terminate',uid,app],capture_output=True)
container = pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data']).decode().strip())
base = container/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1'
manifest = base/'manifest.json'
backup = pathlib.Path('/tmp/almost-round7-fixture-backup'); backup.mkdir(exist_ok=True)
(backup/'manifest.json').write_bytes(manifest.read_bytes())
m = json.loads(manifest.read_text()); now = int(time.time()*1000); key = 'custom_qa_round7_coffee'
def set_value(k, v):
    filename = hashlib.md5(k.encode()).hexdigest()
    target = base/filename
    if target.exists(): (backup/filename).write_bytes(target.read_bytes())
    m[k] = v if isinstance(v,str) else json.dumps(v,ensure_ascii=False)
set_value('@almost_theme','light')
set_value('@almost_language','en')
set_value('@almost_ui_session','')
set_value('@almost_custom_temptations',[{'id':key,'title':'QA Coffee','emoji':'☕','priceUSD':1,'basePriceUSD':1,'currency':'USD','quickTemptation':True,'origin':'quick_custom','impulseCategory':'food','frequency':'daily'}])
set_value('@almost_temptation_interactions',{key:{'saveCount':1,'spendCount':1,'lastAmountUSD':1,'lastInteractionAt':now-86400000,'frequency':'daily','frequencyReminderManualConfigured':True,'frequencyReminderPromptShown':True,'nextCheckAt':now-60000}})
set_value('@almost_history',[{'id':'qa-round7-save','kind':'refuse_spend','timestamp':now-86400000,'meta':{'templateId':key,'amountUSD':20,'title':'QA Coffee'}},{'id':'qa-round7-spend','kind':'spend','timestamp':now-3600000,'meta':{'templateId':key,'amountUSD':40,'title':'QA Coffee'}}])
manifest.write_text(json.dumps(m,ensure_ascii=False))
print('Seeded QA Coffee: stale template $1, historical decisions $20/$40, expected next amount $30. Backup:',backup)
