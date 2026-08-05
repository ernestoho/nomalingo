/**
 * PUT    /api/admin/meetups/[id]  — partial update a meetup
 * DELETE /api/admin/meetups/[id]  — delete a meetup (RSVPs cascade via schema)
 */

import { bad, handler, ok, readJson, requireAdmin, str, num } from '../../../../server/http';
import { db } from '../../../../server/db';

const VALID_CATEGORIES = ['Café', 'Coworking', 'Playa', 'Bachata', 'Networking'] as const;

type MeetupRow = {
  id: string;
  category: string;
  title: unknown;
  venue_id: string;
  area: string;
  when_label: unknown;
  starts_at: string;
  going: number;
  capacity: number;
  languages: unknown;
  description: unknown;
  published: boolean;
};

export const PUT = handler(async (req: Request, params?: Record<string, string>) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const id = params?.id;
  if (!id) return bad('Falta el identificador del encuentro.');

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad('Cuerpo de la solicitud inválido.');

  const sql = db();

  // Fetch the current row so we can merge absent fields.
  const existing = (await sql`
    SELECT id, category, title, venue_id, area, when_label, starts_at,
           going, capacity, languages, description, published
      FROM nomadalingo.meetups
     WHERE id = ${id}
     LIMIT 1
  `) as unknown as MeetupRow[];
  if (!existing.length) return bad('Encuentro no encontrado.', 404);

  const cur = existing[0];

  // ── resolve final values ──────────────────────────────────────────────
  let finalCategory = cur.category;
  if ('category' in body) {
    const v = str(body.category, 32);
    if (!v || !(VALID_CATEGORIES as readonly string[]).includes(v)) {
      return bad(`La categoría debe ser una de: ${VALID_CATEGORIES.join(', ')}.`);
    }
    finalCategory = v;
  }

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

  let finalCapacity = cur.capacity;
  if ('capacity' in body) {
    const v = num(body.capacity, 2, 500);
    if (v === null) return bad('La capacidad debe ser un número entre 2 y 500.');
    finalCapacity = v;
  }

  const finalPublished = 'published' in body ? body.published !== false : cur.published;

  const finalWhenLabel = 'whenLabel' in body
    ? JSON.stringify(body.whenLabel && typeof body.whenLabel === 'object' ? body.whenLabel : cur.when_label)
    : JSON.stringify(cur.when_label);

  const finalLanguages = 'languages' in body
    ? JSON.stringify(Array.isArray(body.languages) ? body.languages : cur.languages)
    : JSON.stringify(cur.languages);

  const finalDescription = 'description' in body
    ? JSON.stringify(body.description && typeof body.description === 'object' ? body.description : cur.description)
    : JSON.stringify(cur.description);

  const rows = await sql`
    UPDATE nomadalingo.meetups
       SET category    = ${finalCategory},
           title       = ${finalTitle}::jsonb,
           venue_id    = ${finalVenueId},
           area        = ${finalArea},
           when_label  = ${finalWhenLabel}::jsonb,
           starts_at   = ${finalStartsAt},
           capacity    = ${finalCapacity},
           languages   = ${finalLanguages}::jsonb,
           description = ${finalDescription}::jsonb,
           published   = ${finalPublished},
           updated_at  = now()
     WHERE id = ${id}
     RETURNING id, category, title, venue_id AS "venueId", area,
               when_label AS "whenLabel",
               to_char(starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt",
               capacity, languages, description, published,
               to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
  `;

  return ok((rows as unknown as unknown[])[0]);
});

export const DELETE = handler(async (req: Request, params?: Record<string, string>) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const id = params?.id;
  if (!id) return bad('Falta el identificador del encuentro.');

  const sql = db();

  // Confirm it exists before attempting delete (friendly 404 vs silent no-op).
  const existing = (await sql`
    SELECT id FROM nomadalingo.meetups WHERE id = ${id} LIMIT 1
  `) as unknown as { id: string }[];
  if (!existing.length) return bad('Encuentro no encontrado.', 404);

  // RSVPs cascade via ON DELETE CASCADE — no manual cleanup needed.
  await sql`DELETE FROM nomadalingo.meetups WHERE id = ${id}`;

  return ok({ ok: true });
});
