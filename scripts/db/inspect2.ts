/** Column-level fingerprint, to tell my tables apart from pre-existing ones. */
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

async function main() {
  for (const t of ['users', 'sessions', 'meetups', 'venues', 'auth_attempts', 'posts']) {
    const cols = await sql`
      SELECT column_name, data_type
        FROM information_schema.columns
       WHERE table_schema='public' AND table_name=${t}
       ORDER BY ordinal_position`;
    if (!(cols as unknown[]).length) { console.log(`public.${t}: (absent)`); continue; }
    console.log(`\npublic.${t}:`);
    console.log('  ' + (cols as { column_name: string; data_type: string }[])
      .map((c) => `${c.column_name}:${c.data_type}`).join(', '));
  }
  console.log('\n--- public.users sample (no secrets printed) ---');
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='users'`;
  const names = (cols as { column_name: string }[]).map((c) => c.column_name);
  const safe = names.filter((n) => !/pass|secret|token|hash/i.test(n)).slice(0, 6);
  if (safe.length) {
    const r = await sql.query(`SELECT ${safe.map((s) => `"${s}"`).join(',')} FROM public.users LIMIT 2`);
    console.table(r);
  }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
