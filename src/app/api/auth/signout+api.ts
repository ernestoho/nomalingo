/**
 * POST /api/auth/signout
 *
 * Deletes the session row so the token stops working server-side. Clearing it
 * only on the device would leave a valid credential alive for sixty days.
 */

import { hashToken } from '../../../server/crypto';
import { handler, ok } from '../../../server/http';
import { db } from '../../../server/db';

export const POST = handler(async (req: Request) => {
  const auth = req.headers.get('authorization') ?? '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) {
      const sql = db();
      await sql`DELETE FROM nomadalingo.sessions WHERE token_hash = ${await hashToken(token)}`;
    }
  }
  // Always 200: signing out should never fail from the user's point of view.
  return ok({ ok: true });
});
