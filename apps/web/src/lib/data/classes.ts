import "server-only";
import { notFound } from "next/navigation";
import type { ClassRow, MemberRole } from "@unimate/shared";
import { requireUser } from "../auth";
import { isUuid } from "../forms";
import { createClient } from "../supabase/server";

// All reads go through RLS: a user only ever gets rows they are allowed to see.

export type ClassSummary = Pick<ClassRow, "id" | "course_name" | "instructor_name" | "term"> & {
  isOwner: boolean;
  memberCount: number;
};

export async function getMyClasses(): Promise<ClassSummary[]> {
  const user = await requireUser();
  const supabase = await createClient();
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
    isOwner: c.owner_id === user.id,
    memberCount: c.class_members[0]?.count ?? 0,
  }));
}

export type ClassDetail = ClassRow & { isOwner: boolean; myRole: MemberRole };

/** The class if the current user is a member; otherwise a 404. */
export async function getClassOrNotFound(classId: string): Promise<ClassDetail> {
  if (!isUuid(classId)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("*").eq("id", classId).maybeSingle();
  if (!data) notFound();

  const isOwner = data.owner_id === user.id;
  return { ...data, isOwner, myRole: isOwner ? "owner" : "member" };
}

export type ClassMember = {
  userId: string;
  role: MemberRole;
  joinedAt: string;
  fullName: string;
  university: string;
};

export async function getMembers(classId: string): Promise<ClassMember[]> {
  const supabase = await createClient();
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
    joinedAt: m.joined_at,
    fullName: m.profiles?.full_name ?? "",
    university: m.profiles?.university ?? "",
  }));
}

export type PendingRequest = { id: string; createdAt: string; userId: string; fullName: string; university: string };

/** Owner only (RLS returns nothing for other members). */
export async function getPendingRequests(classId: string): Promise<PendingRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("join_requests")
    .select("id, created_at, user_id, profiles!join_requests_user_id_fkey(full_name, university)")
    .eq("class_id", classId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;

  return data.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    userId: r.user_id,
    fullName: r.profiles?.full_name ?? "",
    university: r.profiles?.university ?? "",
  }));
}

export type InviteState = "active" | "revoked" | "expired" | "used_up";

export type InviteLink = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  state: InviteState;
};

/** Owner only (RLS returns nothing for other members). */
export async function getInvites(classId: string): Promise<InviteLink[]> {
  const supabase = await createClient();
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
    createdAt: i.created_at,
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

export async function getInvitePreview(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_preview", { p_token: token });
  if (error) throw error;
  return data[0] ?? null;
}
