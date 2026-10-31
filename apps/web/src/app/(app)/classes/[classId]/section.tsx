import type { ReactNode } from "react";

export function Section({
  id,
  title,
  description,
  badge,
  action,
  children,
}: {
  /** Anchor for deep links (e.g. from notifications). */
  id?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  /** Rendered at the end of the header row, e.g. an "add" button. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-bold">{title}</h2>
        {badge}
        {action ? <div className="ms-auto">{action}</div> : null}
      </div>
      {description ? <p className="-mt-2 mb-4 text-sm text-muted">{description}</p> : null}
      {children}
    </section>
  );
}

export function CountBadge({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{count.toLocaleString("fa-IR")}</span>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
      {name.trim().charAt(0) || "؟"}
    </span>
  );
}
