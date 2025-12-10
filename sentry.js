import * as Sentry from "@sentry/react-native";

export function initSentry() {
  if (__DEV__) return;
  if (!process?.env?.SENTRY_DSN) {
    console.warn("SENTRY_DSN is not set. Skipping Sentry initialisation.");
    return;
  }
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      enableProfiling: false,
    });
  } catch (error) {
    console.warn("Failed to initialise Sentry:", error?.message || error);
  }
}

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;

export default Sentry;
