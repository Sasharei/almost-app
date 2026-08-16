const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveFabTutorialCutout,
} = require("../../src/utils/fabTutorialGeometry");

test("centers the tutorial cutout on the FAB layout insets", () => {
  const cutout = resolveFabTutorialCutout({
    overlayWidth: 385,
    overlayHeight: 853,
    fabRight: 24,
    fabBottom: 109,
    fabSize: 64,
    haloSize: 128,
    cutoutBleed: 1,
  });

  assert.equal(cutout.centerX, 329);
  assert.equal(cutout.centerY, 712);
  assert.equal(cutout.radius, 65);
  assert.equal(cutout.left, 264);
  assert.equal(cutout.right, 385);
});

test("keeps the cutout aligned after a viewport size change", () => {
  const portrait = resolveFabTutorialCutout({
    overlayWidth: 385,
    overlayHeight: 853,
    fabRight: 24,
    fabBottom: 109,
    fabSize: 64,
    haloSize: 128,
  });
  const landscape = resolveFabTutorialCutout({
    overlayWidth: 853,
    overlayHeight: 385,
    fabRight: 24,
    fabBottom: 109,
    fabSize: 64,
    haloSize: 128,
  });

  assert.equal(portrait.overlayWidth - portrait.centerX, 56);
  assert.equal(landscape.overlayWidth - landscape.centerX, 56);
  assert.equal(portrait.overlayHeight - portrait.centerY, 141);
  assert.equal(landscape.overlayHeight - landscape.centerY, 141);
});
