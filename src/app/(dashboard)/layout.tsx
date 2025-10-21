import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { TopNav } from "@/components/navigation/top-nav";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <TopNav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
