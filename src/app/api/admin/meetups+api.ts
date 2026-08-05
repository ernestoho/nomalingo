/**
 * GET  /api/admin/meetups  — list all meetups, newest first, with venue name and real RSVP count
 * POST /api/admin/meetups  — create a meetup
 */

import { bad, handler, ok, readJson, requireAdmin, str, num } from '../../../server/http';
import { db } from '../../../server/db';
import { newId } from '../../../server/crypto';

const VALID_CATEGORIES = ['Café', 'Coworking', 'Playa', 'Bachata', 'Networking'] as const;

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const sql = db();

  const rows = await sql`
    SELECT m.id, m.category, m.title, m.venue_id AS "venueId",
           v.name AS "venueName",
           m.area,
           m.when_label AS "whenLabel",
           to_char(m.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt",
           m.capacity, m.languages, m.description, m.published,
           (m.going + (SELECT count(*) FROM nomadalingo.rsvps r WHERE r.meetup_id = m.id))::int AS going,
           to_char(m.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
           to_char(m.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
      FROM nomadalingo.meetups m
      JOIN nomadalingo.venues v ON v.id = m.venue_id
     ORDER BY m.created_at DESC
  `;

  return ok(rows);
});

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad('Cuerpo de la solicitud inválido.');

  // ── validate ─────────────────────────────────────────────────────────────
  const category = str(body.category, 32);
  if (!category || !(VALID_CATEGORIES as readonly string[]).includes(category)) {
    return bad(`La categoría debe ser una de: ${VALID_CATEGORIES.join(', ')}.`);
  }

  const title = body.title as { es?: string; en?: string } | undefined;
  if (!title || (!title.es && !title.en)) return bad('Falta el título (es o en).');

  const venueId = str(body.venueId, 64);
  if (!venueId) return bad('El lugar (venueId) es obligatorio.');

  const startsAt = str(body.startsAt, 40);
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) return bad('La fecha de inicio es inválida.');

  const capacity = num(body.capacity, 2, 500);
  if (capacity === null) return bad('La capacidad debe ser un número entre 2 y 500.');

  const whenLabel = body.whenLabel as { es?: string; en?: string } | undefined;
  const description = body.description as { es?: string; en?: string } | undefined;
  const languages = Array.isArray(body.languages) ? body.languages : [];
  const id = str(body.id, 64) ?? newId('mup');
  const published = body.published !== false;

  const sql = db();

  // Venue must exist — area is derived from it, never accepted from client.
  const venue = (await sql`
    SELECT id, area FROM nomadalingo.venues WHERE id = ${venueId} LIMIT 1
  `) as unknown as { id: string; area: string }[];
  if (!venue.length) return bad('El lugar indicado no existe.', 422);

  const area = venue[0].area;

  const rows = await sql`
    INSERT INTO nomadalingo.meetups
      (id, category, title, venue_id, area, when_label, starts_at,
       going, capacity, languages, attendees, description, published)
    VALUES (
      ${id},
      ${category},
      ${JSON.stringify(title)}::jsonb,
      ${venueId},
      ${area},
      ${JSON.stringify(whenLabel ?? { es: '', en: '' })}::jsonb,
      ${startsAt},
      0,
      ${capacity},
      ${JSON.stringify(languages)}::jsonb,
      '[]'::jsonb,
      ${JSON.stringify(description ?? { es: '', en: '' })}::jsonb,
      ${published}
    )
    RETURNING id, category, title, venue_id AS "venueId", area,
              when_label AS "whenLabel",
              to_char(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt",
              capacity, languages, description, published,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
  `;

  return ok((rows as unknown as unknown[])[0], { status: 201 });
});
