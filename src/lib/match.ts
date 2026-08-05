/**
 * Reciprocity scoring.
 *
 * Computed live from the saved profile, never cached and never hard-coded, so
 * editing your profile visibly reorders the list. It has no notion of
 * appearance and there is deliberately no field for one — this ranks people by
 * what they can teach you and what you can teach them.
 *
 * Every score ships with plain-language reasons. A number with no explanation
 * is the thing that makes recommendation UIs feel arbitrary.
 */

import { AREAS, langLabel } from '../data/reference';
import type { AreaName, Level, MatchResult, Partner, Profile } from '../data/types';
import type { Lang as UiLang } from './i18n';

/** Weight for a language the partner can teach me, by their level in it. */
function teachWeight(level: Level): number {
  if (level === 'Nativo') return 46;
  if (level === 'C1' || level === 'C2') return 37;
  if (level === 'B2') return 28;
  return 18;
}

const R_EARTH_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Distance between two area centroids, in km. */
export function areaDistanceKm(a: AreaName, b: AreaName): number {
  const A = AREAS.find((x) => x.name === a);
  const B = AREAS.find((x) => x.name === b);
  if (!A || !B) return 999;
  return haversine(A.lat, A.lng, B.lat, B.lng);
}

/** Closest known area to a GPS fix. Used by "Detectar mi zona". */
export function nearestArea(lat: number, lng: number): { area: AreaName; km: number } {
  let best = AREAS[0];
  let bestKm = Infinity;
  for (const a of AREAS) {
    const d = haversine(lat, lng, a.lat, a.lng);
    if (d < bestKm) {
      bestKm = d;
      best = a;
    }
  }
  return { area: best.name, km: Math.round(bestKm * 10) / 10 };
}

/** Languages the user can teach: their native plus any extras they listed. */
export function taughtBy(me: Profile) {
  return [me.native, ...(me.extra ?? []).map((x) => x.code)];
}

export function score(partner: Partner, me: Profile, lang: UiLang): MatchResult {
  let total = 0;
  const reasons: string[] = [];

  const iTeach = taughtBy(me);
  const iLearn = (me.learning ?? []).map((x) => x.code);

  // 1. They teach something I'm learning.
  const gives = partner.teaches.find((t) => iLearn.includes(t.code));
  if (gives) {
    total += teachWeight(gives.level);
    const name = langLabel(gives.code, lang);
    const lvl = gives.level === 'Nativo' ? (lang === 'es' ? 'Nativo' : 'Native') : gives.level;
    reasons.push(
      lang === 'es'
        ? `Te enseña ${name.toLowerCase()} · ${lvl}`
        : `Teaches you ${name} · ${lvl}`,
    );
  }

  // 2. They're learning something I teach.
  const wants = partner.learning.find((l) => iTeach.includes(l.code));
  if (wants) {
    total += 36;
    const name = langLabel(wants.code, lang);
    reasons.push(
      lang === 'es' ? `Aprende tu ${name.toLowerCase()}` : `Learning your ${name}`,
    );
  }

  // 3. Shared interests, at most three counted.
  const shared = (partner.interests ?? []).filter((i) => (me.interests ?? []).includes(i));
  if (shared.length > 0) {
    total += Math.min(shared.length, 3) * 5;
    reasons.push(
      lang === 'es'
        ? `${shared.length} ${shared.length === 1 ? 'interés' : 'intereses'} en común`
        : `${shared.length} shared interest${shared.length === 1 ? '' : 's'}`,
    );
  }

  // 4. Proximity.
  if (partner.area === me.area) {
    total += 9;
    reasons.push(lang === 'es' ? 'Misma zona' : 'Same area');
  } else {
    const km = areaDistanceKm(partner.area, me.area);
    if (km <= 9) {
      total += 5;
      // Bávaro and Friusa are ~100 m apart in real coordinates. Without this
      // branch the UI renders "A 0 km de ti", which reads as a bug.
      if (km < 1.5) {
        reasons.push(lang === 'es' ? 'Prácticamente al lado' : 'Practically next door');
      } else {
        const n = Math.round(km);
        reasons.push(lang === 'es' ? `A ${n} km de ti` : `${n} km from you`);
      }
    }
  }

  // 5. Availability overlap.
  const overlap = (partner.availability ?? []).some((a) => (me.availability ?? []).includes(a));
  if (overlap) {
    total += 4;
    reasons.push(lang === 'es' ? 'Coinciden en horario' : 'Your schedules overlap');
  }

  return { partner, score: Math.min(total, 99), reasons };
}

/** Rank everyone against the saved profile, best first. */
export function rankPartners(partners: Partner[], me: Profile, lang: UiLang): MatchResult[] {
  return partners
    .map((p) => score(p, me, lang))
    .sort((a, b) => b.score - a.score || a.partner.name.localeCompare(b.partner.name));
}

export type { MatchResult };
