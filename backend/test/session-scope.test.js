import assert from 'node:assert/strict';
import test from 'node:test';
Object.assign(process.env, {NODE_ENV:'test', STORE_PATH:'', APP_SESSION_SECRET:'synthetic-session-scope-test-secret', REQUIRE_INSTALL_SECRET_PROOF:'0', ENFORCE_INSTALL_ID_BINDING:'1', APPLE_VALIDATION_ENABLED:'0', GOOGLE_VALIDATION_ENABLED:'0'});
const {app}=await import('../src/server.js');
const {config}=await import('../src/config.js');
const {upsertEntitlement, getEntitlementByUser, verifyOrRegisterInstallSecret, hasVerifiedInstallSecret, cacheIdempotentResponse, markTransactionSeen}=await import('../src/store/entitlementsStore.js');
const {issueSessionToken}=await import('../src/auth/session.js');
await test('legacy compatibility sessions cannot read or grant stored entitlements', async t=>{
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 const base=`http://127.0.0.1:${server.address().port}`;
 const id='synthetic-legacy-owner-0001';
 const secret='synthetic-owner-secret-at-least-32-characters';
 const call=async(route,body,token,extra={})=>{const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`} :{}),...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(3000)});return {status:r.status,body:await r.json()};};
 const session=async(installId,installSecret,extra={})=>(await call('/v1/auth/session',{installId,appUserId:installId,platform:'ios',...(installSecret?{installSecret}:{}),...extra})).body.token;
 const stored=upsertEntitlement(id,{isPremium:true,productId:'synthetic-product'});
 try {
  for(const [label,token] of [['no secret',await session(id)],['attacker chosen secret',await session(id,secret)],['old signed token',issueSessionToken({appUserId:id,installId:id,platform:'ios'}).token],['injected claim',await session(id,secret,{installSecretVerified:true})]]) {
   await t.test(label,async()=>{
    assert.equal((await call(`/v1/entitlements/${id}`,undefined,token)).body.entitlement,null);
    const sync=await call('/v1/entitlements/sync',{appUserId:id,installId:id,platform:'ios',entitlement:{isActive:true}},token);
    assert.equal(sync.status,200);assert.equal(sync.body.accepted,true);assert.equal(sync.body.trusted,false);assert.equal(sync.body.entitlement,null);
    cacheIdempotentResponse('shared-key',{ok:true,entitlement:stored});
    const validation=await call('/v1/iap/validate',{appUserId:id,installId:id,platform:'ios'},token,{'idempotency-key':'shared-key'});
    assert.equal(validation.status,403);assert.equal(validation.body.error,'install_secret_proof_required');
    assert.deepEqual(getEntitlementByUser(id),stored);
   });
  }
  await t.test('unbound historical owner cannot be claimed by first registration',()=>{
   assert.equal(verifyOrRegisterInstallSecret(id,secret).ok,false);
   assert.equal(hasVerifiedInstallSecret(id,secret),false);
   markTransactionSeen('synthetic-historical-order','synthetic-transaction-owner');
   assert.equal(verifyOrRegisterInstallSecret('synthetic-transaction-owner',secret).ok,false);
  });
  await t.test('established binding permits only its owner',async()=>{
   const owner='synthetic-bound-owner-0001';
   assert.equal(verifyOrRegisterInstallSecret(owner,secret).ok,true);
   upsertEntitlement(owner,{isPremium:true,productId:'synthetic-owned-product'});
   const token=await session(owner,secret);
   assert.equal((await call(`/v1/entitlements/${owner}`,undefined,token)).body.entitlement.appUserId,owner);
   assert.equal((await call(`/v1/entitlements/${id}`,undefined,token)).status,401);
   assert.equal((await call(`/v1/entitlements/${owner}`,undefined,await session(owner,'wrong-secret'))).body.entitlement,null);
   const r=await call('/v1/iap/validate',{appUserId:owner,installId:owner,platform:'ios'},token,{'idempotency-key':'shared-key'});
   assert.equal(r.status,422);assert.equal(r.body.error,'apple_validation_disabled');
  });
  await t.test('strict mode cannot register historical owner',async()=>{
   config.security.requireInstallSecret=true;
   assert.equal((await call('/v1/auth/session',{installId:id,appUserId:id,platform:'ios',installSecret:secret})).status,401);
  });
 } finally {config.security.requireInstallSecret=false;await new Promise(resolve=>server.close(resolve));}
});
