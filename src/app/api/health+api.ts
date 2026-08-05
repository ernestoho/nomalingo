/**
 * Liveness probe.
 *
 * Exists mainly as the canary for the `web.output: "server"` flip: if this
 * returns JSON in production, API routes are genuinely running. It also
 * reports whether DATABASE_URL reached the deployed worker, without ever
 * echoing the value.
 */

export async function GET() {
  return Response.json({
    ok: true,
    service: 'nomadalingo',
    time: new Date().toISOString(),
    db: Boolean(process.env.DATABASE_URL),
    runtime: typeof globalThis.caches !== 'undefined' ? 'workers' : 'node',
  });
}
