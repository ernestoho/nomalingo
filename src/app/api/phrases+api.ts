/**
 * POST /api/phrases — save a correction to the phrasebook.
 * DELETE /api/phrases — remove one by its wrong/right pair.
 */

import { bad, handler, ok, readJson, requireUser, str } from '../../server/http';
import { newId } from '../../server/crypto';
import { db } from '../../server/db';

export const POST = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await readJson<Record<string, unknown>>(req);
  const wrong = str(body?.wrong, 400);
  const right = str(body?.right, 400);
  if (!wrong || !right) return bad('Falta la corrección.');

  const sql = db();
  const dupe = (await sql`
    SELECT id FROM nomadalingo.phrases
     WHERE user_id = ${user.id} AND wrong = ${wrong} AND right_text = ${right} LIMIT 1
  `) as unknown as { id: string }[];
  if (dupe.length) return ok({ ok: true, id: dupe[0].id, duplicate: true });

  const id = newId('phr');
  await sql`
    INSERT INTO nomadalingo.phrases (id, user_id, wrong, right_text, why)
    VALUES (${id}, ${user.id}, ${wrong}, ${right},
            ${JSON.stringify(body?.why ?? {})}::jsonb)
  `;
  return ok({ ok: true, id });
});

export const DELETE = handler(async (req: Request) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await readJson<Record<string, unknown>>(req);
  const wrong = str(body?.wrong, 400);
  const right = str(body?.right, 400);
  if (!wrong || !right) return bad('Falta la frase.');

  const sql = db();
  await sql`
    DELETE FROM nomadalingo.phrases
     WHERE user_id = ${user.id} AND wrong = ${wrong} AND right_text = ${right}
  `;
  return ok({ ok: true });
});
