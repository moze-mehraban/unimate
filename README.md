# یونی‌میت (UniMate)

مدیریت تکالیف دانشگاهی، هماهنگی بین هم‌کلاسی‌ها و برنامه‌ریزی شخصی — با وب‌اپ و اپ اندروید.

نسخهٔ آنلاین: https://unimate.mozemehraban.ir · نقشهٔ راه: [docs/ROADMAP.md](docs/ROADMAP.md)

## قابلیت‌ها

- **حساب کاربری:** ثبت‌نام و ورود با ایمیل/رمز یا گوگل، بازیابی رمز، پروفایل (نام و دانشگاه).
- **کلاس‌ها:** ساخت کلاس، لینک دعوت خصوصی با مدت اعتبار و سقف استفاده، درخواست عضویت و تأیید/رد توسط سازنده، مدیریت اعضا، خروج از کلاس.
- **تکالیف کلاس:** هر عضو می‌تواند تکلیف (عنوان، توضیحات، مهلت، اولویت) اضافه کند؛ همه به‌صورت زنده می‌بینند. ویرایش/حذف فقط برای ثبت‌کننده یا سازندهٔ کلاس؛ گزارش اطلاعات نادرست و بررسی آن توسط سازنده.
- **پیگیری شخصی:** وضعیت مستقل هر دانشجو برای هر تکلیف (انجام‌نشده / در حال انجام / تکمیل‌شده) و کارهای شخصی.
- **کارهای من و تقویم:** همهٔ تکالیف و کارها با مرتب‌سازی و فیلتر؛ تقویم شمسی ماهانه و هفتگی؛ برجسته‌سازی کارهای عقب‌افتاده و نزدیک به مهلت.
- **اعلان‌ها:** تکلیف جدید، درخواست عضویت و نتیجه‌اش، گزارش؛ شمارندهٔ زندهٔ خوانده‌نشده‌ها.
- **فارسی و راست‌به‌چپ:** تاریخ شمسی و ساعت تهران، انتخابگر تاریخ شمسی، فونت وزیرمتن، حالت تاریک.

همهٔ قوانین دسترسی در خود دیتابیس با **RLS** اعمال می‌شوند؛ وب و موبایل فقط کلاینت‌اند و دور زدن رابط کاربری دسترسی بیشتری نمی‌دهد.

## فناوری‌ها و ساختار

| بخش | فناوری |
|-----|--------|
| وب | Next.js 16 (App Router)، TypeScript، Tailwind CSS 4 |
| موبایل | React Native با Expo SDK 58 و Expo Router |
| بک‌اند | Supabase: Postgres + RLS، Auth، Realtime |
| تست دیتابیس | PGlite (Postgres درون‌پردازه‌ای، بدون Docker) |

```
unimate/
├─ apps/
│  ├─ web/         ← وب‌اپ Next.js
│  └─ mobile/      ← اپ موبایل (Expo / React Native)
├─ packages/
│  └─ shared/      ← تایپ‌های دیتابیس، تاریخ شمسی، متن خطاها و اعلان‌ها (مشترک بین وب و موبایل)
├─ supabase/
│  ├─ migrations/  ← اسکیمای دیتابیس، RLS، تریگرها
│  ├─ tests/       ← تست‌های RLS
│  └─ scripts/     ← ابزارهای کمکی محیط محلی
└─ docs/           ← نقشهٔ راه و حساب‌های تست
```

## اجرای محلی

پیش‌نیاز: **Node.js 20+** و **Docker Desktop** (روشن).

```bash
npm install
npx supabase start
```

از خروجی `supabase start` مقدار **API URL** و **Publishable key** را در `apps/web/.env.local` بگذارید (الگو: `apps/web/.env.example`). سپس:

```bash
npm run dev -w web
```

| آدرس | کاربرد |
|------|--------|
| http://localhost:3000 | وب‌اپ |
| http://127.0.0.1:54323 | Supabase Studio (مشاهدهٔ جدول‌ها و داده‌ها) |
| http://127.0.0.1:54324 | Mailpit (ایمیل‌های تأیید و بازیابی رمز در محیط محلی) |

حساب‌های تست محلی در [docs/dev-test-accounts.md](docs/dev-test-accounts.md) آمده‌اند.

## اپ موبایل

### اجرا در حالت توسعه (Expo Go)

```bash
cp apps/mobile/.env.example apps/mobile/.env.local   # مقادیر را پر کنید
npm run start -w mobile                               # کد QR را با Expo Go اسکن کنید
npm run web -w mobile                                 # یا نسخهٔ وب برای تست سریع
```

گوشی و کامپیوتر باید در یک شبکه باشند. روی گوشی واقعی `127.0.0.1` خودِ گوشی است؛ آدرس IP کامپیوتر در شبکه (مثلاً `http://192.168.1.10:54321`) یا پروژهٔ ابری Supabase را بگذارید.

### ساخت APK اندروید روی کامپیوتر خودتان (بدون حساب و سرور Expo)

پیش‌نیاز: **JDK 17** و Android SDK با `platforms;android-37.0`، `build-tools;37.0.0`، `ndk;27.1.12297006` و `cmake;3.31.6`.

1. **مسیر کوتاه:** ساخت C++ در React Native روی ویندوز به مسیرهای بالای ۲۶۰ کاراکتر می‌خورد. از یک نسخهٔ کاری در مسیر کوتاه بسازید:
   `git worktree add --detach D:\um origin/master` و سپس در `D:\um`: `npm ci`.
2. **آدرس سرور:** فایل `apps/mobile/.env.production.local` با `EXPO_PUBLIC_SUPABASE_URL`، `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (کلید publishable پروژهٔ ابری) و `EXPO_PUBLIC_WEB_URL`. در ساخت release بر `.env.local` (محلی) مقدم است.
3. **پروژهٔ اندروید:** در `apps/mobile`: `npx expo prebuild --platform android` (پوشهٔ `android/` ساخته می‌شود و در git نیست).
4. **`android/local.properties`:**
   ```
   sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk
   cmake.dir=C:/Users/<you>/AppData/Local/Android/Sdk/cmake/3.31.6
   ```
   `cmake.dir` لازم است: ninja همراه CMake 3.22.1 (پیش‌فرض) مسیرهای طولانی را پشتیبانی نمی‌کند؛ ninja نسخهٔ ۱.۱۲ در CMake 3.31.6 می‌کند.
5. **ساخت** (در `apps/mobile/android`، با `JAVA_HOME` روی JDK 17): `gradlew.bat assembleRelease`
   خروجی: `app/build/outputs/apk/release/app-release.apk`.

**در ایران:** `dl.google.com` (SDK و بسته‌های Maven گوگل) برای IP ایران 404 برمی‌گرداند. پروکسی را هم به sdkmanager (`--proxy=http --proxy_host=127.0.0.1 --proxy_port=<port>`) و هم به Gradle بدهید: `GRADLE_OPTS` برای wrapper و `-Dhttps.proxyHost=… -Dhttps.proxyPort=…` (و نسخهٔ http) در خط فرمان. در PowerShell آرگومانی با `|` (مثل `nonProxyHosts`) به `gradlew.bat` ندهید.

APK با کلید debug امضا می‌شود: برای نصب مستقیم و تست کافی است؛ برای کافه‌بازار/گوگل‌پلی کلید امضای اختصاصی لازم است.

## ورود با Google (محیط محلی)

1. در Google Cloud Console یک OAuth Client (نوع Web) بسازید.
2. Authorized redirect URI: `http://127.0.0.1:54321/auth/v1/callback`
3. فایل `supabase/.env.example` را به `supabase/.env` کپی و Client ID / Secret را وارد کنید، سپس `npx supabase stop && npx supabase start`.

### اگر گوگل شبکهٔ شما را مسدود کرده (مثلاً در ایران)

Supabase Auth برای تأیید توکن گوگل باید کلیدهای `www.googleapis.com/oauth2/v3/certs` را بگیرد؛ اگر گوگل جواب 403 بدهد، ورود با گوگل بعد از بازگشت از گوگل شکست می‌خورد. Docker تنظیمات پروکسی ویندوز را به کانتینرها منتقل نمی‌کند، پس **بعد از هر `npx supabase start`** این را اجرا کنید تا کانتینر Auth از پروکسی استفاده کند:

```bash
npm run db:auth-proxy -- http://host.docker.internal:<port>
```

پروکسی باید اتصال از Docker را بپذیرد (گوش دادن روی `0.0.0.0` / «Allow LAN»). اگر VPN در حالت TUN باشد، این مرحله لازم نیست.

## انتشار

### Supabase (ابری)

1. یک پروژه در https://supabase.com/dashboard بسازید.
2. اسکیما را منتقل کنید (رمز دیتابیس را در ترمینال وارد کنید):
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
3. در **Authentication → URL Configuration**:
   - **Site URL:** آدرس سایت (مثلاً `https://unimate.mozemehraban.ir`)
   - **Redirect URLs:** `https://<site>/**` برای وب و `unimate://**` برای اپ موبایل (بدون آن، ورود با گوگل در اپ به‌جای اپ به سایت برمی‌گردد).
4. در **Authentication → Sign In / Providers → Google** کلیدهای OAuth را وارد کنید و در Google Cloud Console این را به Authorized redirect URIs اضافه کنید: `https://<ref>.supabase.co/auth/v1/callback`
5. برای تست، «Confirm email» را خاموش کنید یا SMTP اختصاصی تنظیم کنید؛ ارسال‌کنندهٔ پیش‌فرض Supabase فقط چند ایمیل در ساعت می‌فرستد.

### Vercel (وب)

- Root Directory: `apps/web`
- متغیرها: `NEXT_PUBLIC_SUPABASE_URL`، `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`، `NEXT_PUBLIC_SITE_URL` (آدرس سایت)

بعد از هر migration جدید، قبل یا همراه با استقرار کد، `npx supabase db push` را اجرا کنید.

### اعلان روی گوشی (Push)

یادآوری‌های کلاس و مهلت بدون هیچ تنظیمی به‌صورت اعلان محلی روی گوشی می‌آیند. برای اعلان رویدادها (تکلیف جدید، درخواست عضویت و …) وقتی اپ بسته است، Firebase را طبق [docs/PUSH_NOTIFICATIONS.md](docs/PUSH_NOTIFICATIONS.md) راه بیندازید.

### اندروید

APK را طبق بخش «ساخت APK اندروید» با فایل `.env.production.local` روی پروژهٔ ابری بسازید. (راه جایگزین: پروفایل‌های `apps/mobile/eas.json` برای سرویس ابری EAS.)

## دستورات

| دستور | کار |
|-------|-----|
| `npm run dev -w web` | اجرای وب‌اپ در حالت توسعه |
| `npm run build -w web` | ساخت production وب‌اپ |
| `npm run start -w mobile` | اجرای اپ موبایل با Expo Go |
| `npm run android -w mobile` | ساخت و نصب اپ روی گوشی/شبیه‌ساز متصل (نیازمند Android SDK) |
| `npm run typecheck -w mobile` | بررسی تایپ‌های اپ موبایل |
| `npm run test:db` | تست‌های RLS دیتابیس (بدون Docker) |
| `npm run db:reset` | اجرای دوبارهٔ migrationها روی دیتابیس محلی (داده‌ها پاک می‌شوند) |
| `npm run db:types` | تولید دوبارهٔ تایپ‌های TypeScript از دیتابیس |
| `npm run db:auth-proxy` | عبور کانتینر Auth محلی از پروکسی برای ورود با Google |
