import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/dashboard", label: "کارهای من" },
  { href: "/calendar", label: "تقویم" },
  { href: "/classes", label: "کلاس‌ها" },
  { href: "/profile", label: "پروفایل" },
] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        {/* Phones: logo + user menu on top, nav on its own scrollable row below. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 px-4 sm:h-16 sm:flex-nowrap">
          <div className="flex h-14 items-center sm:h-auto">
            <Logo href="/dashboard" />
          </div>
          <nav className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-1 overflow-x-auto px-3 pb-2 text-sm sm:order-none sm:mx-0 sm:me-auto sm:w-auto sm:p-0">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md px-3 py-1.5 whitespace-nowrap text-muted hover:bg-background hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {/* Reads the session; streams in without holding the page. */}
          <Suspense fallback={<div className="h-8 w-28 animate-pulse rounded-md bg-background" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
