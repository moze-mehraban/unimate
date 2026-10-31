import Link from "next/link";
import type { ReactNode, SVGProps } from "react";

// Direction-aware icons. Don't use text glyphs like ‹ › « » for navigation:
// they're Unicode "mirrored" characters, so in RTL the browser flips them and
// they point the wrong way. These SVGs are drawn for LTR and flipped with
// `rtl:` so "back" always points toward the start of the line (right in Persian).

function Svg({ className = "size-4", children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Previous / back: points to the line start (right in RTL). */
export function ChevronBackIcon({ className }: { className?: string }) {
  return (
    <Svg className={`rtl:-scale-x-100 ${className ?? "size-4"}`}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  );
}

/** Next / forward: points to the line end (left in RTL). */
export function ChevronForwardIcon({ className }: { className?: string }) {
  return (
    <Svg className={`rtl:-scale-x-100 ${className ?? "size-4"}`}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  );
}

export function ArrowBackIcon({ className }: { className?: string }) {
  return (
    <Svg className={`rtl:-scale-x-100 ${className ?? "size-4"}`}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Svg>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function BellIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Svg>
  );
}

/** "→ Parent page" link at the top of sub-pages. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 self-start text-sm text-muted hover:text-foreground">
      <ArrowBackIcon />
      {children}
    </Link>
  );
}
