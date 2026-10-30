import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/redirect";

// Landing point for Google OAuth, email confirmation and password-reset links (PKCE).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  // Supabase Auth redirects here with ?error=… when the provider step fails
  // (e.g. it couldn't verify Google's token). Keep the reason in the server log.
  const providerError = searchParams.get("error");
  if (providerError) {
    console.error(`[auth/callback] ${providerError}: ${searchParams.get("error_description") ?? ""}`);
    return NextResponse.redirect(new URL("/login?error=google", origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error(`[auth/callback] code exchange failed: ${error.message}`);
  }

  return NextResponse.redirect(new URL("/login?error=callback", origin));
}
