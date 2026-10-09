import pathlib,subprocess,json,time,os
root=pathlib.Path(__file__).resolve().parents[2];uid='D06F6A5C-E069-4194-B6CC-CAAC59653090';app='com.sasarei.almostclean';out=root/'qa/artifacts/decision-followup-runtime';env=dict(os.environ,DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer',MAESTRO_DRIVER_STARTUP_TIMEOUT='120000')
for theme in ['light','dark','pro']:
 cmd=['python3',str(root/'qa/decision-followup-runtime/seed.py'),'ios','--device',uid,'--theme',theme,'--language','ru','--timer','3600']
 cmd+=['--premium']
 subprocess.run(cmd,check=True,env=env)
 c=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data'],env=env).decode().strip());p=c/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1/manifest.json';m=json.loads(p.read_text());cards=json.loads(m['@almost_custom_temptations']);interactions=json.loads(m['@almost_temptation_interactions']);base=cards[0];due=interactions[base['id']]
 for i in range(2,21):
  key=f'custom_qa_count_{i}';cards.append(dict(base,id=key,title=f'QA Due {i:02}'));interactions[key]=dict(due)
 m['@almost_custom_temptations']=json.dumps(cards);m['@almost_temptation_interactions']=json.dumps(interactions);p.write_text(json.dumps(m))
 subprocess.run(['xcrun','simctl','launch',uid,app],check=True,env=env)
 with (out/f'count-only-{theme}.log').open('w') as f:r=subprocess.run(['/Users/sasarei/.maestro/bin/maestro','--device',uid,'test','--test-output-dir',str(out/f'count-only-{theme}'),str(root/'qa/decision-followup-runtime/count-only.yaml')],stdout=f,stderr=subprocess.STDOUT,env=env,timeout=240)
 print(theme,r.returncode,flush=True)
 if r.returncode:raise SystemExit(r.returncode)
