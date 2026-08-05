/**
 * PUT    /api/admin/venues/[id]  — partial update a venue
 * DELETE /api/admin/venues/[id]  — delete a venue (refused if meetups or official events reference it)
 */

import { bad, handler, ok, readJson, requireAdmin, str, num } from '../../../../server/http';
import { db } from '../../../../server/db';

const VALID_TYPES = ['coworking', 'cafe', 'bar', 'beach', 'plaza'] as const;
const VALID_AREAS = [
  'Bávaro',
  'Verón',
  'Cap Cana',
  'Downtown Punta Cana',
  'Arena Gorda',
  'Uvero Alto',
  'Friusa',
  'Cabeza de Toro',
  'Higüey',
] as const;
const VALID_PHOTO_SEEDS = ['coworking', 'cafe', 'bar', 'beach', 'plaza'] as const;

type VenueRow = {
  id: string;
  name: string;
  type: string;
  area: string;
  rating: number | null;
  sponsor_deal: unknown;
  amenities: unknown;
  blurb: unknown;
  photo_seed: string;
  published: boolean;
  sort_order: number;
};

export const PUT = handler(async (req: Request, params?: Record<string, string>) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const id = params?.id;
  if (!id) return bad('Falta el identificador del lugar.');

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad('Cuerpo de la solicitud inválido.');

  const sql = db();

  // Fetch the current row so we can merge missing fields.
  const existing = (await sql`
    SELECT id, name, type, area, rating, sponsor_deal, amenities, blurb,
           photo_seed, published, sort_order
      FROM nomadalingo.venues
     WHERE id = ${id}
     LIMIT 1
  `) as unknown as VenueRow[];
  if (!existing.length) return bad('Lugar no encontrado.', 404);

  const cur = existing[0];

  // ── resolve final values, validating only what was supplied ──────────
  let finalName = cur.name;
  if ('name' in body) {
    const v = str(body.name, 120);
    if (!v || v.length < 2) return bad('El nombre debe tener entre 2 y 120 caracteres.');
    finalName = v;
  }

  let finalType = cur.type;
  if ('type' in body) {
    const v = str(body.type, 20);
    if (!v || !(VALID_TYPES as readonly string[]).includes(v)) {
      return bad(`El tipo debe ser uno de: ${VALID_TYPES.join(', ')}.`);
    }
    finalType = v;
  }

  let finalArea = cur.area;
  if ('area' in body) {
    const v = str(body.area, 80);
    if (!v || !(VALID_AREAS as readonly string[]).includes(v)) {
      return bad('El área debe ser una de las nueve zonas válidas.');
    }
    finalArea = v;
  }

  let finalRating: number | null = cur.rating;
  if ('rating' in body) {
    if (body.rating === null || body.rating === undefined) {
      finalRating = null;
    } else {
      const v = num(body.rating, 0, 5);
      if (v === null) return bad('La calificación debe ser un número entre 0 y 5.');
      finalRating = v;
    }
  }

  let finalPhotoSeed = cur.photo_seed;
  if ('photoSeed' in body) {
    const v = str(body.photoSeed, 20);
    if (!v || !(VALID_PHOTO_SEEDS as readonly string[]).includes(v)) {
      return bad(`photoSeed debe ser uno de: ${VALID_PHOTO_SEEDS.join(', ')}.`);
    }
    finalPhotoSeed = v;
  }

  const finalPublished  = 'published'  in body ? body.published !== false : cur.published;
  const finalSortOrder  = 'sortOrder'  in body ? (num(body.sortOrder, 0, 9999) ?? cur.sort_order) : cur.sort_order;

  const finalAmenities  = 'amenities'  in body
    ? JSON.stringify(Array.isArray(body.amenities) ? body.amenities : [])
    : JSON.stringify(cur.amenities);

  const finalBlurb      = 'blurb'      in body
    ? JSON.stringify(body.blurb && typeof body.blurb === 'object' ? body.blurb : {})
    : JSON.stringify(cur.blurb);

  // sponsor_deal is nullable jsonb. Keep existing when not in body.
  const hasSponsorDeal  = 'sponsorDeal' in body;
  const finalSponsorDeal = hasSponsorDeal
    ? (body.sponsorDeal !== null && body.sponsorDeal !== undefined
        ? JSON.stringify(body.sponsorDeal)
        : null)
    : (cur.sponsor_deal !== null ? JSON.stringify(cur.sponsor_deal) : null);

  const rows = await sql`
    UPDATE nomadalingo.venues
       SET name         = ${finalName},
           type         = ${finalType},
           area         = ${finalArea},
           rating       = ${finalRating},
           sponsor_deal = ${finalSponsorDeal}::jsonb,
           amenities    = ${finalAmenities}::jsonb,
           blurb        = ${finalBlurb}::jsonb,
           photo_seed   = ${finalPhotoSeed},
           published    = ${finalPublished},
           sort_order   = ${finalSortOrder},
           updated_at   = now()
     WHERE id = ${id}
     RETURNING id, name, type, area, rating::float8 AS rating,
               sponsor_deal AS "sponsorDeal", amenities, blurb,
               photo_seed AS "photoSeed", published, sort_order AS "sortOrder",
               to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
  `;

  return ok((rows as unknown as unknown[])[0]);
});

export const DELETE = handler(async (req: Request, params?: Record<string, string>) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const id = params?.id;
  if (!id) return bad('Falta el identificador del lugar.');

  const sql = db();

  // ── check for dependent rows before deleting ──────────────────────────
  const refs = (await sql`
    SELECT
      (SELECT count(*)::int FROM nomadalingo.meetups         WHERE venue_id = ${id}) AS meetups,
      (SELECT count(*)::int FROM nomadalingo.official_events WHERE venue_id = ${id}) AS events
  `) as unknown as { meetups: number; events: number }[];

  const { meetups, events } = refs[0];
  if (meetups > 0 || events > 0) {
    const parts: string[] = [];
    if (meetups > 0) parts.push(`${meetups} encuentro${meetups !== 1 ? 's' : ''}`);
    if (events  > 0) parts.push(`${events} evento${events !== 1 ? 's' : ''} oficial${events !== 1 ? 'es' : ''}`);
    return bad(
      `No se puede eliminar este lugar porque tiene ${parts.join(' y ')} asociado${parts.length > 1 ? 's' : ''}. Mueve o elimínalos primero.`,
      409,
    );
  }

  await sql`DELETE FROM nomadalingo.venues WHERE id = ${id}`;

  return ok({ ok: true });
});
