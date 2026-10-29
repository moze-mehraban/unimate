import "server-only";
import { redirect } from "next/navigation";
import type { Profile } from "@unimate/shared";
import { createClient } from "./supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  /** Signed up with Google only, so there is no password to change. */
  isOAuthOnly: boolean;
  profile: Pick<Profile, "full_name" | "university" | "avatar_url">;
};

/**
 * Data Access Layer entry point. Reads the session (request-time data),
 * so callers must render inside a <Suspense> boundary.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, university, avatar_url")
    .eq("id", user.id)
    .single();

  const providers = (user.app_metadata.providers as string[] | undefined) ?? [];

  return {
    id: user.id,
    email: user.email ?? "",
    isOAuthOnly: providers.length > 0 && !providers.includes("email"),
    profile: profile ?? { full_name: "", university: "", avatar_url: null },
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
