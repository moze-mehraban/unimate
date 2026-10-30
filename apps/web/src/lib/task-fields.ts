import "server-only";
import { ASSIGNMENT_LIMITS, PRIORITIES, TASK_STATUSES, type Priority, type TaskStatus } from "@unimate/shared";
import { fromTehranInputValue } from "./format";
import { str } from "./forms";

/** Reads and validates the TaskForm fields (shared by assignments and personal tasks). */
export function readTaskFields(formData: FormData) {
  const values = {
    title: str(formData, "title"),
    description: str(formData, "description"),
    // datetime-local value, entered as Tehran time.
    due_local: str(formData, "due_local"),
    priority: str(formData, "priority"),
  };
  const fieldErrors: Record<string, string> = {};
  if (!values.title) fieldErrors.title = "عنوان را وارد کنید.";
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

export function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}
