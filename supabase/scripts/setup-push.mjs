#!/usr/bin/env node
// Push setup for the linked Supabase project (see docs/PUSH_NOTIFICATIONS.md).
//
//   npm run push:setup -- <firebase-service-account.json>   phones (FCM)
//   npm run push:setup -- --web [--subject https://site]      browsers (Web Push / VAPID)
//   (both can be given at once)
//
// Every run:
//   1. sets the Edge Function secrets: a fresh PUSH_FUNCTION_KEY, plus FIREBASE_SERVICE_ACCOUNT
//      and/or VAPID_KEYS when asked (others are left as they are),
//   2. deploys send-push (bundled by the API, no Docker),
//   3. saves the function URL and the same PUSH_FUNCTION_KEY in Vault for queue_push().
// --web creates the VAPID key pair only once and writes the public half to
// apps/web/src/lib/web-push-key.ts (commit it); --rotate-web replaces it, after which
// browsers re-subscribe on their next visit.
// Needs `npx supabase login` and `npx supabase link` first. Never prints secrets.

import { spawnSync } from "node:child_process";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const subject = option("--subject") ?? "https://unimate.mozemehraban.ir";
const keyPath = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--subject");
const web = flag("--web") || flag("--rotate-web");

if (!keyPath && !web) {
  console.error("Usage: npm run push:setup -- [<firebase-service-account.json>] [--web] [--subject https://your-site]");
  process.exit(1);
}

const secrets = { PUSH_FUNCTION_KEY: randomBytes(32).toString("hex") };

// --- FCM ---
if (keyPath) {
  if (!existsSync(keyPath)) {
    console.error(`Not found: ${keyPath}`);
    process.exit(1);
  }
  const sa = JSON.parse(readFileSync(keyPath, "utf8"));
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    console.error("That file is not a Firebase service-account key (expected project_id, client_email, private_key).");
    process.exit(1);
  }
  // The key and the app's google-services.json must belong to the same Firebase project.
  const appConfig = path.join(root, "apps", "mobile", "google-services.json");
  if (existsSync(appConfig)) {
    const appProject = JSON.parse(readFileSync(appConfig, "utf8")).project_info?.project_id;
    if (appProject && appProject !== sa.project_id) {
      console.error(`Firebase project mismatch: key is "${sa.project_id}", the app uses "${appProject}".`);
      process.exit(1);
    }
  }
  secrets.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(sa);
}

// --- Web Push (VAPID) ---
const publicKeyFile = path.join(root, "apps", "web", "src", "lib", "web-push-key.ts");
if (web) {
  const existing = readFileSync(publicKeyFile, "utf8").match(/VAPID_PUBLIC_KEY = "([^"]*)"/)?.[1];
  if (existing && !flag("--rotate-web")) {
    console.log("Web Push keys already exist (apps/web/src/lib/web-push-key.ts); use --rotate-web to replace them.");
  } else {
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    // Uncompressed point (65 bytes) = the last 65 bytes of the SPKI encoding.
    const rawPublic = publicKey.export({ format: "der", type: "spki" }).subarray(-65).toString("base64url");
    const { kty, crv, x, y, d } = privateKey.export({ format: "jwk" });
    secrets.VAPID_KEYS = JSON.stringify({ publicKey: rawPublic, privateKey: { kty, crv, x, y, d }, subject });
    writeFileSync(
      publicKeyFile,
      readFileSync(publicKeyFile, "utf8").replace(/VAPID_PUBLIC_KEY = "[^"]*"/, `VAPID_PUBLIC_KEY = "${rawPublic}"`),
    );
    console.log("Created Web Push keys; public key written to apps/web/src/lib/web-push-key.ts (commit it).");
  }
}

const refFile = path.join(root, "supabase", ".temp", "project-ref");
if (!existsSync(refFile)) {
  console.error("No linked project. Run: npx supabase link --project-ref <ref>");
  process.exit(1);
}
const ref = readFileSync(refFile, "utf8").trim();

function supabase(cliArgs) {
  const res = spawnSync("npx", ["supabase", ...cliArgs], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) {
    console.error(`\nFailed: supabase ${cliArgs[0]} ${cliArgs[1] ?? ""}`);
    process.exit(1);
  }
}

/** Runs `fn(file)` with `content` in a private temp file (so no shell sees secrets), then deletes it. */
function withTempFile(ext, content, fn) {
  const file = path.join(tmpdir(), `unimate-push-${process.pid}${ext}`);
  writeFileSync(file, content, { mode: 0o600 });
  try {
    fn(file);
  } finally {
    rmSync(file, { force: true });
  }
}

// 1. Secrets (one line each; JSON values are single-line).
console.log("1/3 Setting Edge Function secrets…");
withTempFile(".env", Object.entries(secrets).map(([k, v]) => `${k}=${v}\n`).join(""), (file) =>
  supabase(["secrets", "set", "--env-file", file, "--project-ref", ref]),
);

// 2. Function.
console.log("2/3 Deploying send-push…");
supabase(["functions", "deploy", "send-push", "--project-ref", ref, "--use-api"]);

// 3. Vault secrets the trigger reads (replacing older ones).
console.log("3/3 Saving the function URL and key in Vault…");
const url = `https://${ref}.supabase.co/functions/v1/send-push`;
withTempFile(
  ".sql",
  [
    "delete from vault.secrets where name in ('push_function_url', 'push_function_key');",
    `select vault.create_secret('${url}', 'push_function_url');`,
    `select vault.create_secret('${secrets.PUSH_FUNCTION_KEY}', 'push_function_key');`,
  ].join("\n"),
  (file) => supabase(["db", "query", "--linked", "--file", file]),
);

console.log(`\nDone. Push is configured for project ${ref}${keyPath ? " (phones)" : ""}${web ? " (browsers)" : ""}.`);
