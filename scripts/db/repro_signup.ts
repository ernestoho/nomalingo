import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);

const profile = { name: 'Prueba', email: 'x@y.z', interests: [], learning: [{ code: 'ES', level: 'A2' }] };

async function main() {
  const id = 'usr_test_' + Date.now().toString(36);
  try {
    console.log('1. insert user...');
    await sql`
      INSERT INTO nomadalingo.users (id, email, name, password_hash, role, profile, onboarded)
      VALUES (${id}, ${id + '@t.co'}, ${'Prueba'}, ${'pbkdf2$1$a$b'}, ${'member'},
              ${JSON.stringify(profile)}::jsonb, false)`;
    console.log('   ok');

    console.log('2. insert session with interval...');
    await sql`
      INSERT INTO nomadalingo.sessions (token_hash, user_id, expires_at, user_agent)
      VALUES (${'hash_' + id}, ${id}, now() + (${60} || ' days')::interval, ${'ua'})`;
    console.log('   ok');

    console.log('3. rate-limit select...');
    const r = await sql`
      SELECT count(*)::int AS n FROM nomadalingo.auth_attempts
       WHERE key = ${'k'} AND ok = false AND at > now() - (${15} || ' minutes')::interval`;
    console.log('   ok', r);
  } catch (e) {
    console.error('FAILED:', (e as Error).message);
  } finally {
    await sql`DELETE FROM nomadalingo.users WHERE id = ${id}`;
  }
}
main();
