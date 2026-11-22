/**
 * Shared Sentry settings for the browser, Node and edge runtimes.
 * Sentry stays off unless NEXT_PUBLIC_SENTRY_DSN is set, so local dev and the
 * tests never send anything.
 *
 * Privacy (see /privacy): no IPs, cookies, headers, bodies or query strings,
 * no session replay, and email addresses are scrubbed from anything sent.
 */
import type { BrowserOptions, ErrorEvent, Breadcrumb } from "@sentry/nextjs";

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const scrubText = (s: string) => s.replace(EMAIL, "[email]");

function scrubDeep<T>(value: T, depth = 0): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1)) as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[k] = scrubDeep(v, depth + 1);
  return out as T;
}

export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // The SDK's defaults collect everything; send only the error and its stack.
  dataCollection: {
    userInfo: false, // no IP address or user fields
    cookies: false, // sign-in session
    httpHeaders: false,
    httpBodies: [], // sign-in codes, server action payloads
    urlQueryParams: false, // e.g. ?q=<email> on admin search
    databaseQueryData: false,
    stackFrameVariables: false,
  },
  // Errors only by default. Raise to e.g. 0.1 to sample performance traces.
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0),
  beforeSend(event: ErrorEvent) {
    const scrubbed = scrubDeep(event);
    // Keep the signed-in user's id (a random UUID) at most, never their email.
    if (scrubbed.user) scrubbed.user = scrubbed.user.id ? { id: scrubbed.user.id } : undefined;
    return scrubbed;
  },
  beforeBreadcrumb(crumb: Breadcrumb) {
    return scrubDeep(crumb);
  },
} satisfies BrowserOptions;
