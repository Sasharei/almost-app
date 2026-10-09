const test = require('node:test');
const assert = require('node:assert/strict');
const { createAlmostPaySequence } = require('../../src/utils/almostPaySequence');
function fixture(authorize = null) {
  const phases = []; let completed = 0; const timers = new Map(); let id = 0;
  const sequence = createAlmostPaySequence({ onPhase: p => phases.push(p), onConfirmed: () => completed++, authorize,
    schedule: callback => { timers.set(++id, callback); return id; }, cancel: key => timers.delete(key) });
  const tick = () => { const entry = timers.entries().next().value; if(entry) { timers.delete(entry[0]); entry[1](); } };
  return { sequence, phases, tick, completed: () => completed };
}
test('one press prepares without changing the result; two presses complete exactly once', () => {
  const f = fixture(); f.sequence.press(); f.tick(); assert.deepEqual(f.phases,['ready']); assert.equal(f.completed(),0);
  f.sequence.press(); for(let i=0;i<10;i++) f.sequence.press(); assert.deepEqual(f.phases,['ready','processing']);
  f.tick(); assert.equal(f.completed(),0); f.sequence.press(); f.tick(); f.sequence.press(); f.tick();
  assert.deepEqual(f.phases,['ready','processing','success']); assert.equal(f.completed(),1);
});
const settle = () => new Promise(resolve => setImmediate(resolve));
test('biometrics start on one press and require an actual successful result before processing', async () => {
  let accept; let scans = 0;
  const f = fixture(() => { scans++; return new Promise(resolve => { accept = resolve; }); });
  f.sequence.press(); f.sequence.press(); await settle(); f.tick();
  assert.equal(scans, 1); assert.deepEqual(f.phases, ['authenticating']); assert.equal(f.completed(), 0);
  accept(true); await settle(); assert.deepEqual(f.phases, ['authenticating', 'processing']);
  f.tick(); f.tick(); f.sequence.press(); assert.equal(f.completed(), 1);
});
test('biometric rejection or error records nothing and allows retry', async () => {
  for (const rejected of [() => false, () => { throw Error('sensor unavailable'); }]) {
    const f = fixture(rejected); f.sequence.press(); await settle(); f.tick(); f.tick();
    assert.deepEqual(f.phases, ['authenticating', 'idle']); assert.equal(f.completed(), 0);
    f.sequence.press(); await settle(); assert.equal(f.completed(), 0);
  }
});
test('a successful biometric response after cancellation cannot complete a dismissed payment', async () => {
  let accept; const f = fixture(() => new Promise(resolve => { accept = resolve; }));
  f.sequence.press(); await settle(); f.sequence.dispose(); accept(true); await settle(); f.tick(); f.tick();
  assert.deepEqual(f.phases, ['authenticating']); assert.equal(f.completed(), 0);
});
const { resolveAlmostPayBiometricMethod } = require('../../src/utils/almostPayBiometrics');
test('biometric labels follow available enrolled hardware and leave the OS to choose between modalities', () => {
  const method = (platform, types, enrolled = true, hasHardware = true) => resolveAlmostPayBiometricMethod({ platform, types, enrolled, hasHardware });
  assert.equal(method('ios', [2]), 'FaceID'); assert.equal(method('ios', [1]), 'TouchID');
  assert.equal(method('android', [2]), 'Face'); assert.equal(method('android', [1]), 'Fingerprint');
  assert.equal(method('android', [1, 2]), 'Biometrics'); assert.equal(method('android', [3]), 'Biometrics');
  assert.equal(method('ios', [2], false), null); assert.equal(method('android', [1], true, false), null);
});
test('cancel at each stage prevents a later confirmation, including unmounted sheets', () => {
  for(const stage of ['idle','ready','processing','success']) {
    const f=fixture(); if(stage!=='idle') f.sequence.press(); if(['processing','success'].includes(stage)) f.sequence.press(); if(stage==='success') f.tick();
    f.sequence.dispose(); f.tick(); f.tick(); f.sequence.press(); assert.equal(f.completed(),0,stage);
  }
});
test('two explicit activations need no timing precision for accessible confirmation', () => {
  const f=fixture(); f.sequence.press(); for(let i=0;i<20;i++)f.tick(); f.sequence.press(); f.tick(); f.tick(); assert.equal(f.completed(),1);
});
const { confirmationAmountPrecision } = require('../../src/utils/confirmationAmount');
test('confirmation rounds FX residue to currency minor units', () => {
  assert.equal(confirmationAmountPrecision(12.34, 2), 2);
  assert.equal(confirmationAmountPrecision(12.345, 2), 2);
  assert.equal(confirmationAmountPrecision(12.345678, 2), 2);
  assert.equal(confirmationAmountPrecision(12.3399999999999, 2), 2);
  assert.equal(confirmationAmountPrecision(1200, 0), 0);
  assert.equal(confirmationAmountPrecision(12.5, 0), 0);
});
