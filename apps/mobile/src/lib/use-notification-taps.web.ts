// The web build has no notification taps to route (expo-notifications can't read
// the last notification response on web, and calling it throws).
export function useNotificationTaps() {}
