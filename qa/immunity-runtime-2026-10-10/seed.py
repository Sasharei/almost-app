"""Seeds only the dedicated synthetic immunity QA simulator."""
import json, pathlib, subprocess, time, sys
uid='D4D2132B-98ED-45CE-A4A3-911C91A358C6'; app='com.sasarei.almostclean'
subprocess.run(['xcrun','simctl','terminate',uid,app],capture_output=True)
container=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data']).decode().strip())
base=container/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1';base.mkdir(parents=True,exist_ok=True)
now=int(time.time()*1000); day=time.strftime('%Y-%m-%d'); theme=sys.argv[1];accent=sys.argv[2] if len(sys.argv)>2 else 'indigo'
m={
'almost.practiceTutorial.v1':'1','@almost_onboarded':'done','@almost_terms_accepted':'1','@almost_language':sys.argv[3] if len(sys.argv)>3 else 'en','@almost_theme':theme,'@almost_pro_theme_accent':accent,
'@almost_profile':{'name':'Immunity QA','firstName':'Almi','lastName':'QA','currency':'USD','gender':'none','persona':'mindful_coffee','goal':'save','goalTargetUSD':10000,'primaryGoals':[{'id':'save','targetUSD':10000}],'joinedAt':time.strftime('%Y-%m-%dT00:00:00Z')},
'@almost_mood_state':{'dayKey':day,'current':'neutral','events':[],'lastVisitAt':now-72*3600000},'@almost_tamagotchi_last_active_at':str(now-72*3600000),'@almost_analytics_opt_out':'1','@almost_saved_total':'250','@almost_saved_total_progress':'250',
'@almost_health_points':'15550','@almost_health_points_backup_v1':{'version':1,'balance':15550,'updatedAt':now},
'@almost_tamagotchi_state':{'hunger':0,'mood':0,'cleanliness':0,'coins':15550,'lastDecayAt':now,'hungerImmunityUntil':now+36*3600000,'rewardWindowStartAt':now,'lastHourlyRewardCheckAt':now,'pendingHourlyReward':5,'pendingHourlyRewardHours':1,'cleanToolSupplies':{'brush':5,'soap':5,'shower':5}},
'@almost_daily_reward':{'lastKey':None,'lastAmount':0,'lastClaimAt':0,'streak':0},'@almost_daily_reward_day':'',
'@almost_fab_tutorial':'done','@almost_tutorial_state':'done','@almost_feed_intro_shown':'1','@almost_progress_intro_shown':'1','@almost_fridge_intro_shown':'1','@almost_budget_widget_tutorial':'done',
'@almost_monetization_onboarding_locked':'0','@almost_monetization_trial_locked':'0','@almost_sound_enabled':'0','@almost_haptics_enabled':'0',
'@almost_daily_challenge_state':{'dateKey':day,'status':'idle','offerDismissed':True,'completionDismissed':True,'deferUntilKey':day},
'@almost_rewards_celebrated':{str(i):True for i in range(1,101)},'@almost_pending':[],
'@almost_premium_state_cache':{'version':1,'savedAt':now,'isPremium':True,'entitlement':{'identifier':'premium','isActive':True,'source':'cache','expirationDate':'2099-10-03T00:00:00Z'}},
'@almost_push_day_three_prompt':'1','@almost_no_goal_save_prompt_shown':str(now+86400000),
}
m={k:v if isinstance(v,str) else json.dumps(v) for k,v in m.items()}
(base/'manifest.json').write_text(json.dumps(m))
print('Synthetic fixture',theme,accent,flush=True)
subprocess.run(['xcrun','simctl','launch','--arch=x86_64',uid,app],check=True)
