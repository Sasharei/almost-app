"""Synthetic local tutorial fixture; original device storage is backed up in /tmp."""
import hashlib,json,pathlib,subprocess,sqlite3,time,sys
mode=sys.argv[1]; theme=sys.argv[2] if len(sys.argv)>2 else 'light'; accent=sys.argv[3] if len(sys.argv)>3 else 'indigo'
app='com.sasarei.almostclean'; uid='9D59A3C2-2DDE-4844-9311-A2A747CF3F55'; serial='emulator-5554'; now=int(time.time()*1000)
base=pathlib.Path(pathlib.Path('/tmp/practice-runtime-container.txt').read_text())
original=json.loads((pathlib.Path('/tmp/practice-runtime-storage-backup')/'manifest.json').read_text())
profile=original.get('@almost_profile')
if profile is None: profile=(pathlib.Path('/tmp/practice-runtime-storage-backup')/hashlib.md5(b'@almost_profile').hexdigest()).read_text()
profile=json.loads(profile); profile.update(name='Tutorial QA',currency='USD',language='en')
key='custom_qa_practice_coffee'
values={'@almost_analytics_opt_out':'1','@almost_profile':profile,'@almost_language':'en','@almost_theme':theme,'@almost_pro_theme_accent':accent,'@almost_onboarded':'done','@almost_tutorial_state':'done','@almost_fab_tutorial':'done','@almost_ui_session':'','@almost_feed_intro_shown':'1','@almost_custom_temptations':[{'id':key,'title':'QA Coffee','emoji':'☕','priceUSD':5,'basePriceUSD':5,'currency':'USD','quickTemptation':True,'origin':'quick_custom','impulseCategory':'food','frequency':'daily'}],'@almost_temptation_interactions':{key:{'saveCount':1,'spendCount':1,'lastAmountUSD':5,'lastInteractionAt':now-86400000,'frequency':'daily','frequencyReminderManualConfigured':True,'frequencyReminderPromptShown':True,'nextCheckAt':now-60000}},'@almost_daily_challenge_state':{'dateKey':time.strftime('%Y-%m-%d'),'status':'idle','offerDismissed':True,'completionDismissed':True,'deferUntilKey':time.strftime('%Y-%m-%d')},'@almost_monetization_onboarding_locked':'0','@almost_monetization_trial_locked':'0','@almost_pending':[],'@almost_progress_intro_shown':'1','@almost_fridge_intro_shown':'1','@almost_no_goal_save_prompt_shown':str(now+86400000),'@almost_push_day_three_prompt':'1'}
def encoded(v): return v if isinstance(v,str) else json.dumps(v)
if mode=='ios':
 subprocess.run(['xcrun','simctl','terminate',uid,app],capture_output=True)
 p=base/'manifest.json';m=json.loads(p.read_text());m.update({k:encoded(v) for k,v in values.items()});m.pop('almost.practiceTutorial.v1',None);p.write_text(json.dumps(m));subprocess.run(['xcrun','simctl','launch',uid,app],check=True)
else:
 subprocess.run(['adb','-s',serial,'shell','am','force-stop',app],check=True)
 db=pathlib.Path('/tmp/practice-android-fixture.db');db.write_bytes(subprocess.check_output(['adb','-s',serial,'exec-out','run-as',app,'cat','databases/RKStorage']))
 c=sqlite3.connect(db);c.executemany('insert or replace into catalystLocalStorage values(?,?)',[(k,encoded(v)) for k,v in values.items()]);c.execute('delete from catalystLocalStorage where key=?',('almost.practiceTutorial.v1',));c.commit();c.close()
 subprocess.run(['adb','-s',serial,'push',str(db),'/data/local/tmp/practice-fixture.db'],check=True,capture_output=True);subprocess.run(['adb','-s',serial,'shell','run-as',app,'cp','/data/local/tmp/practice-fixture.db','databases/RKStorage'],check=True);subprocess.run(['adb','-s',serial,'shell','am','start','-n',app+'/.MainActivity'],check=True)
