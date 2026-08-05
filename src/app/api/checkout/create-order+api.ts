/**
 * POST /api/checkout/create-order  { kind, targetId }
 *
 * Step one of the real PayPal shape, with the provider call stubbed.
 *
 * THE RULE THIS ENCODES: the price is looked up from the server's own records
 * and the client never sends an amount. A client-side-only integration is
 * defeated with devtools in seconds and hands out free tickets. Keeping the
 * amount server-side from day one is what makes swapping in real PayPal a
 * one-module change rather than a security rewrite.
 */

import { bad, handler, ok, readJson, requireUser, str } from '../../../server/http';
import { newId } from '../../../server/crypto';
import { db } from '../../../server/db';

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await readJson<{ kind?: string; targetId?: string }>(req);
  const kind = str(body?.kind, 20);
  const targetId = str(body?.targetId, 64);

  if (kind !== 'ticket' && kind !== 'membership') return bad('Tipo de compra inválido.', 422);
  if (!targetId) return bad('Falta qué estás comprando.', 422);

  const sql = db();
  let amount = 0;
  let label = '';

  if (kind === 'ticket') {
    const rows = (await sql`
      SELECT id, price_usd::float8 AS price, title, capacity,
             (sold_seed + (SELECT count(*) FROM nomadalingo.tickets t WHERE t.event_id = e.id))::int AS sold
        FROM nomadalingo.official_events e
       WHERE id = ${targetId} AND published LIMIT 1
    `) as unknown as { id: string; price: number; title: Record<string, string>; capacity: number; sold: number }[];
    if (!rows.length) return bad('Ese evento no existe.', 404);

    const ev = rows[0];
    if (ev.sold >= ev.capacity) return bad('El evento está agotado.', 409, { code: 'sold_out' });

    const already = (await sql`
      SELECT id FROM nomadalingo.tickets WHERE user_id = ${user.id} AND event_id = ${targetId} LIMIT 1
    `) as unknown as { id: string }[];
    if (already.length) return bad('Ya tienes un boleto para este evento.', 409, { code: 'already_owned' });

    // Members get in free — decided here, on the server, not by the client.
    const member = (await sql`
      SELECT 1 AS ok FROM nomadalingo.memberships
       WHERE user_id = ${user.id} AND until > now() LIMIT 1
    `) as unknown as { ok: number }[];

    amount = member.length ? 0 : ev.price;
    label = ev.title?.es ?? 'Evento oficial';
  } else {
    const rows = (await sql`
      SELECT id, price_usd::float8 AS price, days, label
        FROM nomadalingo.membership_plans WHERE id = ${targetId} AND active LIMIT 1
    `) as unknown as { id: string; price: number; days: number; label: Record<string, string> }[];
    if (!rows.length) return bad('Ese plan no existe.', 404);
    amount = rows[0].price;
    label = rows[0].label?.es ?? 'Membresía';
  }

  const orderId = newId('ord');
  await sql`
    INSERT INTO nomadalingo.orders (id, user_id, kind, target_id, amount_usd, status, provider)
    VALUES (${orderId}, ${user.id}, ${kind}, ${targetId}, ${amount}, 'created', 'mock')
  `;

  // With real PayPal this is the approve URL returned by the Orders API.
  // The client's job is identical either way: open it, wait for the redirect.
  return ok({
    orderId,
    amountUsd: amount,
    label,
    approveUrl: `/mock-pay?order=${orderId}`,
    provider: 'mock',
  });
});
