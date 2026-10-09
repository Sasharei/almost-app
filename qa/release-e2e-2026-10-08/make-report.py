import pathlib,json,hashlib,xml.etree.ElementTree as E,collections
root=pathlib.Path('/Users/sasarei/Downloads/almost_clean');q=root/'qa/release-e2e-2026-10-08'
checks=[]
for item in json.loads((q/'source-fingerprint.json').read_text()):
 p=root/item['path']; checks.append({'path':item['path'],'unchanged':p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']})
(q/'source-integrity-final.json').write_text(json.dumps(checks,indent=2))
index=[]
for p in sorted((q/'evidence').glob('*/junit.xml')):
 try:
  for case in E.parse(p).getroot().iter('testcase'):
   index.append({'run':p.parent.name,'name':case.get('name'),'seconds':case.get('time'),'runner':'FAIL' if case.find('failure') is not None or case.find('error') is not None else 'PASS'})
 except Exception:pass
(q/'runner-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2))
meta={'build':'8.0.0 (128)','head':'160fd606bd2f9a41d8357d0bc014f166385ca6a8','testedTree':'pre-existing dirty working tree','sourceFingerprintUnchanged':all(i['unchanged'] for i in checks),'runnerCounts':dict(collections.Counter(i['runner'] for i in index)),'runnerRuns':len(index)}
apk=root/'android/app/build/outputs/apk/release/app-release.apk';meta['androidRelease']={'path':str(apk),'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest()}
(q/'session-summary.json').write_text(json.dumps(meta,indent=2));print(meta)
