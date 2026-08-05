/** Read-only inventory of what exists, before deciding anything destructive. */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const tables = await sql`
    SELECT table_schema, table_name
      FROM information_schema.tables
     WHERE table_schema IN ('public','nomadalingo') AND table_type='BASE TABLE'
     ORDER BY table_schema, table_name`;
  console.log('tables:');
  console.table(tables);

  // Row counts tell us whether anything in public predates tonight.
  for (const t of tables as { table_schema: string; table_name: string }[]) {
    const r = await sql.query(
      `SELECT count(*)::int AS n FROM "${t.table_schema}"."${t.table_name}"`,
    );
    console.log(`  ${t.table_schema}.${t.table_name}: ${(r as { n: number }[])[0].n} rows`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
