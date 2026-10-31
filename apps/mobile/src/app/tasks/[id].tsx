import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { GENERIC_ERROR, toTehranLocal, type PersonalTask } from "@unimate/shared";
import { ComingSoon } from "@/components/coming-soon";
import { TaskForm } from "@/components/task-form";
import { Loading } from "@/components/ui";
import { confirmAsync, notify } from "@/lib/dialogs";
import { goBack } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined = loading, null = not found (or not mine; RLS hides it).
  const [task, setTask] = useState<PersonalTask | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("personal_tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setTask(data));
  }, [id]);

  if (task === undefined) return <Loading />;
  if (task === null) return <ComingSoon icon="alert-circle-outline" title="پیدا نشد" text="این کار وجود ندارد یا حذف شده است." />;

  async function remove() {
    if (!(await confirmAsync("حذف کار", `کار «${task!.title}» حذف شود؟`, "حذف", true))) return;
    const { error } = await supabase.from("personal_tasks").delete().eq("id", id);
    if (error) notify("حذف نشد", GENERIC_ERROR);
    else goBack();
  }

  return (
    <TaskForm
      submitLabel="ذخیرهٔ تغییرات"
      initial={{
        title: task.title,
        description: task.description,
        dueLocal: toTehranLocal(task.due_at),
        priority: task.priority,
      }}
      onSubmit={async (row) => {
        const { data, error } = await supabase.from("personal_tasks").update(row).eq("id", id).select("id");
        if (error || !data.length) return GENERIC_ERROR;
        goBack();
        return null;
      }}
      onDelete={remove}
    />
  );
}
