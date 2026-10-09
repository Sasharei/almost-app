import fs from 'node:fs';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
const envPath=new URL('../../backend/.env',import.meta.url);
const vars=Object.fromEntries(fs.readFileSync(envPath,'utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
export async function api(path,method='GET',data){
 const now=Math.floor(Date.now()/1000),b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const input=b({alg:'ES256',kid:'J8UB294T2C',typ:'JWT'})+'.'+b({iss:vars.APPLE_ISSUER_ID,iat:now,exp:now+600,aud:'appstoreconnect-v1'});
 const token=input+'.'+crypto.sign('sha256',Buffer.from(input),{key:fs.readFileSync('/Users/sasarei/Desktop/Almost_design/API/AuthKey_J8UB294T2C.p8'),dsaEncoding:'ieee-p1363'}).toString('base64url');
 const r=await fetch('https://api.appstoreconnect.apple.com/v1/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
 const result=r.status===204?{}:await r.json();if(!r.ok)throw new Error(JSON.stringify({status:r.status,errors:result.errors}));return result;
}
