import type { Priority, TaskStatus } from "@unimate/shared";

export const PRIORITY_LABEL: Record<Priority, { text: string; className: string }> = {
  high: { text: "اولویت بالا", className: "bg-danger-soft text-danger" },
  medium: { text: "اولویت متوسط", className: "bg-primary/10 text-primary" },
  low: { text: "اولویت پایین", className: "bg-background text-muted" },
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "انجام‌نشده",
  in_progress: "در حال انجام",
  done: "تکمیل‌شده",
};
