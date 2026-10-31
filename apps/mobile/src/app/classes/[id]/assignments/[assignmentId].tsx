import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { GENERIC_ERROR, toTehranLocal, type Assignment } from "@unimate/shared";
import { ComingSoon } from "@/components/coming-soon";
import { TaskForm } from "@/components/task-form";
import { Loading } from "@/components/ui";
import { confirmAsync, notify } from "@/lib/dialogs";
import { goBack } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

export default function EditAssignmentScreen() {
  const { id, assignmentId } = useLocalSearchParams<{ id: string; assignmentId: string }>();
  // undefined = loading, null = not found.
  const [assignment, setAssignment] = useState<Assignment | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .eq("class_id", id)
      .maybeSingle()
      .then(({ data }) => setAssignment(data));
  }, [id, assignmentId]);

  if (assignment === undefined) return <Loading />;
  if (assignment === null) return <ComingSoon icon="alert-circle-outline" title="پیدا نشد" text="این تکلیف وجود ندارد یا حذف شده است." />;

  async function remove() {
    if (!(await confirmAsync("حذف تکلیف", `تکلیف «${assignment!.title}» برای همهٔ اعضا حذف شود؟`, "حذف", true))) return;
    const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
    if (error) notify("حذف نشد", GENERIC_ERROR);
    else goBack();
  }

  return (
    <TaskForm
      submitLabel="ذخیرهٔ تغییرات"
      titlePlaceholder="مثلاً تمرین سری ۳ — نرمال‌سازی"
      descriptionPlaceholder="صورت تمرین، نحوهٔ تحویل، منابع…"
      deleteLabel="حذف تکلیف"
      initial={{
        title: assignment.title,
        description: assignment.description,
        dueLocal: toTehranLocal(assignment.due_at),
        priority: assignment.priority,
      }}
      onSubmit={async (row) => {
        // RLS: only the creator or the class owner can update (0 rows otherwise).
        const { data, error } = await supabase.from("assignments").update(row).eq("id", assignmentId).select("id");
        if (error) return GENERIC_ERROR;
        if (!data.length) return "فقط ثبت‌کنندهٔ تکلیف یا سازندهٔ کلاس می‌تواند آن را ویرایش کند.";
        goBack();
        return null;
      }}
      onDelete={remove}
    />
  );
}
