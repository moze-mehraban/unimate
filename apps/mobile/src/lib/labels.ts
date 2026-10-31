import type { DueState, Priority, TaskStatus } from "@unimate/shared";
import type { Colors } from "./theme";

// Same wording as the web app (apps/web/src/lib/labels.ts).

export const PRIORITY_TEXT: Record<Priority, string> = {
  high: "اولویت بالا",
  medium: "اولویت متوسط",
  low: "اولویت پایین",
};

export function priorityColors(c: Colors): Record<Priority, { bg: string; fg: string }> {
  return {
    high: { bg: c.dangerSoft, fg: c.danger },
    medium: { bg: `${c.primary}1a`, fg: c.primary },
    low: { bg: c.background, fg: c.muted },
  };
}

export const STATUS_TEXT: Record<TaskStatus, string> = {
  todo: "انجام‌نشده",
  in_progress: "در حال انجام",
  done: "تکمیل‌شده",
};

export function dueColor(c: Colors, state: DueState): string {
  return state === "overdue" || state === "soon" ? c.danger : c.muted;
}
