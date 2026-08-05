/**
 * Ticket QR payloads.
 *
 * SECURITY NOTE, and this one is load-bearing:
 *
 * A ticket QR must carry a signature the organiser's scanner can verify, so
 * that a screenshot of someone else's QR — or a hand-crafted one — fails at
 * the door. A real signature requires a secret, and a secret cannot live in a
 * client bundle: anything shipped to the device is readable by anyone who
 * wants it.
 *
 * Payments are not wired up in this build, so there is no server to sign
 * against. What follows produces a *well-formed, tamper-evident* payload with
 * the exact shape the real one will have, using a non-secret checksum. It
 * proves the QR pipeline end to end — generation, rendering, scanning,
 * parsing, verification — while being honest that the checksum is not a
 * cryptographic signature and would not stop a determined forger.
 *
 * When the backend lands: `signQrPayload` moves server-side, the secret lives
 * in a server env var, and this module keeps only `parseQrPayload`. The
 * payload format does not change, so the scanner does not change either.
 */

export type QrPayload = {
  /** Format version, so an old scanner can reject a new payload cleanly. */
  v: number;
  ticketId: string;
  eventId: string;
  holder: string;
  issuedAt: number;
  sig: string;
};

const VERSION = 1;

/**
 * FNV-1a. Deterministic, fast, and deliberately NOT presented as security.
 * Detects accidental corruption and casual edits; a real HMAC replaces it.
 */
function checksum(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, '0');
}

function canonical(p: Omit<QrPayload, 'sig'>): string {
  return `${p.v}|${p.ticketId}|${p.eventId}|${p.holder}|${p.issuedAt}`;
}

export function signQrPayload(input: {
  ticketId: string;
  eventId: string;
  holder: string;
}): string {
  const base: Omit<QrPayload, 'sig'> = {
    v: VERSION,
    ticketId: input.ticketId,
    eventId: input.eventId,
    holder: input.holder,
    issuedAt: Date.now(),
  };
  const payload: QrPayload = { ...base, sig: checksum(canonical(base)) };
  return JSON.stringify(payload);
}

export type VerifyResult =
  | { ok: true; payload: QrPayload }
  | { ok: false; reason: 'malformed' | 'version' | 'signature' };

/** What the organiser's scanner runs against a scanned string. */
export function verifyQrPayload(raw: string): VerifyResult {
  let parsed: QrPayload;
  try {
    parsed = JSON.parse(raw) as QrPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (
    typeof parsed?.ticketId !== 'string' ||
    typeof parsed?.eventId !== 'string' ||
    typeof parsed?.sig !== 'string' ||
    typeof parsed?.issuedAt !== 'number'
  ) {
    return { ok: false, reason: 'malformed' };
  }

  if (parsed.v !== VERSION) return { ok: false, reason: 'version' };

  const { sig, ...rest } = parsed;
  if (checksum(canonical(rest)) !== sig) return { ok: false, reason: 'signature' };

  return { ok: true, payload: parsed };
}
