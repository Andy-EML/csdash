"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="from-background to-secondary/20 flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
      <div className="border-border/60 bg-card/80 w-full max-w-md space-y-6 rounded-2xl border p-8 text-center shadow-xl backdrop-blur">
        <div className="flex justify-center">
          <div className="flex items-center justify-center rounded-full bg-red-100 p-4">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred. This has been logged and we&apos;ll look into it.
          </p>
        </div>

        {error.message && (
          <div className="rounded-lg bg-red-50 p-4 text-left">
            <p className="text-sm font-medium text-red-900">Error details:</p>
            <p className="mt-1 text-xs text-red-700">{error.message}</p>
            {error.digest && (
              <p className="mt-2 text-xs text-red-600">Error ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/devices")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go to dashboard
          </Button>
        </div>

        {process.env.NODE_ENV === "development" && error.stack && (
          <details className="text-left">
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
              Stack trace (development only)
            </summary>
            <pre className="bg-muted mt-2 overflow-auto rounded-lg p-4 text-xs">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
