/**
 * GET /api/admin/users  — list users with optional ?q= search and ?limit= cap
 * PUT /api/admin/users  — change a user's role (body: { userId, role })
 *
 * password_hash is NEVER selected or returned.
 */

import { bad, handler, ok, readJson, requireAdmin, str, num } from '../../../server/http';
import { db } from '../../../server/db';

const MAX_LIMIT   = 200;
const DEFAULT_LIMIT = 50;

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const url    = new URL(req.url);
  const q      = url.searchParams.get('q')?.trim() ?? '';
  const limitRaw = parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit  = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(limitRaw, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const sql = db();

  // We use a LIKE search on name and email. The parameter is user-supplied, so
  // it must go through the parameterised template — never string-concatenated.
  const pattern = q ? `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%` : null;

  const rows = pattern
    ? await sql`
        SELECT u.id, u.name, u.email, u.role, u.onboarded,
               to_char(u.created_at  AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
               to_char(u.last_seen_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "lastSeenAt",
               (EXISTS (
                 SELECT 1 FROM nomadalingo.memberships ms
                  WHERE ms.user_id = u.id AND ms.until > now()
               )) AS "isMember",
               (SELECT count(*)::int FROM nomadalingo.tickets t WHERE t.user_id = u.id) AS "ticketCount"
          FROM nomadalingo.users u
         WHERE lower(u.name)  LIKE lower(${pattern})
            OR lower(u.email) LIKE lower(${pattern})
         ORDER BY u.created_at DESC
         LIMIT ${limit}
      `
    : await sql`
        SELECT u.id, u.name, u.email, u.role, u.onboarded,
               to_char(u.created_at  AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
               to_char(u.last_seen_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "lastSeenAt",
               (EXISTS (
                 SELECT 1 FROM nomadalingo.memberships ms
                  WHERE ms.user_id = u.id AND ms.until > now()
               )) AS "isMember",
               (SELECT count(*)::int FROM nomadalingo.tickets t WHERE t.user_id = u.id) AS "ticketCount"
          FROM nomadalingo.users u
         ORDER BY u.created_at DESC
         LIMIT ${limit}
      `;

  return ok(rows);
});

export const PUT = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const body = await readJson<{ userId?: unknown; role?: unknown }>(req);
  if (!body) return bad('Cuerpo de la solicitud inválido.');

  const userId = str(body.userId, 64);
  if (!userId) return bad('El userId es obligatorio.');

  const role = str(body.role, 10);
  if (!role || !['member', 'admin'].includes(role)) {
    return bad("El rol debe ser 'member' o 'admin'.");
  }

  // ── guard: an admin cannot remove their own admin role ────────────────
  if (userId === user.id && role !== 'admin') {
    return bad(
      'No puedes quitarte el rol de administrador a ti mismo — eso podría dejarte sin acceso al panel.',
      409,
    );
  }

  const sql = db();

  const existing = (await sql`
    SELECT id FROM nomadalingo.users WHERE id = ${userId} LIMIT 1
  `) as unknown as { id: string }[];
  if (!existing.length) return bad('Usuario no encontrado.', 404);

  await sql`
    UPDATE nomadalingo.users SET role = ${role}, updated_at = now() WHERE id = ${userId}
  `;

  return ok({ ok: true, userId, role });
});
