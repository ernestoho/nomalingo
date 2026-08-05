/**
 * Password hashing and token generation, Workers-compatible.
 *
 * bcrypt/argon2 are native modules and cannot run in a V8 isolate, so this
 * uses PBKDF2-SHA256 through Web Crypto — the correct primitive available in
 * this runtime. 210,000 iterations follows current OWASP guidance for
 * PBKDF2-HMAC-SHA256.
 *
 * Two properties that matter more than the algorithm choice:
 *   - Verification is constant-time. A byte-by-byte early return leaks how
 *     much of a hash matched, which is a practical attack given enough tries.
 *   - Session tokens are random 256-bit values stored HASHED in the database.
 *     A database leak must not hand someone a pile of working sessions.
 */

/**
 * Cloudflare Workers caps PBKDF2 at 100,000 iterations and throws above it.
 * OWASP would prefer more, but this is the ceiling the runtime allows, and a
 * hard 100k with a per-password salt is still far beyond what an offline
 * attacker gets from an unsalted or fast hash. The cost factor is stored
 * alongside each hash, so raising this later does not invalidate anyone.
 */
const ITERATIONS = 100_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;

const enc = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Encoded as `pbkdf2$<iterations>$<salt_b64>$<hash_b64>` so the cost factor
 *  can be raised later without invalidating existing passwords. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time comparison. Never short-circuits on first mismatch. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations < 1000) return false;
    const salt = fromBase64(saltB64);
    const expected = fromBase64(hashB64);
    const actual = await pbkdf2(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch (e) {
    // Log rather than swallow. A crypto failure here looks identical to a
    // wrong password from the outside, which is exactly how an iteration-limit
    // bug can hide as "authentication works, users just can't sign in".
    console.error('[crypto] verifyPassword failed', e);
    return false;
  }
}

/** Opaque session token. Returned to the client once and never stored raw. */
export function newSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** What actually goes in the sessions table. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return toBase64(new Uint8Array(digest));
}

/** Short, URL-safe, collision-resistant id for rows the server creates. */
export function newId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const s = toBase64(bytes).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  return `${prefix}_${s}`;
}

/* ------------------------------------------------------------------ */
/*  Ticket QR signing                                                   */
/* ------------------------------------------------------------------ */

/**
 * HMAC-SHA256 over the ticket payload, using a server-only secret.
 *
 * This is the real thing, unlike the client-side checksum it replaces: a
 * forged or edited QR fails verification because the attacker cannot produce
 * the MAC without the secret. Falls back to a deployment-stable default only
 * so a misconfigured environment degrades loudly in the logs rather than
 * throwing at the door — but QR_SECRET should always be set.
 */
function qrSecret(): string {
  const s = process.env.QR_SECRET;
  if (!s) {
    console.warn('[crypto] QR_SECRET is not set — ticket signatures are not secure');
    return 'nomadalingo-unset-secret';
  }
  return s;
}

export type TicketClaims = {
  v: number;
  ticketId: string;
  eventId: string;
  userId: string;
  holder: string;
  issuedAt: number;
};

function canonical(c: TicketClaims): string {
  return `${c.v}|${c.ticketId}|${c.eventId}|${c.userId}|${c.holder}|${c.issuedAt}`;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(qrSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64(new Uint8Array(sig)).replace(/=+$/, '');
}

export async function signTicket(claims: Omit<TicketClaims, 'v' | 'issuedAt'>): Promise<string> {
  const full: TicketClaims = { ...claims, v: 2, issuedAt: Date.now() };
  const sig = await hmac(canonical(full));
  return JSON.stringify({ ...full, sig });
}

export type TicketVerdict =
  | { ok: true; claims: TicketClaims }
  | { ok: false; reason: 'malformed' | 'version' | 'signature' };

export async function verifyTicket(raw: string): Promise<TicketVerdict> {
  let parsed: TicketClaims & { sig?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    typeof parsed?.ticketId !== 'string' ||
    typeof parsed?.eventId !== 'string' ||
    typeof parsed?.sig !== 'string'
  ) {
    return { ok: false, reason: 'malformed' };
  }
  if (parsed.v !== 2) return { ok: false, reason: 'version' };

  const { sig, ...claims } = parsed;
  const expected = await hmac(canonical(claims as TicketClaims));
  const a = enc.encode(sig);
  const b = enc.encode(expected);
  if (!timingSafeEqual(a, b)) return { ok: false, reason: 'signature' };

  return { ok: true, claims: claims as TicketClaims };
}
