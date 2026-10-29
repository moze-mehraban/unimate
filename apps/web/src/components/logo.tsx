import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-lg font-bold">
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">U</span>
      یونی‌میت
    </Link>
  );
}
