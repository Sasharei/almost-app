"""Real UI matrix through the local Maestro XCTest driver's documented request models.
The CLI controller is paused; all taps resolve fresh native accessibility bounds.
"""
import pathlib,urllib.request,json,time,subprocess,sys,urllib.parse
root=pathlib.Path(__file__).resolve().parent
uid='D4D2132B-98ED-45CE-A4A3-911C91A358C6';app='com.sasarei.almostclean';port=62496
out=root/'evidence';out.mkdir(exist_ok=True)
langs=['en','es','fr','ru','de','pt','it','ar','zh','zh-Hant','ko','ja']
palettes=[('light','indigo'),('dark','indigo')]+[('pro',v) for v in ['indigo','emerald','sunset','gold','violet','aqua']]
def api(endpoint,payload):
 request=urllib.request.Request(f'http://127.0.0.1:{port}/{endpoint}',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(request,timeout=30) as response:
  body=response.read();return json.loads(body) if body else {}
def tree():return api('viewHierarchy',{'appIds':[app],'excludeKeyboardElements':True})
def nodes(value):
 if isinstance(value,dict):
  if 'frame' in value:yield value
  for child in value.values():yield from nodes(child)
 elif isinstance(value,list):
  for child in value:yield from nodes(child)
def find(hierarchy,identifier=None,label=None):
 return next((node for node in nodes(hierarchy) if (identifier and node.get('identifier')==identifier) or (label and node.get('label')==label)),None)
def wait(identifier,minimum_height=0,timeout=60):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  hierarchy=tree();node=find(hierarchy,identifier)
  if node and node['frame']['Height']>minimum_height:return hierarchy,node
  time.sleep(.15)
 raise TimeoutError(identifier)
def tap(node):
 f=node['frame'];return api('touch',{'x':f['X']+f['Width']/2,'y':f['Y']+f['Height']/2,'duration':None})
def capture(name,stage,hierarchy):
 (out/f'{name}-{stage}.hierarchy.json').write_text(json.dumps(hierarchy,ensure_ascii=False))
 (out/f'{name}-{stage}.png').unlink(missing_ok=True)
 subprocess.run(['xcrun','simctl','io',uid,'screenshot',str(out/f'{name}-{stage}.png')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def persisted():
 data=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data']).decode().strip())
 manifest=json.loads((data/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1/manifest.json').read_text())
 return manifest,json.loads(manifest['@almost_tamagotchi_state'])
def open_care():
 hierarchy,cat=wait('today-cat-care');time.sleep(4.5)
 hierarchy,cat=wait('today-cat-care')
 for attempt in range(3):
  tap(cat)
  try:return wait('tamagotchi-immunity-card',timeout=4)
  except TimeoutError:hierarchy,cat=wait('today-cat-care')
 raise TimeoutError('open care')
subprocess.run(['python3',str(root/'seed-no-immunity.py'),'light','indigo','ru'],check=True)
hierarchy,cat=wait('today-cat-care');time.sleep(4.5)
hierarchy,cat=wait('today-cat-care')
for attempt in range(3):
 tap(cat)
 try:
  hierarchy,back=wait('tamagotchi-back-button',timeout=4);break
 except TimeoutError:hierarchy,cat=wait('today-cat-care')
else:raise TimeoutError('unprotected care')
capture('activation','before',hierarchy)
d=json.loads((root/'translations.json').read_text())['ru'];label=d['tamagotchiPartyButtonLabel'].replace('{{cost}}','25')
for attempt in range(8):
 hierarchy=tree();party=find(hierarchy,label=label)
 if party and party['frame']['Y']>=116 and party['frame']['Y']+party['frame']['Height']<=845:break
 api('swipe',{'appId':app,'appIds':[app],'startX':201,'startY':735,'endX':201,'endY':390,'duration':.3})
else:raise AssertionError('party not visible')
before_manifest,before=persisted();started=time.time()*1000;tap(party)
# Capture actual immediate party state, then wait for persisted activation rather than assuming tap success.
capture('activation','immediate',tree())
end=time.monotonic()+20
while time.monotonic()<end:
 after_manifest,after=persisted()
 if after['hungerImmunityUntil']>started+47.9*3600000:break
 time.sleep(.2)
else:raise AssertionError('party did not activate')
# Return via the observed back button; inspect the visible speech after state update.
hierarchy,back=wait('tamagotchi-back-button');tap(back)
hierarchy,cat=wait('today-cat-care');time.sleep(1);hierarchy,cat=wait('today-cat-care');capture('activation','home-after',hierarchy)
hierarchy,card=open_care();capture('activation','care-after',hierarchy)
hierarchy,back=wait('tamagotchi-back-button');tap(back)
# Background/foreground using the observed driver API's explicit launch is covered separately by a cold relaunch.
subprocess.run(['xcrun','simctl','terminate',uid,app],check=True)
subprocess.run(['xcrun','simctl','launch','--arch=x86_64',uid,app],check=True)
hierarchy,cat=wait('today-cat-care');time.sleep(6);hierarchy,cat=wait('today-cat-care');capture('activation','home-relaunch',hierarchy)
hierarchy,card=open_care();capture('activation','care-relaunch',hierarchy)
final_manifest,final=persisted()
assert final['hungerImmunityUntil']>time.time()*1000
assert final['hunger']==0 and final['mood']==0 and final['cleanliness']==0
assert float(final_manifest['@almost_health_points'])<float(before_manifest['@almost_health_points'])
(root/'activation-results.json').write_text(json.dumps({'functional':'pass','startedAt':started,'before':before,'after':after,'afterRelaunch':final,'coinsBefore':before_manifest['@almost_health_points'],'coinsAfter':final_manifest['@almost_health_points']},indent=2))
print('ACTIVATION PASS',flush=True)
