/**
 * POST /api/auth/signin
 *
 * Rate limited on failures per IP. The error message is deliberately identical
 * for "no such account" and "wrong password" — distinguishing them turns the
 * login form into an account-enumeration oracle.
 */

import { verifyPassword, newSessionToken, hashToken } from '../../../server/crypto';
import {
  bad,
  clientKey,
  email as parseEmail,
  handler,
  ok,
  readJson,
  recordAttempt,
  tooManyFailures,
} from '../../../server/http';
import { db } from '../../../server/db';

const SESSION_DAYS = 60;

export const POST = handler(async (req: Request) => {
  const body = await readJson(req);
  if (!body) return bad('Solicitud inválida.');

  const emailAddr = parseEmail(body.email);
  const pass = typeof body.password === 'string' ? body.password : '';

  if (!emailAddr || !pass) return bad('Correo o contraseña incorrectos.', 401);

  const key = clientKey(req, 'signin');
  if (await tooManyFailures(key)) {
    return bad('Demasiados intentos fallidos. Espera 15 minutos.', 429);
  }

  const sql = db();
  const rows = (await sql`
    SELECT id, email, name, role, password_hash, profile, onboarded
      FROM nomadalingo.users
     WHERE lower(email) = ${emailAddr}
     LIMIT 1
  `) as unknown as {
    id: string;
    email: string;
    name: string;
    role: 'member' | 'admin';
    password_hash: string;
    profile: Record<string, unknown>;
    onboarded: boolean;
  }[];

  const user = rows[0];

  // Verify even when the account does not exist, against a dummy hash, so the
  // response time does not reveal whether the email is registered.
  const stored =
    user?.password_hash ??
    'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
  const valid = await verifyPassword(pass, stored);

  if (!user || !valid) {
    await recordAttempt(key, false);
    return bad('Correo o contraseña incorrectos.', 401);
  }

  const token = newSessionToken();
  await sql`
    INSERT INTO nomadalingo.sessions (token_hash, user_id, expires_at, user_agent)
    VALUES (${await hashToken(token)}, ${user.id},
            now() + (${SESSION_DAYS} || ' days')::interval,
            ${req.headers.get('user-agent')?.slice(0, 200) ?? null})
  `;

  await sql`UPDATE nomadalingo.users SET last_seen_at = now() WHERE id = ${user.id}`;
  await recordAttempt(key, true);

  return ok({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboarded: user.onboarded,
      profile: user.profile,
    },
  });
});
