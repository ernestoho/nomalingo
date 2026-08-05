/**
 * Shared plumbing for API routes: responses, validation, session lookup and
 * rate limiting.
 *
 * The rule every handler follows: the client is never trusted for anything
 * that decides money, identity or authority. Prices are looked up server-side,
 * roles are read from the database, and ids that matter are derived from the
 * session rather than the request body.
 */

import { db, dbConfigured, DbNotConfigured } from './db';
import { hashToken } from './crypto';

/* ------------------------------------------------------------------ */
/*  responses                                                           */
/* ------------------------------------------------------------------ */

const baseHeaders = {
  'Cache-Control': 'no-store',
};

export function ok(data: unknown, init?: ResponseInit) {
  return Response.json(data as object, { ...init, headers: { ...baseHeaders, ...init?.headers } });
}

export function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status, headers: baseHeaders });
}

export const unauthorized = () => bad('No has iniciado sesión.', 401);
export const forbidden = () => bad('No tienes permiso para hacer esto.', 403);
export const notFound = (what = 'Recurso') => bad(`${what} no encontrado.`, 404);

/**
 * Wrap a handler so an unexpected throw becomes a clean 500 instead of an
 * opaque Worker crash, and a missing database becomes an honest 503.
 */
export function handler(fn: (req: Request, params?: Record<string, string>) => Promise<Response>) {
  return async (req: Request, params?: Record<string, string>) => {
    try {
      return await fn(req, params);
    } catch (e) {
      if (e instanceof DbNotConfigured) {
        return bad('La base de datos no está configurada en el servidor.', 503, {
          code: 'db_unconfigured',
        });
      }
      console.error('[api] unhandled', e);
      return bad('Algo salió mal. Inténtalo de nuevo.', 500);
    }
  };
}

export { dbConfigured };

/* ------------------------------------------------------------------ */
/*  input validation                                                    */
/* ------------------------------------------------------------------ */

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

export function str(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

export function num(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function email(v: unknown): string | null {
  const s = str(v, 254);
  if (!s || !EMAIL_RE.test(s)) return null;
  return s.toLowerCase();
}

export function password(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  // Length is the security property that matters. An upper bound exists
  // because PBKDF2 over a megabyte of input is a free denial of service.
  if (v.length < 8 || v.length > 512) return null;
  return v;
}

/* ------------------------------------------------------------------ */
/*  sessions                                                            */
/* ------------------------------------------------------------------ */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: 'member' | 'admin';
  profile: Record<string, unknown>;
  onboarded: boolean;
};

function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') ?? '';
  if (!h.toLowerCase().startsWith('bearer ')) return null;
  const t = h.slice(7).trim();
  return t.length > 10 ? t : null;
}

/** Resolve the caller, or null. Also refreshes last_seen_at cheaply. */
export async function currentUser(req: Request): Promise<SessionUser | null> {
  const token = bearer(req);
  if (!token) return null;

  const sql = db();
  const tokenHash = await hashToken(token);

  const rows = (await sql`
    SELECT u.id, u.email, u.name, u.role, u.profile, u.onboarded
      FROM nomadalingo.sessions s
      JOIN nomadalingo.users u ON u.id = s.user_id
     WHERE s.token_hash = ${tokenHash}
       AND s.expires_at > now()
     LIMIT 1
  `) as unknown as SessionUser[];

  return rows[0] ?? null;
}

export async function requireUser(req: Request) {
  const user = await currentUser(req);
  if (!user) return { user: null as null, response: unauthorized() };
  return { user, response: null as null };
}

export async function requireAdmin(req: Request) {
  const user = await currentUser(req);
  if (!user) return { user: null as null, response: unauthorized() };
  if (user.role !== 'admin') return { user: null as null, response: forbidden() };
  return { user, response: null as null };
}

/* ------------------------------------------------------------------ */
/*  rate limiting                                                       */
/* ------------------------------------------------------------------ */

export function clientKey(req: Request, suffix: string): string {
  const ip =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  return `${suffix}:${ip}`;
}

/**
 * Sliding-window limiter backed by the auth_attempts table.
 *
 * Deliberately counts *failures* rather than all requests: someone signing in
 * correctly from a busy office should not be locked out because a colleague
 * fat-fingered a password.
 */
export async function tooManyFailures(key: string, limit = 8, windowMinutes = 15) {
  const sql = db();
  const rows = (await sql`
    SELECT count(*)::int AS n
      FROM nomadalingo.auth_attempts
     WHERE key = ${key}
       AND ok = false
       AND at > now() - (${windowMinutes} || ' minutes')::interval
  `) as unknown as { n: number }[];
  return (rows[0]?.n ?? 0) >= limit;
}

export async function recordAttempt(key: string, success: boolean) {
  const sql = db();
  await sql`INSERT INTO nomadalingo.auth_attempts (key, ok) VALUES (${key}, ${success})`;
  // Opportunistic cleanup so the table cannot grow without bound.
  if (Math.random() < 0.02) {
    await sql`DELETE FROM nomadalingo.auth_attempts WHERE at < now() - interval '1 day'`;
  }
}

/* ------------------------------------------------------------------ */
/*  content version                                                     */
/* ------------------------------------------------------------------ */

export async function contentVersion(): Promise<number> {
  const sql = db();
  const rows = (await sql`
    SELECT version::text AS version FROM nomadalingo.content_version WHERE id = 1
  `) as unknown as { version: string }[];
  return Number(rows[0]?.version ?? 1);
}
