import { useState } from "react";
import { authErrorMessage, isValidEmail, PASSWORD_MIN_LENGTH, PROFILE_LIMITS, toFaDigits } from "@unimate/shared";
import { AuthShell, OrDivider } from "@/components/auth-shell";
import { Banner, Button, Field } from "@/components/ui";
import { signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  async function signUp() {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "نام خود را وارد کنید.";
    else if (fullName.trim().length > PROFILE_LIMITS.fullName) next.fullName = "نام خیلی طولانی است.";
    if (!isValidEmail(email)) next.email = "یک ایمیل معتبر وارد کنید.";
    if (password.length < PASSWORD_MIN_LENGTH) next.password = `رمز عبور باید حداقل ${toFaDigits(PASSWORD_MIN_LENGTH)} کاراکتر باشد.`;
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy("email");
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // handle_new_user copies full_name into the profile.
      options: { data: { full_name: fullName.trim() } },
    });
    setBusy(null);
    if (error) return setMessage({ kind: "error", text: authErrorMessage(error) });
    // With email confirmation on there's no session yet; otherwise the guard signs us in.
    if (!data.session) {
      setMessage({ kind: "success", text: "ایمیل تأیید برایت فرستادیم. روی لینک داخل ایمیل بزن و بعد وارد شو." });
    }
  }

  async function google() {
    setBusy("google");
    setMessage(null);
    const error = await signInWithGoogle();
    setBusy(null);
    if (error) setMessage({ kind: "error", text: error });
  }

  return (
    <AuthShell title="ساخت حساب" subtitle="برای مدیریت تکالیف و هماهنگی با هم‌کلاسی‌ها ثبت‌نام کن.">
      {message ? <Banner kind={message.kind}>{message.text}</Banner> : null}
      <Button variant="secondary" onPress={google} loading={busy === "google"} disabled={busy !== null}>
        ثبت‌نام با گوگل
      </Button>
      <OrDivider />
      <Field label="نام و نام خانوادگی" value={fullName} onChangeText={setFullName} error={errors.fullName} autoComplete="name" />
      <Field
        label="ایمیل"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@university.ac.ir"
      />
      <Field
        label="رمز عبور"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        hint={`حداقل ${toFaDigits(PASSWORD_MIN_LENGTH)} کاراکتر`}
        secureTextEntry
        autoComplete="new-password"
      />
      <Button onPress={signUp} loading={busy === "email"} disabled={busy !== null}>
        ثبت‌نام
      </Button>
    </AuthShell>
  );
}
