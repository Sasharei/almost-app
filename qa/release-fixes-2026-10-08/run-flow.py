"""Execute one Maestro journey and retain its first result, JUnit and evidence."""
import argparse,datetime,json,os,pathlib,subprocess
p=argparse.ArgumentParser();p.add_argument('platform',choices=['ios','android']);p.add_argument('flow');p.add_argument('--device');a=p.parse_args()
root=pathlib.Path(__file__).resolve().parent
uid={'ios':'9B99C8DA-25BC-4C63-B2C5-AB7E59853D18','android':'emulator-5582'}[a.platform]
uid=a.device or uid
flow=pathlib.Path(a.flow).resolve(); stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S');name=a.platform+'-'+flow.stem+'-'+stamp
out=root/'evidence'/name;out.mkdir(parents=True)
cmd=[str(pathlib.Path.home()/'.maestro/bin/maestro'),'--device',uid,'test','--format','JUNIT','--output',str(out/'junit.xml'),'--test-output-dir',str(out),str(flow)]
env=os.environ.copy();env['JAVA_HOME']='/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home'
with (out/'runner.log').open('w') as f:r=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT,env=env)
rec={'platform':a.platform,'device':uid,'flow':str(flow),'command':cmd,'exitCode':r.returncode,'evidence':str(out)}
with (root/'results.jsonl').open('a') as f:f.write(json.dumps(rec)+'\n')
print(json.dumps(rec));print((out/'runner.log').read_text()[-2500:]);raise SystemExit(r.returncode)
