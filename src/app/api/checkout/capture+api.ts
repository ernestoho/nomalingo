/**
 * POST /api/checkout/capture  { orderId }
 *
 * Step two. Captures the order and writes the entitlement.
 *
 * Capture is idempotent on the order id: a double tap, a retried request, or a
 * replayed offline write all return the same result rather than minting a
 * second ticket. That property is why orders exist as rows at all.
 */

import { bad, handler, ok, readJson, requireUser, str } from '../../../server/http';
import { newId, signTicket } from '../../../server/crypto';
import { db } from '../../../server/db';

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await readJson<{ orderId?: string }>(req);
  const orderId = str(body?.orderId, 64);
  if (!orderId) return bad('Falta la orden.');

  const sql = db();
  const rows = (await sql`
    SELECT id, user_id, kind, target_id, amount_usd::float8 AS amount, status
      FROM nomadalingo.orders WHERE id = ${orderId} LIMIT 1
  `) as unknown as {
    id: string;
    user_id: string;
    kind: 'ticket' | 'membership';
    target_id: string;
    amount: number;
    status: string;
  }[];

  if (!rows.length) return bad('Esa orden no existe.', 404);
  const order = rows[0];

  // An order belongs to the person who created it. Never trust the id alone.
  if (order.user_id !== user.id) return bad('Esa orden no es tuya.', 403);

  if (order.status === 'cancelled') return bad('Esa orden fue cancelada.', 409);

  if (order.status === 'captured') {
    // Already done — return the existing entitlement rather than erroring.
    return ok({ ok: true, alreadyCaptured: true, ...(await entitlement(sql, user.id, order)) });
  }

  // This is where the real PayPal capture call goes. Everything around it —
  // ownership check, idempotency, entitlement write — stays exactly as is.
  await sql`
    UPDATE nomadalingo.orders SET status = 'captured', captured_at = now() WHERE id = ${orderId}
  `;

  if (order.kind === 'membership') {
    const plan = (await sql`
      SELECT days FROM nomadalingo.membership_plans WHERE id = ${order.target_id} LIMIT 1
    `) as unknown as { days: number }[];
    const days = plan[0]?.days ?? 30;

    // Renewing while active extends from the existing expiry, not from today,
    // so renewing early never costs the member days they already paid for.
    await sql`
      INSERT INTO nomadalingo.memberships (user_id, plan, started_at, until)
      VALUES (${user.id}, ${order.target_id}, now(), now() + (${days} || ' days')::interval)
      ON CONFLICT (user_id) DO UPDATE SET
        plan = EXCLUDED.plan,
        until = GREATEST(nomadalingo.memberships.until, now()) + (${days} || ' days')::interval,
        updated_at = now()
    `;
  } else {
    const ticketId = newId('tkt');
    const qr = await signTicket({
      ticketId,
      eventId: order.target_id,
      userId: user.id,
      holder: user.name || user.email,
    });
    await sql`
      INSERT INTO nomadalingo.tickets (id, user_id, event_id, kind, usd_paid, qr_payload)
      VALUES (${ticketId}, ${user.id}, ${order.target_id},
              ${order.amount === 0 ? 'member-rsvp' : 'ticket'}, ${order.amount}, ${qr})
      ON CONFLICT (user_id, event_id) DO NOTHING
    `;
  }

  return ok({ ok: true, ...(await entitlement(sql, user.id, order)) });
});

async function entitlement(
  sql: ReturnType<typeof db>,
  userId: string,
  order: { kind: string; target_id: string },
) {
  if (order.kind === 'membership') {
    const rows = (await sql`
      SELECT plan, to_char(until AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS until,
             to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startedAt"
        FROM nomadalingo.memberships WHERE user_id = ${userId} LIMIT 1
    `) as unknown as unknown[];
    return { membership: rows[0] ?? null };
  }
  const rows = (await sql`
    SELECT id, event_id AS "eventId", kind, usd_paid::float8 AS "usdPaid",
           qr_payload AS "qrPayload",
           to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "boughtAt"
      FROM nomadalingo.tickets WHERE user_id = ${userId} AND event_id = ${order.target_id} LIMIT 1
  `) as unknown as unknown[];
  return { ticket: rows[0] ?? null };
}
