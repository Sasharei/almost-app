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

for language in ['en','es','fr','ru']:
 query=urllib.parse.urlencode({'language':language,'theme':'light','accent':'indigo'})
 with urllib.request.urlopen('http://127.0.0.1:8769/seed?'+query,timeout=40) as response:copy=json.load(response)
 hierarchy,cat=wait('today-cat-care');time.sleep(6);hierarchy,cat=wait('today-cat-care')
 name=language+'-light'
 # Preserve the initial splash as cold-launch evidence, then replace the unverified home capture.
 for suffix in ['.png','.hierarchy.json','.ocr.json']:
  old=out/(name+'-home'+suffix)
  if old.exists():old.rename(out/(name+'-cold-splash'+suffix))
 capture(name,'home',hierarchy)
 print('SETTLED HOME',language,flush=True)
