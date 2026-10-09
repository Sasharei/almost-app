const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

function checkSecurityVendors() {
  const root = path.resolve(__dirname, '..');
  const consumer = createRequire(require.resolve('micromatch'));
  const installedBraces = consumer.resolve('braces');
  const expoRequire = createRequire(require.resolve('expo/package.json'));
  const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
  const installedForge = cliRequire.resolve('node-forge');
  for (const [name, installed] of [['braces', installedBraces], ['node-forge', installedForge]]) {
    const vendor = path.join(root, 'vendor/security', name);
    assert.equal(fs.realpathSync(installed), fs.realpathSync(require.resolve(vendor)), `${name} must use the maintained security fork`);
    const metadata = require(path.join(vendor, 'package.json'));
    assert.equal(metadata.name, `@almost-security/${name}`);
    const manifest = require(path.join(root, 'vendor/security/source-integrity.json'))[name];
    const { createHash } = require('node:crypto');
    for (const [file, expected] of Object.entries(manifest)) {
      assert.equal(createHash('sha256').update(fs.readFileSync(path.join(vendor, file))).digest('hex'), expected, `${name}/${file} integrity`);
    }
  }
  const braces = consumer('braces');
  assert.deepEqual(braces.expand('a/{b,{c,d}}/{1..3}'), ['a/b/1','a/b/2','a/b/3','a/c/1','a/c/2','a/c/3','a/d/1','a/d/2','a/d/3']);
  const deep = '{'.repeat(4000) + 'a,b' + '}'.repeat(4000);
  for (const method of ['parse','compile','expand','stringify']) {
    assert.throws(() => braces[method](deep), error => error instanceof SyntaxError && /nesting/.test(error.message));
    let ast = { type: 'text', value: 'x' };
    for (let i = 0; i < 1000; i++) ast = { type: 'root', nodes: [ast] };
    if (method !== 'parse') assert.throws(() => braces[method](ast), SyntaxError);
  }
  const cycle = { type: 'root', nodes: [] }; cycle.nodes.push(cycle);
  for (const method of ['compile','expand','stringify']) assert.throws(() => braces[method](cycle), SyntaxError);

  const forge = cliRequire('node-forge');
  const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 });
  const md = forge.md.sha256.create(); md.update('synthetic security regression');
  const digest = md.digest().getBytes();
  assert.equal(keys.publicKey.verify(digest, keys.privateKey.sign(md)), true);
  const asn = forge.asn1;
  const info = asn.create(asn.Class.UNIVERSAL, asn.Type.SEQUENCE, true, [
    asn.create(asn.Class.UNIVERSAL, asn.Type.SEQUENCE, true, [
      asn.create(asn.Class.UNIVERSAL, asn.Type.OID, false, asn.oidToDer(forge.oids.sha256).getBytes()),
      asn.create(asn.Class.UNIVERSAL, asn.Type.NULL, false, ''),
    ]),
    asn.create(asn.Class.UNIVERSAL, asn.Type.OCTETSTRING, false, digest),
  ]);
  const verifyInfo = value => keys.publicKey.verify(digest, keys.privateKey.sign(asn.toDer(value).getBytes(), 'NONE'));
  assert.equal(verifyInfo(info), true);
  info.value[0].value.push(asn.create(asn.Class.UNIVERSAL, asn.Type.OCTETSTRING, false, 'garbage'));
  assert.throws(() => verifyInfo(info), /DigestInfo/);
  info.value[0].value.splice(1);
  info.value[0].value.push(asn.create(asn.Class.UNIVERSAL, asn.Type.OCTETSTRING, false, 'garbage'));
  assert.throws(() => verifyInfo(info), /DigestInfo/);
  info.value[0].value.splice(1);
  assert.equal(verifyInfo(info), true); // SHA256 AlgorithmIdentifier permits absent parameters.
  const cert = forge.pki.createCertificate(); cert.publicKey = keys.publicKey;
  cert.serialNumber = '01'; cert.validity.notBefore = new Date(); cert.validity.notAfter = new Date(Date.now() + 60000);
  const attrs = [{name:'commonName', value:'synthetic.invalid'}]; cert.setSubject(attrs); cert.setIssuer(attrs); cert.sign(keys.privateKey, forge.md.sha256.create());
  assert.equal(cert.verify(forge.pki.certificateFromPem(forge.pki.certificateToPem(cert))), true);
}
module.exports = { checkSecurityVendors };
