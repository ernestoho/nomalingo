/**
 * The official event and the membership plans.
 *
 * One official event at a time owns the top of Home and has its own screen.
 * Membership is one-time-with-expiry, deliberately not auto-renewing: no
 * silent charges, and "renew" extends from the existing expiry rather than
 * from today, so renewing early never costs the user days.
 */

import type { MembershipPlan, OfficialEvent } from './types';
import {
  findPlan,
  liveOfficial,
  livePlans,
  seedOfficial,
  seedPlans,
} from './registry';

const BUNDLED_OFFICIAL: OfficialEvent = {
  id: 'noche-agosto',
  title: { es: 'Noche NómadaLingo · Agosto', en: 'NómadaLingo Night · August' },
  venueId: 'onnos',
  area: 'Bávaro',
  when: { es: 'Viernes 14 de agosto · 7:00–11:00 p.m.', en: 'Friday 14 August · 7:00–11:00 PM' },
  startsAt: '2026-08-14T19:00:00.000Z',
  priceUsd: 12,
  capacity: 120,
  sold: 68,
  includes: [
    { es: 'Bebida de bienvenida', en: 'Welcome drink' },
    { es: 'Credencial con tus idiomas', en: 'Badge showing your languages' },
    { es: '3 rondas de intercambio', en: '3 exchange rounds' },
    { es: 'Bachata en vivo desde las 10', en: 'Live bachata from 10' },
  ],
  blurb: {
    es: 'La noche del mes. Tres rondas de intercambio con credencial, y cuando terminan, bachata en vivo hasta que cierre. Ambiente de coro, no de clase.',
    en: 'The night of the month. Three badged exchange rounds, then live bachata until closing. It feels like a night out, not a class.',
  },
};

const BUNDLED_PLANS: MembershipPlan[] = [
  {
    id: 'monthly',
    label: { es: 'Mensual', en: 'Monthly' },
    priceUsd: 7,
    days: 30,
    note: null,
  },
  {
    id: 'annual',
    label: { es: 'Anual', en: 'Annual' },
    priceUsd: 49,
    days: 365,
    note: { es: 'Ahorra 40%', en: 'Save 40%' },
  },
];

/* Seed the registry, then re-export its live values. */
seedOfficial(BUNDLED_OFFICIAL);
seedPlans(BUNDLED_PLANS);

export const OFFICIAL_EVENT = liveOfficial;
export const MEMBERSHIP_PLANS = livePlans;

export const planById = (id: MembershipPlan['id']) => findPlan(id);

/** Membership perks, shown on the membership screen and in the paywall. */
export const MEMBER_PERKS: { title: { es: string; en: string }; body: { es: string; en: string } }[] =
  [
    {
      title: { es: 'Eventos oficiales gratis', en: 'Official events free' },
      body: {
        es: 'Entras gratis a la Noche NómadaLingo y a cualquier evento oficial del mes.',
        en: 'Free entry to NómadaLingo Night and any official event that month.',
      },
    },
    {
      title: { es: 'Descuentos en lugares aliados', en: 'Partner venue discounts' },
      body: {
        es: 'Café 2×1, pases de coworking a mitad de precio y descuentos en consumo.',
        en: '2-for-1 coffee, half-price coworking passes and money off your tab.',
      },
    },
    {
      title: { es: 'Coincidencias y chats ilimitados', en: 'Unlimited matches and chats' },
      body: {
        es: 'Sin el límite diario de 3 coincidencias y 5 chats.',
        en: 'No more 3-a-day and 5-chat caps.',
      },
    },
    {
      title: { es: 'Filtros avanzados', en: 'Advanced filters' },
      body: {
        es: 'Por nivel exacto, disponibilidad, zona y modalidad.',
        en: 'By exact level, availability, area and format.',
      },
    },
    {
      title: { es: 'Herramientas de anfitrión', en: 'Host tools' },
      body: {
        es: 'QR de registro, lista de espera y estadísticas de asistencia.',
        en: 'Check-in QR, waitlist and attendance stats.',
      },
    },
  ];

/** Free-tier caps, enforced in the UI so the upgrade has an honest reason. */
export const FREE_LIMITS = {
  matchesPerDay: 3,
  chats: 5,
};
