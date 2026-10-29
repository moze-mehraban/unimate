import Link from "next/link";
import { buttonStyles } from "@/components/ui";
import { Logo } from "@/components/logo";

const FEATURES = [
  { title: "کلاس‌های مشترک", body: "برای هر درس یک کلاس بساز و هم‌کلاسی‌ها را با لینک خصوصی دعوت کن." },
  { title: "تکالیف هماهنگ", body: "هر تکلیفی که یک نفر اضافه کند، فوراً برای همهٔ کلاس نمایش داده می‌شود." },
  { title: "پیگیری شخصی", body: "وضعیت هر تکلیف را مستقل از بقیه مدیریت کن و کارهای شخصی‌ات را هم ثبت کن." },
];

// Signed-in visitors are redirected to /dashboard by the proxy.
export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Logo />
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          ورود
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-12 px-4 py-16 text-center">
        <div className="flex max-w-2xl flex-col items-center gap-5">
          <h1 className="text-3xl leading-tight font-bold sm:text-5xl sm:leading-tight">
            تکالیف دانشگاه، <span className="text-primary">بدون هماهنگی پراکنده</span>
          </h1>
          <p className="text-muted sm:text-lg">
            یونی‌میت فضای مشترک هر درس برای مدیریت تکالیف است؛ در کنار برنامه‌ریزی شخصی هر دانشجو.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={buttonStyles.primary}>
              رایگان شروع کن
            </Link>
            <Link href="/login" className={buttonStyles.secondary}>
              حساب دارم
            </Link>
          </div>
        </div>

        <ul className="grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border border-border bg-surface p-5 text-right">
              <h2 className="font-bold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
