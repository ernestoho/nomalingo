/**
 * Remove tables this project accidentally created in `public`.
 *
 * Context: an earlier migration relied on `SET search_path`, which does not
 * persist across the Neon HTTP driver's per-statement sessions, so three
 * tables landed in `public` instead of `nomadalingo`.
 *
 * This is deliberately paranoid. A table is only dropped when ALL of:
 *   1. it is on the explicit allow-list below,
 *   2. it currently holds zero rows,
 *   3. its column signature matches this project's schema exactly.
 *
 * The pre-existing `users`, `meetups` and `posts` tables in `public` belong to
 * an earlier prototype and carry different signatures, so they can never match
 * and are never touched. Nothing is dropped unless --apply is passed.
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const APPLY = process.argv.includes('--apply');

/** Exact expected signatures for the tables this project owns. */
const EXPECTED: Record<string, string[]> = {
  sessions: ['token_hash', 'user_id', 'created_at', 'expires_at', 'user_agent'],
  venues: ['id', 'name', 'type', 'area', 'rating', 'sponsor_deal', 'amenities',
           'blurb', 'photo_seed', 'published', 'sort_order', 'created_at', 'updated_at'],
  auth_attempts: ['id', 'key', 'at', 'ok'],
};

async function main() {
  for (const [table, expected] of Object.entries(EXPECTED)) {
    const cols = (await sql`
      SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name=${table}
       ORDER BY ordinal_position`) as unknown as { column_name: string }[];

    if (!cols.length) { console.log(`public.${table}: absent — nothing to do`); continue; }

    const actual = cols.map((c) => c.column_name);
    const matches =
      actual.length === expected.length && actual.every((c, i) => c === expected[i]);

    const cnt = (await sql.query(
      `SELECT count(*)::int AS n FROM public."${table}"`,
    )) as unknown as { n: number }[];
    const rows = cnt[0].n;

    if (!matches) {
      console.log(`public.${table}: SKIP — signature differs, not ours`);
      console.log(`   found:    ${actual.join(', ')}`);
      continue;
    }
    if (rows !== 0) {
      console.log(`public.${table}: SKIP — holds ${rows} row(s), refusing to drop`);
      continue;
    }

    if (APPLY) {
      await sql.query(`DROP TABLE public."${table}"`);
      console.log(`public.${table}: DROPPED (empty, signature matched)`);
    } else {
      console.log(`public.${table}: would drop (empty, signature matched)`);
    }
  }

  const left = (await sql`
    SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`) as unknown as
    { table_name: string }[];
  console.log('\npublic now contains:', left.map((t) => t.table_name).join(', ') || '(nothing)');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
