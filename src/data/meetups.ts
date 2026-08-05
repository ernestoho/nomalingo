/**
 * Seeded community meetups.
 *
 * Dates are computed as the next occurrence of a weekday + time rather than
 * hardcoded, so the app never shows a listing that has already happened. A
 * demo full of last month's events is the fastest way to make a product look
 * abandoned.
 *
 * Every meetup references a venue id from the directory. There is no free-text
 * location field anywhere in the app.
 */

import type { Meetup, MeetupCategory } from './types';
import { liveMeetups, seedMeetups } from './registry';

/** Next occurrence of a weekday (0 = Sunday) at a given local time. */
export function nextWeekday(dow: number, hour: number, minute = 0): string {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  let delta = (dow - d.getDay() + 7) % 7;
  if (delta === 0 && d.getTime() <= now.getTime()) delta = 7;
  d.setDate(d.getDate() + delta);
  return d.toISOString();
}

const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6, SUN = 0;

const BUNDLED_MEETUPS: Meetup[] = [
  {
    id: 'e0',
    category: 'Café',
    title: { es: 'Intercambio de la tarde', en: 'Afternoon exchange' },
    venueId: 'loscubanos',
    area: 'Bávaro',
    when: { es: 'Jue 6:00 p.m.', en: 'Thu 6:00 PM' },
    startsAt: nextWeekday(THU, 18),
    going: 8,
    capacity: 12,
    languages: ['ES', 'EN'],
    attendees: [0, 5, 7, 2, 1],
    description: {
      es: 'Media hora en español, media en inglés, y después lo que salga. Llega puntual que la mesa se llena.',
      en: 'Half an hour in Spanish, half in English, then whatever happens. Come on time — the table fills up.',
    },
    hostId: 0,
  },
  {
    id: 'e1',
    category: 'Coworking',
    title: { es: 'Coworking + idiomas', en: 'Coworking exchange' },
    venueId: 'pyhex',
    area: 'Downtown Punta Cana',
    when: { es: 'Mié 5:00 p.m.', en: 'Wed 5:00 PM' },
    startsAt: nextWeekday(WED, 17),
    going: 11,
    capacity: 20,
    languages: ['ES', 'EN'],
    attendees: [1, 6, 3, 5],
    description: {
      es: 'Trabajamos dos horas en silencio y la última hora es de conversación. Trae audífonos.',
      en: 'Two hours of quiet work, last hour is conversation. Bring headphones.',
    },
    hostId: 1,
  },
  {
    id: 'e2',
    category: 'Playa',
    title: { es: 'Caminata y conversación', en: 'Beach walk & talk' },
    venueId: 'playa-arena-gorda',
    area: 'Arena Gorda',
    when: { es: 'Sáb 7:00 a.m.', en: 'Sat 7:00 AM' },
    startsAt: nextWeekday(SAT, 7),
    going: 6,
    capacity: 15,
    languages: ['ES', 'EN'],
    attendees: [2, 4, 0],
    description: {
      es: 'Caminamos una hora por la orilla cambiando de idioma cada quince minutos. Gorra y agua.',
      en: 'An hour along the shore, switching language every fifteen minutes. Cap and water.',
    },
    hostId: 2,
  },
  {
    id: 'e3',
    category: 'Bachata',
    title: { es: 'Bachata y práctica de idiomas', en: 'Bachata + language practice' },
    venueId: 'plaza-bavaro',
    area: 'Bávaro',
    when: { es: 'Vie 8:00 p.m.', en: 'Fri 8:00 PM' },
    startsAt: nextWeekday(FRI, 20),
    going: 18,
    capacity: 24,
    languages: ['ES', 'EN'],
    attendees: [0, 5, 1, 7, 2, 3],
    description: {
      es: 'Clase básica de bachata en español, y después coro. No hace falta saber bailar, de verdad.',
      en: 'A basic bachata lesson in Spanish, then everyone hangs out. You really do not need to know how to dance.',
    },
    hostId: 5,
  },
  {
    id: 'e4',
    category: 'Networking',
    title: { es: 'Networking de negocios', en: 'Business networking' },
    venueId: 'capcana-marina',
    area: 'Cap Cana',
    when: { es: 'Jue 7:00 p.m.', en: 'Thu 7:00 PM' },
    startsAt: nextWeekday(THU, 19),
    going: 9,
    capacity: 16,
    languages: ['ES', 'EN'],
    attendees: [3, 4, 1],
    description: {
      es: 'Para quien trabaja remoto o tiene negocio propio aquí. Presentaciones de dos minutos y después libre.',
      en: 'For remote workers and people running something here. Two-minute intros, then open.',
    },
    hostId: 3,
  },
  {
    id: 'e5',
    category: 'Café',
    title: { es: 'Café matutino en Verón', en: 'Morning coffee in Verón' },
    venueId: 'plaza-friusa',
    area: 'Friusa',
    when: { es: 'Mar 9:00 a.m.', en: 'Tue 9:00 AM' },
    startsAt: nextWeekday(TUE, 9),
    going: 4,
    capacity: 10,
    languages: ['ES'],
    attendees: [7, 0],
    description: {
      es: 'Solo español, para quien quiera soltarse sin muleta. Nivel principiante bienvenido.',
      en: 'Spanish only, for anyone who wants to practise without a crutch. Beginners welcome.',
    },
    hostId: 7,
  },
  {
    id: 'e6',
    category: 'Coworking',
    title: { es: 'Inglés para hostelería', en: 'English for hospitality' },
    venueId: 'flex',
    area: 'Friusa',
    when: { es: 'Sáb 10:00 a.m.', en: 'Sat 10:00 AM' },
    startsAt: nextWeekday(SAT, 10),
    going: 12,
    capacity: 25,
    languages: ['EN'],
    attendees: [0, 7, 5],
    description: {
      es: 'Práctica de situaciones reales de hotel y restaurante: check-in, quejas, recomendaciones.',
      en: 'Real hotel and restaurant situations: check-in, complaints, recommendations.',
    },
    hostId: 0,
  },
  {
    id: 'e7',
    category: 'Playa',
    title: { es: 'Amanecer en Uvero Alto', en: 'Sunrise at Uvero Alto' },
    venueId: 'playa-uvero-alto',
    area: 'Uvero Alto',
    when: { es: 'Dom 6:30 a.m.', en: 'Sun 6:30 AM' },
    startsAt: nextWeekday(SUN, 6, 30),
    going: 5,
    capacity: 12,
    languages: ['ES', 'EN'],
    attendees: [2, 6],
    description: {
      es: 'Salimos temprano, vemos el amanecer y desayunamos. Hay que coordinar el transporte en el chat.',
      en: 'Early start, sunrise, then breakfast. We sort out transport in the chat.',
    },
    hostId: 2,
  },
];

/** Bundled meetups seed the registry; the live array is what screens read. */
seedMeetups(BUNDLED_MEETUPS);

export const SEED_MEETUPS = liveMeetups;

export const CATEGORY_ORDER: MeetupCategory[] = [
  'Café',
  'Coworking',
  'Playa',
  'Bachata',
  'Networking',
];
