const ALMOST_RELEASE_SCOPE = Object.freeze({
  iosBundleId: "com.sasarei.almostclean",
  iosAppStoreId: "6756276744",
  androidPackage: "com.sasarei.almostclean",
  tiktokAndroidAppId: "7601076786457329672",
  tiktokIosAppId: "7604101135837855751",
});

const FORBIDDEN_RELEASE_IDS = Object.freeze([
  "6778129996",
  "7655726160134275080",
]);

const assertAlmostReleaseScope = ({
  iosBundleId,
  iosAppStoreId,
  androidPackage,
  tiktokAndroidAppId,
  tiktokIosAppId,
} = {}) => {
  const resolved = {
    iosBundleId: String(iosBundleId || ALMOST_RELEASE_SCOPE.iosBundleId).trim(),
    iosAppStoreId: String(iosAppStoreId || ALMOST_RELEASE_SCOPE.iosAppStoreId).trim(),
    androidPackage: String(androidPackage || ALMOST_RELEASE_SCOPE.androidPackage).trim(),
    tiktokAndroidAppId: String(
      tiktokAndroidAppId || ALMOST_RELEASE_SCOPE.tiktokAndroidAppId
    ).trim(),
    tiktokIosAppId: String(tiktokIosAppId || ALMOST_RELEASE_SCOPE.tiktokIosAppId).trim(),
  };
  Object.values(resolved).forEach((value) => {
    if (FORBIDDEN_RELEASE_IDS.some((forbiddenId) => value.includes(forbiddenId))) {
      throw new Error("Almost Crossed identifier detected in release analytics scope");
    }
  });
  Object.entries(ALMOST_RELEASE_SCOPE).forEach(([key, expected]) => {
    if (resolved[key] !== expected) {
      throw new Error(`Invalid Almost release scope for ${key}`);
    }
  });
  return resolved;
};

module.exports = {
  ALMOST_RELEASE_SCOPE,
  FORBIDDEN_RELEASE_IDS,
  assertAlmostReleaseScope,
};
