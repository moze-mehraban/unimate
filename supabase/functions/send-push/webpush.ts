// Web Push with only WebCrypto (works in Deno and Node 20+, no dependencies):
//   - payload encryption: RFC 8291 (aes128gcm content coding, RFC 8188)
//   - sender authentication: VAPID, RFC 8292 (ES256 JWT)

export type WebPushSubscription = { endpoint: string; p256dh: string; auth: string };
/** publicKey: uncompressed P-256 point, base64url. privateKey: the matching JWK (with d, x, y). */
export type VapidKeys = { publicKey: string; privateKey: JsonWebKey };

const text = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function concat(...parts: (Uint8Array | number[])[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** Encrypts one payload for one subscription (a single aes128gcm record). */
export async function encryptPayload(sub: WebPushSubscription, plaintext: Uint8Array): Promise<Uint8Array> {
  const uaPublic = fromB64url(sub.p256dh);
  const authSecret = fromB64url(sub.auth);

  // Fresh ECDH key pair per message; its public key goes in the record header.
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));

  // RFC 8291 §3.4: IKM from the shared secret and the subscription's auth secret.
  const prkKey = await hmac(authSecret, ecdhSecret);
  const ikm = await hmac(prkKey, concat(text.encode("WebPush: info\0"), uaPublic, asPublic, [1]));

  // RFC 8188: content key and nonce from a random salt.
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(text.encode("Content-Encoding: aes128gcm\0"), [1]))).slice(0, 16);
  const nonce = (await hmac(prk, concat(text.encode("Content-Encoding: nonce\0"), [1]))).slice(0, 12);

  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02 = padding delimiter of the last (only) record.
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(plaintext, [2])));

  // Header: salt (16) | record size (uint32) | key id length (1) | key id (sender public key).
  const recordSize = [0, 0, 0x10, 0]; // 4096
  return concat(salt, recordSize, [asPublic.length], asPublic, ciphertext);
}

/** "vapid t=<JWT>, k=<public key>" for the push service at the endpoint's origin. */
export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, subject: string): Promise<string> {
  const encode = (value: unknown) => b64url(text.encode(JSON.stringify(value)));
  const unsigned = `${encode({ typ: "JWT", alg: "ES256" })}.${encode({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })}`;
  const { kty, crv, x, y, d } = vapid.privateKey;
  const key = await crypto.subtle.importKey("jwk", { kty, crv, x, y, d }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  // WebCrypto returns the raw r|s signature JWS expects.
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, text.encode(unsigned)));
  return `vapid t=${unsigned}.${b64url(signature)}, k=${vapid.publicKey}`;
}

/** Sends one push. Resolves to the push service's response (201 = accepted; 404/410 = subscription gone). */
export async function sendWebPush(
  sub: WebPushSubscription,
  payload: unknown,
  vapid: VapidKeys,
  subject: string,
): Promise<Response> {
  const body = await encryptPayload(sub, text.encode(JSON.stringify(payload)));
  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(sub.endpoint, vapid, subject),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(24 * 3600),
      Urgency: "high",
    },
    body,
  });
}
