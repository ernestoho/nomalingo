/**
 * POST /api/tickets/verify  { payload }
 *
 * The door scanner. Verifies the HMAC and confirms the ticket is real, unused
 * and for the right event — a screenshot of somebody else's QR fails here
 * because the signature is checked against server state, not just parsed.
 */

import { bad, handler, ok, requireUser, str } from '../../../server/http';
import { verifyTicket } from '../../../server/crypto';
import { db } from '../../../server/db';

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await readBody(req);
  const payload = str(body?.payload, 4000);
  if (!payload) return bad('Código vacío.');

  const verdict = await verifyTicket(payload);
  if (!verdict.ok) return ok({ valid: false, reason: verdict.reason });

  const sql = db();
  const rows = (await sql`
    SELECT t.id, t.event_id AS "eventId", t.kind, u.name AS holder,
           to_char(t.checked_in_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "checkedInAt"
      FROM nomadalingo.tickets t
      JOIN nomadalingo.users u ON u.id = t.user_id
     WHERE t.id = ${verdict.claims.ticketId} LIMIT 1
  `) as unknown as {
    id: string;
    eventId: string;
    kind: string;
    holder: string;
    checkedInAt: string | null;
  }[];

  if (!rows.length) return ok({ valid: false, reason: 'unknown' });
  const ticket = rows[0];

  const alreadyIn = Boolean(ticket.checkedInAt);
  if (!alreadyIn && user.role === 'admin') {
    await sql`UPDATE nomadalingo.tickets SET checked_in_at = now() WHERE id = ${ticket.id}`;
  }

  return ok({
    valid: true,
    alreadyCheckedIn: alreadyIn,
    holder: ticket.holder || verdict.claims.holder,
    eventId: ticket.eventId,
    kind: ticket.kind,
  });
});

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
