"""Compare fixed clear padding pixels in native before/after screenshots, not theme formulas."""
from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parent/'evidence';out={}
for p in sorted(root.iterdir()):
 if not p.is_dir() or not (p/'after-top.png').exists():continue
 out[p.name]={}
 for name in ['before-top','after-top']:
  b=subprocess.check_output(['ffmpeg','-loglevel','error','-i',str(p/(name+'.png')),'-f','rawvideo','-pix_fmt','rgb24','-'])
  def pix(x,y):return '#'+b[(y*1206+x)*3:(y*1206+x)*3+3].hex()
  out[p.name][name]={'bonusPadding':pix(710,1300),'shieldPadding':pix(1135,1490),'statsPadding':pix(1135,2040)}
 out[p.name]['equal']=out[p.name]['before-top']==out[p.name]['after-top']
 print(p.name,out[p.name]['equal'])
(root/'background-samples.json').write_text(json.dumps({'pixelCoordinates':{'bonusPadding':[710,1300],'shieldPadding':[1135,1490],'statsPadding':[1135,2040]},'samples':out},indent=2))
