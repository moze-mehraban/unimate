"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ASSIGNMENT_LIMITS, PRIORITIES, REPORT_REASON_LIMIT, type Priority } from "@unimate/shared";
import { requireUser } from "@/lib/auth";
import { GENERIC_ERROR } from "@/lib/auth-errors";
import { fromTehranInputValue } from "@/lib/format";
import { str, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

// RLS decides who may write: any member creates; creator or owner edits/deletes.

function readAssignmentFields(formData: FormData) {
  const values = {
    title: str(formData, "title"),
    description: str(formData, "description"),
    // datetime-local value, entered as Tehran time.
    due_local: str(formData, "due_local"),
    priority: str(formData, "priority"),
  };
  const fieldErrors: Record<string, string> = {};
  if (!values.title) fieldErrors.title = "عنوان تکلیف را وارد کنید.";
  else if (values.title.length > ASSIGNMENT_LIMITS.title) fieldErrors.title = "عنوان خیلی طولانی است.";
  if (values.description.length > ASSIGNMENT_LIMITS.description) fieldErrors.description = "توضیحات خیلی طولانی است.";
  const due = values.due_local ? fromTehranInputValue(values.due_local) : null;
  if (due && Number.isNaN(due.getTime())) fieldErrors.due_local = "تاریخ مهلت نامعتبر است.";
  if (!PRIORITIES.includes(values.priority as Priority)) fieldErrors.priority = "اولویت را انتخاب کنید.";

  const row = {
    title: values.title,
    description: values.description,
    due_at: due && !Number.isNaN(due.getTime()) ? due.toISOString() : null,
    priority: values.priority as Priority,
  };
  return { values, fieldErrors, row };
}

export async function createAssignment(classId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { values, fieldErrors, row } = readAssignmentFields(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({ ...row, class_id: classId });
  if (error) return { error: GENERIC_ERROR, values };

  redirect(`/classes/${classId}`);
}

export async function updateAssignment(
  classId: string,
  assignmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const { values, fieldErrors, row } = readAssignmentFields(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("assignments").update(row).eq("id", assignmentId).select("id");
  if (error || !data.length) return { error: GENERIC_ERROR, values };

  redirect(`/classes/${classId}`);
}

export async function deleteAssignment(assignmentId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("assignments").delete().eq("id", assignmentId);
  refresh();
}

export async function reportAssignment(assignmentId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const reason = str(formData, "reason");
  if (!reason) return { fieldErrors: { reason: "توضیح بده چه چیزی اشتباه است." } };
  if (reason.length > REPORT_REASON_LIMIT) return { fieldErrors: { reason: "توضیح خیلی طولانی است." }, values: { reason } };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("assignment_reports")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("reporter_id", user.id)
    .eq("status", "open")
    .limit(1);
  if (existing?.length) return { error: "قبلاً برای این تکلیف گزارش باز ثبت کرده‌ای." };

  const { error } = await supabase.from("assignment_reports").insert({ assignment_id: assignmentId, reason });
  if (error) return { error: GENERIC_ERROR, values: { reason } };

  refresh();
  return { success: "گزارش ثبت شد و برای سازندهٔ کلاس ارسال شد." };
}

export async function resolveReport(reportId: string, status: "resolved" | "dismissed") {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("assignment_reports")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", reportId);
  refresh();
}
