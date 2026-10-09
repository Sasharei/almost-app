// The OS selects the actual enrolled modality. Never claim face scanning on
// a fingerprint-only device or assume that installed hardware is enrolled.
function resolveAlmostPayBiometricMethod({ platform, types = [], hasHardware, enrolled }) {
  if (!hasHardware || !enrolled) return null;
  const fingerprint = types.includes(1);
  const face = types.includes(2);
  if (fingerprint && face) return 'Biometrics';
  if (face) return platform === 'ios' ? 'FaceID' : 'Face';
  if (fingerprint) return platform === 'ios' ? 'TouchID' : 'Fingerprint';
  return 'Biometrics';
}
module.exports = { resolveAlmostPayBiometricMethod };
