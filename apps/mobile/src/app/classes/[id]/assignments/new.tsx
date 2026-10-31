import { useLocalSearchParams } from "expo-router";
import { GENERIC_ERROR } from "@unimate/shared";
import { TaskForm } from "@/components/task-form";
import { goBack } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

export default function NewAssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <TaskForm
      submitLabel="افزودن تکلیف"
      titlePlaceholder="مثلاً تمرین سری ۳ — نرمال‌سازی"
      descriptionPlaceholder="صورت تمرین، نحوهٔ تحویل، منابع…"
      onSubmit={async (row) => {
        // Any member may add; a trigger notifies the rest of the class.
        const { error } = await supabase.from("assignments").insert({ ...row, class_id: id });
        if (error) return GENERIC_ERROR;
        goBack();
        return null;
      }}
    />
  );
}
