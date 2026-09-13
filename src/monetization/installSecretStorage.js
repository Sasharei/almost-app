// Pure adapter so migration failure/retry behavior can be exercised without a device.
const loadInstallSecret = async ({ readSecure, writeSecure, readLegacy, removeLegacy, randomBytes }) => {
  const saved = await readSecure();
  if (saved) {
    // A failed cleanup must not discard an already durable credential.
    await removeLegacy().catch(() => {});
    return saved;
  }
  const legacy = await readLegacy();
  const normalized = typeof legacy === "string" ? legacy.trim() : "";
  const bytes = normalized ? null : await randomBytes(32);
  if (bytes && bytes.length !== 32) throw new Error("invalid_secure_random_length");
  // Preserve existing credentials exactly; never rotate a registered secret locally.
  const value = normalized || Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  await writeSecure(value);
  if (await readSecure() !== value) throw new Error("secure_storage_write_unverified");
  await removeLegacy().catch(() => {});
  return value;
};
module.exports = { loadInstallSecret };
