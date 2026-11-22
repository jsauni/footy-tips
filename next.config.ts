import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Keep the dev badge off the mobile bottom tab bar.
  devIndicators: { position: "top-right" },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  // Source maps upload only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT
  // are set (e.g. in Vercel). Without them the build just skips the upload.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Don't serve source maps to browsers once they're uploaded.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Browser events go through our own domain so ad blockers don't drop them.
  // Excluded from the proxy matcher in src/proxy.ts.
  tunnelRoute: "/monitoring",
  telemetry: false,
});
