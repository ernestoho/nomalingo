/**
 * GET /api/me/state
 *
 * Everything specific to the signed-in member: profile, RSVPs, membership,
 * tickets and saved phrases. Fetched once at launch and after any sync.
 */

import { handler, ok, requireUser } from '../../../server/http';
import { db } from '../../../server/db';

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const sql = db();
  const [rsvps, membership, tickets, phrases] = await Promise.all([
    sql`SELECT meetup_id FROM nomadalingo.rsvps WHERE user_id = ${user.id}`,
    sql`
      SELECT plan,
             to_char(until AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS until,
             to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startedAt"
        FROM nomadalingo.memberships WHERE user_id = ${user.id} LIMIT 1
    `,
    sql`
      SELECT id, event_id AS "eventId", kind, usd_paid::float8 AS "usdPaid",
             qr_payload AS "qrPayload",
             to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "boughtAt"
        FROM nomadalingo.tickets WHERE user_id = ${user.id} ORDER BY created_at DESC
    `,
    sql`
      SELECT wrong, right_text AS "right", why,
             to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "savedAt"
        FROM nomadalingo.phrases WHERE user_id = ${user.id} ORDER BY created_at DESC
    `,
  ]);

  return ok({
    profile: user.profile,
    onboarded: user.onboarded,
    role: user.role,
    rsvps: (rsvps as unknown as { meetup_id: string }[]).map((r) => r.meetup_id),
    membership: (membership as unknown as unknown[])[0] ?? null,
    tickets,
    phrases,
  });
});
