import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-lg font-bold">
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG (app/icon.svg) */}
      <img src="/icon.svg" alt="" className="size-8" />
      یونی‌میت
    </Link>
  );
}
