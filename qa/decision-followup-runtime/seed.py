"""Simulator/emulator-only synthetic state; retain original storage in /tmp."""
import argparse,subprocess,pathlib,json,time,shutil,sqlite3,datetime
ap=argparse.ArgumentParser();ap.add_argument('platform',choices=['ios','android']);ap.add_argument('--device',required=True);ap.add_argument('--theme',default='light');ap.add_argument('--accent',default='violet');ap.add_argument('--language',default='en');ap.add_argument('--premium',action='store_true');ap.add_argument('--empty',action='store_true');ap.add_argument('--backup-tag',default='');ap.add_argument('--timer',type=int,default=45);a=ap.parse_args()
app='com.sasarei.almostclean';now=int(time.time()*1000);day=86400000
base=pathlib.Path('/tmp/almost-followup-'+a.platform+'-'+a.device+a.backup_tag);base.mkdir(exist_ok=True)
if a.platform=='ios':
 subprocess.run(['xcrun','simctl','terminate',a.device,app],capture_output=True)
 c=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',a.device,app,'data']).decode().strip())
 store=c/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1'
 if not store.exists():
  (base/'original-storage-absent').touch();store.mkdir(parents=True);(store/'manifest.json').write_text('{}')
 if not (base/'original-ios').exists():shutil.copytree(store,base/'original-ios')
 manifest=store/'manifest.json';m=json.loads(manifest.read_text())
 def put(k,v):m[k]=v if isinstance(v,str) else json.dumps(v,ensure_ascii=False)
else:
 subprocess.run(['adb','-s',a.device,'shell','am','force-stop',app],check=True)
 original=base/'original.db'
 if not original.exists():
  with original.open('wb') as f:subprocess.run(['adb','-s',a.device,'exec-out','run-as',app,'cat','databases/RKStorage'],stdout=f,check=True)
 working=base/'working.db'
 if original.read_bytes()[:16] != b'SQLite format 3\x00':
  (base/'original-storage-absent').touch()
  original.unlink()
  c=sqlite3.connect(original);c.execute('create table catalystLocalStorage (key TEXT PRIMARY KEY, value TEXT NOT NULL)');c.commit();c.close()
 shutil.copyfile(original,working);conn=sqlite3.connect(working)
 def put(k,v):conn.execute('insert or replace into catalystLocalStorage(key,value) values(?,?)',(k,v if isinstance(v,str) else json.dumps(v,ensure_ascii=False)))
profile={'firstName':'QA','lastName':'Tester','name':'QA Tester','currency':'USD','goal':'save','goalTargetUSD':500,'primaryGoals':[{'id':'save','targetUSD':500}],'persona':'mindful_coffee','gender':'none','incomePayday':15,'joinedAt':now-10*day}
put('@almost_profile',profile);put('@almost_language',a.language);put('@almost_theme',a.theme);put('@almost_pro_theme_accent',a.accent);put('@almost_ui_session','');put('@almost_feed_intro_shown','1');put('@almost_budget_widget_tutorial','done');put('@almost_onboarded','done');put('@almost_terms_accepted','1');put('@almost_analytics_opt_out','1');put('@almost_push_day_three_prompt','1');put('@almost_tycoon_settings',{'enabled':False})
put('@almost_premium_state_cache',{'version':1,'savedAt':now,'isPremium':a.premium,'entitlement':{'identifier':'premium','isActive':True,'source':'cache','expirationDate':datetime.datetime.fromtimestamp((now+day)/1000,datetime.timezone.utc).isoformat()} if a.premium else None})
put('@almost_monetization_onboarding_locked','0');put('@almost_premium_hard_paywall_shown','1');put('@almost_premium_soft_paywall_shown','1');put('@almost_premium_daily_soft_paywall_shown_day_key',datetime.datetime.now().strftime('%Y-%m-%d'));put('@almost_premium_group_c_soft_paywall_shown_day_key',datetime.datetime.now().strftime('%Y-%m-%d'))
cards=[];interactions={}
for suffix,title,amount,due,category,freq in [('ready','QA Ready',12,now-1000,'food','daily'),('timer','QA Timer',18,now+a.timer*1000,'food','daily'),('tomorrow','QA Tomorrow',25,now+day*2,'food','daily'),('subscription','QA Music Subscription',9,now+day,'subscriptions','monthly')]:
 key='custom_qa_followup_'+suffix
 cards.append({'id':key,'title':title,'emoji':'☕' if category=='food' else '🎵','priceUSD':amount,'basePriceUSD':amount,'currency':'USD','quickTemptation':True,'origin':'quick_custom','impulseCategory':category,'frequency':freq,'createdAt':now-10*day})
 interactions[key]={'saveCount':0,'spendCount':0,'lastInteractionAt':now-day,'intervalMs':day if freq=='daily' else 30*day,'frequency':freq,'frequencyReminderManualConfigured':True,'frequencyReminderPromptShown':True,'nextCheckAt':due,'firstTimerConfiguredAt':now-day}
put('@almost_custom_temptations',[] if a.empty else cards);put('@almost_temptation_interactions',{} if a.empty else interactions);put('@almost_history',[])
put('@almost_pending',[] if a.empty else [{'id':'qa_pause_short','title':'QA Pause Timer','emoji':'☕','priceUSD':32,'basePriceUSD':32,'createdAt':now,'decisionDue':now+3600000},{'id':'qa_pause_long','title':'QA Pause Later','emoji':'🎧','priceUSD':18,'basePriceUSD':18,'createdAt':now,'decisionDue':now+2*day}])
if a.platform=='ios':manifest.write_text(json.dumps(m,ensure_ascii=False))
else:
 conn.execute('pragma user_version=1');conn.commit();conn.close();subprocess.run(['adb','-s',a.device,'push',str(working),'/data/local/tmp/almost-followup.db'],check=True,stdout=subprocess.DEVNULL);subprocess.run(['adb','-s',a.device,'shell','run-as',app,'mkdir','-p','databases'],check=True);subprocess.run(['adb','-s',a.device,'shell','run-as',app,'cp','/data/local/tmp/almost-followup.db','databases/RKStorage'],check=True)
print('Seeded',a.platform,a.device,a.theme,a.language,'premium fixture' if a.premium else 'free fixture','timer due',datetime.datetime.fromtimestamp((now+a.timer*1000)/1000).isoformat(),'backup',base)
