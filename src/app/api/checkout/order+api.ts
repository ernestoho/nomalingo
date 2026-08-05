/**
 * GET /api/checkout/order?id=...
 *
 * Reads back an order so the mock approval screen can show what is being
 * bought. Scoped to the owner.
 */

import { bad, handler, ok, requireUser } from '../../../server/http';
import { db } from '../../../server/db';

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return bad('Falta la orden.');

  const sql = db();
  const rows = (await sql`
    SELECT id, kind, target_id AS "targetId", amount_usd::float8 AS "amountUsd", status
      FROM nomadalingo.orders WHERE id = ${id} AND user_id = ${user.id} LIMIT 1
  `) as unknown as unknown[];

  if (!rows.length) return bad('Esa orden no existe.', 404);
  return ok({ order: rows[0] });
});
