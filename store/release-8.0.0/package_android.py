"""Split optional native debug metadata into a Play-uploadable sidecar; preserve every runtime byte."""
import hashlib,json,os,shutil,subprocess,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent;builds=root/'builds';original=builds/'Almost-8.0.0-128.aab';output=builds/'Almost-8.0.0-128-store.aab';symbols=builds/'Almost-8.0.0-128-native-debug-symbols.zip';prefix='BUNDLE-METADATA/com.android.tools.build.debugsymbols/'
if output.exists():raise SystemExit('Refusing to replace existing prepared store bundle')
with zipfile.ZipFile(original) as source,zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as target,zipfile.ZipFile(symbols,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as sidecar:
 for info in source.infolist():
  if info.filename.startswith('META-INF/'):continue
  data=source.read(info.filename)
  if info.filename.startswith(prefix):
   name=info.filename[len(prefix):]
   if name.endswith('.sym'):name=name[:-4]
   sidecar.writestr(name,data)
  else:
   info._compresslevel=9;target.writestr(info,data)
properties={}
for line in (root.parents[1]/'android/keystore.properties').read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  key,value=line.split('=',1);properties[key.strip()]=value.strip()
store=Path(properties['storeFile'])
if not store.is_absolute():store=root.parents[1]/'android'/store
assert store.is_file()
env=os.environ.copy();env['ALMOST_PACKAGE_STORE_PASSWORD']=properties['storePassword'];env['ALMOST_PACKAGE_KEY_PASSWORD']=properties['keyPassword']
with (root/'checks/android-package-signing.log').open('w') as log:
 subprocess.run(['jarsigner','-keystore',str(store),'-storepass:env','ALMOST_PACKAGE_STORE_PASSWORD','-keypass:env','ALMOST_PACKAGE_KEY_PASSWORD','-sigalg','SHA256withRSA','-digestalg','SHA-256',str(output),properties['keyAlias']],env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
 subprocess.run(['jarsigner','-verify',str(output)],stdout=log,stderr=subprocess.STDOUT,check=True)
# Compare complete runtime and configuration contents, and all native symbols.
with zipfile.ZipFile(original) as source,zipfile.ZipFile(output) as target,zipfile.ZipFile(symbols) as sidecar:
 expected={i.filename for i in source.infolist() if not i.filename.startswith(('META-INF/',prefix))}
 actual={i.filename for i in target.infolist() if not i.filename.startswith('META-INF/')}
 assert expected==actual
 for name in expected:assert source.read(name)==target.read(name),name
 for info in source.infolist():
  if info.filename.startswith(prefix):
   name=info.filename[len(prefix):]
   if name.endswith('.sym'):name=name[:-4]
   assert source.read(info.filename)==sidecar.read(name),name
 def certificate(path):
  result=subprocess.check_output(['keytool','-printcert','-jarfile',str(path)],stderr=subprocess.DEVNULL).decode()
  return next(line.strip() for line in result.splitlines() if 'SHA256:' in line)
 assert certificate(original)==certificate(output)
 assert output.stat().st_size<=100000000
 original_provenance=json.loads((builds/'Almost-8.0.0-128.provenance.json').read_text())
 original_provenance.update(artifact=str(output.relative_to(root.parents[1])),sha256=hashlib.sha256(output.read_bytes()).hexdigest(),bytes=output.stat().st_size)
 original_provenance['packaging']={'original_gradle_sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'original_bytes':original.stat().st_size,'native_symbols_sidecar':symbols.name,'native_symbols_sha256':hashlib.sha256(symbols.read_bytes()).hexdigest(),'all_runtime_entries_byte_identical':True,'all_configuration_entries_byte_identical':True,'native_symbols_preserved':True,'upload_certificate_unchanged':True,'runtime_entry_count':len(expected),'note':'Upload the native symbol sidecar for version 128 in Play Console; ReTrace mapping stays embedded.'}
 (builds/'Almost-8.0.0-128-store.provenance.json').write_text(json.dumps(original_provenance,indent=2)+'\n')
 print(json.dumps({'store_aab_bytes':output.stat().st_size,'symbols_zip_bytes':symbols.stat().st_size,'runtime_entries_unchanged':len(expected)},indent=2))
