import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { GENERIC_ERROR, PROFILE_LIMITS } from "@unimate/shared";
import { AppText, Banner, Button, Card, Field, Loading } from "@/components/ui";
import { confirmAsync } from "@/lib/dialogs";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/providers/session";

export default function ProfileScreen() {
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const [fullName, setFullName] = useState<string | null>(null);
  const [university, setUniversity] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, university")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "");
        setUniversity(data?.university ?? "");
      });
  }, [userId]);

  async function save() {
    const name = (fullName ?? "").trim();
    if (!name) return setMessage({ kind: "error", text: "نام نمی‌تواند خالی باشد." });
    if (name.length > PROFILE_LIMITS.fullName || university.trim().length > PROFILE_LIMITS.university) {
      return setMessage({ kind: "error", text: "متن واردشده خیلی طولانی است." });
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name, university: university.trim() }).eq("id", userId);
    setSaving(false);
    setMessage(error ? { kind: "error", text: GENERIC_ERROR } : { kind: "success", text: "پروفایل ذخیره شد." });
  }

  async function signOut() {
    if (await confirmAsync("خروج از حساب", "از حسابت خارج می‌شوی؟", "خروج", true)) await supabase.auth.signOut();
  }

  if (fullName === null) return <Loading />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 14 }}>
        <View>
          <AppText weight="bold">اطلاعات حساب</AppText>
          <AppText size={13} tone="muted" style={{ writingDirection: "ltr" }}>
            {session?.user.email}
          </AppText>
        </View>
        {message ? <Banner kind={message.kind}>{message.text}</Banner> : null}
        <Field label="نام و نام خانوادگی" value={fullName} onChangeText={setFullName} maxLength={PROFILE_LIMITS.fullName} />
        <Field
          label="دانشگاه"
          value={university}
          onChangeText={setUniversity}
          maxLength={PROFILE_LIMITS.university}
          placeholder="مثلاً دانشگاه صنعتی شریف"
        />
        <Button onPress={save} loading={saving}>
          ذخیره
        </Button>
      </Card>
      <Button variant="danger" onPress={signOut}>
        خروج از حساب
      </Button>
    </ScrollView>
  );
}
