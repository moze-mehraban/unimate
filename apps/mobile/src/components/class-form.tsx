import { useState } from "react";
import { View } from "react-native";
import { CLASS_LIMITS } from "@unimate/shared";
import { validateClass, type ClassFields } from "@/lib/classes";
import { Banner, Button, Field } from "./ui";

/** Course name, instructor and term (new class and class settings). */
export function ClassForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: ClassFields;
  submitLabel: string;
  /** Returns a message to show (error or success), or null. */
  onSubmit: (values: ClassFields) => Promise<{ kind: "error" | "success"; text: string } | null>;
}) {
  const [values, setValues] = useState<ClassFields>(initial ?? { course_name: "", instructor_name: "", term: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof ClassFields) => (text: string) => setValues((v) => ({ ...v, [key]: text }));

  async function submit() {
    const next = validateClass(values);
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    setMessage(
      await onSubmit({
        course_name: values.course_name.trim(),
        instructor_name: values.instructor_name.trim(),
        term: values.term.trim(),
      }),
    );
    setSaving(false);
  }

  return (
    <View style={{ gap: 14 }}>
      {message ? <Banner kind={message.kind}>{message.text}</Banner> : null}
      <Field
        label="نام درس"
        value={values.course_name}
        onChangeText={set("course_name")}
        error={errors.course_name}
        maxLength={CLASS_LIMITS.courseName}
        placeholder="مثلاً پایگاه داده"
      />
      <Field
        label="نام استاد"
        value={values.instructor_name}
        onChangeText={set("instructor_name")}
        error={errors.instructor_name}
        maxLength={CLASS_LIMITS.instructorName}
        hint="اختیاری"
      />
      <Field
        label="ترم"
        value={values.term}
        onChangeText={set("term")}
        error={errors.term}
        maxLength={CLASS_LIMITS.term}
        placeholder="مثلاً نیم‌سال اول ۱۴۰۵"
        hint="اختیاری"
      />
      <Button onPress={submit} loading={saving}>
        {submitLabel}
      </Button>
    </View>
  );
}
