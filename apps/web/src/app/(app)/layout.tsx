import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/dashboard", label: "داشبورد" },
  { href: "/classes", label: "کلاس‌ها" },
  { href: "/profile", label: "پروفایل" },
] as const;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Logo href="/dashboard" />
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-md px-3 py-1.5 text-muted hover:bg-background hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
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
