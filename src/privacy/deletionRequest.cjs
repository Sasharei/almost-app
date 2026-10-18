// Pure request preparation: no networking, SDK initialization, logging or deletion.
const ID_FIELDS = Object.freeze([
  "firebase_app_instance_ids", "firebase_user_ids", "firebase_installation_ids",
  "amplitude_user_ids", "amplitude_ids", "amplitude_device_ids",
  "appsflyer_ids", "revenuecat_customer_ids",
]);
const clean = value => [...new Set((Array.isArray(value) ? value : [value]).filter(
  id => typeof id === "string" && id.length > 0 && id.length <= 1500 && id.trim() === id && !/[\x00-\x1f]/.test(id)
))].slice(0, 100);
const readBounded = async (reader, timeoutMs) => {
  if (typeof reader !== "function") return [];
  let timer;
  try {
    return clean(await Promise.race([
      Promise.resolve().then(reader),
      new Promise(resolve => { timer = setTimeout(() => resolve([]), timeoutMs); }),
    ]));
  } catch { return []; }
  finally { clearTimeout(timer); }
};
async function buildDeletionRequest({ app, platform, version, caseId, readers = {}, timeoutMs = 2500 }) {
  if (!["almost-crossed", "almost-savings"].includes(app) || !["ios", "android"].includes(platform) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId)) throw new Error("invalid_deletion_scope");
  const identities = Object.fromEntries(await Promise.all(ID_FIELDS.map(async key => [key, await readBounded(readers[key], timeoutMs)])));
  return {
    schema_version: 1, case_id: caseId, app, platform, app_version: String(version || "unknown"),
    requested_at: new Date().toISOString(), status: "DRAFT_NOT_SUBMITTED",
    providers: ["firebase", "amplitude", "appsflyer", "revenuecat"],
    subject_verified: false, identity_coverage_reviewed: false, collection_plan_reviewed: false,
    purchase_impact_reviewed: false, revenuecat_aliases_reviewed: false, identities,
    coverage: Object.fromEntries(ID_FIELDS.map(key => [key, identities[key].length ? "existing_identifiers_only" : "requires_operator_lookup"])),
    historical_coverage: "Prior reset, reinstall or consent generations may require operator lookup; this is not proof of complete history.",
    support_email: "almostappsup@gmail.com",
  };
}

// A mail draft is not a submitted or completed deletion request.
function buildDeletionEmail(request, introduction) {
  if (!["almost-crossed", "almost-savings"].includes(request.app) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(request.case_id)) throw Error("invalid_deletion_scope");
  const recipient = "almostappsup@gmail.com";
  const subject = `[Privacy deletion] ${request.app} / ${request.case_id}`;
  const body = `${introduction}\n\nALMOST-PRIVACY-REQUEST-BEGIN\n${JSON.stringify(request, null, 2)}\nALMOST-PRIVACY-REQUEST-END`;
  const url = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { recipient, subject, body, shareText: `To: ${recipient}\nSubject: ${subject}\n\n${body}`, mailto: url.length <= 12000 ? url : null };
}
async function openDeletionEmail(email, { openURL, share }, shareOnly = false) {
  if (!shareOnly && email.mailto) {
    try { await openURL(email.mailto); return; } catch { /* No mail handler: retain the complete request in the fallback. */ }
  }
  await share({ title: email.subject, message: email.shareText }, { subject: email.subject });
}

module.exports = { buildDeletionRequest, buildDeletionEmail, openDeletionEmail, ID_FIELDS };
