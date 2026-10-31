import {
  CLASS_LIMITS,
  describeDue,
  type ClassRow,
  type DueState,
  type MemberRole,
  type Priority,
  type TaskStatus,
} from "@unimate/shared";
import { supabase } from "./supabase";

// Reads mirror the web data layer (apps/web/src/lib/data/classes.ts, assignments.ts).
// RLS decides what each user gets back; nothing here is a security boundary.

export type ClassSummary = Pick<ClassRow, "id" | "course_name" | "instructor_name" | "term"> & {
  isOwner: boolean;
  memberCount: number;
};

export async function fetchMyClasses(userId: string): Promise<ClassSummary[]> {
  const { data, error } = await supabase
    .from("classes")
    .select("id, course_name, instructor_name, term, owner_id, created_at, class_members(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    course_name: c.course_name,
    instructor_name: c.instructor_name,
    term: c.term,
    isOwner: c.owner_id === userId,
    memberCount: c.class_members[0]?.count ?? 0,
  }));
}

export type ClassDetail = ClassRow & { isOwner: boolean };

/** The class if I'm a member, else null. */
export async function fetchClass(classId: string, userId: string): Promise<ClassDetail | null> {
  const { data } = await supabase.from("classes").select("*").eq("id", classId).maybeSingle();
  return data ? { ...data, isOwner: data.owner_id === userId } : null;
}

export type ClassFields = { course_name: string; instructor_name: string; term: string };

/** Field errors for the class form (same rules as the web). */
export function validateClass(v: ClassFields): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!v.course_name.trim()) errors.course_name = "نام درس را وارد کنید.";
  else if (v.course_name.trim().length > CLASS_LIMITS.courseName) errors.course_name = "نام درس خیلی طولانی است.";
  if (v.instructor_name.trim().length > CLASS_LIMITS.instructorName) errors.instructor_name = "نام استاد خیلی طولانی است.";
  if (v.term.trim().length > CLASS_LIMITS.term) errors.term = "نام ترم خیلی طولانی است.";
  return errors;
}

// --- Assignments -------------------------------------------------------------

export type ClassAssignment = {
  id: string;
  title: string;
  description: string;
  dueAt: string | null;
  due: { text: string; state: DueState };
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  creatorName: string;
  /** Creator or class owner (mirrors the RLS update/delete policies). */
  canEdit: boolean;
  reportedByMe: boolean;
  myStatus: TaskStatus;
};

export async function fetchClassAssignments(cls: ClassDetail, userId: string): Promise<ClassAssignment[]> {
  const [{ data, error }, { data: myReports }, { data: myStatuses }] = await Promise.all([
    supabase
      .from("assignments")
      .select(
        "id, title, description, due_at, priority, created_at, updated_at, created_by, profiles!assignments_created_by_fkey(full_name)",
      )
      .eq("class_id", cls.id)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.from("assignment_reports").select("assignment_id").eq("reporter_id", userId).eq("status", "open"),
    supabase.from("assignment_status").select("assignment_id, status").eq("user_id", userId),
  ]);
  if (error) throw error;

  const reported = new Set((myReports ?? []).map((r) => r.assignment_id));
  const statusById = new Map((myStatuses ?? []).map((s) => [s.assignment_id, s.status]));
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
    canEdit: cls.isOwner || a.created_by === userId,
    reportedByMe: reported.has(a.id),
    myStatus: statusById.get(a.id) ?? "todo",
  }));
}

export type AssignmentReport = { id: string; reason: string; assignmentId: string; assignmentTitle: string; reporterName: string };

/** Open reports for the owner (RLS returns nothing to other members). */
export async function fetchOpenReports(classId: string): Promise<AssignmentReport[]> {
  const { data, error } = await supabase
    .from("assignment_reports")
    .select("id, reason, assignment_id, assignments!inner(title, class_id), profiles!assignment_reports_reporter_id_fkey(full_name)")
    .eq("assignments.class_id", classId)
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    reason: r.reason,
    assignmentId: r.assignment_id,
    assignmentTitle: r.assignments.title,
    reporterName: r.profiles?.full_name ?? "",
  }));
}

// --- Members, requests, invites ------------------------------------------------

export type ClassMember = { userId: string; role: MemberRole; fullName: string; university: string };

export async function fetchMembers(classId: string): Promise<ClassMember[]> {
  const { data, error } = await supabase
    .from("class_members")
    .select("user_id, role, joined_at, profiles(full_name, university)")
    .eq("class_id", classId)
    .order("role", { ascending: true }) // enum order: owner first
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return data.map((m) => ({
    userId: m.user_id,
    role: m.role,
    fullName: m.profiles?.full_name ?? "",
    university: m.profiles?.university ?? "",
  }));
}

export type PendingRequest = { id: string; fullName: string; university: string };

export async function fetchPendingRequests(classId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from("join_requests")
    .select("id, created_at, profiles!join_requests_user_id_fkey(full_name, university)")
    .eq("class_id", classId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((r) => ({ id: r.id, fullName: r.profiles?.full_name ?? "", university: r.profiles?.university ?? "" }));
}

export type InviteState = "active" | "revoked" | "expired" | "used_up";
export type InviteLink = {
  id: string;
  token: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  state: InviteState;
};

export async function fetchInvites(classId: string): Promise<InviteLink[]> {
  const { data, error } = await supabase
    .from("class_invites")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return data.map((i) => ({
    id: i.id,
    token: i.token,
    expiresAt: i.expires_at,
    maxUses: i.max_uses,
    useCount: i.use_count,
    state: i.revoked_at
      ? "revoked"
      : i.expires_at && new Date(i.expires_at).getTime() <= now
        ? "expired"
        : i.max_uses !== null && i.use_count >= i.max_uses
          ? "used_up"
          : "active",
  }));
}
