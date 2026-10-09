const assert = require("node:assert/strict");
const test = require("node:test");
const { resolveControlGeometry } = require("../../src/utils/controlGeometry");

test("compact icon controls reserve non-overlapping platform-sized layout targets", () => {
  for (const target of [44, 48]) {
    const style = { width: 28, height: 28, borderRadius: 14 };
    const geometry = resolveControlGeometry(style, target);
    assert.equal(geometry.width, target);
    assert.equal(geometry.height, target);
    assert.equal(geometry.minWidth, target);
    assert.equal(geometry.minHeight, target);
    assert.deepEqual(style, { width: 28, height: 28, borderRadius: 14 });
  }
});

test("full-width actions can grow for long translations and accessibility text", () => {
  const geometry = resolveControlGeometry({ width: "100%", height: 52 }, 48);
  assert.equal(geometry.height, undefined);
  assert.equal(geometry.minHeight, 52);
});

test("already large and flexible targets preserve their layout constraints", () => {
  const geometry = resolveControlGeometry({ minHeight: 70, minWidth: 90, flex: 1, justifyContent: "flex-start" }, 48);
  assert.equal(geometry.minHeight, 70);
  assert.equal(geometry.minWidth, 90);
  assert.equal(geometry.height, undefined);
  assert.equal(geometry.width, undefined);
  assert.equal(geometry.justifyContent, undefined);
});

test("switch artwork and explicitly collapsed controls keep their measured geometry", () => {
  assert.equal(resolveControlGeometry({ width: 48, height: 28 }, 48, "switch"), null);
  assert.equal(resolveControlGeometry({ height: 0 }, 48), null);
  assert.equal(resolveControlGeometry({ display: "none" }, 48), null);
});

test("legacy maximum dimensions cannot negate the reserved touch target", () => {
  const geometry = resolveControlGeometry({ width: 32, height: 32, maxWidth: 36, maxHeight: 36 }, 48);
  assert.equal(geometry.maxWidth, 48);
  assert.equal(geometry.maxHeight, 48);
});
