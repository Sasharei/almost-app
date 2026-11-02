const NOTICE_REVISION = "analytics-and-diagnostics-2026-10-31-v1";

const readConsentReceipt = (rawReceipt, legacyOptOut) => {
  try {
    const receipt = JSON.parse(rawReceipt);
    if (receipt?.choice === "denied") return false;
    if (receipt?.choice === "granted" && receipt.noticeRevision === NOTICE_REVISION) {
      return true;
    }
  } catch (_error) {
    // An absent or malformed receipt never grants a newly disclosed purpose.
  }
  // Preserve a prior refusal; prior grants do not cover the expanded SDK scope.
  if (legacyOptOut === "1" || legacyOptOut === "true") return false;
  return null;
};

const createConsentReceipt = (enabled) =>
  JSON.stringify({
    choice: enabled === true ? "granted" : "denied",
    noticeRevision: NOTICE_REVISION,
    savedAt: new Date().toISOString(),
  });

module.exports = { NOTICE_REVISION, readConsentReceipt, createConsentReceipt };
