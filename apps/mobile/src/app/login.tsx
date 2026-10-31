import { Link } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { authErrorMessage, isValidEmail } from "@unimate/shared";
import { AuthShell, OrDivider } from "@/components/auth-shell";
import { AppText, Banner, Button, Field } from "@/components/ui";
import { signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  async function signIn() {
    if (!isValidEmail(email)) return setError("یک ایمیل معتبر وارد کنید.");
    if (!password) return setError("رمز عبور را وارد کنید.");
    setBusy("email");
    setError(null);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(null);
    // On success the session listener swaps to the signed-in screens.
    if (e) setError(authErrorMessage(e));
  }

  async function google() {
    setBusy("google");
    setError(null);
    const message = await signInWithGoogle();
    setBusy(null);
    if (message) setError(message);
  }

  return (
    <AuthShell title="ورود به یونی‌میت" subtitle="خوش برگشتی! برای ادامه وارد شو.">
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Button variant="secondary" onPress={google} loading={busy === "google"} disabled={busy !== null}>
        ورود با گوگل
      </Button>
      <OrDivider />
      <Field
        label="ایمیل"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@university.ac.ir"
      />
      <Field
        label="رمز عبور"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={signIn}
      />
      <Link href="/forgot-password">
        <AppText size={13} tone="primary">
          رمز عبور را فراموش کرده‌ای؟
        </AppText>
      </Link>
      <Button onPress={signIn} loading={busy === "email"} disabled={busy !== null}>
        ورود
      </Button>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
        <AppText size={14} tone="muted">
          حساب نداری؟
        </AppText>
        <Link href="/signup">
          <AppText size={14} tone="primary" weight="medium">
            ثبت‌نام کن
          </AppText>
        </Link>
      </View>
    </AuthShell>
  );
}
