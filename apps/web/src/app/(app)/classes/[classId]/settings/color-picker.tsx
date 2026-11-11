"use client";

import { useOptimistic, useTransition } from "react";
import { CLASS_COLOR_KEYS, CLASS_COLORS, type ClassColor } from "@unimate/shared";
import { setClassColor } from "../../actions";

/** Ten swatches; the pick shows immediately and saves in the background. */
export function ColorPicker({ classId, color }: { classId: string; color: ClassColor }) {
  const [current, setCurrent] = useOptimistic(color);
  const [, startTransition] = useTransition();

  return (
    <div role="radiogroup" aria-label="رنگ کلاس" className="flex flex-wrap gap-2">
      {CLASS_COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={current === key}
          aria-label={CLASS_COLORS[key].label}
          title={CLASS_COLORS[key].label}
          onClick={() =>
            startTransition(async () => {
              setCurrent(key);
              await setClassColor(classId, key);
            })
          }
          className={`size-9 rounded-full ring-offset-2 ring-offset-surface transition ${
            current === key ? "ring-2 ring-foreground" : "hover:scale-110"
          }`}
          style={{ backgroundColor: CLASS_COLORS[key].hex }}
        />
      ))}
    </div>
  );
}
