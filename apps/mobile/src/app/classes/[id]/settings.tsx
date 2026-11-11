import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { GENERIC_ERROR, type ClassSession } from "@unimate/shared";
import { ClassForm } from "@/components/class-form";
import { ComingSoon } from "@/components/coming-soon";
import { ColorPicker, ScheduleEditor } from "@/components/schedule-editor";
import { AppText, Button, Card, Loading } from "@/components/ui";
import { fetchClass, fetchClassSessions, type ClassDetail } from "@/lib/classes";
import { confirmAsync, notify } from "@/lib/dialogs";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/providers/session";

export default function ClassSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const [cls, setCls] = useState<ClassDetail | null | undefined>(undefined);
  const [sessions, setSessions] = useState<ClassSession[]>([]);

  const loadSessions = useCallback(() => {
    fetchClassSessions(id).then(setSessions, () => notify("خطا", "بارگذاری برنامهٔ کلاس انجام نشد."));
  }, [id]);

  useEffect(() => {
    fetchClass(id, userId).then(setCls);
    loadSessions();
  }, [id, userId, loadSessions]);

  if (cls === undefined) return <Loading />;
  if (cls === null)
    return <ComingSoon icon="alert-circle-outline" title="پیدا نشد" text="این کلاس وجود ندارد یا عضوش نیستی." />;
  // Members leave from the class info page; settings are the owner's.
  if (!cls.isOwner)
    return (
      <ComingSoon icon="lock-closed-outline" title="فقط سازندهٔ کلاس" text="تنظیمات کلاس فقط برای سازندهٔ آن است." />
    );

  async function deleteClass() {
    if (
      !(await confirmAsync(
        "حذف کلاس",
        `کلاس «${cls!.course_name}» برای همیشه حذف شود؟ این کار قابل بازگشت نیست.`,
        "حذف",
        true,
      ))
    )
      return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) return notify("حذف نشد", GENERIC_ERROR);
    router.dismissTo("/classes");
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "تنظیمات کلاس" }} />
      <Card>
        <ClassForm
          submitLabel="ذخیرهٔ تغییرات"
          initial={{
            course_name: cls.course_name,
            instructor_name: cls.instructor_name,
            term: cls.term,
          }}
          onSubmit={async (values) => {
            const { data, error } = await supabase.from("classes").update(values).eq("id", id).select("id");
            return error || !data.length
              ? { kind: "error", text: GENERIC_ERROR }
              : { kind: "success", text: "اطلاعات کلاس ذخیره شد." };
          }}
        />
      </Card>
      <ColorPicker classId={cls.id} color={cls.color} onChanged={() => fetchClass(id, userId).then(setCls)} />
      <ScheduleEditor classId={cls.id} sessions={sessions} onChanged={loadSessions} />
      <Card style={{ gap: 10, borderColor: "transparent" }}>
        <AppText weight="bold" tone="danger">
          حذف کلاس
        </AppText>
        <AppText size={13} tone="muted">
          همهٔ تکالیف، اعضا و لینک‌های دعوت این کلاس هم حذف می‌شوند.
        </AppText>
        <Button variant="danger" onPress={deleteClass}>
          حذف کلاس
        </Button>
      </Card>
    </ScrollView>
  );
}
