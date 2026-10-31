import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { dbErrorMessage, parseInviteToken } from "@unimate/shared";
import { AppText, Banner, Button, Card, Loading } from "@/components/ui";
import { setPendingInvite } from "@/lib/pending-invite";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/providers/session";

type Preview = {
  class_id: string;
  course_name: string;
  instructor_name: string;
  term: string;
  is_valid: boolean;
  is_member: boolean;
  has_pending_request: boolean;
};

/** Opened from unimate://join/<token> or a pasted invite link. Works signed out too. */
export default function JoinScreen() {
  const params = useLocalSearchParams<{ token: string }>();
  const token = parseInviteToken(params.token ?? "");
  const { session } = useSession();
  // undefined = loading, null = no such invite.
  const [preview, setPreview] = useState<Preview | null | undefined>(undefined);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!session || !token) return;
    supabase.rpc("get_invite_preview", { p_token: token }).then(({ data }) => setPreview(data?.[0] ?? null));
  }, [session, token]);

  if (!token) return <Message title="لینک نامعتبر" text="این لینک دعوت درست نیست. لینک کامل را از سازندهٔ کلاس بگیر." />;

  if (!session) {
    return (
      <Message title="دعوت به کلاس" text="برای دیدن کلاس و ارسال درخواست عضویت، اول وارد حسابت شو.">
        <Button
          onPress={() => {
            setPendingInvite(token);
            router.replace("/login");
          }}
        >
          ورود یا ثبت‌نام
        </Button>
      </Message>
    );
  }

  if (preview === undefined) return <Loading />;
  if (preview === null) return <Message title="لینک پیدا نشد" text="این لینک دعوت وجود ندارد." />;

  async function request() {
    setSending(true);
    const { error } = await supabase.rpc("request_to_join", { p_token: token! });
    setSending(false);
    setMessage(
      error
        ? { kind: "error", text: dbErrorMessage(error) }
        : { kind: "success", text: "درخواست عضویتت ثبت شد. پس از تأیید سازندهٔ کلاس، کلاس در فهرست کلاس‌هایت نمایش داده می‌شود." },
    );
    if (!error) setPreview({ ...preview!, has_pending_request: true });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card style={{ gap: 10 }}>
        <AppText size={13} tone="muted">
          دعوت به کلاس
        </AppText>
        <AppText weight="bold" size={20}>
          {preview.course_name}
        </AppText>
        {preview.instructor_name || preview.term ? (
          <AppText size={13} tone="muted">
            {[preview.instructor_name && `استاد: ${preview.instructor_name}`, preview.term].filter(Boolean).join(" · ")}
          </AppText>
        ) : null}
        {message ? <Banner kind={message.kind}>{message.text}</Banner> : null}

        {preview.is_member ? (
          <Button onPress={() => router.replace({ pathname: "/classes/[id]", params: { id: preview.class_id } })}>
            تو عضو این کلاس هستی — باز کردن کلاس
          </Button>
        ) : preview.has_pending_request ? (
          message ? null : <Banner kind="success">درخواست عضویتت ثبت شده و منتظر تأیید سازندهٔ کلاس است.</Banner>
        ) : !preview.is_valid ? (
          <Banner kind="error">این لینک دعوت دیگر معتبر نیست (لغو شده، منقضی شده یا ظرفیتش پر شده).</Banner>
        ) : (
          <Button onPress={request} loading={sending}>
            درخواست عضویت
          </Button>
        )}
      </Card>
    </ScrollView>
  );
}

function Message({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
      <Card style={{ gap: 12 }}>
        <AppText weight="bold" size={18}>
          {title}
        </AppText>
        <AppText tone="muted" size={14}>
          {text}
        </AppText>
        {children}
      </Card>
    </View>
  );
}
