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

## اپ موبایل (Expo)

```bash
cp apps/mobile/.env.example apps/mobile/.env   # مقادیر را پر کنید
npm run start -w mobile                         # کد QR را با Expo Go اسکن کنید
npm run web -w mobile                           # یا نسخهٔ وب برای تست سریع
```

روی گوشی واقعی `127.0.0.1` خودِ گوشی است؛ در `.env` آدرس IP کامپیوتر در شبکه (مثلاً `http://192.168.1.10:54321`) یا پروژهٔ ابری Supabase را بگذارید.

### ساخت APK اندروید روی کامپیوتر خودتان (بدون حساب و سرور Expo)

پیش‌نیاز: JDK 17 و Android SDK با `platforms;android-37.0`، `build-tools;37.0.0`، `ndk;27.1.12297006` و `cmake;3.31.6`.

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
