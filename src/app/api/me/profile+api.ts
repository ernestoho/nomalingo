/**
 * PUT /api/me/profile
 *
 * Stores the app's Profile object wholesale. The matcher reads it straight
 * back out, so keeping one canonical shape avoids a translation layer that
 * would inevitably drift from the client's type.
 */

import { bad, handler, ok, readJson, requireUser } from '../../../server/http';
import { db } from '../../../server/db';

export const PUT = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await readJson<{ profile?: Record<string, unknown>; onboarded?: boolean }>(req);
  if (!body?.profile || typeof body.profile !== 'object') return bad('Perfil inválido.');

  // Guard against a runaway payload; a profile is a small object.
  const serialized = JSON.stringify(body.profile);
  if (serialized.length > 200_000) return bad('El perfil es demasiado grande.', 413);

  const sql = db();
  const name = typeof body.profile.name === 'string' ? body.profile.name.slice(0, 80) : user.name;
  const onboarded = typeof body.onboarded === 'boolean' ? body.onboarded : user.onboarded;

  await sql`
    UPDATE nomadalingo.users
       SET profile = ${serialized}::jsonb,
           name = ${name},
           onboarded = ${onboarded},
           updated_at = now()
     WHERE id = ${user.id}
  `;

  return ok({ ok: true });
});
