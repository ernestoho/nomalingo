/**
 * Neon connection for API routes.
 *
 * EAS Hosting runs server code in Cloudflare Workers — V8 isolates, not Node
 * processes. There are no long-lived TCP sockets, so the ordinary `pg` driver
 * cannot work here at all. `@neondatabase/serverless` speaks Postgres over
 * HTTP, which is the only shape that survives this runtime.
 *
 * The client is created per request rather than kept in a module-level
 * singleton: isolates are recycled unpredictably and a cached handle can
 * outlive its usefulness. Over HTTP there is no connection to pool anyway, so
 * this costs nothing.
 */

import { neon } from '@neondatabase/serverless';

export type Sql = ReturnType<typeof neon>;

export class DbNotConfigured extends Error {
  constructor() {
    super('DATABASE_URL is not set on the server');
    this.name = 'DbNotConfigured';
  }
}

export function db(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DbNotConfigured();
  return neon(url);
}

/** True when the deployment has a database configured at all. */
export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Every query runs against the app's own schema. Set explicitly rather than
 * relying on the connection string's search_path, so this is safe in a
 * database shared with other projects.
 */
export const SCHEMA = 'nomadalingo';
