"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { CLASS_REMINDER_OPTIONS, DEADLINE_REMINDER_OPTIONS, PASSWORD_MIN_LENGTH, PROFILE_LIMITS } from "@unimate/shared";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage, GENERIC_ERROR } from "@/lib/auth-errors";
import type { FormState } from "@/lib/forms";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const university = String(formData.get("university") ?? "").trim();
  const values = { full_name: fullName, university };

  const fieldErrors: Record<string, string> = {};
  if (!fullName) fieldErrors.full_name = "نام نمی‌تواند خالی باشد.";
  else if (fullName.length > PROFILE_LIMITS.fullName) fieldErrors.full_name = "نام خیلی طولانی است.";
  if (university.length > PROFILE_LIMITS.university) fieldErrors.university = "نام دانشگاه خیلی طولانی است.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  // Authorize inside the action; never trust the client.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, university })
    .eq("id", user.id);
  if (error) return { error: GENERIC_ERROR, values };

  refresh();
  return { success: "پروفایل ذخیره شد.", values };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const redirectTo = formData.get("redirect_to") === "dashboard";

  const fieldErrors: Record<string, string> = {};
  if (password.length < PASSWORD_MIN_LENGTH) {
    fieldErrors.password = `رمز عبور باید حداقل ${PASSWORD_MIN_LENGTH} کاراکتر باشد.`;
  } else if (password !== confirm) {
    fieldErrors.confirm = "تکرار رمز با رمز جدید یکسان نیست.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error) };

  if (redirectTo) redirect("/dashboard");
  return { success: "رمز عبور تغییر کرد." };
}

/** "" = off; otherwise one of the offered values. */
function readReminder(formData: FormData, key: string, options: { value: number | null }[]): number | null | undefined {
  const raw = String(formData.get(key) ?? "");
  if (raw === "") return null;
  const value = Number(raw);
  return options.some((o) => o.value === value) ? value : undefined;
}

export async function updateReminders(_prev: FormState, formData: FormData): Promise<FormState> {
  const classMinutes = readReminder(formData, "class_reminder_minutes", CLASS_REMINDER_OPTIONS);
  const deadlineHours = readReminder(formData, "deadline_reminder_hours", DEADLINE_REMINDER_OPTIONS);
  if (classMinutes === undefined || deadlineHours === undefined) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { error } = await supabase
    .from("profiles")
    .update({ class_reminder_minutes: classMinutes, deadline_reminder_hours: deadlineHours })
    .eq("id", data.user.id);
  if (error) return { error: GENERIC_ERROR };

  refresh();
  return { success: "تنظیمات یادآوری ذخیره شد." };
}
