import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

// Runs once per server instance (Node.js and edge/proxy runtimes).
export function register() {
  Sentry.init(sentryOptions);
}

// Errors from server components, server actions, route handlers and the proxy.
export const onRequestError = Sentry.captureRequestError;
