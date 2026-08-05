/**
 * Areas, taxonomy and the nine real Punta Cana zones.
 *
 * The coordinates are real, which matters: Bávaro and Friusa are ~100 m apart,
 * so the matcher needs its "practically next door" branch or it renders
 * "A 0 km de ti" and looks broken.
 */

import type { Area, AreaName, L, LangCode, Level, MeetupCategory, VenueType } from './types';

export const AREAS: Area[] = [
  { name: 'Bávaro', lat: 18.685, lng: -68.452 },
  { name: 'Verón', lat: 18.6167, lng: -68.4167 },
  { name: 'Cap Cana', lat: 18.502, lng: -68.38 },
  { name: 'Downtown Punta Cana', lat: 18.558, lng: -68.383 },
  { name: 'Arena Gorda', lat: 18.7167, lng: -68.4333 },
  { name: 'Uvero Alto', lat: 18.7833, lng: -68.5333 },
  { name: 'Friusa', lat: 18.6841, lng: -68.4517 },
  { name: 'Cabeza de Toro', lat: 18.6333, lng: -68.4 },
  { name: 'Higüey', lat: 18.6157, lng: -68.7079 },
];

export const AREA_NAMES = AREAS.map((a) => a.name) as AreaName[];

export const LANGUAGES: { code: LangCode; label: L; flag: string }[] = [
  { code: 'ES', label: { es: 'Español', en: 'Spanish' }, flag: '🇩🇴' },
  { code: 'EN', label: { es: 'Inglés', en: 'English' }, flag: '🇺🇸' },
  { code: 'FR', label: { es: 'Francés', en: 'French' }, flag: '🇫🇷' },
  { code: 'DE', label: { es: 'Alemán', en: 'German' }, flag: '🇩🇪' },
  { code: 'IT', label: { es: 'Italiano', en: 'Italian' }, flag: '🇮🇹' },
  { code: 'PT', label: { es: 'Portugués', en: 'Portuguese' }, flag: '🇧🇷' },
  { code: 'JA', label: { es: 'Japonés', en: 'Japanese' }, flag: '🇯🇵' },
];

export const langLabel = (code: LangCode, lang: 'es' | 'en') =>
  LANGUAGES.find((l) => l.code === code)?.label[lang] ?? code;

export const langFlag = (code: LangCode) =>
  LANGUAGES.find((l) => l.code === code)?.flag ?? '🏳️';

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Nativo'];

export const levelLabel = (lvl: Level, lang: 'es' | 'en') =>
  lvl === 'Nativo' ? (lang === 'es' ? 'Nativo' : 'Native') : lvl;

/** How many filled dots a level draws on a profile. */
export const levelDots = (lvl: Level) =>
  ({ A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 5, Nativo: 5 }[lvl] ?? 1);

export const INTERESTS: { key: string; label: L; emoji: string }[] = [
  { key: 'Cocina', label: { es: 'Cocina', en: 'Cooking' }, emoji: '🥘' },
  { key: 'Música', label: { es: 'Música', en: 'Music' }, emoji: '🎧' },
  { key: 'Playa', label: { es: 'Playa', en: 'Beach' }, emoji: '🏖' },
  { key: 'Café', label: { es: 'Café', en: 'Coffee' }, emoji: '☕' },
  { key: 'Bachata', label: { es: 'Bachata', en: 'Bachata' }, emoji: '💃' },
  { key: 'Deporte', label: { es: 'Deporte', en: 'Sport' }, emoji: '⚽' },
  { key: 'Negocios', label: { es: 'Negocios', en: 'Business' }, emoji: '💼' },
  { key: 'Arte', label: { es: 'Arte', en: 'Art' }, emoji: '🎨' },
  { key: 'Buceo', label: { es: 'Buceo', en: 'Diving' }, emoji: '🤿' },
  { key: 'Ajedrez', label: { es: 'Ajedrez', en: 'Chess' }, emoji: '♟' },
  { key: 'Naturaleza', label: { es: 'Naturaleza', en: 'Outdoors' }, emoji: '🌿' },
  { key: 'Videojuegos', label: { es: 'Videojuegos', en: 'Gaming' }, emoji: '🎮' },
];

export const interestLabel = (key: string, lang: 'es' | 'en') =>
  INTERESTS.find((i) => i.key === key)?.label[lang] ?? key;

export const interestEmoji = (key: string) =>
  INTERESTS.find((i) => i.key === key)?.emoji ?? '•';

export const AVAILABILITY: { key: string; label: L }[] = [
  { key: 'Mañanas', label: { es: 'Mañanas', en: 'Mornings' } },
  { key: 'Tardes', label: { es: 'Tardes', en: 'Afternoons' } },
  { key: 'Noches', label: { es: 'Noches', en: 'Evenings' } },
  { key: 'Fines de semana', label: { es: 'Fines de semana', en: 'Weekends' } },
];

export const availLabel = (key: string, lang: 'es' | 'en') =>
  AVAILABILITY.find((a) => a.key === key)?.label[lang] ?? key;

export const CONNECTION_MODES: { key: string; label: L; emoji: string }[] = [
  { key: 'texto', label: { es: 'Chat de texto', en: 'Text chat' }, emoji: '💬' },
  { key: 'voz', label: { es: 'Notas de voz', en: 'Voice notes' }, emoji: '🎙' },
  { key: 'llamadas', label: { es: 'Llamadas', en: 'Calls' }, emoji: '📞' },
  { key: 'persona', label: { es: 'En persona', en: 'In person' }, emoji: '🤝' },
];

export const MEET_PREFS: { key: 'online' | 'inperson' | 'both'; label: L }[] = [
  { key: 'online', label: { es: 'Solo en línea', en: 'Online only' } },
  { key: 'inperson', label: { es: 'Solo en persona', en: 'In person only' } },
  { key: 'both', label: { es: 'Ambos', en: 'Both' } },
];

export const USER_KINDS: { key: 'local' | 'visitor' | 'expat'; label: L; sub: L; emoji: string }[] = [
  {
    key: 'local',
    label: { es: 'Soy de aquí', en: "I'm local" },
    sub: { es: 'Dominicano/a viviendo en la zona', en: 'Dominican living in the area' },
    emoji: '🇩🇴',
  },
  {
    key: 'visitor',
    label: { es: 'Estoy de visita', en: "I'm visiting" },
    sub: { es: 'Turista o nómada de paso', en: 'Tourist or nomad passing through' },
    emoji: '🧳',
  },
  {
    key: 'expat',
    label: { es: 'Soy expatriado/a', en: "I'm an expat" },
    sub: { es: 'Vivo aquí pero vengo de fuera', en: 'I live here but came from abroad' },
    emoji: '🌎',
  },
];

export const MEETUP_CATEGORIES: { key: MeetupCategory; label: L; emoji: string }[] = [
  { key: 'Café', label: { es: 'Café', en: 'Coffee chat' }, emoji: '☕' },
  { key: 'Coworking', label: { es: 'Coworking', en: 'Coworking' }, emoji: '💻' },
  { key: 'Playa', label: { es: 'Playa', en: 'Beach walk' }, emoji: '🏖' },
  { key: 'Bachata', label: { es: 'Salsa/Bachata', en: 'Salsa / bachata' }, emoji: '💃' },
  { key: 'Networking', label: { es: 'Networking', en: 'Networking' }, emoji: '🤝' },
];

export const categoryEmoji = (c: MeetupCategory) =>
  MEETUP_CATEGORIES.find((x) => x.key === c)?.emoji ?? '•';

export const categoryLabel = (c: MeetupCategory, lang: 'es' | 'en') =>
  MEETUP_CATEGORIES.find((x) => x.key === c)?.label[lang] ?? c;

export const VENUE_TYPES: { key: VenueType; label: L; emoji: string }[] = [
  { key: 'coworking', label: { es: 'Coworking', en: 'Coworking' }, emoji: '💻' },
  { key: 'cafe', label: { es: 'Café', en: 'Café' }, emoji: '☕' },
  { key: 'bar', label: { es: 'Bar', en: 'Bar' }, emoji: '🍹' },
  { key: 'beach', label: { es: 'Playa', en: 'Beach club' }, emoji: '🏖' },
  { key: 'plaza', label: { es: 'Plaza', en: 'Plaza' }, emoji: '🏛' },
];

export const venueTypeLabel = (t: VenueType, lang: 'es' | 'en') =>
  VENUE_TYPES.find((x) => x.key === t)?.label[lang] ?? t;

export const venueTypeEmoji = (t: VenueType) =>
  VENUE_TYPES.find((x) => x.key === t)?.emoji ?? '📍';

/** Amenities. "Planta eléctrica" is a genuine Punta Cana concern, not filler. */
export const AMENITIES: { key: string; label: L; emoji: string }[] = [
  { key: 'wifi', label: { es: 'Wi-Fi rápido', en: 'Fast Wi-Fi' }, emoji: '📶' },
  { key: 'planta', label: { es: 'Planta eléctrica', en: 'Backup generator' }, emoji: '🔌' },
  { key: 'enchufes', label: { es: 'Enchufes', en: 'Power outlets' }, emoji: '🔋' },
  { key: 'aire', label: { es: 'Aire', en: 'Air conditioning' }, emoji: '❄️' },
  { key: 'terraza', label: { es: 'Terraza', en: 'Terrace' }, emoji: '🌴' },
  { key: 'playa', label: { es: 'Acceso a playa', en: 'Beach access' }, emoji: '🏖' },
  { key: 'parqueo', label: { es: 'Estacionamiento', en: 'Parking' }, emoji: '🅿️' },
  { key: 'tranquilo', label: { es: 'Ambiente tranquilo', en: 'Quiet atmosphere' }, emoji: '🤫' },
];

export const amenityLabel = (key: string, lang: 'es' | 'en') =>
  AMENITIES.find((a) => a.key === key)?.label[lang] ?? key;

export const amenityEmoji = (key: string) =>
  AMENITIES.find((a) => a.key === key)?.emoji ?? '•';
