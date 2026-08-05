/**
 * GET /api/admin/plans  — list all membership plans (including inactive)
 * PUT /api/admin/plans  — update one plan by id in the body
 */

import { bad, handler, ok, readJson, requireAdmin, str, num } from '../../../server/http';
import { db } from '../../../server/db';

export const GET = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const sql = db();

  const rows = await sql`
    SELECT id, label, price_usd::float8 AS "priceUsd", days, note, active,
           sort_order AS "sortOrder",
           to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
      FROM nomadalingo.membership_plans
     ORDER BY sort_order, id
  `;

  return ok(rows);
});

export const PUT = handler(async (req: Request) => {
  const { user, response } = await requireAdmin(req);
  if (!user) return response!;

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return bad('Cuerpo de la solicitud inválido.');

  const id = str(body.id, 64);
  if (!id) return bad('El id del plan es obligatorio.');

  const sql = db();

  // Fetch the current row for merge.
  type PlanRow = {
    id: string;
    label: unknown;
    price_usd: string;
    days: number;
    note: unknown;
    active: boolean;
    sort_order: number;
  };

  const existing = (await sql`
    SELECT id, label, price_usd, days, note, active, sort_order
      FROM nomadalingo.membership_plans
     WHERE id = ${id}
     LIMIT 1
  `) as unknown as PlanRow[];
  if (!existing.length) return bad('Plan no encontrado.', 404);

  const cur = existing[0];

  // ── validate and merge ────────────────────────────────────────────────
  let finalPriceUsd = parseFloat(cur.price_usd);
  if ('priceUsd' in body) {
    const v = num(body.priceUsd, 0, 9999);
    if (v === null) return bad('El precio debe ser un número entre 0 y 9999.');
    finalPriceUsd = v;
  }

  let finalDays = cur.days;
  if ('days' in body) {
    const v = num(body.days, 1, 3650);
    if (v === null) return bad('Los días deben ser un número entre 1 y 3650.');
    finalDays = v;
  }

  const finalActive = 'active' in body ? body.active !== false : cur.active;

  const finalLabel = 'label' in body
    ? JSON.stringify(body.label && typeof body.label === 'object' ? body.label : cur.label)
    : JSON.stringify(cur.label);

  // note is nullable jsonb.
  const hasNote = 'note' in body;
  const finalNote = hasNote
    ? (body.note !== null && body.note !== undefined ? JSON.stringify(body.note) : null)
    : (cur.note !== null ? JSON.stringify(cur.note) : null);

  const rows = await sql`
    UPDATE nomadalingo.membership_plans
       SET label      = ${finalLabel}::jsonb,
           price_usd  = ${finalPriceUsd},
           days       = ${finalDays},
           note       = ${finalNote}::jsonb,
           active     = ${finalActive},
           updated_at = now()
     WHERE id = ${id}
     RETURNING id, label, price_usd::float8 AS "priceUsd", days, note, active,
               sort_order AS "sortOrder",
               to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "updatedAt"
  `;

  return ok((rows as unknown as unknown[])[0]);
});
