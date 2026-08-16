const bootstrapAppsFlyerAttribution = async ({
  ensureInstallId,
  setInstallIdentity,
  initAttribution,
} = {}) => {
  if (typeof ensureInstallId !== "function") {
    throw new Error("AppsFlyer bootstrap requires ensureInstallId");
  }
  if (typeof setInstallIdentity !== "function") {
    throw new Error("AppsFlyer bootstrap requires setInstallIdentity");
  }
  if (typeof initAttribution !== "function") {
    throw new Error("AppsFlyer bootstrap requires initAttribution");
  }
  const installId = await ensureInstallId();
  await setInstallIdentity(installId);
  return initAttribution();
};

module.exports = {
  bootstrapAppsFlyerAttribution,
};
