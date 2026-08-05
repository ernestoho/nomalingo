/**
 * Illustrative member personas.
 *
 * HONESTY RULE: these are not real people. They exist to show what the
 * matching produces against a realistic spread of languages, levels, zones and
 * schedules. The UI labels them as illustrative wherever a profile is shown.
 *
 * Avatars are drawn from initials rather than stock or generated faces —
 * putting invented faces on invented people is the part that would actually
 * mislead someone.
 */

import type { Partner } from './types';

export const PARTNERS: Partner[] = [
  {
    id: 0,
    name: 'Yamilex Rodríguez',
    age: 26,
    flag: '🇩🇴',
    kind: 'local',
    area: 'Friusa',
    role: { es: 'Recepción de hotel', en: 'Hotel front desk' },
    teaches: [{ code: 'ES', level: 'Nativo' }],
    learning: [{ code: 'EN', level: 'B1' }],
    interests: ['Cocina', 'Música', 'Deporte'],
    availability: ['Tardes', 'Fines de semana'],
    online: true,
    bio: {
      es: 'Trabajo en recepción y necesito el inglés para subir a supervisora. Entiendo bastante, pero me trabo cuando me hablan rápido.',
      en: 'I work the front desk and I need English to make supervisor. I understand a fair bit, but I freeze when people talk fast.',
    },
    avatarSeed: 'YR',
  },
  {
    id: 1,
    name: 'Marc Deschamps',
    age: 35,
    flag: '🇨🇦',
    kind: 'visitor',
    area: 'Bávaro',
    role: { es: 'Desarrollador backend', en: 'Backend developer' },
    teaches: [
      { code: 'FR', level: 'Nativo' },
      { code: 'EN', level: 'C1' },
    ],
    learning: [{ code: 'ES', level: 'A2' }],
    interests: ['Café', 'Deporte', 'Ajedrez'],
    availability: ['Tardes', 'Fines de semana'],
    online: true,
    bio: {
      es: 'De Montréal, tres meses en Bávaro. Mi español es de libro y se cae en cuanto alguien habla rápido.',
      en: 'From Montréal, three months in Bávaro. My Spanish is textbook and it collapses the second someone speeds up.',
    },
    avatarSeed: 'MD',
  },
  {
    id: 2,
    name: 'José Miguel Peña',
    age: 38,
    flag: '🇩🇴',
    kind: 'local',
    area: 'Cabeza de Toro',
    role: { es: 'Instructor de buceo', en: 'Dive instructor' },
    teaches: [
      { code: 'ES', level: 'Nativo' },
      { code: 'EN', level: 'B2' },
    ],
    learning: [{ code: 'FR', level: 'A1' }],
    interests: ['Buceo', 'Playa', 'Música'],
    availability: ['Tardes'],
    online: true,
    bio: {
      es: 'Doy clases de buceo a franceses todo el año y no les entiendo ni la mitad. Quiero arreglar eso.',
      en: 'I teach diving to French tourists all year and I catch maybe half of it. I want to fix that.',
    },
    avatarSeed: 'JP',
  },
  {
    id: 3,
    name: 'Lena Fischer',
    age: 29,
    flag: '🇩🇪',
    kind: 'expat',
    area: 'Cap Cana',
    role: { es: 'Fisioterapeuta', en: 'Physiotherapist' },
    teaches: [
      { code: 'DE', level: 'Nativo' },
      { code: 'EN', level: 'C1' },
    ],
    learning: [{ code: 'ES', level: 'A2' }],
    interests: ['Naturaleza', 'Deporte', 'Arte'],
    availability: ['Mañanas', 'Fines de semana'],
    online: false,
    bio: {
      es: 'Llevo un año aquí y todavía trabajo en inglés. Quiero atender a mis pacientes en español.',
      en: 'A year here and I still work in English. I want to treat my patients in Spanish.',
    },
    avatarSeed: 'LF',
  },
  {
    id: 4,
    name: 'Robert Ellery',
    age: 63,
    flag: '🇺🇸',
    kind: 'expat',
    area: 'Cap Cana',
    role: { es: 'Jubilado, ex-arquitecto', en: 'Retired architect' },
    teaches: [{ code: 'EN', level: 'Nativo' }],
    learning: [{ code: 'ES', level: 'A1' }],
    interests: ['Naturaleza', 'Arte', 'Ajedrez'],
    availability: ['Mañanas'],
    online: false,
    bio: {
      es: 'Me mudé hace dos años y me da pena admitir que apenas paso del saludo. Empezando de cero, sin prisa.',
      en: 'Moved here two years ago and I am embarrassed to say I barely get past hello. Starting from zero, no rush.',
    },
    avatarSeed: 'RE',
  },
  {
    id: 5,
    name: 'Ana Beatriz Then',
    age: 22,
    flag: '🇩🇴',
    kind: 'local',
    area: 'Bávaro',
    role: { es: 'Estudiante de diseño UX', en: 'UX design student' },
    teaches: [{ code: 'ES', level: 'Nativo' }],
    learning: [{ code: 'EN', level: 'B2' }],
    interests: ['Arte', 'Videojuegos', 'Café'],
    availability: ['Tardes', 'Noches'],
    online: true,
    bio: {
      es: 'Estudio UX y quiero aplicar a trabajos remotos. Leo inglés bien, hablarlo es otra vaina.',
      en: 'I study UX and I want to apply for remote jobs. I read English fine; speaking it is another story.',
    },
    avatarSeed: 'AT',
  },
  {
    id: 6,
    name: 'Kenji Tanaka',
    age: 28,
    flag: '🇯🇵',
    kind: 'visitor',
    area: 'Arena Gorda',
    role: { es: 'Desarrollador de videojuegos', en: 'Game developer' },
    teaches: [
      { code: 'JA', level: 'Nativo' },
      { code: 'EN', level: 'C1' },
    ],
    learning: [{ code: 'ES', level: 'A1' }],
    interests: ['Videojuegos', 'Café', 'Deporte'],
    availability: ['Noches'],
    online: true,
    bio: {
      es: 'Trabajo de noche con Tokio, así que tengo el día libre. Cambio japonés por español, o inglés si prefieres.',
      en: 'I work nights with Tokyo, so my days are free. Happy to trade Japanese for Spanish — or English if you prefer.',
    },
    avatarSeed: 'KT',
  },
  {
    id: 7,
    name: 'Rosa Mercedes Then',
    age: 44,
    flag: '🇩🇴',
    kind: 'local',
    area: 'Verón',
    role: { es: 'Dueña de colmado', en: 'Colmado owner' },
    teaches: [{ code: 'ES', level: 'Nativo' }],
    learning: [{ code: 'EN', level: 'A2' }],
    interests: ['Cocina', 'Música', 'Naturaleza'],
    availability: ['Mañanas'],
    online: false,
    bio: {
      es: 'Tengo un colmado en Verón y cada vez entran más turistas. Quiero poder atenderlos bien.',
      en: 'I run a colmado in Verón and more tourists come in every year. I want to serve them properly.',
    },
    avatarSeed: 'RT',
  },
];

export const partnerById = (id: number) => PARTNERS.find((p) => p.id === id) ?? null;

/**
 * Stable avatar tint per persona. Pulled from the brand palette so eight
 * avatars in a list still look like one product.
 */
export const AVATAR_TINTS = [
  '#2A9D8F',
  '#D4A373',
  '#E5735B',
  '#3D5771',
  '#1F8A7D',
  '#B0824F',
  '#14304F',
  '#176E63',
];

export const avatarTint = (id: number) => AVATAR_TINTS[id % AVATAR_TINTS.length];
