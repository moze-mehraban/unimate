import { useState } from "react";
import { TextInput, View } from "react-native";
import { formatDeadlineFa, formatJalaliDay, dayKeyOf, REPORT_REASON_LIMIT, TASK_STATUSES, type TaskStatus } from "@unimate/shared";
import type { ClassAssignment } from "@/lib/classes";
import { dueColor, priorityColors, PRIORITY_TEXT, STATUS_TEXT } from "@/lib/labels";
import { FONT, useColors } from "@/lib/theme";
import { AppText, Segmented, SmallButton } from "./ui";

/** A class assignment: details, my status, edit/delete (creator or owner) or report (everyone else). */
export function AssignmentCard({
  a,
  onStatus,
  onEdit,
  onDelete,
  onReport,
}: {
  a: ClassAssignment;
  onStatus: (status: TaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Returns an error message, or null when the report was sent. */
  onReport: (reason: string) => Promise<string | null>;
}) {
  const c = useColors();
  const done = a.myStatus === "done";
  const priority = priorityColors(c)[a.priority];
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function sendReport() {
    if (!reason.trim()) return setReportError("توضیح بده چه چیزی اشتباه است.");
    setSending(true);
    const error = await onReport(reason.trim());
    setSending(false);
    if (error) setReportError(error);
    else {
      setReporting(false);
      setReason("");
    }
  }

  return (
    <View
      style={{
        backgroundColor: done ? c.background : c.surface,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <AppText weight="bold" tone={done ? "muted" : "foreground"} style={done ? { textDecorationLine: "line-through" } : null}>
          {a.title}
        </AppText>
        <View style={{ backgroundColor: priority.bg, borderRadius: 999, paddingHorizontal: 8 }}>
          <AppText size={11} style={{ color: priority.fg }}>
            {PRIORITY_TEXT[a.priority]}
          </AppText>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 10 }}>
        {a.dueAt ? (
          <AppText size={12} tone="muted">
            مهلت: {formatDeadlineFa(a.dueAt)}
          </AppText>
        ) : null}
        {done ? null : (
          <AppText size={12} style={{ color: dueColor(c, a.due.state) }}>
            {a.due.text}
          </AppText>
        )}
      </View>

      {a.description ? <AppText size={14}>{a.description}</AppText> : null}

      <View style={{ marginTop: 4 }}>
        <Segmented
          value={a.myStatus}
          onChange={onStatus}
          options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_TEXT[s] }))}
          activeColors={{
            todo: { bg: c.surface, fg: c.foreground },
            in_progress: { bg: c.primary, fg: c.primaryForeground },
            done: { bg: c.success, fg: c.primaryForeground },
          }}
        />
      </View>

      <View style={{ borderTopColor: c.border, borderTopWidth: 1, paddingTop: 8, marginTop: 4, gap: 8 }}>
        <AppText size={12} tone="muted">
          ثبت توسط {a.creatorName || "عضو سابق"} · {formatJalaliDay(dayKeyOf(a.createdAt))}
          {a.updatedAt !== a.createdAt ? " · ویرایش‌شده" : ""}
        </AppText>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {a.canEdit ? (
            <>
              <SmallButton onPress={onEdit}>ویرایش</SmallButton>
              <SmallButton tone="danger" onPress={onDelete}>
                حذف
              </SmallButton>
            </>
          ) : a.reportedByMe ? (
            <AppText size={12} tone="muted">
              گزارش تو در انتظار بررسی است
            </AppText>
          ) : !reporting ? (
            <SmallButton onPress={() => setReporting(true)}>گزارش اطلاعات نادرست</SmallButton>
          ) : null}
        </View>

        {reporting ? (
          <View style={{ gap: 8 }}>
            <TextInput
              value={reason}
              onChangeText={(t) => {
                setReason(t);
                setReportError(null);
              }}
              placeholder="مثلاً مهلت واقعی پنجشنبه است، نه سه‌شنبه."
              placeholderTextColor={c.muted}
              maxLength={REPORT_REASON_LIMIT}
              multiline
              style={{
                fontFamily: FONT.regular,
                fontSize: 14,
                color: c.foreground,
                borderColor: reportError ? c.danger : c.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
                minHeight: 70,
                textAlignVertical: "top",
              }}
            />
            {reportError ? (
              <AppText size={12} tone="danger">
                {reportError}
              </AppText>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SmallButton tone="primary" onPress={sendReport} disabled={sending}>
                {sending ? "…" : "ارسال گزارش"}
              </SmallButton>
              <SmallButton onPress={() => setReporting(false)}>انصراف</SmallButton>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
