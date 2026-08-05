/**
 * Venue directory.
 *
 * HONESTY RULE (kept in the product, not just in a comment): these are real,
 * publicly listed places in Punta Cana, shown as illustrative hosts. Nothing
 * here implies a signed partnership, and the sponsor deals are illustrative
 * until real agreements exist. The UI says so wherever a deal is shown.
 *
 * Meetups must reference an id from this list rather than free text. That is
 * what makes a sponsor discount enforceable, and it is also what stops anyone
 * publishing their home address as a meeting point.
 */

import type { Venue } from './types';
import {
  findVenue,
  liveSponsorVenues,
  liveVenues,
  seedVenues,
} from './registry';

const SEED_VENUES: Venue[] = [
  {
    id: 'pyhex',
    name: 'PYHEX Work 2',
    type: 'coworking',
    area: 'Downtown Punta Cana',
    rating: 4.8,
    sponsorDeal: { es: '1 día gratis al mes', en: 'One free day a month' },
    amenities: ['wifi', 'planta', 'enchufes', 'aire', 'parqueo', 'tranquilo'],
    blurb: {
      es: 'Coworking serio en Downtown. Cabinas para llamadas y planta eléctrica que sí arranca.',
      en: 'A serious coworking spot downtown. Call booths and a generator that actually kicks in.',
    },
    photoSeed: 'coworking',
  },
  {
    id: 'loscubanos',
    name: 'Coffee & Rum Los Cubanos',
    type: 'cafe',
    area: 'Bávaro',
    rating: 4.9,
    sponsorDeal: { es: '2×1 en café de especialidad', en: '2-for-1 on specialty coffee' },
    amenities: ['wifi', 'enchufes', 'aire', 'terraza'],
    blurb: {
      es: 'El sitio clásico para un intercambio de la tarde. Ruidoso en el buen sentido.',
      en: 'The classic spot for an afternoon exchange. Noisy in the good way.',
    },
    photoSeed: 'cafe',
  },
  {
    id: 'villablanca',
    name: 'Villa Blanca Beach Club',
    type: 'beach',
    area: 'Bávaro',
    rating: 4.3,
    sponsorDeal: { es: '15% en consumo', en: '15% off your tab' },
    amenities: ['playa', 'wifi', 'terraza', 'parqueo'],
    blurb: {
      es: 'Playa abierta al público, mesas a la sombra y brisa. Bueno para grupos grandes.',
      en: 'Public beach access, shaded tables and a breeze. Good for bigger groups.',
    },
    photoSeed: 'beach',
  },
  {
    id: 'onnos',
    name: "Onno's Bávaro",
    type: 'bar',
    area: 'Bávaro',
    rating: 4.5,
    sponsorDeal: { es: 'Happy hour extendido', en: 'Extended happy hour' },
    amenities: ['terraza', 'aire', 'parqueo'],
    blurb: {
      es: 'Donde se hace la Noche NómadaLingo. Se pone bueno después de las diez.',
      en: 'Home of Noche NómadaLingo. It picks up after ten.',
    },
    photoSeed: 'bar',
  },
  {
    id: 'flex',
    name: 'The Flex Workspace',
    type: 'coworking',
    area: 'Friusa',
    rating: null,
    sponsorDeal: { es: 'Pase diario a mitad de precio', en: 'Half-price day pass' },
    amenities: ['wifi', 'planta', 'enchufes', 'aire', 'tranquilo'],
    blurb: {
      es: 'En Friusa, a un chin de Bávaro. Ambiente de trabajo, poco ruido.',
      en: 'In Friusa, a stone’s throw from Bávaro. Heads-down, quiet.',
    },
    photoSeed: 'coworking',
  },
  {
    id: 'cogarden',
    name: 'Cogarden',
    type: 'coworking',
    area: 'Bávaro',
    rating: 4.3,
    sponsorDeal: { es: '10% en pase diario', en: '10% off a day pass' },
    amenities: ['wifi', 'planta', 'terraza', 'enchufes', 'tranquilo'],
    blurb: {
      es: 'Coworking al aire libre entre plantas. Se trabaja rico por la mañana.',
      en: 'Open-air coworking among the plants. Mornings here are lovely.',
    },
    photoSeed: 'coworking',
  },
  {
    id: 'bohemian',
    name: 'Bohemian Tapas & Wine',
    type: 'bar',
    area: 'Cap Cana',
    rating: 4.8,
    sponsorDeal: { es: 'Copa de bienvenida', en: 'Welcome glass' },
    amenities: ['aire', 'terraza', 'parqueo', 'tranquilo'],
    blurb: {
      es: 'Más tranquilo y más formal. Bueno para networking sin gritar.',
      en: 'Quieter and dressier. Good for networking without shouting.',
    },
    photoSeed: 'bar',
  },
  {
    id: 'dalias',
    name: "Dalia's Cafe & Bakery",
    type: 'cafe',
    area: 'Bávaro',
    rating: 4.2,
    sponsorDeal: null,
    amenities: ['wifi', 'aire', 'enchufes'],
    blurb: {
      es: 'Panadería con mesas. Café decente y pan recién hecho por la mañana.',
      en: 'A bakery with tables. Decent coffee and fresh bread in the morning.',
    },
    photoSeed: 'cafe',
  },
  {
    id: 'kats',
    name: "Kat's Corner",
    type: 'bar',
    area: 'Bávaro',
    rating: 4.3,
    sponsorDeal: null,
    amenities: ['terraza', 'parqueo'],
    blurb: {
      es: 'Bar de esquina, sin pretensiones. La gente se queda hablando.',
      en: 'An unpretentious corner bar. People stay and talk.',
    },
    photoSeed: 'bar',
  },
  {
    id: 'tributaina',
    name: 'Tribu Taína Café Bistro',
    type: 'cafe',
    area: 'Downtown Punta Cana',
    rating: 5.0,
    sponsorDeal: null,
    amenities: ['wifi', 'aire', 'enchufes', 'tranquilo'],
    blurb: {
      es: 'Bistró pequeño en Downtown. Silencioso, ideal para uno a uno.',
      en: 'A small downtown bistro. Quiet, ideal for one-on-one.',
    },
    photoSeed: 'cafe',
  },
  {
    id: 'aua',
    name: 'AUA Beach Club',
    type: 'beach',
    area: 'Bávaro',
    rating: 4.4,
    sponsorDeal: null,
    amenities: ['playa', 'terraza', 'parqueo', 'wifi'],
    blurb: {
      es: 'Club de playa con área de sombra. Buen punto para caminar y hablar.',
      en: 'Beach club with shade. A good start point for a walk and talk.',
    },
    photoSeed: 'beach',
  },
  {
    id: 'lima',
    name: 'LIMA Beach Club',
    type: 'beach',
    area: 'Bávaro',
    rating: 4.5,
    sponsorDeal: null,
    amenities: ['playa', 'terraza', 'aire', 'parqueo'],
    blurb: {
      es: 'Más cuidado que el promedio. Atardeceres serios.',
      en: 'More polished than most. Serious sunsets.',
    },
    photoSeed: 'beach',
  },
  {
    id: 'noah',
    name: 'Noah Marina Restaurant',
    type: 'bar',
    area: 'Cap Cana',
    rating: 4.5,
    sponsorDeal: null,
    amenities: ['terraza', 'aire', 'parqueo', 'tranquilo'],
    blurb: {
      es: 'Frente a la marina de Cap Cana. Caro pero bonito.',
      en: 'On the Cap Cana marina. Pricey but pretty.',
    },
    photoSeed: 'bar',
  },
  {
    id: 'aroma',
    name: 'Aroma Bakery & Coffee',
    type: 'cafe',
    area: 'Bávaro',
    rating: 5.0,
    sponsorDeal: null,
    amenities: ['wifi', 'aire', 'enchufes', 'tranquilo'],
    blurb: {
      es: 'Café de barrio con buena mesa larga. Se presta para grupos de cuatro o cinco.',
      en: 'Neighbourhood café with a good long table. Works for groups of four or five.',
    },
    photoSeed: 'cafe',
  },
  {
    id: 'spotcast',
    name: 'Spotcast Cafe',
    type: 'coworking',
    area: 'Bávaro',
    rating: 5.0,
    sponsorDeal: null,
    amenities: ['wifi', 'planta', 'enchufes', 'aire', 'tranquilo'],
    blurb: {
      es: 'Mitad café, mitad coworking. Wi-Fi de los buenos.',
      en: 'Half café, half coworking. Genuinely good Wi-Fi.',
    },
    photoSeed: 'coworking',
  },
  {
    id: 'gourmetmarket',
    name: 'Gourmet Market',
    type: 'cafe',
    area: 'Downtown Punta Cana',
    rating: 4.5,
    sponsorDeal: null,
    amenities: ['wifi', 'aire', 'parqueo', 'enchufes'],
    blurb: {
      es: 'Mercado con cafetería adentro. Práctico si vienes en guagua.',
      en: 'A market with a café inside. Handy if you come by guagua.',
    },
    photoSeed: 'cafe',
  },

  /* Public open spaces. Included so outdoor meetups can still reference a real,
     publicly listed place instead of someone typing an address. */
  {
    id: 'playa-arena-gorda',
    name: 'Playa Arena Gorda',
    type: 'beach',
    area: 'Arena Gorda',
    rating: 4.6,
    sponsorDeal: null,
    amenities: ['playa', 'parqueo'],
    blurb: {
      es: 'Playa pública y ancha. El punto de encuentro es la entrada principal.',
      en: 'Wide public beach. Meeting point is the main entrance.',
    },
    photoSeed: 'beach',
  },
  {
    id: 'playa-uvero-alto',
    name: 'Playa Uvero Alto',
    type: 'beach',
    area: 'Uvero Alto',
    rating: 4.7,
    sponsorDeal: null,
    amenities: ['playa', 'parqueo'],
    blurb: {
      es: 'Más lejos y más vacía. Los amaneceres valen el viaje.',
      en: 'Further out and emptier. The sunrises are worth the drive.',
    },
    photoSeed: 'beach',
  },
  {
    id: 'plaza-bavaro',
    name: 'Plaza Bávaro',
    type: 'plaza',
    area: 'Bávaro',
    rating: 4.1,
    sponsorDeal: null,
    amenities: ['parqueo', 'aire'],
    blurb: {
      es: 'Plaza comercial céntrica. Fácil de encontrar para quien no maneja.',
      en: 'Central shopping plaza. Easy to find if you do not drive.',
    },
    photoSeed: 'plaza',
  },
  {
    id: 'plaza-friusa',
    name: 'Plaza Friusa Center',
    type: 'plaza',
    area: 'Friusa',
    rating: 4.0,
    sponsorDeal: null,
    amenities: ['parqueo'],
    blurb: {
      es: 'En pleno Friusa, al lado de la parada de guaguas.',
      en: 'Right in Friusa, next to the guagua stop.',
    },
    photoSeed: 'plaza',
  },
  {
    id: 'capcana-marina',
    name: 'Cap Cana Marina',
    type: 'plaza',
    area: 'Cap Cana',
    rating: 4.8,
    sponsorDeal: null,
    amenities: ['terraza', 'parqueo', 'tranquilo'],
    blurb: {
      es: 'Paseo de la marina. Punto de encuentro frente a la torre del reloj.',
      en: 'The marina boardwalk. Meet by the clock tower.',
    },
    photoSeed: 'plaza',
  },
];

/**
 * Hand the bundled seed to the registry and re-export its live array.
 *
 * Screens keep importing `VENUES` exactly as before; the reference is stable
 * for the life of the process while its contents are replaced on sync. See
 * data/registry.ts for why it is arranged this way.
 */
seedVenues(SEED_VENUES);

export const VENUES = liveVenues;

export const venueById = (id: string) => findVenue(id);

export const venueName = (id: string) => findVenue(id)?.name ?? id;

/** Venues carrying an illustrative member discount. Kept live by the registry. */
export const SPONSOR_VENUES = liveSponsorVenues;
