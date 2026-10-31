import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { GENERIC_ERROR, parseInviteToken } from "@unimate/shared";
import { ClassForm } from "@/components/class-form";
import { AppText, Button, Card, Field } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";

/** Opened from the "+" on the classes tab: create a class, or join one with an invite link. */
export default function NewClassScreen() {
  const c = useColors();
  const [invite, setInvite] = useState("");
  const [inviteError, setInviteError] = useState<string | undefined>(undefined);

  function openInvite() {
    const token = parseInviteToken(invite);
    if (!token) return setInviteError("این لینک دعوت معتبر نیست. لینک کامل را از سازندهٔ کلاس بگیر.");
    router.replace(`/join/${token}`);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <Card style={{ gap: 12 }}>
        <View>
          <AppText weight="bold">پیوستن با لینک دعوت</AppText>
          <AppText size={13} tone="muted">
            لینکی را که سازندهٔ کلاس فرستاده اینجا بچسبان.
          </AppText>
        </View>
        <Field
          label="لینک دعوت"
          value={invite}
          onChangeText={(t) => {
            setInvite(t);
            setInviteError(undefined);
          }}
          onSubmitEditing={openInvite}
          error={inviteError}
          placeholder="https://…/join/…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Button variant="secondary" onPress={openInvite} disabled={!invite.trim()}>
          ادامه
        </Button>
      </Card>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <AppText size={12} tone="muted">
          یا
        </AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>

      <Card style={{ gap: 12 }}>
        <View>
          <AppText weight="bold">ساخت کلاس جدید</AppText>
          <AppText size={13} tone="muted">
            بعد از ساخت کلاس، با لینک دعوت هم‌کلاسی‌هایت را اضافه کن.
          </AppText>
        </View>
        <ClassForm
          submitLabel="ساخت کلاس"
          onSubmit={async (values) => {
            // A trigger adds me as the owner member.
            const { data, error } = await supabase.from("classes").insert(values).select("id").single();
            if (error) return { kind: "error", text: GENERIC_ERROR };
            router.replace(`/classes/${data.id}`);
            return null;
          }}
        />
      </Card>
    </ScrollView>
  );
}
