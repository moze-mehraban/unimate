import { PRIORITIES, type Priority } from "@unimate/shared";
import type { WorkItem } from "./data/my-work";
import { isUuid } from "./forms";

export type WorkSort = "due" | "priority" | "class";
export const WORK_SORTS: { value: WorkSort; label: string }[] = [
  { value: "due", label: "نزدیک‌ترین مهلت" },
  { value: "priority", label: "اولویت" },
  { value: "class", label: "کلاس" },
];

export type WorkFilters = {
  /** A class id, "personal" for personal tasks, or "all". */
  source: string;
  priority: Priority | "all";
  sort: WorkSort;
};

type SearchParams = Record<string, string | string[] | undefined>;

/** Reads ?source=&priority=&sort=, falling back to defaults for anything unknown. */
export function parseWorkFilters(params: SearchParams): WorkFilters {
  const source = typeof params.source === "string" && (params.source === "personal" || isUuid(params.source)) ? params.source : "all";
  const priority = PRIORITIES.includes(params.priority as Priority) ? (params.priority as Priority) : "all";
  const sort = WORK_SORTS.some((s) => s.value === params.sort) ? (params.sort as WorkSort) : "due";
  return { source, priority, sort };
}

export function filterWork(items: WorkItem[], f: WorkFilters): WorkItem[] {
  return items.filter((item) => {
    if (f.priority !== "all" && item.priority !== f.priority) return false;
    if (f.source === "personal") return item.kind === "task";
    if (f.source !== "all") return item.kind === "assignment" && item.classId === f.source;
    return true;
  });
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

function byDue(a: WorkItem, b: WorkItem) {
  if (a.dueAt === b.dueAt) return 0;
  if (!a.dueAt) return 1;
  if (!b.dueAt) return -1;
  return a.dueAt < b.dueAt ? -1 : 1;
}

const byPriority = (a: WorkItem, b: WorkItem) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

/** Personal tasks after all classes. */
function byClass(a: WorkItem, b: WorkItem) {
  const name = (i: WorkItem) => (i.kind === "assignment" ? i.courseName : null);
  const [x, y] = [name(a), name(b)];
  if (x === y) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x.localeCompare(y, "fa");
}

const COMPARATORS: Record<WorkSort, ((a: WorkItem, b: WorkItem) => number)[]> = {
  due: [byDue, byPriority],
  priority: [byPriority, byDue],
  class: [byClass, byDue, byPriority],
};

export function sortWork(items: WorkItem[], sort: WorkSort): WorkItem[] {
  const comparators = COMPARATORS[sort];
  return [...items].sort((a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result) return result;
    }
    return 0;
  });
}

/** Classes that appear in the list, for the source filter. */
export function workSources(items: WorkItem[]) {
  const classes = new Map<string, string>();
  for (const item of items) if (item.kind === "assignment") classes.set(item.classId, item.courseName);
  return [...classes].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "fa"));
}
