import { GENERIC_ERROR } from "./auth-errors";

// Persian messages for exceptions raised by our SQL functions (see the migration).
const RPC_MESSAGES: Record<string, string> = {
  "invite not found": "این لینک دعوت وجود ندارد.",
  "invite revoked": "این لینک دعوت لغو شده است.",
  "invite expired": "مهلت این لینک دعوت تمام شده است.",
  "invite usage limit reached": "ظرفیت استفاده از این لینک دعوت پر شده است.",
  "already a member": "تو از قبل عضو این کلاس هستی.",
  "request already pending": "درخواست عضویتت قبلاً ثبت شده و منتظر تأیید است.",
  "only the class owner can respond": "فقط سازندهٔ کلاس می‌تواند درخواست‌ها را بررسی کند.",
  "request already handled": "این درخواست قبلاً بررسی شده است.",
  "request not found": "این درخواست پیدا نشد.",
};

export function dbErrorMessage(error: { message?: string } | null | undefined): string {
  if (error?.message && RPC_MESSAGES[error.message]) return RPC_MESSAGES[error.message];
  return GENERIC_ERROR;
}
