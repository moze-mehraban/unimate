import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@unimate/shared";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
