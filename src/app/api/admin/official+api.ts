/**
 * GET  /api/admin/official  — list all official events with real sold counts and revenue
 * POST /api/admin/official  — create an official event
 *
 * CRITICAL: exactly one official event may have is_current = true.
 * When creating or updating one to is_current, all other rows are cleared first.
 */

import { bad, handler, ok, readJson, requireAdmin, str, num } from '../../../server/http';
import { db } from '../../../server/db';
import { newId } from '../../../server/crypto';

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const sql = db();

  const rows = await sql`
    SELECT e.id, e.title, e.venue_id AS "venueId",
           v.name AS "venueName",
           e.area, e.when_label AS "whenLabel",
           to_char(e.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt",
           e.price_usd::float8 AS "priceUsd",
           e.capacity,
           e.sold_seed AS "soldSeed",
           e.includes, e.blurb,
           e.is_current AS "isCurrent",
           e.published,
           (e.sold_seed + (SELECT count(*) FROM nomadalingo.tickets t WHERE t.event_id = e.id))::int AS sold,
           (SELECT coalesce(sum(t.usd_paid), 0)::float8 FROM nomadalingo.tickets t WHERE t.event_id = e.id) AS revenue,
           to_char(e.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
           to_char(e.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
      FROM nomadalingo.official_events e
      JOIN nomadalingo.venues v ON v.id = e.venue_id
     ORDER BY e.starts_at DESC
  `;

  return ok(rows);
});

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad('Cuerpo de la solicitud inválido.');

  // ── validate ─────────────────────────────────────────────────────────────
  const title = body.title as { es?: string; en?: string } | undefined;
  if (!title || (!title.es && !title.en)) return bad('Falta el título (es o en).');

  const venueId = str(body.venueId, 64);
  if (!venueId) return bad('El lugar (venueId) es obligatorio.');

  const startsAt = str(body.startsAt, 40);
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) return bad('La fecha de inicio es inválida.');

  const priceUsd = num(body.priceUsd, 0, 99999);
  if (priceUsd === null) return bad('El precio debe ser un número entre 0 y 99999.');

  const capacity = num(body.capacity, 1, 100000);
  if (capacity === null) return bad('La capacidad debe ser un número positivo.');

  const soldSeed = num(body.soldSeed ?? 0, 0, 100000) ?? 0;
  const isCurrent = body.isCurrent === true;
  const published = body.published !== false;

  const whenLabel  = body.whenLabel  as { es?: string; en?: string } | undefined;
  const includes   = Array.isArray(body.includes) ? body.includes : (body.includes ?? []);
  const blurb      = body.blurb && typeof body.blurb === 'object' ? body.blurb : {};
  const id         = str(body.id, 64) ?? newId('evt');

  const sql = db();

  // Venue must exist; area is derived from it.
  const venue = (await sql`
    SELECT id, area FROM nomadalingo.venues WHERE id = ${venueId} LIMIT 1
  `) as unknown as { id: string; area: string }[];
  if (!venue.length) return bad('El lugar indicado no existe.', 422);

  const area = venue[0].area;

  // ── enforce single is_current ─────────────────────────────────────────
  if (isCurrent) {
    await sql`
      UPDATE nomadalingo.official_events SET is_current = false WHERE is_current = true
    `;
  }

  const rows = await sql`
    INSERT INTO nomadalingo.official_events
      (id, title, venue_id, area, when_label, starts_at, price_usd,
       capacity, sold_seed, includes, blurb, is_current, published)
    VALUES (
      ${id},
      ${JSON.stringify(title)}::jsonb,
      ${venueId},
      ${area},
      ${JSON.stringify(whenLabel ?? { es: '', en: '' })}::jsonb,
      ${startsAt},
      ${priceUsd},
      ${capacity},
      ${soldSeed},
      ${JSON.stringify(includes)}::jsonb,
      ${JSON.stringify(blurb)}::jsonb,
      ${isCurrent},
      ${published}
    )
    RETURNING id, title, venue_id AS "venueId", area,
              when_label AS "whenLabel",
              to_char(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt",
              price_usd::float8 AS "priceUsd", capacity, sold_seed AS "soldSeed",
              includes, blurb, is_current AS "isCurrent", published,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
  `;

  return ok((rows as unknown as unknown[])[0], { status: 201 });
});
