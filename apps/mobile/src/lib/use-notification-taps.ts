import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

/** Tapping a reminder or push opens its route (also when the tap launched the app). */
export function useNotificationTaps() {
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = lastResponse?.notification.request.content.data?.url;
    if (typeof url === "string" && url.startsWith("/")) router.push(url);
  }, [lastResponse]);
}
