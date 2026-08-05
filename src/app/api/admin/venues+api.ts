/**
 * GET  /api/admin/venues  — list ALL venues (including unpublished) with meetup count
 * POST /api/admin/venues  — create a venue
 */

import { bad, handler, ok, readJson, requireAdmin, str, num } from '../../../server/http';
import { db } from '../../../server/db';
import { newId } from '../../../server/crypto';

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

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const sql = db();

  const rows = await sql`
    SELECT v.id, v.name, v.type, v.area, v.rating::float8 AS rating,
           v.sponsor_deal AS "sponsorDeal", v.amenities, v.blurb,
           v.photo_seed AS "photoSeed", v.published, v.sort_order AS "sortOrder",
           to_char(v.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt",
           to_char(v.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt",
           count(m.id)::int AS "meetupCount"
      FROM nomadalingo.venues v
      LEFT JOIN nomadalingo.meetups m ON m.venue_id = v.id
     GROUP BY v.id
     ORDER BY v.sort_order, v.name
  `;

  return ok(rows);
});

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad('Cuerpo de la solicitud inválido.');

  // ── validate ─────────────────────────────────────────────────────────────
  const name = str(body.name, 120);
  if (!name || name.length < 2) return bad('El nombre es obligatorio (2–120 caracteres).');

  const type = str(body.type, 20);
  if (!type || !(VALID_TYPES as readonly string[]).includes(type)) {
    return bad(`El tipo debe ser uno de: ${VALID_TYPES.join(', ')}.`);
  }

  const area = str(body.area, 80);
  if (!area || !(VALID_AREAS as readonly string[]).includes(area)) {
    return bad('El área debe ser una de las nueve zonas válidas.');
  }

  const ratingRaw = body.rating;
  let rating: number | null = null;
  if (ratingRaw !== null && ratingRaw !== undefined) {
    rating = num(ratingRaw, 0, 5);
    if (rating === null) return bad('La calificación debe ser un número entre 0 y 5.');
  }

  const photoSeed = str(body.photoSeed, 20) ?? 'cafe';
  if (!(VALID_PHOTO_SEEDS as readonly string[]).includes(photoSeed)) {
    return bad(`photoSeed debe ser uno de: ${VALID_PHOTO_SEEDS.join(', ')}.`);
  }

  const id = str(body.id, 64) ?? newId('ven');
  const published = body.published !== false;
  const amenities = Array.isArray(body.amenities) ? body.amenities : [];
  const blurb = body.blurb && typeof body.blurb === 'object' ? body.blurb : {};
  // sponsor_deal is optional jsonb; null means no deal.
  const hasSponsorDeal = body.sponsorDeal !== null && body.sponsorDeal !== undefined;
  const sponsorDeal = hasSponsorDeal ? body.sponsorDeal : null;

  const sql = db();

  // Build the INSERT. For the nullable jsonb column we use a CASE expression
  // so that when the value is SQL NULL the cast is bypassed entirely.
  const rows = await sql`
    INSERT INTO nomadalingo.venues
      (id, name, type, area, rating, sponsor_deal, amenities, blurb, photo_seed, published)
    VALUES (
      ${id},
      ${name},
      ${type},
      ${area},
      ${rating},
      ${hasSponsorDeal ? JSON.stringify(sponsorDeal) : null}::jsonb,
      ${JSON.stringify(amenities)}::jsonb,
      ${JSON.stringify(blurb)}::jsonb,
      ${photoSeed},
      ${published}
    )
    RETURNING id, name, type, area, rating::float8 AS rating,
              sponsor_deal AS "sponsorDeal", amenities, blurb,
              photo_seed AS "photoSeed", published,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
  `;

  return ok((rows as unknown as unknown[])[0], { status: 201 });
});
