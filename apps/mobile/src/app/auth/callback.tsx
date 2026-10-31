import { Redirect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Loading } from "@/components/ui";
import { useSession } from "@/providers/session";

// The OAuth redirect target. signInWithGoogle() reads the code from the auth
// session result; this screen only closes the web popup and moves on.
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallback() {
  const { session, loading } = useSession();
  if (loading) return <Loading />;
  return <Redirect href={session ? "/" : "/login"} />;
}
