import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../admin/suggestions/app.js',import.meta.url),'utf8');
const adapter=source.slice(source.indexOf('const controllers = new Set();'),source.indexOf('function showLogin('));
const harness=fetch=>{let active=0;const context={AbortController,Set,Error,csrf:'synthetic-csrf',fetch,setTimeout:fn=>{active++;return setTimeout(fn,12)},clearTimeout:id=>{active--;clearTimeout(id)}};vm.createContext(context);vm.runInContext(adapter+';this.request=api;',context);return {request:context.request,active:()=>active};};
test('owner request deadline includes body and has explanatory TimeoutError rather than silent cancellation',async()=>{
 const h=harness(async(url,{signal})=>({ok:true,json:()=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{const error=new Error('aborted');error.name='AbortError';reject(error)},{once:true}))}));
 await assert.rejects(h.request('ideas'),error=>error.name==='TimeoutError');assert.equal(h.active(),0);
});
test('intentional owner navigation cancellation stays AbortError and releases deadline',async()=>{
 let calls=0;const h=harness((url,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>{const error=new Error('aborted');error.name='AbortError';reject(error)},{once:true}));});
 const controller=new AbortController();const pending=h.request('ideas',{signal:controller.signal});controller.abort();await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(calls,1);assert.equal(h.active(),0);
});
