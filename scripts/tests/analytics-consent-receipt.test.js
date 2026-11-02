const test = require("node:test");
const assert = require("node:assert/strict");
const {
  NOTICE_REVISION,
  createConsentReceipt,
  readConsentReceipt,
} = require("../../src/analytics/consentReceipt");

test("new consent enables optional SDKs only after the current receipt", () => {
  assert.equal(readConsentReceipt(null, "0"), null);
  assert.equal(readConsentReceipt("not-json", "0"), null);
  assert.equal(readConsentReceipt(JSON.stringify({ choice: "granted", noticeRevision: "old" }), "0"), null);
  assert.equal(readConsentReceipt(createConsentReceipt(true), "1"), true);
  assert.equal(JSON.parse(createConsentReceipt(true)).noticeRevision, NOTICE_REVISION);
});

test("refusals survive revision changes and legacy migration", () => {
  assert.equal(readConsentReceipt(null, "1"), false);
  assert.equal(readConsentReceipt(null, "true"), false);
  assert.equal(readConsentReceipt(JSON.stringify({ choice: "denied", noticeRevision: "old" }), "0"), false);
  assert.equal(readConsentReceipt(createConsentReceipt(false), "0"), false);
});
