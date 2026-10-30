#!/usr/bin/env node
// Recreates the local Supabase Auth container with an outbound HTTP(S) proxy.
//
// Why: Google blocks some networks (e.g. Iran) from fetching its OIDC signing keys
// (www.googleapis.com/oauth2/v3/certs), so Auth can't verify the Google token and
// "Sign in with Google" fails. Docker doesn't pass host proxy settings into the
// containers the Supabase CLI starts, so this copies the container's config and
// adds HTTPS_PROXY. Re-run after every `supabase start`.
//
// Usage: npm run db:auth-proxy [-- http://host.docker.internal:2081]
//        (or set AUTH_PROXY). The proxy must accept connections from Docker,
//        i.e. listen on 0.0.0.0 / "allow LAN", not only 127.0.0.1.

import { spawnSync } from "node:child_process";

const CONTAINER = "supabase_auth_unimate";
const PROXY = process.argv[2] ?? process.env.AUTH_PROXY ?? "http://host.docker.internal:2081";
// Auth talks to these over HTTP inside the Docker network; never proxy them.
const NO_PROXY = ["localhost", "127.0.0.1", "kong", "db", "supabase_kong_unimate", "supabase_db_unimate"].join(",");
const PROXY_VARS = new Set(["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"]);

function docker(args, { quiet = false } = {}) {
  const res = spawnSync("docker", args, { encoding: "utf8" });
  if (res.status !== 0 && !quiet) {
    console.error(`docker ${args[0]} failed:\n${res.stderr}`);
    process.exit(1);
  }
  return res;
}

const inspected = docker(["inspect", CONTAINER], { quiet: true });
if (inspected.status !== 0) {
  console.error(`Container ${CONTAINER} not found. Run \`npx supabase start\` first.`);
  process.exit(1);
}
const [info] = JSON.parse(inspected.stdout);

const env = info.Config.Env.filter((e) => !PROXY_VARS.has(e.slice(0, e.indexOf("="))));
env.push(`HTTPS_PROXY=${PROXY}`, `HTTP_PROXY=${PROXY}`, `NO_PROXY=${NO_PROXY}`);

const args = ["run", "-d", "--name", CONTAINER, "--restart", info.HostConfig.RestartPolicy.Name || "unless-stopped"];
for (const [name, net] of Object.entries(info.NetworkSettings.Networks)) {
  args.push("--network", name);
  for (const alias of net.Aliases ?? []) if (!alias.startsWith(info.Config.Hostname)) args.push("--network-alias", alias);
}
for (const [k, v] of Object.entries(info.Config.Labels ?? {})) args.push("--label", `${k}=${v}`);
const hc = info.Config.Healthcheck;
if (hc?.Test?.[0] === "CMD-SHELL") {
  args.push("--health-cmd", hc.Test[1], "--health-interval", `${hc.Interval / 1e9}s`, "--health-timeout", `${hc.Timeout / 1e9}s`, "--health-retries", String(hc.Retries));
}
for (const e of env) args.push("-e", e);
if (info.Config.Entrypoint?.length) args.push("--entrypoint", info.Config.Entrypoint.join(" "));
args.push(info.Config.Image, ...(info.Config.Cmd ?? []));

docker(["rm", "-f", CONTAINER]);
docker(args);
console.log(`Recreated ${CONTAINER} with HTTPS_PROXY=${PROXY}`);

// Check the request that was failing, through the same proxy. (Auth is Go and
// reads HTTPS_PROXY itself; busybox wget needs http_proxy and -Y on.)
const check = docker(
  [
    "exec", "-e", `http_proxy=${PROXY}`, "-e", `https_proxy=${PROXY}`, CONTAINER,
    "sh", "-c", "wget -Y on -q -S -O /dev/null -T 20 https://www.googleapis.com/oauth2/v3/certs 2>&1 | grep -m1 HTTP",
  ],
  { quiet: true },
);
const status = check.stdout.trim() || check.stderr.trim();
if (status.includes("200")) {
  console.log("Google signing keys reachable (200). Google sign-in should work now.");
} else {
  console.error(`Google signing keys still not reachable: ${status || "no response"}`);
  console.error("Check that the proxy is running and accepts connections from Docker.");
  process.exit(1);
}
