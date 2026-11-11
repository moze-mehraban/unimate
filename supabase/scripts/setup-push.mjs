#!/usr/bin/env node
// One-time FCM push setup for the linked Supabase project (see docs/PUSH_NOTIFICATIONS.md):
//   1. stores FIREBASE_SERVICE_ACCOUNT and a fresh PUSH_FUNCTION_KEY as Edge Function secrets,
//   2. deploys the send-push function,
//   3. saves the function URL and the same key in Vault for the queue_push() trigger.
// Re-running replaces the key everywhere.
//
// Usage: npm run push:setup -- <path-to-firebase-service-account.json>
// Needs `npx supabase login` and `npx supabase link` done first. Never prints the key.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const keyPath = process.argv[2];
if (!keyPath || !existsSync(keyPath)) {
  console.error("Usage: npm run push:setup -- <path-to-firebase-service-account.json>");
  process.exit(1);
}

const sa = JSON.parse(readFileSync(keyPath, "utf8"));
if (!sa.project_id || !sa.client_email || !sa.private_key) {
  console.error("That file is not a Firebase service-account key (expected project_id, client_email, private_key).");
  process.exit(1);
}

// Warn if the key and the app's google-services.json belong to different Firebase projects.
const appConfig = path.join(root, "apps", "mobile", "google-services.json");
if (existsSync(appConfig)) {
  const appProject = JSON.parse(readFileSync(appConfig, "utf8")).project_info?.project_id;
  if (appProject && appProject !== sa.project_id) {
    console.error(`Firebase project mismatch: key is "${sa.project_id}", the app uses "${appProject}".`);
    process.exit(1);
  }
}

const refFile = path.join(root, "supabase", ".temp", "project-ref");
if (!existsSync(refFile)) {
  console.error("No linked project. Run: npx supabase link --project-ref <ref>");
  process.exit(1);
}
const ref = readFileSync(refFile, "utf8").trim();

function supabase(args) {
  const res = spawnSync("npx", ["supabase", ...args], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) {
    console.error(`\nFailed: supabase ${args[0]} ${args[1] ?? ""}`);
    process.exit(1);
  }
}

const pushKey = randomBytes(32).toString("hex");

// 1. Secrets, via a temporary env file (one-line JSON) so no shell has to quote the key.
const envFile = path.join(tmpdir(), `unimate-push-${process.pid}.env`);
writeFileSync(envFile, `FIREBASE_SERVICE_ACCOUNT=${JSON.stringify(sa)}\nPUSH_FUNCTION_KEY=${pushKey}\n`, { mode: 0o600 });
try {
  console.log("1/3 Setting Edge Function secrets…");
  supabase(["secrets", "set", "--env-file", envFile, "--project-ref", ref]);
} finally {
  rmSync(envFile, { force: true });
}

// 2. Function (bundled by the API, so Docker isn't needed).
console.log("2/3 Deploying send-push…");
supabase(["functions", "deploy", "send-push", "--project-ref", ref, "--use-api"]);

// 3. Vault secrets the trigger reads (replacing older ones).
console.log("3/3 Saving the function URL and key in Vault…");
const url = `https://${ref}.supabase.co/functions/v1/send-push`;
const sql = [
  "delete from vault.secrets where name in ('push_function_url', 'push_function_key');",
  `select vault.create_secret('${url}', 'push_function_url');`,
  `select vault.create_secret('${pushKey}', 'push_function_key');`,
].join("\n");
// Through a file: on Windows the shell would split an inline query into words (and echo the key).
const sqlFile = path.join(tmpdir(), `unimate-push-${process.pid}.sql`);
writeFileSync(sqlFile, sql, { mode: 0o600 });
try {
  supabase(["db", "query", "--linked", "--file", sqlFile]);
} finally {
  rmSync(sqlFile, { force: true });
}

console.log(`\nDone. Push is configured for project ${ref} (Firebase: ${sa.project_id}).`);
