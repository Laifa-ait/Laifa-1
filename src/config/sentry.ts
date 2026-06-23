import * as Sentry from "@sentry/react";

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
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
}
