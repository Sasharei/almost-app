import crypto from "node:crypto";

// Legacy payment sessions can be issued without an established install credential.
// A board actor is scoped to the actual credential pair, never to that legacy claim alone.
// No payment trust/ownership is inferred, and server signing-key rotation preserves the actor.
export const deriveSuggestionsActor = (installId, installSecret) => {
  if (typeof installId !== "string" || typeof installSecret !== "string") return null;
  const id = installId.trim();
  const secret = installSecret.trim();
  if (!id || id.length > 200 || secret.length < 32 || secret.length > 256) return null;
  return crypto.createHmac("sha256", secret).update(JSON.stringify(["almost-suggestions-v1", id])).digest("hex");
};
