#!/usr/bin/env node
// Generates every UniMate icon from the one design below (graduation cap + check badge
// on indigo): the Android launcher/adaptive/monochrome icons, splash and web favicon for
// apps/mobile, and icon.svg / apple-icon.png for the Next.js site.
//
// Usage: npm run icons      (needs sharp, installed with Next.js)

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobile = path.join(root, "apps", "mobile", "assets", "images");
const web = path.join(root, "apps", "web", "src", "app");

const INDIGO_LIGHT = "#6366f1";
const INDIGO = "#4f46e5";
const INDIGO_DARK = "#4338ca";
const AMBER = "#f59e0b";

/**
 * The glyph, drawn on a 1024 canvas around (512, 512).
 * mono: single-color silhouette (white), for Android's themed and notification icons.
 */
function glyph({ mono = false } = {}) {
  const top = "#fff";
  const body = mono ? "#fff" : "#e0e7ff";
  const tassel = mono ? "#fff" : "#fde68a";
  const badge = mono ? "#fff" : AMBER;
  const check = mono ? "#000" : "#fff";
  return `
  <defs>
    <mask id="badge-cut">
      <rect width="1024" height="1024" fill="#fff"/>
      <circle cx="690" cy="688" r="150" fill="#000"/>
    </mask>
    ${mono ? `<mask id="check-cut"><rect width="1024" height="1024" fill="#fff"/>
      <path d="M632 690 l40 40 l80 -84" fill="none" stroke="#000" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/></mask>` : ""}
  </defs>
  <g mask="url(#badge-cut)">
    <path d="M352 470 V600 C352 650 432 690 512 690 C592 690 672 650 672 600 V470 Z" fill="${body}"/>
    <path d="M512 290 L822 420 L512 550 L202 420 Z" fill="${top}"/>
    <path d="M512 420 L262 470 V610" fill="none" stroke="${tassel}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="262" cy="628" r="26" fill="${tassel}"/>
  </g>
  <g ${mono ? 'mask="url(#check-cut)"' : ""}>
    <circle cx="690" cy="688" r="118" fill="${badge}"/>
    ${mono ? "" : `<path d="M632 690 l40 40 l80 -84" fill="none" stroke="${check}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`}
  </g>`;
}

const gradient = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${INDIGO_LIGHT}"/>
    <stop offset="1" stop-color="${INDIGO_DARK}"/>
  </linearGradient>`;

/** Full icon. radius: corner radius on the 1024 canvas (0 = square, Android masks it). */
const fullIcon = (radius = 0, scale = 0.86) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>${gradient}</defs>
  <rect width="1024" height="1024" rx="${radius}" fill="url(#bg)"/>
  <g transform="translate(512 512) scale(${scale}) translate(-512 -490)">${glyph()}</g>
</svg>`;

/** Glyph alone on a transparent canvas, scaled to fit Android's adaptive-icon safe zone. */
const glyphOnly = (scale, opts) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(${scale}) translate(-512 -490)">${glyph(opts)}</g>
</svg>`;

const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>${gradient}</defs><rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;

async function png(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log(path.relative(root, file));
}

// --- Mobile (paths referenced by apps/mobile/app.json) ---
await png(fullIcon(0), 1024, path.join(mobile, "icon.png"));
// Adaptive icon: launchers show the middle ~61%, so the glyph is kept small.
await png(glyphOnly(0.68), 512, path.join(mobile, "android-icon-foreground.png"));
await png(background, 512, path.join(mobile, "android-icon-background.png"));
await png(glyphOnly(0.68, { mono: true }), 432, path.join(mobile, "android-icon-monochrome.png"));
// Notification small icon: white silhouette filling most of the square.
await png(glyphOnly(0.95, { mono: true }), 96, path.join(mobile, "notification-icon.png"));
await png(glyphOnly(1), 512, path.join(mobile, "splash-icon.png"));
await png(fullIcon(224), 48, path.join(mobile, "favicon.png"));

// --- Web (Next.js file conventions: app/icon.svg, app/apple-icon.png) ---
mkdirSync(web, { recursive: true });
writeFileSync(path.join(web, "icon.svg"), fullIcon(224));
console.log(path.relative(root, path.join(web, "icon.svg")));
await png(fullIcon(0), 180, path.join(web, "apple-icon.png"));
rmSync(path.join(web, "favicon.ico"), { force: true });
