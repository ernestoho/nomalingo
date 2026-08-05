import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  const rows = await sql`
    SELECT email, name, role, onboarded,
           profile->>'area' AS area,
           profile->'interests' AS interests,
           profile->'availability' AS availability,
           profile->'learning' AS learning
      FROM nomadalingo.users ORDER BY created_at DESC LIMIT 5`;
  console.table(rows);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
