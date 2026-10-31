import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { GENERIC_ERROR } from "@unimate/shared";
import { InvitesSection, MembersSection } from "@/components/class-sections";
import { ComingSoon } from "@/components/coming-soon";
import { AppText, Button, Card, Loading } from "@/components/ui";
import { fetchClass, fetchInvites, fetchMembers, type ClassDetail, type ClassMember, type InviteLink } from "@/lib/classes";
import { confirmAsync, notify } from "@/lib/dialogs";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/providers/session";

/** Class details, members and (owner) invite links; owners get the settings link, members the leave button. */
export default function ClassInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  // undefined = loading, null = not a member / doesn't exist.
  const [data, setData] = useState<{ cls: ClassDetail; members: ClassMember[]; invites: InviteLink[] } | null | undefined>(
    undefined,
  );

  const load = useCallback(async () => {
    const cls = await fetchClass(id, userId);
    if (!cls) return setData(null);
    // Invites are the owner's (RLS returns none to members).
    const [members, invites] = await Promise.all([fetchMembers(cls.id), cls.isOwner ? fetchInvites(cls.id) : []]);
    setData({ cls, members, invites });
  }, [id, userId]);

  // Refresh on return from settings (e.g. after renaming).
  useFocusEffect(
    useCallback(() => {
      load().catch(() => notify("خطا", "بارگذاری اطلاعات کلاس انجام نشد."));
    }, [load]),
  );

  if (data === undefined) return <Loading />;
  if (data === null) return <ComingSoon icon="alert-circle-outline" title="پیدا نشد" text="این کلاس وجود ندارد یا عضوش نیستی." />;
  const { cls, members, invites } = data;

  async function leave() {
    if (!(await confirmAsync("خروج از کلاس", `از کلاس «${cls.course_name}» خارج می‌شوی؟`, "خروج", true))) return;
    const { error } = await supabase.from("class_members").delete().eq("class_id", cls.id).eq("user_id", userId);
    if (error) return notify("انجام نشد", GENERIC_ERROR);
    router.dismissTo("/classes");
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen options={{ title: "اطلاعات کلاس" }} />
      <Card style={{ gap: 4 }}>
        <AppText weight="bold" size={18}>
          {cls.course_name}
        </AppText>
        {cls.instructor_name ? <AppText tone="muted" size={14}>استاد: {cls.instructor_name}</AppText> : null}
        {cls.term ? <AppText tone="muted" size={14}>{cls.term}</AppText> : null}
      </Card>

      <MembersSection classId={cls.id} members={members} isOwner={cls.isOwner} onChanged={load} />

      {cls.isOwner ? <InvitesSection classId={cls.id} invites={invites} onChanged={load} /> : null}

      {cls.isOwner ? (
        <Button variant="secondary" onPress={() => router.push(`/classes/${cls.id}/settings`)}>
          تنظیمات کلاس
        </Button>
      ) : (
        <Button variant="danger" onPress={leave}>
          خروج از کلاس
        </Button>
      )}
    </ScrollView>
  );
}
