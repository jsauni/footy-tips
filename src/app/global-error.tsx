"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

// Last-resort error screen when the root layout itself fails. Reports to Sentry.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-AU">
      <body className="flex min-h-dvh items-center justify-center bg-bg p-6 text-center text-fg">
        <title>Something went wrong · Footy Tips</title>
        <div className="max-w-sm space-y-4">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-muted">
            Sorry, the app hit an error. It’s been reported. Try again, or come back in a minute.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-fg"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
