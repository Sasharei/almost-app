import { OAuth2Client } from "google-auth-library";
import { config } from "../config.js";
const client = new OAuth2Client();
export const verifyGooglePush = async (authorization = "", verifier = client) => {
  const { audience, serviceAccountEmail } = config.google.webhook;
  if (!audience || !serviceAccountEmail || !/^Bearer \S+$/i.test(authorization)) return false;
  try {
    const ticket = await verifier.verifyIdToken({ idToken: authorization.split(/\s+/)[1], audience });
    const payload = ticket.getPayload();
    return payload?.email_verified === true && payload.email === serviceAccountEmail &&
      ["accounts.google.com", "https://accounts.google.com"].includes(payload.iss);
  } catch { return false; }
};
