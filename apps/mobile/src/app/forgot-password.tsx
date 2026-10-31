import { useState } from "react";
import { authErrorMessage, isValidEmail } from "@unimate/shared";
import { AuthShell } from "@/components/auth-shell";
import { Banner, Button, Field } from "@/components/ui";
import { supabase, WEB_URL } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!isValidEmail(email)) return setMessage({ kind: "error", text: "یک ایمیل معتبر وارد کنید." });
    setBusy(true);
    // The new password is set on the website, which already handles this link.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${WEB_URL}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    // Like the web app, only rate limits are surfaced, so the form never reveals whether an account exists.
    if (error?.code?.startsWith("over_")) return setMessage({ kind: "error", text: authErrorMessage(error) });
    setMessage({ kind: "success", text: "اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز برایش ارسال شد." });
  }

  return (
    <AuthShell title="بازیابی رمز عبور" subtitle="ایمیلت را وارد کن تا لینک تعیین رمز جدید را برایت بفرستیم.">
      {message ? <Banner kind={message.kind}>{message.text}</Banner> : null}
      <Field
        label="ایمیل"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@university.ac.ir"
      />
      <Button onPress={send} loading={busy}>
        ارسال لینک بازیابی
      </Button>
    </AuthShell>
  );
}
