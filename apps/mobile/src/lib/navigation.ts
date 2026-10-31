import { router } from "expo-router";

/** Back if there's somewhere to go back to; a screen opened by a link or deep link has no history. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
