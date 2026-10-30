# UniMate

مدیریت تکالیف دانشگاهی، هماهنگی بین هم‌کلاسی‌ها و برنامه‌ریزی شخصی. نقشهٔ راه: [docs/ROADMAP.md](docs/ROADMAP.md)

## اجرای محلی

پیش‌نیاز: Node.js 20+ و Docker Desktop (روشن).

```bash
npm install
npx supabase start
```

از خروجی `supabase start` مقدار **API URL** و **Publishable key** را در `apps/web/.env.local` بگذارید
(الگو: `apps/web/.env.example`). سپس:

```bash
npm run dev -w web
```

| آدرس | کاربرد |
|------|--------|
| http://localhost:3000 | اپ وب |
| http://127.0.0.1:54323 | Supabase Studio |
| http://127.0.0.1:54324 | Mailpit (ایمیل‌های تأیید و بازیابی رمز در محیط محلی) |

## ورود با Google

1. در Google Cloud Console یک OAuth Client (نوع Web) بسازید.
2. Authorized redirect URI: `http://127.0.0.1:54321/auth/v1/callback`
3. فایل `supabase/.env.example` را به `supabase/.env` کپی و Client ID / Secret را وارد کنید، سپس `npx supabase stop && npx supabase start`.

### اگر گوگل شبکهٔ شما را مسدود کرده (مثلاً در ایران)

Supabase Auth برای تأیید توکن گوگل باید کلیدهای `www.googleapis.com/oauth2/v3/certs` را بگیرد؛ اگر گوگل جواب 403 بدهد،
ورود با گوگل بعد از بازگشت از گوگل شکست می‌خورد. Docker تنظیمات پروکسی ویندوز را به کانتینرها منتقل نمی‌کند، پس
**بعد از هر `npx supabase start`** این را اجرا کنید تا کانتینر Auth از پروکسی (مثلاً Nekoray روی پورت 2081) استفاده کند:

```bash
npm run db:auth-proxy
```

آدرس دیگر: `npm run db:auth-proxy -- http://host.docker.internal:<port>`. پروکسی باید اتصال از Docker را بپذیرد
(گوش دادن روی `0.0.0.0` / «Allow LAN»). اگر VPN در حالت TUN باشد، این مرحله لازم نیست.

## دستورات

| دستور | کار |
|-------|-----|
| `npm run test:db` | تست‌های RLS دیتابیس (بدون Docker) |
| `npm run db:reset` | اجرای دوبارهٔ migrationها روی دیتابیس محلی (داده‌ها پاک می‌شوند) |
| `npm run db:types` | تولید دوبارهٔ تایپ‌های TypeScript از دیتابیس |
| `npm run db:auth-proxy` | عبور کانتینر Auth از پروکسی برای ورود با Google (بخش بالا) |
