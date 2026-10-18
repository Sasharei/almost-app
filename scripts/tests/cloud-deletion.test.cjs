const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDeletionRequest } = require("../../src/privacy/deletionRequest.cjs");
const base = { app: "almost-savings", platform: "ios", version: "test", caseId: "a1978bda-c92c-4ae0-9a1d-226130045817" };
test("captures only existing allowlisted identifiers without enabling a missing SDK", async () => {
 let reads = 0;
 const r = await buildDeletionRequest({ ...base, readers: { firebase_user_ids: () => { reads++; return "existing-custom"; },
  appsflyer_ids: () => "existing-af", revenuecat_customer_ids: () => ["existing-rc", "existing-rc"], access_token: () => { throw new Error("must not read secrets"); } } });
 assert.equal(reads, 1); assert.deepEqual(r.identities.firebase_user_ids, ["existing-custom"]);
 assert.deepEqual(r.identities.firebase_installation_ids, []); assert.deepEqual(r.identities.revenuecat_customer_ids, ["existing-rc"]);
 assert.equal(r.coverage.amplitude_device_ids, "requires_operator_lookup");
 assert.equal(r.status, "DRAFT_NOT_SUBMITTED"); assert.equal(r.subject_verified, false);
 assert.equal(JSON.stringify(r).includes("access_token"), false);
});
test("failed and hung SDK getters do not discard other identifiers", async () => {
 const r = await buildDeletionRequest({ ...base, timeoutMs: 10, readers: {
  appsflyer_ids: () => new Promise(() => {}), amplitude_device_ids: () => { throw Error("failure"); },
  firebase_user_ids: () => "existing" } });
 assert.deepEqual(r.identities.firebase_user_ids, ["existing"]);
 assert.equal(r.coverage.appsflyer_ids, "requires_operator_lookup");
});
test("rejects ambiguous scope and strips unsafe identifiers", async () => {
 await assert.rejects(buildDeletionRequest({ ...base, app: "all" }));
 await assert.rejects(buildDeletionRequest({ ...base, platform: "web" }));
 const r = await buildDeletionRequest({ ...base, readers: { amplitude_user_ids: () => ["ok", "bad\nvalue", null, { secret: "no" }] } });
 assert.deepEqual(r.identities.amplitude_user_ids, ["ok"]);
});

const { buildDeletionEmail, openDeletionEmail } = require("../../src/privacy/deletionRequest.cjs");
test("special email addresses support and preserves the exact request through URI encoding", async () => {
 const request = await buildDeletionRequest({ ...base, readers: { amplitude_device_ids: () => "existing+&?#日本" } });
 const email = buildDeletionEmail(request, "Запросить удаление");
 const url = new URL(email.mailto);
 assert.equal(url.pathname, "almostappsup@gmail.com");
 assert.equal(url.searchParams.get("subject"), `[Privacy deletion] ${request.app} / ${request.case_id}`);
 assert.equal(url.searchParams.get("body"), email.body);
 const payload = email.body.split("ALMOST-PRIVACY-REQUEST-BEGIN\n")[1].split("\nALMOST-PRIVACY-REQUEST-END")[0];
 assert.deepEqual(JSON.parse(payload), request);
 assert.match(email.shareText, /^To: almostappsup@gmail.com\nSubject: \[Privacy deletion\]/);
});
test("unavailable email falls back to a complete share message without claiming submission", async () => {
 const request = await buildDeletionRequest(base), email = buildDeletionEmail(request, "Request deletion");
 let shared = 0;
 await openDeletionEmail(email, { openURL: async () => { throw Error("No mail app"); }, share: async (content, options) => {
  shared++; assert.equal(content.message, email.shareText); assert.equal(options.subject, email.subject);
  return { action: "dismissedAction" };
 } });
 assert.equal(shared, 1); assert.equal(request.status, "DRAFT_NOT_SUBMITTED");
});
test("opening or cancelling email does not submit deletion or open a second share sheet", async () => {
 const request = await buildDeletionRequest(base), email = buildDeletionEmail(request, "Request deletion");
 let opened = 0;
 await openDeletionEmail(email, { openURL: async () => { opened++; }, share: async () => { assert.fail("must not auto-share"); } });
 assert.equal(opened, 1); assert.equal(request.subject_verified, false); assert.equal(request.status, "DRAFT_NOT_SUBMITTED");
});
test("explicit sharing and oversized email preserve all identifiers", async () => {
 const request = await buildDeletionRequest(base); request.identities.firebase_user_ids = Array.from({length:100},(_,i)=>"synthetic-"+i+"x".repeat(250));
 const email = buildDeletionEmail(request, "Request deletion"); assert.equal(email.mailto,null);
 let shared=0;
 const transport={openURL:async()=>assert.fail("must not open oversized or explicitly bypassed mailto"),share:async content=>{shared++;assert.ok(content.message.includes(request.identities.firebase_user_ids[99]));}};
 await openDeletionEmail(email,transport); await openDeletionEmail(email,transport,true); assert.equal(shared,2);
});
test("fallback errors remain retryable and special email scope cannot be injected", async () => {
 const request = await buildDeletionRequest(base), email = buildDeletionEmail(request, "Request deletion");
 await assert.rejects(openDeletionEmail(email,{openURL:async()=>{throw Error("none")},share:async()=>{throw Error("none")}}));
 assert.equal(request.status,"DRAFT_NOT_SUBMITTED");
 assert.throws(()=>buildDeletionEmail({...request,app:"almost-savings\nBcc: other"},"Request deletion"));
});

// Execute the real row with a small hook/element adapter. Native presentation and
// scrolling still require device QA; these tests protect the dismissal ordering.
const fs = require("node:fs");
const vm = require("node:vm");
const babel = require("@babel/core");
const rowSource = fs.readFileSync(require.resolve("../../src/privacy/CloudDeletionRow.js"), "utf8")
 .replace(/^import .*;\n/gm, "").replace("export function CloudDeletionRow", "function CloudDeletionRow");
const rowCode = babel.transformSync(rowSource, { configFile: false, babelrc: false,
 plugins: ["@babel/plugin-transform-react-jsx"] }).code;
function rowHarness({ platform = "ios", openURL = async () => {}, share = async () => ({ action: "dismissedAction" }), build = buildDeletionRequest } = {}) {
 const slots = [], effects = [], cleanups = [], calls = [];
 let cursor = 0, tree;
 const sameDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
 const React = { Fragment: "Fragment", createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
 const context = {
  React, useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], v => { slots[i] = v; }]; },
  useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
  useEffect: (fn, deps) => { const i = cursor++; if (!sameDeps(slots[i], deps)) { slots[i] = deps; effects.push(() => { cleanups[i]?.(); cleanups[i] = fn(); }); } },
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }), Platform: { OS: platform },
  ...Object.fromEntries(["Modal", "ScrollView", "Text", "View", "Pressable"].map(name => [name, name])),
  StyleSheet: { create: v => v, hairlineWidth: 1 }, Crypto: { randomUUID: () => base.caseId },
  Application: { nativeApplicationVersion: "test" }, readExistingPremiumInstallId: () => "existing",
  existingAnalyticsDeletionReaders: () => ({}), existingRevenueCatDeletionIds: () => [],
  Linking: { openURL: async url => { calls.push("mail"); return openURL(url); } },
  shareDeletionRequest: async (...args) => { calls.push("share"); return share(...args); },
  require: () => ({ buildDeletionRequest: async args => { calls.push("build"); return build(args); }, buildDeletionEmail, openDeletionEmail }),
 };
 const Row = vm.runInNewContext(rowCode + "\nCloudDeletionRow", context);
 const nodes = () => { const all = []; const walk = n => { if (!n || typeof n !== "object") return; if (Array.isArray(n)) return n.forEach(walk); all.push(n); n.children?.forEach(walk); }; walk(tree); return all; };
 const render = () => { cursor = 0; tree = Row({ t: k => k, colors: {} }); while (effects.length) effects.shift()(); };
 render();
 return { calls, render, press: id => nodes().find(n => n.props.testID === id).props.onPress(),
  modal: () => nodes().find(n => n.type === "Modal").props,
  busy: () => nodes().find(n => n.props.testID === "request-cloud-deletion").props.disabled,
  unmount: () => cleanups.forEach(fn => fn?.()),
 };
}
const settleRow = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
test("iOS prepares and opens mail only after native confirmation dismissal, once", async () => {
 const row = rowHarness(); row.press("request-cloud-deletion"); row.render();
 assert.equal(row.modal().visible, true);
 row.press("cloud-deletion-prepare"); row.press("cloud-deletion-prepare"); row.render();
 await settleRow(); assert.deepEqual(row.calls, []); assert.equal(row.busy(), true); assert.equal(row.modal().visible, false);
 row.modal().onDismiss(); row.modal().onDismiss(); await settleRow(); row.render();
 assert.deepEqual(row.calls, ["build", "mail"]); assert.equal(row.busy(), false);
});
test("missing mail app, dismissed fallback and a second request leave the row usable", async () => {
 const row = rowHarness({ openURL: async () => { throw Error("no mail app"); } });
 for (let i = 0; i < 2; i++) {
  row.press("request-cloud-deletion"); row.render(); row.press("cloud-deletion-prepare"); row.render();
  row.modal().onDismiss(); await settleRow(); row.render(); assert.equal(row.busy(), false);
 }
 assert.deepEqual(row.calls, ["build", "mail", "share", "mail", "share"]);
});
test("explicit share waits for dismissal; confirmation cancel/back does no work", async () => {
 const row = rowHarness();
 row.press("request-cloud-deletion"); row.render(); row.press("cloud-deletion-cancel"); row.render(); row.modal().onDismiss();
 row.press("request-cloud-deletion"); row.render(); row.modal().onRequestClose(); row.render(); row.modal().onDismiss();
 assert.deepEqual(row.calls, []);
 row.press("request-cloud-deletion"); row.render(); row.press("cloud-deletion-share"); row.render();
 assert.deepEqual(row.calls, []); row.modal().onDismiss(); await settleRow(); row.render();
 assert.deepEqual(row.calls, ["build", "share"]); assert.equal(row.busy(), false);
});
test("failed fallback exposes a retry and releases busy state without another native Alert", async () => {
 let fail = true;
 const row = rowHarness({ openURL: async () => { throw Error("none"); }, share: async () => { if (fail) throw Error("none"); } });
 row.press("request-cloud-deletion"); row.render(); row.press("cloud-deletion-prepare"); row.render(); row.modal().onDismiss();
 await settleRow(); row.render(); assert.equal(row.modal().visible, true); assert.equal(row.busy(), false);
 fail = false; row.press("cloud-deletion-share"); row.render(); row.modal().onDismiss(); await settleRow(); row.render();
 assert.equal(row.busy(), false); assert.equal(row.modal().visible, false);
 assert.deepEqual(row.calls, ["build", "mail", "share", "share"]);
});
test("Android closes its dialog before transport without depending on iOS-only onDismiss", async () => {
 const row = rowHarness({ platform: "android" }); row.press("request-cloud-deletion"); row.render();
 row.press("cloud-deletion-share"); assert.deepEqual(row.calls, []); row.render();
 assert.equal(row.modal().visible, false); await settleRow(); row.render();
 assert.deepEqual(row.calls, ["build", "share"]); assert.equal(row.busy(), false);
});
test("leaving Settings cancels queued or still-preparing presentation", async () => {
 const queued = rowHarness(); queued.press("request-cloud-deletion"); queued.render(); queued.press("cloud-deletion-share"); queued.render();
 queued.unmount(); queued.modal().onDismiss(); await settleRow(); assert.deepEqual(queued.calls, []);
 let resolve;
 const preparing = rowHarness({ build: () => new Promise(r => { resolve = r; }) });
 preparing.press("request-cloud-deletion"); preparing.render(); preparing.press("cloud-deletion-share"); preparing.render(); preparing.modal().onDismiss();
 preparing.unmount(); resolve(await buildDeletionRequest(base)); await settleRow(); assert.deepEqual(preparing.calls, ["build"]);
});

const transportSource = fs.readFileSync(require.resolve("../../src/privacy/shareDeletionRequest.js"), "utf8")
 .replace(/^import .*;\n/gm, "").replace("export function", "function");
function transport(platform, nativeModule) {
 const calls = [];
 const share = vm.runInNewContext(transportSource + "\nshareDeletionRequest", {
  Platform: { OS: platform }, NativeModules: { AlmostPrivacySharing: nativeModule ? {
   share: request => { calls.push({ native: request }); return typeof nativeModule === "function" ? nativeModule(request) : Promise.resolve("native-dismissed"); },
  } : undefined }, Share: { share: (content, options) => { calls.push({ content, options }); return Promise.resolve("legacy-dismissed"); } },
 });
 return { share, calls };
}
test("new iOS shells hand complete text and subject to the scene-owned native presenter", async () => {
 const email = buildDeletionEmail(await buildDeletionRequest(base), "Request deletion");
 const t = transport("ios", true);
 assert.equal(await t.share({ message: email.shareText, title: email.subject }, { subject: email.subject }), "native-dismissed");
 assert.equal(t.calls.length, 1); assert.equal(t.calls[0].native.message, email.shareText);
 assert.equal(t.calls[0].native.subject, email.subject); assert.equal(t.calls[0].native.title, email.subject);
});
test("Android and older iOS shells preserve their existing sharing capability", async () => {
 for (const [platform, native] of [["android", true], ["ios", false]]) {
  const t = transport(platform, native), content = { message: "synthetic request" }, options = { subject: "synthetic subject" };
  assert.equal(await t.share(content, options), "legacy-dismissed");
  assert.deepEqual(t.calls, [{ content, options }]);
 }
});
test("native presentation errors propagate for retry without opening a second activity controller", async () => {
 const t = transport("ios", () => Promise.reject(Error("presentation busy")));
 await assert.rejects(t.share({ message: "synthetic request" }, { subject: "subject" }), /presentation busy/);
 assert.equal(t.calls.length, 1); assert.ok(t.calls[0].native);
});
