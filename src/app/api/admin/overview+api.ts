/**
 * GET /api/admin/overview
 *
 * Business metrics dashboard in a single round-trip. Every figure is a real
 * count or sum from the database — no placeholders, no estimates.
 */

import { handler, ok, requireAdmin } from '../../../server/http';
import { db } from '../../../server/db';

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const sql = db();

  const [
    totalsRows,
    signupRows,
    revenueRows,
    topVenuesRows,
    topMeetupsRows,
    currentEventRows,
    recentUsersRows,
  ] = await Promise.all([
    // ── totals ──────────────────────────────────────────────────────────
    sql`
      SELECT
        (SELECT count(*)::int FROM nomadalingo.users)                          AS "userCount",
        (SELECT count(*)::int FROM nomadalingo.memberships WHERE until > now()) AS "memberCount",
        (SELECT count(*)::int FROM nomadalingo.tickets)                         AS "ticketCount",
        (SELECT coalesce(sum(usd_paid), 0)::float8 FROM nomadalingo.tickets)    AS "revenue",
        (SELECT count(*)::int FROM nomadalingo.meetups)                         AS "meetupCount",
        (SELECT count(*)::int FROM nomadalingo.venues)                          AS "venueCount"
    `,

    // ── signups last 14 days, one row per day including zero days ────────
    sql`
      SELECT
        to_char(d.day, 'YYYY-MM-DD') AS day,
        count(u.id)::int              AS count
      FROM generate_series(
             (now() AT TIME ZONE 'UTC')::date - 13,
             (now() AT TIME ZONE 'UTC')::date,
             '1 day'::interval
           ) AS d(day)
      LEFT JOIN nomadalingo.users u
             ON u.created_at::date = d.day
      GROUP BY d.day
      ORDER BY d.day
    `,

    // ── revenue last 14 days ─────────────────────────────────────────────
    sql`
      SELECT
        to_char(d.day, 'YYYY-MM-DD')           AS day,
        coalesce(sum(t.usd_paid), 0)::float8   AS count
      FROM generate_series(
             (now() AT TIME ZONE 'UTC')::date - 13,
             (now() AT TIME ZONE 'UTC')::date,
             '1 day'::interval
           ) AS d(day)
      LEFT JOIN nomadalingo.tickets t
             ON t.created_at::date = d.day
      GROUP BY d.day
      ORDER BY d.day
    `,

    // ── top 5 venues by meetup count ─────────────────────────────────────
    sql`
      SELECT v.id, v.name, v.area,
             count(m.id)::int AS meetups
        FROM nomadalingo.venues v
        LEFT JOIN nomadalingo.meetups m ON m.venue_id = v.id
       GROUP BY v.id, v.name, v.area
       ORDER BY meetups DESC, v.name
       LIMIT 5
    `,

    // ── top 5 upcoming meetups by RSVP count ─────────────────────────────
    sql`
      SELECT m.id,
             m.title,
             (m.going + (SELECT count(*) FROM nomadalingo.rsvps r WHERE r.meetup_id = m.id))::int AS going,
             m.capacity,
             to_char(m.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "startsAt"
        FROM nomadalingo.meetups m
       WHERE m.starts_at >= now()
       ORDER BY going DESC, m.starts_at
       LIMIT 5
    `,

    // ── current official event ────────────────────────────────────────────
    sql`
      SELECT e.id,
             e.title,
             e.capacity,
             (e.sold_seed + (SELECT count(*) FROM nomadalingo.tickets t WHERE t.event_id = e.id))::int AS sold,
             (SELECT coalesce(sum(t.usd_paid), 0)::float8 FROM nomadalingo.tickets t WHERE t.event_id = e.id) AS revenue
        FROM nomadalingo.official_events e
       WHERE e.is_current
       LIMIT 1
    `,

    // ── 8 most recent users (never return password_hash) ─────────────────
    sql`
      SELECT id, name, email, role,
             to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"
        FROM nomadalingo.users
       ORDER BY created_at DESC
       LIMIT 8
    `,
  ]);

  const t = (totalsRows as unknown as {
    userCount: number;
    memberCount: number;
    ticketCount: number;
    revenue: number;
    meetupCount: number;
    venueCount: number;
  }[])[0];

  return ok({
    totals: {
      users: t.userCount,
      members: t.memberCount,
      tickets: t.ticketCount,
      revenue: t.revenue,
      meetups: t.meetupCount,
      venues: t.venueCount,
    },
    signupsLast14Days: signupRows,
    revenueLast14Days: revenueRows,
    topVenues: topVenuesRows,
    topMeetups: topMeetupsRows,
    currentEvent: (currentEventRows as unknown as unknown[])[0] ?? null,
    recentUsers: recentUsersRows,
  });
});
