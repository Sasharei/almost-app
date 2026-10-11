"""Keep native-resolution party frames and a short recording around the actual UI tap."""
import pathlib,datetime,re,subprocess,json,sys,shutil
root=pathlib.Path(__file__).resolve().parent
for name in sys.argv[1:]:
 p=root/'evidence'/name;v=p/'transition.mp4'
 logs=sorted(p.glob('raw/**/party/logs/maestro.log'));s=logs[-1].read_text()
 for frame in logs[-1].parent.parent.glob('takeScreenshot/*.png'):shutil.copy2(frame,p/frame.name)
 marker='Tap on "Party ×25" RUNNING'
 if marker in s:
  tail=s.split(marker,1)[1];t=re.search(r'(\d\d:\d\d:\d\d\.\d+) .*Try tapping at',tail).group(1)
 else:
  tail=re.split(r'Tap on point \(50%, (?:94|96)%\) RUNNING',s,maxsplit=1)[1]
  t=re.search(r'(\d\d:\d\d:\d\d\.\d+) .*Try tapping at',tail).group(1)
 birth=datetime.datetime.fromtimestamp(v.stat().st_birthtime)
 tap=datetime.datetime.combine(birth.date(),datetime.time.fromisoformat(t));delta=(tap-birth).total_seconds()
 (p/'timing.json').write_text(json.dumps({'videoBirth':birth.isoformat(),'tapLogTime':t,'tapSeconds':delta,'framesAfterTap':[1,3,5,7]},indent=2))
 for offset in [1,3,5,7]:
  subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(delta+offset),'-i',str(v),'-frames:v','1',str(p/f'during-{offset}.png')],check=True)
 subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(max(0,delta-1)),'-i',str(v),'-t','12','-c','copy',str(p/'party-clip.mp4')],check=True)
 print(name,delta)
