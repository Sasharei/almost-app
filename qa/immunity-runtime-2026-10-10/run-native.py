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
results=[result for result in json.loads((root/'native-results.json').read_text()) if result['functional']=='pass'] if (root/'native-results.json').exists() else []
completed={result['case'] for result in results}
for language in langs:
 for theme,accent in palettes:
  name=language+'-'+theme+('-'+accent if theme=='pro' else '');started=time.monotonic()
  if name in completed:continue
  print('START',name,flush=True)
  try:
   query=urllib.parse.urlencode({'language':language,'theme':theme,'accent':accent})
   with urllib.request.urlopen('http://127.0.0.1:8769/seed?'+query,timeout=40) as response:copy=json.load(response)
   hierarchy,cat=wait('today-cat-care')
   # Native hierarchy can expose the React tree while the launch splash still covers it.
   time.sleep(4.5)
   hierarchy,cat=wait('today-cat-care')
   if theme=='light':capture(name,'home',hierarchy)
   attempts=0
   for attempts in range(1,4):
    tap(cat)
    try:
     hierarchy,card=wait('tamagotchi-immunity-card',timeout=4);break
    except TimeoutError:
     hierarchy,cat=wait('today-cat-care')
   else:raise TimeoutError('Care did not open after synchronization retries')
   collapsed=card['frame'];tap(card)
   hierarchy,expanded=wait('tamagotchi-immunity-card',collapsed['Height']+20)
   capture(name,'expanded',hierarchy)
   party=None
   for attempt in range(8):
    hierarchy=tree();party=find(hierarchy,label=copy['party'])
    if party and party['frame']['Y']>=116 and party['frame']['Y']+party['frame']['Height']<=845:break
    api('swipe',{'appId':app,'appIds':[app],'startX':201,'startY':735,'endX':201,'endY':390,'duration':.3})
   else:raise AssertionError('Party control not fully visible')
   capture(name,'party',hierarchy)
   data=pathlib.Path(subprocess.check_output(['xcrun','simctl','get_app_container',uid,app,'data']).decode().strip())
   manifest=json.loads((data/'Library/Application Support'/app/'RCTAsyncLocalStorage_V1/manifest.json').read_text())
   state=json.loads(manifest['@almost_tamagotchi_state'])
   assert state['hungerImmunityUntil']>time.time()*1000
   assert state['hunger']==0 and state['mood']==0 and state['cleanliness']==0
   result={'case':name,'functional':'pass','openAttempts':attempts,'collapsedFrame':collapsed,'expandedFrame':expanded['frame'],'partyFrame':party['frame'],'state':{key:state[key] for key in ['hunger','mood','cleanliness','hungerImmunityUntil']},'seconds':round(time.monotonic()-started,2)}
  except Exception as error:
   result={'case':name,'functional':'failed','error':repr(error),'seconds':round(time.monotonic()-started,2)}
  results.append(result);(root/'native-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
  print('DONE',json.dumps(result,ensure_ascii=False),flush=True)
  if result['functional']!='pass':sys.exit(1)
