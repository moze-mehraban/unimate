"use client";

import { useOptimistic, useTransition } from "react";
import { TASK_STATUSES, type TaskStatus } from "@unimate/shared";
import { STATUS_LABEL } from "@/lib/labels";

const ACTIVE_STYLE: Record<TaskStatus, string> = {
  todo: "bg-surface text-foreground shadow-sm",
  in_progress: "bg-primary text-primary-foreground shadow-sm",
  done: "bg-success text-primary-foreground shadow-sm",
};

/** Segmented todo / in progress / done picker; switches instantly, saves in the background. */
export function StatusControl({
  status,
  action,
}: {
  status: TaskStatus;
  action: (status: TaskStatus) => Promise<void>;
}) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label="وضعیت من"
      aria-busy={pending}
      className="inline-flex rounded-lg bg-background p-0.5 text-xs"
    >
      {TASK_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={optimistic === s}
          onClick={() => {
            if (s === optimistic) return;
            startTransition(async () => {
              setOptimistic(s);
              await action(s);
            });
          }}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            optimistic === s ? ACTIVE_STYLE[s] : "text-muted hover:text-foreground"
          }`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
