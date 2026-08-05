/** Undo the propagation test rename. The trigger bumps content_version. */
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  await sql`UPDATE nomadalingo.venues SET name = 'Kat''s Corner', updated_at = now() WHERE id = 'kats'`;
  const r = await sql`SELECT name FROM nomadalingo.venues WHERE id='kats'`;
  const v = await sql`SELECT version::text AS v FROM nomadalingo.content_version WHERE id=1`;
  console.log('name restored to:', (r as {name:string}[])[0].name);
  console.log('content version:', (v as {v:string}[])[0].v);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
