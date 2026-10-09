from pathlib import Path
import subprocess,time,shutil,json
r=Path(__file__).resolve().parent;device='46C39996-F57E-401F-87F6-15ADCD2DDC2A';config='/Users/sasarei/Desktop/Almost_design/Screenshots/Almost Savings 8.0.0/02-localized-series/configure-runtime.cjs'
for theme,accent in [('light','indigo'),('dark','indigo')]+[('pro',a) for a in ['indigo','emerald','sunset','gold','violet','aqua']]:
 name=theme if theme!='pro' else theme+'-'+accent;print('START',name,flush=True)
 subprocess.run(['python3',str(r/'seed-theme.py'),theme,accent],check=True)
 for attempt in range(60):
  c=subprocess.run(['node',config],capture_output=True)
  if c.returncode==0:break
  time.sleep(.2)
 else:raise RuntimeError('Runtime not ready')
 out=r/'verified-themes'/name
 result=subprocess.run(['/Users/sasarei/.maestro/bin/maestro','--device',device,'test','--test-output-dir',str(out),str(r/'reveal.yaml')],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=180)
 out.mkdir(parents=True,exist_ok=True);(out/'latest.log').write_text(result.stdout)
 if result.returncode:raise RuntimeError(result.stdout)
 image=sorted(out.rglob('revealed.png'))[-1];shutil.copy2(image,r/(name+'.png'));print('DONE',name,flush=True)
