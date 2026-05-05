import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const { app, buildHealthPayload, resolveTamagotchiSkinAssetDir } = await import("../src/server.js");

const getRegisteredRoutes = () =>
  app._router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) =>
      Object.keys(layer.route.methods).map(
        (method) => `${method.toUpperCase()} ${layer.route.path}`
      )
    );

test("health payload includes backend readiness", () => {
  const payload = buildHealthPayload();

  assert.equal(payload.ok, true);
  assert.equal(payload.service, "almost-monetization");
  assert.equal(typeof payload.now, "string");
  assert.equal(typeof payload.readiness, "object");
});

test("app registers core monetization routes", () => {
  const routes = getRegisteredRoutes();

  assert.ok(routes.includes("GET /health"));
  assert.ok(routes.includes("GET /v1/entitlements/:appUserId"));
  assert.ok(routes.includes("POST /v1/entitlements/sync"));
  assert.ok(routes.includes("POST /v1/iap/validate"));
});

test("app exposes tamagotchi skin static assets", () => {
  const assetDir = resolveTamagotchiSkinAssetDir();
  const staticMiddleware = app._router.stack.find(
    (layer) => layer.name === "serveStatic" && String(layer.regexp).includes("assets")
  );

  assert.ok(staticMiddleware);
  assert.equal(typeof assetDir, "string");
  assert.ok(fs.existsSync(path.join(assetDir, "green", "Cat_idle.webp")));
});
