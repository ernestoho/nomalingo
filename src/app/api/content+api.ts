/**
 * GET /api/content
 *
 * Everything the app renders that is not user-specific: venues, meetups, the
 * current official event and the membership plans, plus the content version.
 *
 * One call rather than four. On a phone the round trip dominates the payload,
 * and the app needs all of it before it can draw Home anyway.
 */

import { contentVersion, handler, ok } from '../../server/http';
import { db } from '../../server/db';

export const GET = handler(async () => {
  const sql = db();

  const [venues, meetups, official, plans, version] = await Promise.all([
    sql`
      SELECT id, name, type, area, rating::float8 AS rating,
             sponsor_deal AS "sponsorDeal", amenities, blurb, photo_seed AS "photoSeed"
        FROM nomadalingo.venues
       WHERE published
       ORDER BY sort_order, name
    `,
    sql`
      SELECT m.id, m.category, m.title, m.venue_id AS "venueId", m.area,
             m.when_label AS "when",
             to_char(m.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt",
             m.capacity, m.languages, m.attendees, m.description,
             m.host_id AS "hostId",
             (m.created_by IS NOT NULL) AS "userCreated",
             (m.going + (SELECT count(*) FROM nomadalingo.rsvps r WHERE r.meetup_id = m.id))::int AS going
        FROM nomadalingo.meetups m
       WHERE m.published
       ORDER BY m.starts_at
    `,
    sql`
      SELECT e.id, e.title, e.venue_id AS "venueId", e.area, e.when_label AS "when",
             to_char(e.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt",
             e.price_usd::float8 AS "priceUsd", e.capacity, e.includes, e.blurb,
             (e.sold_seed + (SELECT count(*) FROM nomadalingo.tickets t WHERE t.event_id = e.id))::int AS sold
        FROM nomadalingo.official_events e
       WHERE e.published AND e.is_current
       ORDER BY e.starts_at
       LIMIT 1
    `,
    sql`
      SELECT id, label, price_usd::float8 AS "priceUsd", days, note
        FROM nomadalingo.membership_plans
       WHERE active
       ORDER BY sort_order
    `,
    contentVersion(),
  ]);

  return ok({
    venues,
    meetups,
    official: (official as unknown as unknown[])[0] ?? null,
    plans,
    version,
  });
});
