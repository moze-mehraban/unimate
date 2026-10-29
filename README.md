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

## دستورات

| دستور | کار |
|-------|-----|
| `npm run test:db` | تست‌های RLS دیتابیس (بدون Docker) |
| `npm run db:reset` | اجرای دوبارهٔ migrationها روی دیتابیس محلی (داده‌ها پاک می‌شوند) |
| `npm run db:types` | تولید دوبارهٔ تایپ‌های TypeScript از دیتابیس |
