import subprocess,time,re,xml.etree.ElementTree as E
from pathlib import Path
SERIAL='emulator-5560';root=Path(__file__).resolve().parent/'artifacts'/'android-confirm';root.mkdir(parents=True,exist_ok=True)
def adb(*a):return subprocess.check_output(['adb','-s',SERIAL,*a],timeout=30)
def tree():
 adb('shell','uiautomator','dump','/sdcard/almost-controls.xml');return E.fromstring(adb('shell','cat','/sdcard/almost-controls.xml'))
def tap(t,key,value):
 n=next(n for n in t.iter('node') if n.get(key)==value)
 x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')));adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.5)
def shot(name):(root/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
adb('shell','am','force-stop','com.sasarei.almostclean');adb('shell','am','start','-n','com.sasarei.almostclean/.MainActivity');time.sleep(3)
t=tree();modal=None
for palette in ['light','dark','indigo','emerald','sunset','gold','violet','aqua']:
 tap(t,'resource-id','qa-'+palette);tap(t,'resource-id','qa-daily');shot(palette+'-daily')
 tap(t,'resource-id','qa-monthly');shot(palette+'-monthly')
 tap(t,'resource-id','qa-autosave');shot(palette+'-autocollect')
 if modal is None:modal=tree()
 tap(modal,'content-desc','Закрыть без подтверждения');print('PASS '+palette+' daily/calendar/autocollect/cancel',flush=True)
