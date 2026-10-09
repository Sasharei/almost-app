import hashlib,json,os,shutil,subprocess,tempfile
from pathlib import Path
root=Path.cwd(); dest=Path(tempfile.mkdtemp(prefix='almost-release-8.0.0-'))
files=subprocess.check_output(['git','ls-files','-co','--exclude-standard','-z']).decode().split('\0')
skip=('qa/','design/','output/','store/','.impeccable/','.playwright-cli/')
manifest=[]
for name in sorted(set(files)):
 if not name or name.startswith(skip): continue
 source=root/name
 if not source.is_file(): continue
 target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
 manifest.append({'path':name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
# Runtime inputs and signing material remain ignored and are never added to Git.
for name in ['package-lock.json','.env','android/local.properties','android/keystore.properties','android/app/release.keystore']:
 source=root/name
 if source.is_file():
  target=dest/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
subprocess.run(['git','init','-q',str(dest)],check=True)
subprocess.run(['git','add','.'],cwd=dest,check=True)
subprocess.run(['git','-c','user.name=Codex Release Snapshot','-c','user.email=release-snapshot@localhost','commit','-qm','Snapshot current Almost 8.0.0 sources for release build'],cwd=dest,check=True)
(root/'store/release-8.0.0/source-snapshot.json').write_text(json.dumps({'snapshot_path':str(dest),'original_head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'snapshot_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=dest).decode().strip(),'original_worktree_preserved':True,'files':manifest},indent=2)+'\n')
config=json.loads(Path('/Users/sasarei/.config/almost/release/applovin.json').read_text());env=os.environ.copy()
for key,value in config.items(): env[key]='\n'.join(value) if isinstance(value,list) else str(value)
print('Building isolated release snapshot:',dest,flush=True)
with (root/'store/release-8.0.0/checks/android-dependencies.log').open('w') as log:
 for command in [['npm','ci','--no-audit','--no-fund'],['npm','--prefix','backend','ci','--no-audit','--no-fund']]:
  result=subprocess.run(command,cwd=dest,stdout=log,stderr=subprocess.STDOUT)
  if result.returncode: raise SystemExit(result.returncode)
# The existing release artifact supplies the pre-build size baseline. Check the newly built AAB again below.
env['APP_SIZE_ARTIFACT']=str(root/'android/app/build/outputs/apk/release/app-release.apk')
with (root/'store/release-8.0.0/checks/android-release.log').open('w') as log:
 result=subprocess.run(['npm','run','release:android'],cwd=dest,env=env,stdout=log,stderr=subprocess.STDOUT)
print('Android release exit:',result.returncode,flush=True)
if result.returncode==0:
 builds=root/'store/release-8.0.0/builds';builds.mkdir(exist_ok=True)
 for name in ['app-release.aab','app-release.provenance.json']:
  shutil.copy2(dest/'android/app/build/outputs/bundle/release'/name,builds/name.replace('app-release','Almost-8.0.0-128'))

 env['APP_SIZE_ARTIFACT']=str(builds/'Almost-8.0.0-128.aab')
 with (root/'store/release-8.0.0/checks/android-final-size.log').open('w') as log:
  result=subprocess.run(['npm','run','size:check'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
 print('Final AAB size gate exit:',result.returncode,flush=True)
raise SystemExit(result.returncode)
