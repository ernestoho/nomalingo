/**
 * Offline write queue.
 *
 * Writes made without a connection are appended here and replayed when one
 * returns. The UI already updated optimistically, so from the user's side the
 * RSVP simply happened; this is what makes that true rather than a lie.
 *
 * Three properties this needs, in order of how badly their absence hurts:
 *
 *   1. Every operation must be idempotent server-side, because a flush can be
 *      interrupted after the server committed but before we recorded success.
 *      The endpoints are built for this — RSVP upserts, meetup create is
 *      ON CONFLICT DO NOTHING, capture is keyed on order id.
 *   2. A permanently-failing item must not block the queue forever. A write
 *      rejected 4xx is dropped after being logged; retrying it every launch
 *      would wedge everything behind it.
 *   3. The queue must survive a force-quit, so it lives in storage, not memory.
 */

import { storage } from './storage';
import { api } from './api';
import { checkOnline } from './net';

export type OutboxOp =
  | { kind: 'rsvp'; meetupId: string; going: boolean }
  | { kind: 'profile'; profile: Record<string, unknown>; onboarded?: boolean }
  | { kind: 'meetup'; payload: Record<string, unknown> }
  | { kind: 'phrase.add'; wrong: string; right: string; why: unknown }
  | { kind: 'phrase.remove'; wrong: string; right: string };

export type OutboxItem = {
  id: string;
  op: OutboxOp;
  queuedAt: number;
  attempts: number;
};

const KEY = 'outbox';
const MAX_ATTEMPTS = 6;

/**
 * The in-flight flush, if any.
 *
 * Concurrent callers await the SAME promise rather than being turned away.
 * Returning early to a second caller looks harmless but is not: the caller
 * assumes the queue has drained and reads server state that is still stale,
 * which silently overwrote freshly-onboarded profiles with the empty one
 * created at signup.
 */
let inFlight: Promise<FlushResult> | null = null;
const listeners = new Set<(count: number) => void>();

async function read(): Promise<OutboxItem[]> {
  return storage.get<OutboxItem[]>(KEY, []);
}

async function write(items: OutboxItem[]): Promise<void> {
  await storage.set(KEY, items);
  for (const fn of listeners) fn(items.length);
}

export function subscribeOutbox(fn: (count: number) => void): () => void {
  listeners.add(fn);
  void read().then((i) => fn(i.length));
  return () => listeners.delete(fn);
}

export async function pendingCount(): Promise<number> {
  return (await read()).length;
}

/**
 * Queue a write.
 *
 * RSVP operations collapse: queuing "going" then "not going" for the same
 * meetup leaves only the last intent, rather than replaying a pointless
 * round trip. Profile updates collapse the same way — only the newest matters.
 */
export async function enqueue(op: OutboxOp): Promise<void> {
  const items = await read();

  let next = items;
  if (op.kind === 'rsvp') {
    next = items.filter((i) => !(i.op.kind === 'rsvp' && i.op.meetupId === op.meetupId));
  } else if (op.kind === 'profile') {
    next = items.filter((i) => i.op.kind !== 'profile');
  }

  next.push({
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    op,
    queuedAt: Date.now(),
    attempts: 0,
  });

  await write(next);
}

async function send(op: OutboxOp) {
  switch (op.kind) {
    case 'rsvp':
      return api.post('/api/rsvps', { meetupId: op.meetupId, going: op.going });
    case 'profile':
      return api.put('/api/me/profile', { profile: op.profile, onboarded: op.onboarded });
    case 'meetup':
      return api.post('/api/meetups', op.payload);
    case 'phrase.add':
      return api.post('/api/phrases', { wrong: op.wrong, right: op.right, why: op.why });
    case 'phrase.remove':
      return api.del('/api/phrases', { wrong: op.wrong, right: op.right });
  }
}

export type FlushResult = { sent: number; dropped: number; remaining: number };

/**
 * Replay the queue oldest-first, stopping at the first network failure so
 * ordering is preserved. Order matters: a profile write followed by an RSVP
 * should not land backwards.
 */
export function flush(): Promise<FlushResult> {
  if (inFlight) return inFlight;
  inFlight = runFlush().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** True when a profile write is still waiting to reach the server. */
export async function hasPendingKind(kind: OutboxOp['kind']): Promise<boolean> {
  return (await read()).some((i) => i.op.kind === kind);
}

async function runFlush(): Promise<FlushResult> {
  let sent = 0;
  let dropped = 0;

  try {
    if (!(await checkOnline())) {
      return { sent, dropped, remaining: (await read()).length };
    }

    let items = await read();

    while (items.length) {
      const item = items[0];
      const res = await send(item.op);

      if (res.ok) {
        items = items.slice(1);
        sent++;
        await write(items);
        continue;
      }

      if (res.kind === 'offline') {
        // Still offline — stop and keep everything for next time.
        break;
      }

      // A 4xx is the client's fault and will never succeed on retry. Log it,
      // drop it, and keep the queue moving rather than wedging every later
      // write behind one bad item.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        console.warn('[outbox] dropping rejected op', item.op.kind, res.status, res.message);
        items = items.slice(1);
        dropped++;
        await write(items);
        continue;
      }

      // 5xx or rate limited: retry later, up to a point.
      item.attempts += 1;
      if (item.attempts >= MAX_ATTEMPTS) {
        console.warn('[outbox] giving up after retries', item.op.kind);
        items = items.slice(1);
        dropped++;
      } else {
        items = [item, ...items.slice(1)];
      }
      await write(items);
      break;
    }

    return { sent, dropped, remaining: items.length };
  } catch (e) {
    console.warn('[outbox] flush aborted', e);
    return { sent, dropped, remaining: (await read()).length };
  }
}

export async function clearOutbox(): Promise<void> {
  await write([]);
}
