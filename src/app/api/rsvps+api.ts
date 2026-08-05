/**
 * POST /api/rsvps  { meetupId, going }
 *
 * Idempotent in both directions: joining twice is still one row, leaving twice
 * is still gone. That matters because the offline outbox can legitimately
 * replay a queued write after a flaky reconnect.
 */

import { bad, handler, ok, readJson, requireUser, str } from '../../server/http';
import { db } from '../../server/db';

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await readJson<{ meetupId?: string; going?: boolean }>(req);
  const meetupId = str(body?.meetupId, 64);
  if (!meetupId) return bad('Falta el encuentro.');
  const going = body?.going !== false;

  const sql = db();

  const exists = (await sql`
    SELECT id, capacity, going FROM nomadalingo.meetups WHERE id = ${meetupId} LIMIT 1
  `) as unknown as { id: string; capacity: number; going: number }[];
  if (!exists.length) return bad('Ese encuentro ya no existe.', 404);

  if (going) {
    await sql`
      INSERT INTO nomadalingo.rsvps (user_id, meetup_id)
      VALUES (${user.id}, ${meetupId})
      ON CONFLICT (user_id, meetup_id) DO NOTHING
    `;
  } else {
    await sql`
      DELETE FROM nomadalingo.rsvps WHERE user_id = ${user.id} AND meetup_id = ${meetupId}
    `;
  }

  const counted = (await sql`
    SELECT (m.going + (SELECT count(*) FROM nomadalingo.rsvps r WHERE r.meetup_id = m.id))::int AS going
      FROM nomadalingo.meetups m WHERE m.id = ${meetupId}
  `) as unknown as { going: number }[];

  return ok({ ok: true, going, count: counted[0]?.going ?? 0 });
});
