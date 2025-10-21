import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { env } from "../env";

export function getSupabaseServiceClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
