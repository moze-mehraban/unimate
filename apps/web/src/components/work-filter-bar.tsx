"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { PRIORITIES } from "@unimate/shared";
import { PRIORITY_LABEL } from "@/lib/labels";
import { WORK_SORTS, type WorkFilters } from "@/lib/work-filters";

const selectStyle =
  "rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Source / priority (and optionally sort) pickers that live in the URL, so views are shareable. */
export function WorkFilterBar({
  filters,
  sources,
  params,
  showSort = false,
}: {
  filters: WorkFilters;
  sources: { id: string; name: string }[];
  /** The page's current query, kept when one filter changes. */
  params: Record<string, string>;
  showSort?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string, fallback: string) {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <select
        aria-label="کلاس"
        className={selectStyle}
        value={filters.source}
        onChange={(e) => update("source", e.target.value, "all")}
      >
        <option value="all">همهٔ کلاس‌ها و کارها</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
        <option value="personal">فقط کارهای شخصی</option>
      </select>
      <select
        aria-label="اولویت"
        className={selectStyle}
        value={filters.priority}
        onChange={(e) => update("priority", e.target.value, "all")}
      >
        <option value="all">همهٔ اولویت‌ها</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p].text}
          </option>
        ))}
      </select>
      {showSort ? (
        <select
          aria-label="مرتب‌سازی"
          className={selectStyle}
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value, "due")}
        >
          {WORK_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              مرتب‌سازی: {s.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
