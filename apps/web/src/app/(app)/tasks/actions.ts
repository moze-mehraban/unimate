"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { TaskStatus } from "@unimate/shared";
import { requireUser } from "@/lib/auth";
import { GENERIC_ERROR } from "@/lib/auth-errors";
import type { FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { isTaskStatus, readTaskFields } from "@/lib/task-fields";

// Personal tasks are private: RLS limits every operation to user_id = auth.uid().

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { values, fieldErrors, row } = readTaskFields(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.from("personal_tasks").insert(row);
  if (error) return { error: GENERIC_ERROR, values };

  redirect("/dashboard");
}

export async function updateTask(taskId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const { values, fieldErrors, row } = readTaskFields(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("personal_tasks").update(row).eq("id", taskId).select("id");
  if (error || !data.length) return { error: GENERIC_ERROR, values };

  redirect("/dashboard");
}

export async function deleteTask(taskId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("personal_tasks").delete().eq("id", taskId);
  refresh();
}

export async function setTaskStatus(taskId: string, status: TaskStatus) {
  await requireUser();
  if (!isTaskStatus(status)) return;
  const supabase = await createClient();
  await supabase.from("personal_tasks").update({ status }).eq("id", taskId);
  refresh();
}
