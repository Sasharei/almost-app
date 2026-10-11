"""Sequential single-simulator visual matrix with real UI-triggered parties."""
import pathlib, subprocess, sys, signal, json, time, shutil, os
root=pathlib.Path(__file__).resolve().parent;uid='4A50B42B-BC8B-4428-9BB6-BF17D21F28E2'
matrix=[('light','indigo'),('dark','indigo')]+[('pro',v) for v in ['indigo','emerald','sunset','gold','violet','aqua']]
if len(sys.argv)>1: matrix=[v for v in matrix if (v[0] if v[0]!='pro' else 'pro-'+v[1]) in sys.argv[1:]]
for theme,accent in matrix:
 name=theme if theme!='pro' else 'pro-'+accent;out=root/'evidence'/name;out.mkdir(parents=True,exist_ok=True)
 print('START',name,flush=True)
 subprocess.run(['python3',str(root/'seed.py'),theme,accent],check=True)
 with (out/'record.log').open('w') as recording_log:
  recorder=subprocess.Popen(['xcrun','simctl','io',uid,'recordVideo','--codec=h264','--force',str(out/'transition.mp4')],stdout=recording_log,stderr=subprocess.STDOUT)
  start=time.time()
  try:
   env=os.environ.copy();env['JAVA_HOME']='/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home'
   with (out/'runner.log').open('w') as log:
    result=subprocess.run(['/Users/sasarei/.maestro/bin/maestro','--device',uid,'test','--format','JUNIT','--output',str(out/'junit.xml'),'--test-output-dir',str(out/'raw'),str(root/'party.yaml')],stdout=log,stderr=subprocess.STDOUT,env=env,timeout=240)
  finally:
   recorder.send_signal(signal.SIGINT);recorder.wait(timeout=20)
 for f in (out/'raw').rglob('takeScreenshot/*.png'): shutil.copy2(f,out/f.name)
 rec={'theme':name,'exitCode':result.returncode,'duration':round(time.time()-start,1)}
 with (root/'evidence'/'results.jsonl').open('a') as log:log.write(json.dumps(rec)+'\n')
 print('DONE',json.dumps(rec),flush=True)
 if result.returncode: print((out/'runner.log').read_text()[-3500:],flush=True);sys.exit(result.returncode)
