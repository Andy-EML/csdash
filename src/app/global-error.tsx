"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error (root):", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
            <div className="flex justify-center">
              <div className="flex items-center justify-center rounded-full bg-red-500/20 p-4">
                <svg
                  className="h-12 w-12 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Critical Error
              </h1>
              <p className="text-sm text-neutral-400">
                A critical error occurred that prevented the application from loading.
              </p>
            </div>

            {error.message && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-left">
                <p className="text-sm font-medium text-red-400">Error:</p>
                <p className="mt-1 text-xs text-red-300">{error.message}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Go to homepage
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
