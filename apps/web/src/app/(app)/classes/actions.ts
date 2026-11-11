"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { CLASS_COLOR_KEYS, CLASS_LIMITS, INVITE_MAX_USES_LIMIT, type ClassColor } from "@unimate/shared";
import { requireUser } from "@/lib/auth";
import { GENERIC_ERROR } from "@/lib/auth-errors";
import { dbErrorMessage } from "@/lib/db-errors";
import { str, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

// Every action re-reads the session; RLS and the SQL functions decide what is allowed.

function readClassFields(formData: FormData) {
  const values = {
    course_name: str(formData, "course_name"),
    instructor_name: str(formData, "instructor_name"),
    term: str(formData, "term"),
  };
  const fieldErrors: Record<string, string> = {};
  if (!values.course_name) fieldErrors.course_name = "نام درس را وارد کنید.";
  else if (values.course_name.length > CLASS_LIMITS.courseName) fieldErrors.course_name = "نام درس خیلی طولانی است.";
  if (values.instructor_name.length > CLASS_LIMITS.instructorName) fieldErrors.instructor_name = "نام استاد خیلی طولانی است.";
  if (values.term.length > CLASS_LIMITS.term) fieldErrors.term = "نام ترم خیلی طولانی است.";
  return { values, fieldErrors };
}

export async function createClass(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { values, fieldErrors } = readClassFields(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("classes").insert(values).select("id").single();
  if (error) return { error: GENERIC_ERROR, values };

  redirect(`/classes/${data.id}`);
}

export async function updateClass(classId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { values, fieldErrors } = readClassFields(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("classes").update(values).eq("id", classId).select("id");
  if (error || !data.length) return { error: GENERIC_ERROR, values };

  refresh();
  return { success: "اطلاعات کلاس ذخیره شد.", values };
}

export async function deleteClass(classId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("classes").delete().eq("id", classId);
  redirect("/classes");
}

const EXPIRY_DAYS = new Set(["1", "7", "30"]);

export async function createInvite(classId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const expiry = str(formData, "expires_in_days");
  const maxUsesRaw = str(formData, "max_uses");
  const values = { expires_in_days: expiry, max_uses: maxUsesRaw };

  const fieldErrors: Record<string, string> = {};
  if (expiry && !EXPIRY_DAYS.has(expiry)) fieldErrors.expires_in_days = "مدت اعتبار نامعتبر است.";
  let maxUses: number | null = null;
  if (maxUsesRaw) {
    maxUses = Number(maxUsesRaw);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > INVITE_MAX_USES_LIMIT) {
      fieldErrors.max_uses = `عددی بین ۱ تا ${INVITE_MAX_USES_LIMIT.toLocaleString("fa-IR")} وارد کنید.`;
    }
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const expiresAt = expiry ? new Date(Date.now() + Number(expiry) * 86_400_000).toISOString() : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_invites")
    .insert({ class_id: classId, expires_at: expiresAt, max_uses: maxUses });
  if (error) return { error: GENERIC_ERROR, values };

  refresh();
  return { success: "لینک دعوت ساخته شد." };
}

export async function revokeInvite(inviteId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("class_invites").update({ revoked_at: new Date().toISOString() }).eq("id", inviteId);
  refresh();
}

export async function respondToRequest(requestId: string, approve: boolean) {
  await requireUser();
  const supabase = await createClient();
  await supabase.rpc("respond_to_join_request", { p_request_id: requestId, p_approve: approve });
  refresh();
}

export async function removeMember(classId: string, userId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("class_members").delete().eq("class_id", classId).eq("user_id", userId);
  refresh();
}

export async function leaveClass(classId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("class_members").delete().eq("class_id", classId).eq("user_id", user.id);
  redirect("/classes");
}

export async function requestToJoin(token: string): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_to_join", { p_token: token });
  if (error) return { error: dbErrorMessage(error) };

  refresh();
  return { success: "درخواست عضویتت ثبت شد. پس از تأیید سازندهٔ کلاس، کلاس در فهرست کلاس‌هایت نمایش داده می‌شود." };
}

export async function setClassColor(classId: string, color: ClassColor) {
  await requireUser();
  if (!CLASS_COLOR_KEYS.includes(color)) return;
  const supabase = await createClient();
  await supabase.from("classes").update({ color }).eq("id", classId);
  refresh();
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const ROOM_LIMIT = 80;

/** Adds a weekly session (owner only, via RLS). Times are Tehran wall-clock "HH:mm". */
export async function addSession(classId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const values = {
    weekday: str(formData, "weekday"),
    start_time: str(formData, "start_time"),
    end_time: str(formData, "end_time"),
    room: str(formData, "room"),
  };
  const fieldErrors: Record<string, string> = {};
  const weekday = Number(values.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) fieldErrors.weekday = "روز را انتخاب کنید.";
  if (!TIME_RE.test(values.start_time)) fieldErrors.start_time = "ساعت شروع نامعتبر است.";
  if (!TIME_RE.test(values.end_time)) fieldErrors.end_time = "ساعت پایان نامعتبر است.";
  else if (!fieldErrors.start_time && values.end_time <= values.start_time) fieldErrors.end_time = "پایان باید بعد از شروع باشد.";
  if (values.room.length > ROOM_LIMIT) fieldErrors.room = "نام اتاق خیلی طولانی است.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("class_sessions").insert({
    class_id: classId,
    weekday,
    start_time: values.start_time,
    end_time: values.end_time,
    room: values.room,
  });
  if (error) return { error: GENERIC_ERROR, values };

  refresh();
  return { success: "جلسه اضافه شد." };
}

export async function deleteSession(sessionId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("class_sessions").delete().eq("id", sessionId);
  refresh();
}
