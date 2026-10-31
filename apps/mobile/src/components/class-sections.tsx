import { useState } from "react";
import { Platform, Share, View } from "react-native";
import { formatJalaliDay, dayKeyOf, GENERIC_ERROR, INVITE_MAX_USES_LIMIT, toFaDigits } from "@unimate/shared";
import type { AssignmentReport, ClassMember, InviteLink, InviteState, PendingRequest } from "@/lib/classes";
import { confirmAsync, notify } from "@/lib/dialogs";
import { supabase, WEB_URL } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { AppText, Banner, Button, Field, Section, Segmented, SmallButton } from "./ui";

// Owner tools on the class screen. Each action re-checks on the server: RLS and
// the SQL functions decide; these screens only hide what wouldn't work anyway.

function Row({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ borderTopColor: c.border, borderTopWidth: 1, paddingTop: 10, gap: 6 }}>{children}</View>
  );
}

export function ReportsSection({ reports, onChanged }: { reports: AssignmentReport[]; onChanged: () => void }) {
  if (!reports.length) return null;

  async function resolve(id: string, status: "resolved" | "dismissed") {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("assignment_reports")
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: auth.user?.id ?? null })
      .eq("id", id);
    if (error) notify("انجام نشد", GENERIC_ERROR);
    onChanged();
  }

  return (
    <Section title="گزارش‌های اطلاعات نادرست" count={reports.length}>
      {reports.map((r) => (
        <Row key={r.id}>
          <AppText weight="medium" size={14}>
            «{r.assignmentTitle}»
          </AppText>
          <AppText size={14}>{r.reason}</AppText>
          <AppText size={12} tone="muted">
            گزارش از {r.reporterName || "یک عضو"}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <SmallButton tone="primary" onPress={() => resolve(r.id, "resolved")}>
              رسیدگی شد
            </SmallButton>
            <SmallButton onPress={() => resolve(r.id, "dismissed")}>رد گزارش</SmallButton>
          </View>
        </Row>
      ))}
    </Section>
  );
}

export function RequestsSection({ requests, onChanged }: { requests: PendingRequest[]; onChanged: () => void }) {
  async function respond(id: string, approve: boolean, name: string) {
    if (!approve && !(await confirmAsync("رد درخواست", `درخواست «${name}» رد شود؟`, "رد", true))) return;
    const { error } = await supabase.rpc("respond_to_join_request", { p_request_id: id, p_approve: approve });
    if (error) notify("انجام نشد", GENERIC_ERROR);
    onChanged();
  }

  return (
    <Section title="درخواست‌های عضویت" count={requests.length}>
      {requests.length ? (
        requests.map((r) => (
          <Row key={r.id}>
            <AppText weight="medium" size={14}>
              {r.fullName || "بدون نام"}
            </AppText>
            {r.university ? (
              <AppText size={12} tone="muted">
                {r.university}
              </AppText>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SmallButton tone="primary" onPress={() => respond(r.id, true, r.fullName)}>
                تأیید
              </SmallButton>
              <SmallButton tone="danger" onPress={() => respond(r.id, false, r.fullName)}>
                رد
              </SmallButton>
            </View>
          </Row>
        ))
      ) : (
        <AppText size={13} tone="muted">
          درخواست تازه‌ای نیست.
        </AppText>
      )}
    </Section>
  );
}

const INVITE_STATE_TEXT: Record<InviteState, string> = {
  active: "فعال",
  revoked: "لغوشده",
  expired: "منقضی",
  used_up: "ظرفیت پر شده",
};

type Expiry = "none" | "1" | "7" | "30";

export function InvitesSection({ classId, invites, onChanged }: { classId: string; invites: InviteLink[]; onChanged: () => void }) {
  const c = useColors();
  const [expiry, setExpiry] = useState<Expiry>("7");
  const [maxUses, setMaxUses] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function create() {
    let max: number | null = null;
    if (maxUses.trim()) {
      max = Number(maxUses.trim());
      if (!Number.isInteger(max) || max < 1 || max > INVITE_MAX_USES_LIMIT) {
        return setError(`سقف استفاده باید عددی بین ۱ تا ${toFaDigits(INVITE_MAX_USES_LIMIT)} باشد.`);
      }
    }
    setError(null);
    setCreating(true);
    const expiresAt = expiry === "none" ? null : new Date(Date.now() + Number(expiry) * 86_400_000).toISOString();
    const { error: e } = await supabase.from("class_invites").insert({ class_id: classId, expires_at: expiresAt, max_uses: max });
    setCreating(false);
    if (e) return setError(GENERIC_ERROR);
    setMaxUses("");
    onChanged();
  }

  async function share(token: string) {
    const url = `${WEB_URL}/join/${token}`;
    if (Platform.OS === "web") {
      await navigator.clipboard?.writeText(url);
      notify("کپی شد", "لینک دعوت کپی شد.");
    } else {
      await Share.share({ message: `برای عضویت در کلاس روی این لینک بزن:\n${url}` });
    }
  }

  async function revoke(id: string) {
    if (!(await confirmAsync("لغو لینک", "این لینک دعوت لغو شود؟ دیگر کسی نمی‌تواند با آن درخواست بدهد.", "لغو لینک", true))) return;
    const { error: e } = await supabase.from("class_invites").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (e) notify("انجام نشد", GENERIC_ERROR);
    onChanged();
  }

  return (
    <Section title="لینک‌های دعوت">
      <View style={{ gap: 10 }}>
        {error ? <Banner kind="error">{error}</Banner> : null}
        <AppText size={13} weight="medium">
          مدت اعتبار
        </AppText>
        <Segmented
          value={expiry}
          onChange={setExpiry}
          options={[
            { value: "1", label: "۱ روز" },
            { value: "7", label: "۷ روز" },
            { value: "30", label: "۳۰ روز" },
            { value: "none", label: "بدون انقضا" },
          ]}
        />
        <Field label="سقف استفاده" value={maxUses} onChangeText={setMaxUses} keyboardType="number-pad" hint="اختیاری — خالی یعنی بدون محدودیت" />
        <Button onPress={create} loading={creating}>
          ساخت لینک دعوت
        </Button>
      </View>

      {invites.map((inv) => (
        <Row key={inv.id}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                backgroundColor: inv.state === "active" ? c.successSoft : c.background,
                borderRadius: 999,
                paddingHorizontal: 8,
              }}
            >
              <AppText size={11} style={{ color: inv.state === "active" ? c.success : c.muted }}>
                {INVITE_STATE_TEXT[inv.state]}
              </AppText>
            </View>
            <AppText size={12} tone="muted">
              {toFaDigits(inv.useCount)}
              {inv.maxUses !== null ? ` از ${toFaDigits(inv.maxUses)}` : ""} استفاده
              {inv.expiresAt ? ` · تا ${formatJalaliDay(dayKeyOf(inv.expiresAt))}` : ""}
            </AppText>
          </View>
          {inv.state === "active" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <SmallButton tone="primary" onPress={() => share(inv.token)}>
                {Platform.OS === "web" ? "کپی لینک" : "اشتراک‌گذاری"}
              </SmallButton>
              <SmallButton tone="danger" onPress={() => revoke(inv.id)}>
                لغو
              </SmallButton>
            </View>
          ) : null}
        </Row>
      ))}
    </Section>
  );
}

export function MembersSection({
  classId,
  members,
  isOwner,
  onChanged,
}: {
  classId: string;
  members: ClassMember[];
  isOwner: boolean;
  onChanged: () => void;
}) {
  async function remove(m: ClassMember) {
    if (!(await confirmAsync("حذف عضو", `«${m.fullName || "این عضو"}» از کلاس حذف شود؟`, "حذف", true))) return;
    const { error } = await supabase.from("class_members").delete().eq("class_id", classId).eq("user_id", m.userId);
    if (error) notify("انجام نشد", GENERIC_ERROR);
    onChanged();
  }

  return (
    <Section title="اعضا" count={members.length}>
      {members.map((m) => (
        <Row key={m.userId}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <AppText weight="medium" size={14}>
                {m.fullName || "بدون نام"}
                {m.role === "owner" ? " · سازنده" : ""}
              </AppText>
              {m.university ? (
                <AppText size={12} tone="muted">
                  {m.university}
                </AppText>
              ) : null}
            </View>
            {isOwner && m.role !== "owner" ? (
              <SmallButton tone="danger" onPress={() => remove(m)}>
                حذف
              </SmallButton>
            ) : null}
          </View>
        </Row>
      ))}
    </Section>
  );
}
