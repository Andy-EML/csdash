"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

function DefaultErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center">
      <div className="flex items-center justify-center rounded-full bg-red-100 p-4">
        <AlertCircle className="h-8 w-8 text-red-600" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-red-900">Something went wrong</h2>
        <p className="max-w-md text-sm text-red-700">
          {error.message ||
            "An unexpected error occurred while rendering this component."}
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
        <Button onClick={() => window.location.reload()} variant="default">
          Reload page
        </Button>
      </div>

      {process.env.NODE_ENV === "development" && (
        <details className="mt-4 w-full max-w-2xl">
          <summary className="cursor-pointer text-sm font-medium text-red-800">
            Error details (development only)
          </summary>
          <pre className="mt-2 overflow-auto rounded-lg bg-red-100 p-4 text-left text-xs text-red-900">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
