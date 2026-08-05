/**
 * Live content registry.
 *
 * The problem this solves: fourteen screens import `VENUES`, `OFFICIAL_EVENT`
 * and friends directly from the data modules. Once content lives in Neon those
 * values have to change at runtime — but rewriting every screen's data access
 * would risk regressions in UI the user is happy with, for no visual gain.
 *
 * So the arrays screens import become *live* arrays owned by this module and
 * mutated in place on sync. The object identity never changes, which is why no
 * screen needs editing; `StoreProvider` subscribes here and bumps a context
 * value so the tree re-renders with the new contents.
 *
 * Control is inverted deliberately: each data module pushes its bundled seed
 * *into* this registry at import time and re-exports the live array. This
 * module imports nothing from `data/`, so there is no import cycle.
 *
 * The bundled seed is not dead weight — it is the first paint. The app draws
 * real Punta Cana content immediately, offline, on a cold install, and the
 * server's version replaces it a moment later.
 */

import type { L, MembershipPlan, Meetup, OfficialEvent, Venue } from './types';

/* Live arrays. Same reference for the life of the process. */
export const liveVenues: Venue[] = [];
export const liveMeetups: Meetup[] = [];
export const livePlans: MembershipPlan[] = [];
export const liveSponsorVenues: Venue[] = [];

/**
 * The official event is an object screens read fields from, so it is mutated
 * with Object.assign rather than replaced.
 */
export const liveOfficial: OfficialEvent = {
  id: '',
  title: { es: '', en: '' },
  venueId: '',
  area: 'Bávaro',
  when: { es: '', en: '' },
  startsAt: new Date().toISOString(),
  priceUsd: 0,
  capacity: 0,
  sold: 0,
  includes: [],
  blurb: { es: '', en: '' },
};

type Source = 'seed' | 'cache' | 'server';

let source: Source = 'seed';
export const contentSource = () => source;

const listeners = new Set<() => void>();

export function subscribeContent(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn();
}

function replaceAll<T>(target: T[], next: T[]) {
  target.length = 0;
  target.push(...next);
}

function recomputeSponsors() {
  replaceAll(
    liveSponsorVenues,
    liveVenues.filter((v) => v.sponsorDeal !== null && v.sponsorDeal !== undefined),
  );
}

/* ------------------------------------------------------------------ */
/*  seeding — called by the data modules at import time                 */
/* ------------------------------------------------------------------ */

export function seedVenues(seed: Venue[]) {
  if (liveVenues.length === 0) {
    replaceAll(liveVenues, seed);
    recomputeSponsors();
  }
}

export function seedMeetups(seed: Meetup[]) {
  if (liveMeetups.length === 0) replaceAll(liveMeetups, seed);
}

export function seedPlans(seed: MembershipPlan[]) {
  if (livePlans.length === 0) replaceAll(livePlans, seed);
}

export function seedOfficial(seed: OfficialEvent) {
  if (!liveOfficial.id) Object.assign(liveOfficial, seed);
}

/* ------------------------------------------------------------------ */
/*  applying server / cached content                                    */
/* ------------------------------------------------------------------ */

export type ContentPayload = {
  venues?: Venue[];
  meetups?: Meetup[];
  plans?: MembershipPlan[];
  official?: OfficialEvent | null;
  version?: number;
};

let version = 0;
export const contentVersion = () => version;

/**
 * Replace live content. Empty collections are ignored rather than applied —
 * a malformed or partial response should never blank the app's content out
 * from under the user. Losing content is far worse than showing slightly
 * stale content.
 */
export function applyContent(payload: ContentPayload, from: Source = 'server') {
  let changed = false;

  if (Array.isArray(payload.venues) && payload.venues.length) {
    replaceAll(liveVenues, payload.venues);
    recomputeSponsors();
    changed = true;
  }
  if (Array.isArray(payload.meetups)) {
    replaceAll(liveMeetups, payload.meetups);
    changed = true;
  }
  if (Array.isArray(payload.plans) && payload.plans.length) {
    replaceAll(livePlans, payload.plans);
    changed = true;
  }
  if (payload.official && payload.official.id) {
    Object.assign(liveOfficial, payload.official);
    changed = true;
  }
  if (typeof payload.version === 'number') version = payload.version;

  if (changed) {
    source = from;
    notify();
  }
  return changed;
}

/* ------------------------------------------------------------------ */
/*  lookups                                                             */
/* ------------------------------------------------------------------ */

export const findVenue = (id: string) => liveVenues.find((v) => v.id === id) ?? null;
export const findMeetup = (id: string) => liveMeetups.find((m) => m.id === id) ?? null;
export const findPlan = (id: string) => livePlans.find((p) => p.id === id) ?? livePlans[0];

export type { L };
