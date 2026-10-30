"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// iOS-style rotary ("wheel") time picker: scroll-snapping columns that loop,
// with rows curving away from the center band.

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
/** Each column repeats its values so it can loop; we re-center on the middle copy. */
const COPIES = 7;
const MIDDLE_COPY = Math.floor(COPIES / 2);
/** How long scrolling must pause before the wheel counts as settled. */
const SETTLE_MS = 120;

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, h) => pad(h));
const MINUTES = Array.from({ length: 60 }, (_, m) => pad(m));

const mod = (n: number, m: number) => ((n % m) + m) % m;
const faTwoDigits = (value: string) => Number(value).toLocaleString("fa-IR", { minimumIntegerDigits: 2 });

/** `value` is "HH:mm" (24-hour). */
export function WheelTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [hour, minute] = value.split(":");
  return (
    // Digits read left to right even in RTL: hours, then minutes.
    <div dir="ltr" className="relative flex items-center justify-center gap-1 select-none">
      {/* Selection band behind the center row. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-lg bg-background"
        style={{ height: ITEM_HEIGHT }}
      />
      <WheelColumn label="ساعت" values={HOURS} value={hour} onChange={(h) => onChange(`${h}:${minute}`)} />
      <span aria-hidden="true" className="relative text-xl font-bold">
        :
      </span>
      <WheelColumn label="دقیقه" values={MINUTES} value={minute} onChange={(m) => onChange(`${hour}:${m}`)} />
    </div>
  );
}

function WheelColumn({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef(0);
  const count = values.length;
  const valueIndex = Math.max(0, values.indexOf(value));

  /** Curve rows by their distance from the center, like a drum. */
  const paint = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const center = el.scrollTop + el.clientHeight / 2;
    // The centered item is scrollTop / ITEM_HEIGHT; paint the rows around it plus one spare each side.
    const centered = Math.round(el.scrollTop / ITEM_HEIGHT);
    const reach = Math.ceil(VISIBLE_ROWS / 2) + 1;
    const items = el.querySelectorAll<HTMLElement>("[data-wheel-item]");
    for (let i = Math.max(0, centered - reach); i <= Math.min(items.length - 1, centered + reach); i++) {
      // Padding of two rows sits above item 0.
      const itemCenter = (i + 2) * ITEM_HEIGHT + ITEM_HEIGHT / 2;
      const offset = (itemCenter - center) / ITEM_HEIGHT;
      const distance = Math.min(Math.abs(offset), 3);
      items[i].style.transform = `rotateX(${-offset * 22}deg) scale(${1 - distance * 0.06})`;
      items[i].style.opacity = String(Math.max(0.15, 1 - distance * 0.32));
    }
  }, []);

  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    ref.current?.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? "smooth" : "instant" });
  }, []);

  // Start on the current value in the middle copy.
  useLayoutEffect(() => {
    scrollToIndex(MIDDLE_COPY * count + valueIndex, false);
    paint();
    // Only on mount; later value changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow value changes made from outside (e.g. the form resetting).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const current = Math.round(el.scrollTop / ITEM_HEIGHT);
    if (mod(current, count) !== valueIndex) scrollToIndex(MIDDLE_COPY * count + valueIndex, false);
  }, [valueIndex, count, scrollToIndex]);

  useEffect(
    () => () => {
      clearTimeout(settleTimer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  function onScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const next = values[mod(index, count)];
      // Drifted into an outer copy: jump to the same row in the middle one (invisible).
      if (index < count || index >= (COPIES - 1) * count) {
        scrollToIndex(MIDDLE_COPY * count + mod(index, count), false);
        paint();
      }
      if (next !== value) onChange(next);
    }, SETTLE_MS);
  }

  function step(delta: number) {
    const el = ref.current;
    if (!el) return;
    scrollToIndex(Math.round(el.scrollTop / ITEM_HEIGHT) + delta, true);
  }

  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={Number(value)}
      aria-valuetext={faTwoDigits(value)}
      aria-valuemin={0}
      aria-valuemax={count - 1}
      onScroll={onScroll}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") step(-1);
        else if (e.key === "ArrowDown") step(1);
        else if (e.key === "PageUp") step(-5);
        else if (e.key === "PageDown") step(5);
        else return;
        e.preventDefault();
      }}
      className="relative w-16 snap-y snap-mandatory overflow-y-scroll rounded-lg outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-scrollbar]:hidden"
      style={{
        height: ITEM_HEIGHT * VISIBLE_ROWS,
        perspective: 400,
        // Fade rows toward the top and bottom edges.
        maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
      }}
    >
      <div style={{ paddingBlock: ITEM_HEIGHT * 2 }}>
        {Array.from({ length: COPIES * count }, (_, i) => {
          const v = values[i % count];
          return (
            <div
              key={i}
              data-wheel-item=""
              onClick={() => scrollToIndex(i, true)}
              className="grid snap-center place-items-center text-xl tabular-nums will-change-transform"
              style={{ height: ITEM_HEIGHT }}
            >
              {faTwoDigits(v)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
