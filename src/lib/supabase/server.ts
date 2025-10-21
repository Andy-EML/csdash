import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "../database.types";
import { env } from "../env";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* Suppress cookie writes during Server Component rendering */
          }
        },
        remove(name, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            /* Suppress cookie writes during Server Component rendering */
          }
        },
      },
    }
  );
}
