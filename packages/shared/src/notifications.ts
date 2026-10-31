import type { Database, Json } from "./database.types";

export type NotificationType = Database["public"]["Enums"]["notification_type"];

type Payload = Record<string, string | null | undefined>;

function asPayload(json: Json): Payload {
  return json && typeof json === "object" && !Array.isArray(json) ? (json as Payload) : {};
}

/**
 * Title, body and target path for a notification. Names come from the payload
 * (snapshotted by the trigger, so a rejected requester still sees the class).
 * `href` is a web path; the mobile app maps it to its own routes.
 */
export function describeNotification(
  type: NotificationType,
  classId: string | null,
  payload: Json,
  formatDeadline: (iso: string) => string,
): { title: string; body: string; href: string } {
  const p = asPayload(payload);
  const course = p.course_name || "کلاس";
  const classHref = classId ? `/classes/${classId}` : "/classes";

  switch (type) {
    case "assignment_created":
      return {
        title: `تکلیف جدید در ${course}`,
        body: `«${p.title ?? ""}»${p.creator_name ? ` — ثبت توسط ${p.creator_name}` : ""}${
          p.due_at ? ` · مهلت: ${formatDeadline(p.due_at)}` : ""
        }`,
        href: p.assignment_id ? `${classHref}#assignment-${p.assignment_id}` : classHref,
      };
    case "join_request_received":
      return {
        title: `درخواست عضویت در ${course}`,
        body: `${p.requester_name || "یک کاربر"} می‌خواهد به کلاس بپیوندد.`,
        href: `${classHref}#requests`,
      };
    case "join_request_approved":
      return { title: "درخواستت تأیید شد", body: `حالا عضو ${course} هستی.`, href: classHref };
    case "join_request_rejected":
      // Not a member, so the class page would 404.
      return { title: "درخواستت رد شد", body: `درخواست عضویت در ${course} پذیرفته نشد.`, href: "/classes" };
    case "assignment_reported":
      return {
        title: `گزارش اطلاعات نادرست در ${course}`,
        body: `«${p.title ?? ""}»: ${p.reason ?? ""}`,
        href: `${classHref}#reports`,
      };
  }
}
