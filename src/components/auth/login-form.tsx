"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const isBusy = loading || isNavigating;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      startNavigation(() => {
        router.replace("/devices");
      });
    } catch (signInUnknownError) {
      setError("Unable to login. Please try again.");
      console.error(signInUnknownError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="relative flex flex-col gap-6"
      onSubmit={handleSubmit}
      aria-live="polite"
      aria-busy={isBusy}
    >
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onInput={(event) => setEmail((event.target as HTMLInputElement).value)}
          autoComplete="username"
          required
          disabled={isBusy}
          className="relative z-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-80 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-200" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onInput={(event) => setPassword((event.target as HTMLInputElement).value)}
          autoComplete="current-password"
          required
          disabled={isBusy}
          className="relative z-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-80 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 focus:ring-2 focus:ring-blue-300 focus:outline-none"
        disabled={isBusy}
      >
        {isBusy ? "Signing in..." : "Sign In"}
      </button>

      {isBusy ? (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" aria-hidden="true" />
          Signing you in…
        </p>
      ) : null}

      <div className="text-center">
        <a
          href="/forgot-password"
          className={cn(
            "text-sm text-blue-600 hover:text-blue-500 hover:underline",
            isBusy && "pointer-events-none opacity-60"
          )}
          aria-disabled={isBusy}
        >
          Forgot your password?
        </a>
      </div>
    </form>
  );
}
