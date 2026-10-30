import "server-only";
import { notFound } from "next/navigation";
import type { Priority, ReportStatus } from "@unimate/shared";
import { requireUser } from "../auth";
import { describeDue, type DueState } from "../format";
import { isUuid } from "../forms";
import { createClient } from "../supabase/server";
import { getClassOrNotFound, type ClassDetail } from "./classes";

export type ClassAssignment = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  /** Relative deadline, computed at request time. */
  due: { text: string; state: DueState };
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  creatorName: string;
  /** Creator or class owner (mirrors the RLS update/delete policies). */
  canEdit: boolean;
  /** I already have an open report on it. */
  reportedByMe: boolean;
};

export async function getClassAssignments(cls: ClassDetail): Promise<ClassAssignment[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data, error }, { data: myReports }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, description, due_at, priority, created_at, updated_at, created_by, profiles!assignments_created_by_fkey(full_name)")
      .eq("class_id", cls.id)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    // RLS: members only see their own reports.
    supabase.from("assignment_reports").select("assignment_id").eq("reporter_id", user.id).eq("status", "open"),
  ]);
  if (error) throw error;

  const reported = new Set((myReports ?? []).map((r) => r.assignment_id));
  const now = Date.now();
  return data.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    dueAt: a.due_at,
    due: describeDue(a.due_at, now),
    priority: a.priority,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    createdBy: a.created_by,
    creatorName: a.profiles?.full_name ?? "",
    canEdit: cls.isOwner || a.created_by === user.id,
    reportedByMe: reported.has(a.id),
  }));
}

/** An assignment the current user may edit, with its class; otherwise a 404. */
export async function getEditableAssignment(classId: string, assignmentId: string) {
  if (!isUuid(assignmentId)) notFound();
  const cls = await getClassOrNotFound(classId);
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("class_id", cls.id)
    .maybeSingle();
  if (!data || !(cls.isOwner || data.created_by === user.id)) notFound();
  return { cls, assignment: data };
}

export type AssignmentReport = {
  id: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  assignmentId: string;
  assignmentTitle: string;
  reporterName: string;
};

/** Open reports for the owner's review (RLS returns nothing for other members). */
export async function getOpenReports(classId: string): Promise<AssignmentReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignment_reports")
    .select("id, reason, status, created_at, assignment_id, assignments!inner(title, class_id), profiles!assignment_reports_reporter_id_fkey(full_name)")
    .eq("assignments.class_id", classId)
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) throw error;

  return data.map((r) => ({
    id: r.id,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
    assignmentId: r.assignment_id,
    assignmentTitle: r.assignments.title,
    reporterName: r.profiles?.full_name ?? "",
  }));
}
