/**
 * PUT    /api/admin/official/[id]  — partial update an official event
 * DELETE /api/admin/official/[id]  — delete an official event (refused if tickets exist)
 *
 * CRITICAL: exactly one official event may have is_current = true.
 * When updating is_current to true, all other rows are cleared first.
 */

import { bad, handler, ok, readJson, requireAdmin, str, num } from '../../../../server/http';
import { db } from '../../../../server/db';

type OfficialEventRow = {
  id: string;
  title: unknown;
  venue_id: string;
  area: string;
  when_label: unknown;
  starts_at: string;
  price_usd: string;
  capacity: number;
  sold_seed: number;
  includes: unknown;
  blurb: unknown;
  is_current: boolean;
  published: boolean;
};

export const PUT = handler(async (req: Request, params?: Record<string, string>) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const id = params?.id;
  if (!id) return bad('Falta el identificador del evento.');

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad('Cuerpo de la solicitud inválido.');

  const sql = db();

  // Fetch the current row so we can merge absent fields.
  const existing = (await sql`
    SELECT id, title, venue_id, area, when_label, starts_at, price_usd,
           capacity, sold_seed, includes, blurb, is_current, published
      FROM nomadalingo.official_events
     WHERE id = ${id}
     LIMIT 1
  `) as unknown as OfficialEventRow[];
  if (!existing.length) return bad('Evento oficial no encontrado.', 404);

  const cur = existing[0];

  // ── resolve final values ──────────────────────────────────────────────
  const finalTitle = 'title' in body
    ? JSON.stringify(body.title && typeof body.title === 'object' ? body.title : cur.title)
    : JSON.stringify(cur.title);

  // If venueId changes, re-derive area from the new venue.
  let finalVenueId = cur.venue_id;
  let finalArea    = cur.area;
  if ('venueId' in body) {
    const v = str(body.venueId, 64);
    if (!v) return bad('El venueId no es válido.');
    const venue = (await sql`
      SELECT id, area FROM nomadalingo.venues WHERE id = ${v} LIMIT 1
    `) as unknown as { id: string; area: string }[];
    if (!venue.length) return bad('El lugar indicado no existe.', 422);
    finalVenueId = venue[0].id;
    finalArea    = venue[0].area;
  }

  let finalStartsAt = cur.starts_at;
  if ('startsAt' in body) {
    const v = str(body.startsAt, 40);
    if (!v || Number.isNaN(Date.parse(v))) return bad('La fecha de inicio es inválida.');
    finalStartsAt = v;
  }

  let finalPriceUsd = parseFloat(cur.price_usd);
  if ('priceUsd' in body) {
    const v = num(body.priceUsd, 0, 99999);
    if (v === null) return bad('El precio debe ser un número entre 0 y 99999.');
    finalPriceUsd = v;
  }

  let finalCapacity = cur.capacity;
  if ('capacity' in body) {
    const v = num(body.capacity, 1, 100000);
    if (v === null) return bad('La capacidad debe ser un número positivo.');
    finalCapacity = v;
  }

  let finalSoldSeed = cur.sold_seed;
  if ('soldSeed' in body) {
    const v = num(body.soldSeed, 0, 100000);
    if (v === null) return bad('soldSeed debe ser un número entre 0 y 100000.');
    finalSoldSeed = v;
  }

  const finalIsCurrent = 'isCurrent' in body ? body.isCurrent === true : cur.is_current;
  const finalPublished  = 'published'  in body ? body.published !== false : cur.published;

  const finalWhenLabel = 'whenLabel' in body
    ? JSON.stringify(body.whenLabel && typeof body.whenLabel === 'object' ? body.whenLabel : cur.when_label)
    : JSON.stringify(cur.when_label);

  const finalIncludes = 'includes' in body
    ? JSON.stringify(Array.isArray(body.includes) ? body.includes : cur.includes)
    : JSON.stringify(cur.includes);

  const finalBlurb = 'blurb' in body
    ? JSON.stringify(body.blurb && typeof body.blurb === 'object' ? body.blurb : cur.blurb)
    : JSON.stringify(cur.blurb);

  // ── enforce single is_current ─────────────────────────────────────────
  // Clear all others before setting this one — even if it was already current
  // (idempotent and safe).
  if (finalIsCurrent) {
    await sql`
      UPDATE nomadalingo.official_events
         SET is_current = false
       WHERE is_current = true
         AND id != ${id}
    `;
  }

  const rows = await sql`
    UPDATE nomadalingo.official_events
       SET title      = ${finalTitle}::jsonb,
           venue_id   = ${finalVenueId},
           area       = ${finalArea},
           when_label = ${finalWhenLabel}::jsonb,
           starts_at  = ${finalStartsAt},
           price_usd  = ${finalPriceUsd},
           capacity   = ${finalCapacity},
           sold_seed  = ${finalSoldSeed},
           includes   = ${finalIncludes}::jsonb,
           blurb      = ${finalBlurb}::jsonb,
           is_current = ${finalIsCurrent},
           published  = ${finalPublished},
           updated_at = now()
     WHERE id = ${id}
     RETURNING id, title, venue_id AS "venueId", area,
               when_label AS "whenLabel",
               to_char(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt",
               price_usd::float8 AS "priceUsd", capacity, sold_seed AS "soldSeed",
               includes, blurb, is_current AS "isCurrent", published,
               to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
  `;

  return ok((rows as unknown as unknown[])[0]);
});

export const DELETE = handler(async (req: Request, params?: Record<string, string>) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const id = params?.id;
  if (!id) return bad('Falta el identificador del evento.');

  const sql = db();

  // ── refuse if tickets exist for this event ────────────────────────────
  const ticketCheck = (await sql`
    SELECT count(*)::int AS n FROM nomadalingo.tickets WHERE event_id = ${id}
  `) as unknown as { n: number }[];

  const ticketCount = ticketCheck[0]?.n ?? 0;
  if (ticketCount > 0) {
    return bad(
      `No se puede eliminar este evento porque tiene ${ticketCount} boleto${ticketCount !== 1 ? 's' : ''} vendido${ticketCount !== 1 ? 's' : ''}. Cancela o mueve los boletos primero.`,
      409,
    );
  }

  const existing = (await sql`
    SELECT id FROM nomadalingo.official_events WHERE id = ${id} LIMIT 1
  `) as unknown as { id: string }[];
  if (!existing.length) return bad('Evento oficial no encontrado.', 404);

  await sql`DELETE FROM nomadalingo.official_events WHERE id = ${id}`;

  return ok({ ok: true });
});
