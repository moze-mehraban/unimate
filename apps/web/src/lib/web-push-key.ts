// VAPID public key for Web Push (public by design). Written by `npm run push:setup -- --web`,
// which stores the matching private key as the send-push function's VAPID_KEYS secret.
// Empty = Web Push not set up; the profile hides the option.
export const VAPID_PUBLIC_KEY = "";
