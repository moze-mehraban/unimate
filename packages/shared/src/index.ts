export type { Database, Json } from "./database.types";
import type { Database } from "./database.types";

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Profile = Tables<"profiles">;
export type ClassRow = Tables<"classes">;
export type ClassInvite = Tables<"class_invites">;
export type MemberRole = Enums<"member_role">;
export type Assignment = Tables<"assignments">;
export type Priority = Enums<"priority_level">;
export type TaskStatus = Enums<"task_status">;
export type ReportStatus = Enums<"report_status">;
export type PersonalTask = Tables<"personal_tasks">;

// Validation shared by web and mobile. Limits mirror the DB CHECK constraints.
export const PROFILE_LIMITS = { fullName: 120, university: 160 } as const;
export const CLASS_LIMITS = { courseName: 160, instructorName: 120, term: 60 } as const;
/** Max uses an invite link can be given in the UI (DB only requires > 0). */
export const INVITE_MAX_USES_LIMIT = 500;
export const ASSIGNMENT_LIMITS = { title: 200, description: 5000 } as const;
export const REPORT_REASON_LIMIT = 1000;
export const PRIORITIES: readonly Priority[] = ["high", "medium", "low"];
export const TASK_STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "done"];
export const PASSWORD_MIN_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export { authErrorMessage, GENERIC_ERROR } from "./auth-errors";
export * from "./jalali";
export { dbErrorMessage } from "./db-errors";

/** Extracts an invite token from a pasted link (…/join/<token>, unimate://join/<token>) or a bare token. */
export function parseInviteToken(input: string): string | null {
  const match = /(?:^|\/join\/)([0-9a-f]{36})(?:[/?#]|$)/i.exec(input.trim());
  return match ? match[1].toLowerCase() : null;
}
export { describeNotification, type NotificationType } from "./notifications";
