"use server";

import { redirect } from "next/navigation";
import { isValidEmail, PASSWORD_MIN_LENGTH, PROFILE_LIMITS } from "@unimate/shared";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth-errors";
import { getOrigin, safeNextPath } from "@/lib/redirect";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back so inputs keep their values after a failed submit. */
  values?: Record<string, string>;
};

function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email");
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!isValidEmail(email) || !password) {
    return { error: "ایمیل و رمز عبور را وارد کنید.", values: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error), values: { email } };

  redirect(next);
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = str(formData, "full_name");
  const university = str(formData, "university");
  const email = str(formData, "email");
  const password = String(formData.get("password") ?? "");
  const values = { full_name: fullName, university, email };

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "نام خود را وارد کنید.";
  else if (fullName.length > PROFILE_LIMITS.fullName) fieldErrors.full_name = "نام خیلی طولانی است.";
  if (university.length > PROFILE_LIMITS.university) fieldErrors.university = "نام دانشگاه خیلی طولانی است.";
  if (!isValidEmail(email)) fieldErrors.email = "یک ایمیل معتبر وارد کنید.";
  if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = `رمز عبور باید حداقل ${PASSWORD_MIN_LENGTH} کاراکتر باشد.`;
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Picked up by the handle_new_user trigger to fill the profile.
      data: { full_name: fullName, university },
      emailRedirectTo: `${await getOrigin()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { error: authErrorMessage(error), values };

  // Email confirmation disabled → we already have a session.
  if (data.session) redirect("/dashboard");

  return {
    success: "حساب شما ساخته شد. لینک تأیید به ایمیلتان ارسال شد؛ پس از تأیید وارد شوید.",
  };
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await getOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData, "email");
  if (!isValidEmail(email)) return { error: "یک ایمیل معتبر وارد کنید.", values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/reset-password`,
  });
  // Rate limits are worth surfacing; anything else stays generic so the
  // form never reveals whether an account exists for this email.
  if (error?.code?.startsWith("over_")) return { error: authErrorMessage(error), values: { email } };

  return { success: "اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی رمز برایتان ارسال شد." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
