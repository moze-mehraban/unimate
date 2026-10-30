import Link from "next/link";
import { buttonStyles } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo href="/dashboard" />
      <div>
        <h1 className="text-2xl font-bold">صفحه پیدا نشد</h1>
        <p className="mt-2 text-sm text-muted">این صفحه وجود ندارد یا اجازهٔ دیدن آن را نداری.</p>
      </div>
      <Link href="/classes" className={buttonStyles.primary}>
        کلاس‌های من
      </Link>
    </main>
  );
}
