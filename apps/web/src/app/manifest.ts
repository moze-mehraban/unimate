import type { MetadataRoute } from "next";

// Lets the site be installed (Add to Home Screen), which iPhone requires for Web Push.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "یونی‌میت",
    short_name: "یونی‌میت",
    description: "مدیریت تکالیف دانشگاهی، هماهنگی با هم‌کلاسی‌ها و برنامه‌ریزی شخصی",
    start_url: "/dashboard",
    display: "standalone",
    dir: "rtl",
    lang: "fa",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
