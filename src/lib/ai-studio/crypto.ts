/*
  Cryptographic primitives for Aczen AI Studio: API keys, password hashing,
  signed tokens and the keyed hashes used for rate limiting.

  One file so each primitive has exactly one implementation. A second copy of
  a constant-time compare or a key-hash routine is how one of the two ends up
  subtly different — and with API keys, "subtly different" means a key that
  hashes one way at creation and another way at the gateway.
*/

import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

if (typeof window !== "undefined") {
  throw new Error("src/lib/ai-studio/crypto.ts is server-only and must never reach the browser.");
}

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

function requireSecret(name: string): string {
  const value = process.env[name];
  // Fail closed. A default secret is a secret everyone who reads this repo knows.
  if (!value || value.length < 32) {
    throw new Error(`${name} is not set (or shorter than 32 chars); refusing to continue.`);
  }
  return value;
}

/* Constant-time equality for two strings of possibly different length. */
export function safeEqual(a: string, b: string): boolean {
  // Hashing first gives both sides a fixed length, so timingSafeEqual cannot
  // throw and the comparison leaks neither content nor length.
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

/* ============================== API keys ============================== */

export const API_KEY_PREFIX = "aczen_sk_live_";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function base62(bytes: Buffer, length: number): string {
  let value = BigInt(`0x${bytes.toString("hex") || "0"}`);
  let out = "";
  while (value > 0n) {
    out = BASE62[Number(value % 62n)] + out;
    value /= 62n;
  }
  return out.padStart(length, "0").slice(-length);
}

// CRC-32 (IEEE), used as a checksum suffix so the gateway can reject a
// mistyped or random string without touching the database — the same idea as
// GitHub's token format. It is an integrity check, not a security control.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(input: string): number {
  let crc = 0xffffffff;
  for (const byte of Buffer.from(input, "utf8")) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function checksum(body: string): string {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(crc32(body));
  return base62(buf, 6);
}

const KEY_BODY_LENGTH = 43; // 32 random bytes in base62
const KEY_PATTERN = new RegExp(`^${API_KEY_PREFIX}([0-9A-Za-z]{${KEY_BODY_LENGTH}})([0-9A-Za-z]{6})$`);

export interface GeneratedKey {
  key: string;
  hash: string;
  hint: string;
}

export function generateApiKey(): GeneratedKey {
  // 256 bits from the CSPRNG: unguessable regardless of how many keys exist.
  const body = base62(randomBytes(32), KEY_BODY_LENGTH);
  const key = `${API_KEY_PREFIX}${body}${checksum(body)}`;
  return { key, hash: hashApiKey(key), hint: `${API_KEY_PREFIX}…${key.slice(-4)}` };
}

/* Format + checksum check. Cheap, and runs before any database lookup. */
export function isWellFormedApiKey(candidate: string): boolean {
  const match = KEY_PATTERN.exec(candidate);
  if (!match) return false;
  return safeEqual(checksum(match[1]), match[2]);
}

/*
  HMAC-SHA256 under AI_STUDIO_KEY_PEPPER.

  Keyed rather than a bare SHA-256 so a leaked copy of the ai_api_key table is
  useless on its own: without the pepper (which lives only in the deployment
  environment) no stored hash can be matched against a candidate key. A slow
  hash is unnecessary here — the input has 256 bits of entropy, so there is
  nothing to brute-force — and would add latency to every gateway request.
*/
export function hashApiKey(key: string): string {
  return createHmac("sha256", requireSecret("AI_STUDIO_KEY_PEPPER")).update(`apikey|${key}`).digest("hex");
}

/* ======================== Keyed identifiers ======================== */

// Prefixed per purpose so a hash computed for one table can never be looked
// up against another's.
export function hashIp(ip: string): string {
  return createHmac("sha256", requireSecret("AI_STUDIO_KEY_PEPPER")).update(`ip|${ip}`).digest("hex");
}

export function hashEmail(email: string): string {
  return createHmac("sha256", requireSecret("AI_STUDIO_KEY_PEPPER"))
    .update(`email|${email.trim().toLowerCase()}`)
    .digest("hex");
}

/* ============================ Passwords ============================ */

// N=2^15 is double Node's default; ~100 ms and 32 MB per hash, which is the
// point: an offline attacker pays the same cost per guess.
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 96 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

/*
  Verifies against a stored `scrypt$N$r$p$salt$hash`. The parameters are read
  from the stored value, so raising the cost later does not lock anyone out:
  old hashes verify with their own parameters and are replaced on next change.
*/
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  // Bounds stop a corrupted (or tampered) row from requesting an absurd cost
  // and turning one login into a memory exhaustion.
  if (![N, r, p].every(Number.isInteger) || N < 16384 || N > 1048576 || r < 1 || r > 32 || p < 1 || p > 16) {
    return false;
  }
  const expected = Buffer.from(hashB64, "base64");
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const derived = await scrypt(password, Buffer.from(saltB64, "base64"), SCRYPT_KEYLEN, {
    N, r, p, maxmem: SCRYPT_MAXMEM,
  });
  return timingSafeEqual(derived, expected);
}

/*
  Burns the same scrypt cost as a real verification. Called on the paths that
  would otherwise answer instantly (unknown email, account still on its
  initial password), so response timing does not reveal which emails exist.
*/
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCost(password: string): Promise<void> {
  if (!dummyHash) dummyHash = hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

/* ========================== Signed tokens ========================== */

/*
  `<payload>.<hmac>` where payload is dot-separated fields. The gate name is
  the first field and is covered by the signature, so a cookie minted for one
  gate cannot be renamed into another's slot (the bug the /axe session module
  documents). Each gate also signs with its own secret.
*/
export function signToken(secretName: string, fields: string[]): string {
  const payload = fields.join(".");
  const signature = createHmac("sha256", requireSecret(secretName)).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/* Returns the verified fields, or null. Never throws on hostile input. */
export function verifyToken(secretName: string, token: string | undefined, fieldCount: number): string[] | null {
  if (!token || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== fieldCount + 1) return null;
  const signature = parts.pop() as string;
  const secret = process.env[secretName];
  if (!secret || secret.length < 32) return null;
  const expected = createHmac("sha256", secret).update(parts.join(".")).digest("base64url");
  // Signature first; nothing in the payload is trusted until it verifies.
  if (!safeEqual(expected, signature)) return null;
  return parts;
}

export function randomId(bytes = 12): string {
  return randomBytes(bytes).toString("base64url");
}
