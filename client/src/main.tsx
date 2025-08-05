// Initialize Sentry error monitoring FIRST
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://319c1c96a44e093b60a97763d1afc9a3@o4509793819361280.ingest.us.sentry.io/4509793820606464",
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: true,
    })
  ],
  tracesSampleRate: 0.1, // 10% sampling
  replaysSessionSampleRate: 0.1, // 10% normal sessions
  replaysOnErrorSampleRate: 1.0, // 100% error sessions
  environment: import.meta.env.MODE || 'development',
  beforeSend(event) {
    if (import.meta.env.MODE === 'development') {
      console.log('🔍 [SENTRY] Frontend error:', event.exception?.values?.[0]?.value);
      return null; // Skip in development
    }
    return event;
  }
});

console.log('✅ [SENTRY] Frontend error monitoring initialized');

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
