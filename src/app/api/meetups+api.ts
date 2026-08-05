/**
 * POST /api/meetups
 *
 * Member-created meetups. The venue must exist in the directory — there is no
 * free-text location anywhere in this system, which is what keeps sponsor
 * discounts enforceable and stops anyone publishing a home address.
 *
 * The client supplies the id so a meetup created offline keeps its identity
 * when the outbox flushes.
 */

import { bad, handler, ok, num, readJson, requireUser, str } from '../../server/http';
import { db } from '../../server/db';

const CATEGORIES = ['Café', 'Coworking', 'Playa', 'Bachata', 'Networking'];

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad('Solicitud inválida.');

  const id = str(body.id, 64) ?? `u_${Date.now().toString(36)}`;
  const category = str(body.category, 32);
  const venueId = str(body.venueId, 64);
  const startsAt = str(body.startsAt, 40);
  const capacity = num(body.capacity, 2, 500);

  if (!category || !CATEGORIES.includes(category)) return bad('Categoría inválida.', 422);
  if (!venueId) return bad('Tienes que elegir un lugar del directorio.', 422);
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) return bad('Fecha inválida.', 422);
  if (!capacity) return bad('Capacidad inválida.', 422);

  const title = body.title as { es?: string; en?: string } | undefined;
  if (!title?.es && !title?.en) return bad('Falta el título.', 422);

  const sql = db();

  const venue = (await sql`
    SELECT id, area FROM nomadalingo.venues WHERE id = ${venueId} AND published LIMIT 1
  `) as unknown as { id: string; area: string }[];
  if (!venue.length) return bad('Ese lugar no está en el directorio.', 422);

  // Area is derived from the venue, never accepted from the client.
  const area = venue[0].area;

  await sql`
    INSERT INTO nomadalingo.meetups
      (id, category, title, venue_id, area, when_label, starts_at, going, capacity,
       languages, attendees, description, host_id, created_by)
    VALUES
      (${id}, ${category}, ${JSON.stringify(title)}::jsonb, ${venueId}, ${area},
       ${JSON.stringify(body.when ?? { es: '', en: '' })}::jsonb, ${startsAt},
       0, ${capacity},
       ${JSON.stringify(body.languages ?? [])}::jsonb,
       '[]'::jsonb,
       ${JSON.stringify(body.description ?? { es: '', en: '' })}::jsonb,
       null, ${user.id})
    ON CONFLICT (id) DO NOTHING
  `;

  // Creating a meetup implies attending it.
  await sql`
    INSERT INTO nomadalingo.rsvps (user_id, meetup_id) VALUES (${user.id}, ${id})
    ON CONFLICT DO NOTHING
  `;

  return ok({ ok: true, id });
});
