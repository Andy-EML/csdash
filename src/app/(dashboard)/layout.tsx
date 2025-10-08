import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { TopNav } from "@/components/navigation/top-nav";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <TopNav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
