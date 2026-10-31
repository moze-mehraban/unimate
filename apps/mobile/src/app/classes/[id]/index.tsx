import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { GENERIC_ERROR, REPORT_REASON_LIMIT, type TaskStatus } from "@unimate/shared";
import { AssignmentCard } from "@/components/assignment-card";
import { ReportsSection, RequestsSection } from "@/components/class-sections";
import { ComingSoon } from "@/components/coming-soon";
import { Fab } from "@/components/fab";
import { AppText, Card, Loading, Section } from "@/components/ui";
import {
  fetchClass,
  fetchClassAssignments,
  fetchOpenReports,
  fetchPendingRequests,
  type AssignmentReport,
  type ClassAssignment,
  type ClassDetail,
  type PendingRequest,
} from "@/lib/classes";
import { confirmAsync, notify } from "@/lib/dialogs";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";
import { useClassRealtime } from "@/lib/use-class-realtime";
import { useUserId } from "@/providers/session";

type ClassData = {
  cls: ClassDetail;
  assignments: ClassAssignment[];
  // Owner only.
  reports: AssignmentReport[];
  requests: PendingRequest[];
};

export default function ClassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const c = useColors();
  // undefined = loading, null = not a member / doesn't exist.
  const [data, setData] = useState<ClassData | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const cls = await fetchClass(id, userId);
    if (!cls) return setData(null);
    const [assignments, reports, requests] = await Promise.all([
      fetchClassAssignments(cls, userId),
      cls.isOwner ? fetchOpenReports(cls.id) : [],
      cls.isOwner ? fetchPendingRequests(cls.id) : [],
    ]);
    setData({ cls, assignments, reports, requests });
  }, [id, userId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => notify("خطا", "بارگذاری کلاس انجام نشد."));
    }, [load]),
  );

  const live = useClassRealtime(id, data?.assignments.map((a) => a.id) ?? [], () => {
    load();
  });

  if (data === undefined) return <Loading />;
  if (data === null) {
    return <ComingSoon icon="alert-circle-outline" title="پیدا نشد" text="این کلاس وجود ندارد یا عضوش نیستی." />;
  }

  const { cls, assignments } = data;

  async function setStatus(a: ClassAssignment, status: TaskStatus) {
    setData(
      (d) =>
        d && {
          ...d,
          assignments: d.assignments.map((x) => (x.id === a.id ? { ...x, myStatus: status } : x)),
        },
    );
    const { error } = await supabase
      .from("assignment_status")
      .upsert({ assignment_id: a.id, user_id: userId, status }, { onConflict: "assignment_id,user_id" });
    if (error) {
      notify("ذخیره نشد", "وضعیت ذخیره نشد. دوباره تلاش کن.");
      load();
    }
  }

  async function remove(a: ClassAssignment) {
    if (!(await confirmAsync("حذف تکلیف", `تکلیف «${a.title}» برای همهٔ اعضا حذف شود؟`, "حذف", true))) return;
    const { error } = await supabase.from("assignments").delete().eq("id", a.id);
    if (error) notify("حذف نشد", GENERIC_ERROR);
    load();
  }

  async function report(a: ClassAssignment, reason: string): Promise<string | null> {
    if (reason.length > REPORT_REASON_LIMIT) return "توضیح خیلی طولانی است.";
    const { error } = await supabase.from("assignment_reports").insert({ assignment_id: a.id, reason });
    if (error) return GENERIC_ERROR;
    notify("ثبت شد", "گزارش ثبت شد و برای سازندهٔ کلاس ارسال شد.");
    load();
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={c.primary}
          />
        }
      >
        <Stack.Screen
          options={{
            title: cls.course_name,
            headerRight: () => (
              <Pressable
                role="button"
                aria-label="اطلاعات کلاس و اعضا"
                onPress={() => router.push(`/classes/${cls.id}/info`)}
                style={{ padding: 6 }}
              >
                <Ionicons name="information-circle-outline" size={24} color={c.foreground} />
              </Pressable>
            ),
          }}
        />

        {cls.instructor_name || cls.term ? (
          <AppText size={13} tone="muted">
            {[cls.instructor_name && `استاد: ${cls.instructor_name}`, cls.term].filter(Boolean).join(" · ")}
          </AppText>
        ) : null}

        {/* Owner's to-dos first: pending join requests, then reports. Hidden when empty. */}
        {cls.isOwner && data.requests.length ? <RequestsSection requests={data.requests} onChanged={load} /> : null}
        {cls.isOwner ? <ReportsSection reports={data.reports} onChanged={load} /> : null}

        <Section
          title="تکالیف"
          count={assignments.length}
          action={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: live ? c.success : c.border,
                }}
              />
              <AppText size={12} tone="muted">
                {live ? "زنده" : "…"}
              </AppText>
            </View>
          }
        >
          {assignments.length ? (
            assignments.map((a) => (
              <AssignmentCard
                key={a.id}
                a={a}
                onStatus={(s) => setStatus(a, s)}
                onEdit={() =>
                  router.push({
                    pathname: "/classes/[id]/assignments/[assignmentId]",
                    params: { id: cls.id, assignmentId: a.id },
                  })
                }
                onDelete={() => remove(a)}
                onReport={(reason) => report(a, reason)}
              />
            ))
          ) : (
            <Card
              style={{
                backgroundColor: c.background,
                borderColor: "transparent",
              }}
            >
              <AppText size={14} tone="muted" style={{ textAlign: "center" }}>
                هنوز تکلیفی ثبت نشده. اولین تکلیف را تو اضافه کن تا همهٔ کلاس ببینند.
              </AppText>
            </Card>
          )}
        </Section>
      </ScrollView>
      <Fab label="تکلیف جدید" onPress={() => router.push(`/classes/${cls.id}/assignments/new`)} />
    </View>
  );
}
