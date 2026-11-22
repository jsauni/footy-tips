// Forwards browser error reports to Sentry (only the event payload, no cookies
// or headers). Served at /monitoring via withSentryConfig's tunnelRoute.
export { POST } from "@sentry/nextjs/tunnel";
