import { Pressable, View } from "react-native";
import { formatDeadlineFa, TASK_STATUSES, type TaskStatus } from "@unimate/shared";
import { dueColor, priorityColors, PRIORITY_TEXT, STATUS_TEXT } from "@/lib/labels";
import { useColors } from "@/lib/theme";
import type { WorkItem } from "@/lib/work";
import { AppText, Segmented } from "./ui";

/** One assignment or personal task with my status picker; overdue and due-soon work stands out. */
export function WorkCard({
  item,
  onStatus,
  onPress,
}: {
  item: WorkItem;
  onStatus: (status: TaskStatus) => void;
  onPress?: () => void;
}) {
  const c = useColors();
  const done = item.status === "done";
  const overdue = !done && item.due.state === "overdue";
  const soon = !done && item.due.state === "soon";
  const priority = priorityColors(c)[item.priority];

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => ({
        backgroundColor: overdue ? c.dangerSoft : done ? c.background : c.surface,
        borderColor: overdue ? c.danger : c.border,
        borderWidth: 1,
        // A thick edge on the start side marks "due within two days".
        borderStartWidth: soon ? 4 : 1,
        borderStartColor: soon ? c.danger : overdue ? c.danger : c.border,
        borderRadius: 14,
        padding: 14,
        gap: 6,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <AppText weight="bold" tone={done ? "muted" : "foreground"} style={done ? { textDecorationLine: "line-through" } : null}>
          {item.title}
        </AppText>
        <Chip bg={priority.bg} fg={priority.fg}>
          {PRIORITY_TEXT[item.priority]}
        </Chip>
        {overdue ? (
          <Chip bg={c.danger} fg={c.primaryForeground}>
            عقب‌افتاده
          </Chip>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 10 }}>
        <AppText size={12} tone={item.kind === "assignment" ? "primary" : "muted"}>
          {item.kind === "assignment" ? item.courseName : "کار شخصی"}
        </AppText>
        {item.dueAt ? (
          <AppText size={12} tone="muted">
            مهلت: {formatDeadlineFa(item.dueAt)}
          </AppText>
        ) : null}
        {done ? null : (
          <AppText size={12} style={{ color: dueColor(c, item.due.state) }}>
            {item.due.text}
          </AppText>
        )}
      </View>

      {item.description && !done ? (
        <AppText size={13} tone="muted" numberOfLines={2}>
          {item.description}
        </AppText>
      ) : null}

      <View style={{ marginTop: 4 }}>
        <Segmented
          value={item.status}
          onChange={onStatus}
          options={TASK_STATUSES.map((s) => ({ value: s, label: STATUS_TEXT[s] }))}
          activeColors={{
            todo: { bg: c.surface, fg: c.foreground },
            in_progress: { bg: c.primary, fg: c.primaryForeground },
            done: { bg: c.success, fg: c.primaryForeground },
          }}
        />
      </View>
    </Pressable>
  );
}

function Chip({ bg, fg, children }: { bg: string; fg: string; children: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 }}>
      <AppText size={11} style={{ color: fg }}>
        {children}
      </AppText>
    </View>
  );
}
