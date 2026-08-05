/**
 * POST /api/auth/signup
 *
 * Creates an account and returns a session token plus the user's state.
 *
 * Admin is granted by configuration, never by request: the role comes from
 * matching ADMIN_EMAIL on the server. A client cannot ask to be an admin.
 */

import { hashPassword, newSessionToken, hashToken, newId } from '../../../server/crypto';
import {
  bad,
  clientKey,
  email as parseEmail,
  handler,
  ok,
  password as parsePassword,
  readJson,
  recordAttempt,
  str,
  tooManyFailures,
} from '../../../server/http';
import { db } from '../../../server/db';

const SESSION_DAYS = 60;

export const POST = handler(async (req: Request) => {
  const body = await readJson(req);
  if (!body) return bad('Solicitud inválida.');

  const emailAddr = parseEmail(body.email);
  const pass = parsePassword(body.password);
  const name = str(body.name, 80) ?? '';

  if (!emailAddr) return bad('Ese correo no parece válido.', 422, { field: 'email' });
  if (!pass)
    return bad('La contraseña debe tener al menos 8 caracteres.', 422, { field: 'password' });

  const key = clientKey(req, 'signup');
  if (await tooManyFailures(key, 12, 60)) {
    return bad('Demasiados intentos. Espera un rato e inténtalo de nuevo.', 429);
  }

  const sql = db();

  const existing = (await sql`
    SELECT id FROM nomadalingo.users WHERE lower(email) = ${emailAddr} LIMIT 1
  `) as unknown as { id: string }[];

  if (existing.length) {
    await recordAttempt(key, false);
    return bad('Ya existe una cuenta con ese correo.', 409, { field: 'email' });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? '').toLowerCase().trim();
  const role = adminEmail && emailAddr === adminEmail ? 'admin' : 'member';

  const id = newId('usr');
  const passwordHash = await hashPassword(pass);

  // The profile the app already understands. Onboarding fills the rest.
  const profile = {
    name,
    email: emailAddr,
    age: '25–34',
    nationality: '',
    flag: '🌎',
    kind: 'visitor',
    native: 'EN',
    extra: [],
    learning: [{ code: 'ES', level: 'A2' }],
    interests: [],
    area: 'Bávaro',
    availability: [],
    until: null,
    meetPref: 'both',
    bio: '',
    photo: null,
  };

  await sql`
    INSERT INTO nomadalingo.users (id, email, name, password_hash, role, profile, onboarded)
    VALUES (${id}, ${emailAddr}, ${name}, ${passwordHash}, ${role},
            ${JSON.stringify(profile)}::jsonb, false)
  `;

  const token = newSessionToken();
  await sql`
    INSERT INTO nomadalingo.sessions (token_hash, user_id, expires_at, user_agent)
    VALUES (${await hashToken(token)}, ${id},
            now() + (${SESSION_DAYS} || ' days')::interval,
            ${req.headers.get('user-agent')?.slice(0, 200) ?? null})
  `;

  await recordAttempt(key, true);

  return ok({
    token,
    user: { id, email: emailAddr, name, role, onboarded: false, profile },
  });
});
