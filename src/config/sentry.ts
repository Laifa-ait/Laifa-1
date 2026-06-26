import * as Sentry from "@sentry/react";

if (process.env.NODE_ENV === "production") {
  try {
    const dsn = process.env.VITE_SENTRY_DSN || import.meta.env.VITE_SENTRY_DSN;
    if (dsn && dsn !== "https://dummy@sentry.io/1" && !dsn.includes("dummy")) {
      Sentry.init({
        dsn: dsn,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ],
        tracesSampleRate: 0.1, // 10% des transactions
        replaysSessionSampleRate: 0.01, // 1% des sessions
        replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreur
      });
    } else {
      // Skipped Sentry initialization (no real DSN provided)
    }
  } catch (error) {
    console.error("[Sentry] Failed to initialize safely:", error);
  }
}

