// Persian messages for Supabase Auth error codes.
const MESSAGES: Record<string, string> = {
  invalid_credentials: "ایمیل یا رمز عبور اشتباه است.",
  email_not_confirmed: "ایمیل شما هنوز تأیید نشده است. صندوق ایمیل خود را بررسی کنید.",
  user_already_exists: "حسابی با این ایمیل از قبل وجود دارد.",
  email_exists: "حسابی با این ایمیل از قبل وجود دارد.",
  weak_password: "رمز عبور خیلی ضعیف است. رمز قوی‌تری انتخاب کنید.",
  same_password: "رمز عبور جدید باید با رمز فعلی متفاوت باشد.",
  email_address_invalid: "آدرس ایمیل معتبر نیست.",
  signup_disabled: "ثبت‌نام در حال حاضر غیرفعال است.",
  over_email_send_rate_limit: "تعداد ایمیل‌های ارسالی زیاد بوده است. کمی بعد دوباره تلاش کنید.",
  over_request_rate_limit: "تعداد درخواست‌ها زیاد بوده است. کمی بعد دوباره تلاش کنید.",
  reauthentication_needed: "برای این کار باید دوباره وارد شوید.",
  session_expired: "نشست شما منقضی شده است. دوباره وارد شوید.",
  provider_disabled: "این روش ورود فعال نیست.",
};

export const GENERIC_ERROR = "مشکلی پیش آمد. لطفاً دوباره تلاش کنید.";

export function authErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return GENERIC_ERROR;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error.message?.toLowerCase().includes("fetch")) {
    return "اتصال به سرور برقرار نشد. اتصال اینترنت را بررسی کنید.";
  }
  return GENERIC_ERROR;
}
