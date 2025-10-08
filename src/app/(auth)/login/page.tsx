import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/devices");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">MPS Dashboard</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Sign in with your Managed Print Services credentials.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
