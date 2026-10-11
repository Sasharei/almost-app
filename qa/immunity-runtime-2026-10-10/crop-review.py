"""Native-resolution crops only; originals are retained alongside these review aids."""
import pathlib,json
from PIL import Image,ImageDraw
root=pathlib.Path(__file__).resolve().parent
for result in json.loads((root/'native-results.json').read_text()):
 if result['functional']!='pass':continue
 name=result['case'];target=root/'evidence'/f'{name}-review.png'
 if target.exists():continue
 expanded=Image.open(root/'evidence'/f'{name}-expanded.png');party=Image.open(root/'evidence'/f'{name}-party.png');f=result['expandedFrame'];p=result['partyFrame']
 crops=[('Speech / '+name,expanded.crop((0,365,1206,545))),('Expanded protection',expanded.crop((0,max(0,int(f['Y']*3)-20),1206,min(2622,int((f['Y']+f['Height'])*3)+290)))),('Party benefit',party.crop((0,max(0,int(p['Y']*3)-20),1206,min(2622,int((p['Y']+p['Height'])*3)+45))))]
 height=sum(crop.height+26 for _,crop in crops);canvas=Image.new('RGB',(1206,height),'#dedede');draw=ImageDraw.Draw(canvas);y=0
 for label,crop in crops:
  draw.text((12,y+5),label,fill='#000000');y+=26;canvas.paste(crop,(0,y));y+=crop.height
 canvas.save(target)
