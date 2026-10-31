import { GENERIC_ERROR } from "@unimate/shared";
import { TaskForm } from "@/components/task-form";
import { goBack } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";

export default function NewTaskScreen() {
  return (
    <TaskForm
      submitLabel="افزودن کار"
      onSubmit={async (row) => {
        // user_id defaults to auth.uid(); RLS keeps the task private.
        const { error } = await supabase.from("personal_tasks").insert(row);
        if (error) return GENERIC_ERROR;
        goBack();
        return null;
      }}
    />
  );
}
