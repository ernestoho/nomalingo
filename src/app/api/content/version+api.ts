/**
 * GET /api/content/version
 *
 * Deliberately tiny. The app polls this while foregrounded and only refetches
 * the full content payload when the number changes — that is how an admin edit
 * reaches a phone without holding a websocket open, which Cloudflare Workers
 * cannot do without extra machinery.
 */

import { contentVersion, handler, ok } from '../../../server/http';

export const GET = handler(async () => ok({ version: await contentVersion() }));
