"""Verify Apple's AEA signature and inspect the actual signed payload, not only source."""
import pathlib, plistlib, struct, subprocess, tempfile

def signed_workflow(path):
    blob = path.read_bytes()
    if blob[:4] != b'AEA1': raise ValueError('Unsigned shortcut')
    auth = plistlib.loads(blob[12:12 + struct.unpack('<I', blob[8:12])[0]])
    with tempfile.TemporaryDirectory(prefix='almost-wallet-verify-') as directory:
        directory = pathlib.Path(directory)
        cert = directory / 'signer.der'
        cert.write_bytes(auth['SigningCertificateChain'][0])
        pem = subprocess.check_output(['openssl', 'x509', '-inform', 'DER', '-in', str(cert), '-pubkey', '-noout'])
        der = subprocess.check_output(['openssl', 'pkey', '-pubin', '-outform', 'DER'], input=pem)
        public_key = der[-65:]
        if public_key[0] != 4: raise ValueError('Unexpected signing key')
        archive = directory / 'workflow.aar'
        subprocess.run(['aea', 'decrypt', '-i', str(path), '-o', str(archive), '-sign-pub-value', 'hex:' + public_key.hex()], check=True)
        subprocess.run(['aa', 'extract', '-i', str(archive), '-d', str(directory / 'decoded')], check=True)
        return plistlib.loads((directory / 'decoded/Shortcut.wflow').read_bytes())

def verify(source, signed):
    actual = signed_workflow(signed)
    for key in ('WFWorkflowActions', 'WFWorkflowImportQuestions', 'WFWorkflowTriggers'):
        if actual.get(key) != source.get(key):
            raise ValueError('Signing changed ' + key + '; use Shortcuts on macOS 27+ for Wallet automation exports')
    return actual
