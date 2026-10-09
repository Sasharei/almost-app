import argparse, pathlib, subprocess, os, json, time
p=argparse.ArgumentParser();p.add_argument('platform');p.add_argument('device');p.add_argument('cases',nargs='+');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[2];out=root/'qa/artifacts/decision-followup-runtime';env=dict(os.environ,DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer',MAESTRO_DRIVER_STARTUP_TIMEOUT='120000')
results=[]
for case in a.cases:
 theme,_,accent=case.partition(':');accent=accent or 'violet';tag=f'matrix-{a.platform}-{theme}-{accent}'
 cmd=['python3',str(root/'qa/decision-followup-runtime/seed.py'),a.platform,'--device',a.device,'--theme',theme,'--accent',accent,'--timer','3600']
 if a.platform=='android':cmd+=['--backup-tag=-new-avd']
 if theme=='pro':cmd+=['--premium']
 subprocess.run(cmd,check=True,env=env)
 if a.platform=='ios':subprocess.run(['xcrun','simctl','launch',a.device,'com.sasarei.almostclean'],check=True,env=env)
 else:subprocess.run(['adb','-s',a.device,'shell','am','start','-n','com.sasarei.almostclean/.MainActivity'],check=True,env=env)
 log=out/(tag+'.log')
 with log.open('w') as f:r=subprocess.run(['/Users/sasarei/.maestro/bin/maestro','--device',a.device,'test','--test-output-dir',str(out/tag),str(root/('qa/decision-followup-runtime/surface-matrix-android.yaml' if a.platform=='android' else 'qa/decision-followup-runtime/surface-matrix.yaml'))],stdout=f,stderr=subprocess.STDOUT,env=env,timeout=600)
 results.append({'case':case,'exit':r.returncode,'log':str(log),'timestamp':time.time()});(out/f'matrix-{a.platform}-results.json').write_text(json.dumps(results,indent=2));print(tag,'exit',r.returncode,flush=True)
 if r.returncode:break
