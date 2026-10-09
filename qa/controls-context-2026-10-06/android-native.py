import subprocess,time,re,xml.etree.ElementTree as ET
from pathlib import Path
SERIAL='emulator-5560'
ROOT=Path(__file__).resolve().parent/'artifacts'/'android-native';ROOT.mkdir(parents=True,exist_ok=True)
def adb(*args):return subprocess.check_output(['adb','-s',SERIAL,*args],timeout=30)
def hierarchy():
 adb('shell','uiautomator','dump','/sdcard/almost-controls.xml')
 return ET.fromstring(adb('shell','cat','/sdcard/almost-controls.xml'))
def find(tree,key,value):
 candidates=[n for n in tree.iter('node') if n.get(key)==value and n.get('bounds')!='[0,0][0,0]']
 assert candidates,(key,value)
 return candidates[0]
def tap(key,value,tree=None):
 n=find(tree if tree is not None else hierarchy(),key,value)
 x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
 adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.35)
def shot(name): (ROOT/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
def label(key):return find(hierarchy(),'resource-id',key).get('text')
def passed(name):print('PASS '+name,flush=True)
# The prior direct native tap selected hour 11.
assert label('qa-time')=='11:00'
tap('text','01');assert label('qa-time')=='11:01';passed('hour/minute row taps')
adb('shell','input','swipe','485','1340','485','1120','350');time.sleep(.8)
selected=label('qa-time');tap('resource-id','qa-rerender');assert label('qa-time')==selected;shot('hour-after-rerender');passed('hour swipe and rerender: '+selected)
adb('shell','input','swipe','796','1340','796','1520','1200');time.sleep(.8)
selected=label('qa-time');tap('resource-id','qa-rerender');assert label('qa-time')==selected;shot('minute-after-rerender');passed('minute swipe and rerender: '+selected)
assert '8' in label('today-awaiting-decisions')
tree=hierarchy()
for _ in range(6):tap('resource-id','qa-decision',tree)
assert '2' in label('today-awaiting-decisions');shot('six-decisions-two-pending')
tap('resource-id','qa-next-day');assert '8' in label('today-awaiting-decisions');shot('next-day-eight-pending');passed('eight pending, six complete, day reset')
for palette in ['light','dark','indigo','emerald','sunset','gold','violet','aqua']:
 tree=hierarchy();tap('resource-id','qa-'+palette,tree);tap('resource-id','qa-daily',tree);shot(palette+'-daily')
 tap('resource-id','qa-monthly',tree);shot(palette+'-monthly')
 tap('resource-id','qa-weekly',tree);shot(palette+'-weekly')
 tap('resource-id','qa-autosave',tree);shot(palette+'-autocollect')
 if palette=='light':
  adb('shell','input','swipe','640','1215','1160','1350','800');time.sleep(.5)
  assert any(n.get('text')=='До $30' for n in hierarchy().iter('node'));shot('slider-right')
  adb('shell','input','swipe','1110','1215','155','1080','800');time.sleep(.5)
  assert any(n.get('text')=='До $30' for n in hierarchy().iter('node'));shot('slider-left');passed('diagonal autocollect drag retains range')
 tap('content-desc','Закрыть без подтверждения');passed(palette+' calendar/time/autocollect/cancel')
