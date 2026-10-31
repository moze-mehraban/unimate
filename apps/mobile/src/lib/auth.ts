import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { authErrorMessage } from "@unimate/shared";
import { supabase } from "./supabase";

// Close the auth popup on web when it lands back on our callback page.
WebBrowser.maybeCompleteAuthSession();

/**
 * Google sign-in: open Supabase's OAuth page in an auth browser session, wait
 * for it to redirect to unimate://auth/callback (exp://… in Expo Go), then
 * exchange the PKCE code for a session. Returns an error message or null.
 */
export async function signInWithGoogle(): Promise<string | null> {
  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return authErrorMessage(error);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return null; // cancelled or dismissed

  const params = new URL(result.url).searchParams;
  const code = params.get("code");
  if (!code) return params.get("error_description") ? "ورود با گوگل انجام نشد. دوباره تلاش کنید." : null;

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return exchangeError ? authErrorMessage(exchangeError) : null;
}
