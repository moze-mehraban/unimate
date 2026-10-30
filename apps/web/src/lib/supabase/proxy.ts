import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@unimate/shared";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Refreshes the Supabase session cookie on every request and returns the
 * signed-in user's id (or null) plus the response to send. Read `response`
 * after any further auth call, since refreshed or cleared cookies replace it.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() verifies the JWT; do not run code between client creation and this call.
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    userId = data?.claims.sub ?? null;
  } catch {
    // Auth server unreachable: treat as signed out rather than crashing every page.
  }

  return {
    userId,
    get response() {
      return response;
    },
    /**
     * getClaims() only checks the JWT, which stays valid after the session is
     * revoked (sign-out elsewhere, deleted user). Confirm with the Auth server and
     * clear the cookies if it's gone, so pages that call getUser() agree.
     */
    async confirmSession() {
      const { data, error } = await supabase.auth.getUser();
      if (data.user) return true;
      if (error?.status === 403 || error?.status === 401) await supabase.auth.signOut({ scope: "local" });
      return false;
    },
  };
}

/** Copy refreshed auth cookies onto a redirect so the session isn't lost. */
export function withSessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}
