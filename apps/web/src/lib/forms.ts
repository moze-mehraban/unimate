export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back so inputs keep their values after a failed submit. */
  values?: Record<string, string>;
};

export function str(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
