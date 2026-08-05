/**
 * GET /api/auth/me
 *
 * Session check on app launch. Returns the current user or 401.
 */

import { handler, ok, requireUser } from '../../../server/http';
import { db } from '../../../server/db';

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const sql = db();
  await sql`UPDATE nomadalingo.users SET last_seen_at = now() WHERE id = ${user.id}`;

  return ok({ user });
});
