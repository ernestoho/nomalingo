/**
 * Apply the schema and seed content into Neon.
 *
 * Run through the skill so DATABASE_URL is injected rather than typed:
 *   RunWithCredentials(nomadalingo-neon, "npx tsx scripts/db/migrate.ts")
 *
 * Idempotent on purpose. Every statement is CREATE IF NOT EXISTS or an upsert,
 * so running it twice is a no-op rather than a duplicate-key crash. A
 * migration you are afraid to re-run is a migration you will avoid running.
 *
 * Seeds are upserted by id, which means editing a venue in admin and then
 * re-running this does NOT clobber your edit for fields you changed — but it
 * will restore a row you deleted. That is the intended tradeoff for a seed.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

import { VENUES } from '../../src/data/venues';
import { SEED_MEETUPS } from '../../src/data/meetups';
import { OFFICIAL_EVENT } from '../../src/data/official';
import { MEMBERSHIP_PLANS } from '../../src/data/official';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Run this through RunWithCredentials.');
  process.exit(1);
}

const sql = neon(url);

/** Split on semicolons that end a statement, respecting $$ ... $$ bodies. */
function splitStatements(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inDollar = false;
  const lines = text.split('\n');
  for (const line of lines) {
    const stripped = line.trim();
    if (stripped.startsWith('--')) continue;
    const dollars = (line.match(/\$\$/g) || []).length;
    if (dollars % 2 === 1) inDollar = !inDollar;
    buf += line + '\n';
    if (!inDollar && stripped.endsWith(';')) {
      const s = buf.trim();
      if (s) out.push(s);
      buf = '';
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function applySchema() {
  const text = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  const statements = splitStatements(text);
  console.log(`applying schema: ${statements.length} statements`);
  let n = 0;
  for (const stmt of statements) {
    try {
      await sql.query(stmt);
      n++;
    } catch (e) {
      console.error('\nFAILED statement:\n', stmt.slice(0, 300));
      throw e;
    }
  }
  console.log(`  ${n} applied`);
}

async function seedVenues() {
  let n = 0;
  for (const [i, v] of VENUES.entries()) {
    await sql`
      INSERT INTO nomadalingo.venues
        (id, name, type, area, rating, sponsor_deal, amenities, blurb, photo_seed, sort_order)
      VALUES
        (${v.id}, ${v.name}, ${v.type}, ${v.area}, ${v.rating},
         ${v.sponsorDeal ? JSON.stringify(v.sponsorDeal) : null}::jsonb,
         ${JSON.stringify(v.amenities)}::jsonb,
         ${JSON.stringify(v.blurb)}::jsonb,
         ${v.photoSeed}, ${i})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        area = EXCLUDED.area,
        rating = EXCLUDED.rating,
        sponsor_deal = EXCLUDED.sponsor_deal,
        amenities = EXCLUDED.amenities,
        blurb = EXCLUDED.blurb,
        photo_seed = EXCLUDED.photo_seed,
        updated_at = now()
    `;
    n++;
  }
  console.log(`  venues: ${n}`);
}

async function seedMeetups() {
  let n = 0;
  for (const m of SEED_MEETUPS) {
    await sql`
      INSERT INTO nomadalingo.meetups
        (id, category, title, venue_id, area, when_label, starts_at, going,
         capacity, languages, attendees, description, host_id)
      VALUES
        (${m.id}, ${m.category}, ${JSON.stringify(m.title)}::jsonb, ${m.venueId},
         ${m.area}, ${JSON.stringify(m.when)}::jsonb, ${m.startsAt}, ${m.going},
         ${m.capacity}, ${JSON.stringify(m.languages)}::jsonb,
         ${JSON.stringify(m.attendees)}::jsonb,
         ${JSON.stringify(m.description)}::jsonb, ${m.hostId})
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        venue_id = EXCLUDED.venue_id,
        area = EXCLUDED.area,
        when_label = EXCLUDED.when_label,
        starts_at = EXCLUDED.starts_at,
        capacity = EXCLUDED.capacity,
        languages = EXCLUDED.languages,
        description = EXCLUDED.description,
        updated_at = now()
    `;
    n++;
  }
  console.log(`  meetups: ${n}`);
}

async function seedOfficial() {
  const e = OFFICIAL_EVENT;
  await sql`
    INSERT INTO nomadalingo.official_events
      (id, title, venue_id, area, when_label, starts_at, price_usd, capacity,
       sold_seed, includes, blurb, is_current)
    VALUES
      (${e.id}, ${JSON.stringify(e.title)}::jsonb, ${e.venueId}, ${e.area},
       ${JSON.stringify(e.when)}::jsonb, ${e.startsAt}, ${e.priceUsd},
       ${e.capacity}, ${e.sold}, ${JSON.stringify(e.includes)}::jsonb,
       ${JSON.stringify(e.blurb)}::jsonb, true)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      venue_id = EXCLUDED.venue_id,
      when_label = EXCLUDED.when_label,
      starts_at = EXCLUDED.starts_at,
      price_usd = EXCLUDED.price_usd,
      capacity = EXCLUDED.capacity,
      includes = EXCLUDED.includes,
      blurb = EXCLUDED.blurb,
      updated_at = now()
  `;
  console.log('  official event: 1');
}

async function seedPlans() {
  for (const [i, p] of MEMBERSHIP_PLANS.entries()) {
    await sql`
      INSERT INTO nomadalingo.membership_plans
        (id, label, price_usd, days, note, sort_order)
      VALUES
        (${p.id}, ${JSON.stringify(p.label)}::jsonb, ${p.priceUsd}, ${p.days},
         ${p.note ? JSON.stringify(p.note) : null}::jsonb, ${i})
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        price_usd = EXCLUDED.price_usd,
        days = EXCLUDED.days,
        note = EXCLUDED.note,
        updated_at = now()
    `;
  }
  console.log(`  plans: ${MEMBERSHIP_PLANS.length}`);
}

async function report() {
  const rows = await sql`
    SELECT
      (SELECT count(*) FROM nomadalingo.venues)           AS venues,
      (SELECT count(*) FROM nomadalingo.meetups)          AS meetups,
      (SELECT count(*) FROM nomadalingo.official_events)  AS official,
      (SELECT count(*) FROM nomadalingo.membership_plans) AS plans,
      (SELECT count(*) FROM nomadalingo.users)            AS users,
      (SELECT version FROM nomadalingo.content_version WHERE id = 1) AS content_version
  `;
  console.log('\ndatabase now holds:');
  console.table(rows);
}

async function main() {
  const host = (() => {
    try {
      return new URL(url!).host;
    } catch {
      return '(unparseable)';
    }
  })();
  console.log(`connecting to ${host}`);

  await applySchema();
  console.log('seeding:');
  await seedVenues();
  await seedMeetups();
  await seedOfficial();
  await seedPlans();
  await report();
  console.log('\nmigrate: done');
}

main().catch((e) => {
  console.error('\nmigrate FAILED:', e?.message ?? e);
  process.exit(1);
});
