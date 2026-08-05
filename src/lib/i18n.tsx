/**
 * Spanish-first bilingual layer.
 *
 * Design decision worth defending: strings are written inline as {es, en}
 * pairs at their point of use rather than looked up from a central key
 * dictionary. A key dictionary makes it easy to ship a screen whose English
 * silently falls back to Spanish, and "the toggle covers every visible string"
 * is an explicit requirement. With pairs, an untranslated string is a type
 * error, not a runtime surprise.
 *
 * Spanish is the default and the source of truth. First-run detection only
 * chooses English when the device is explicitly non-Spanish.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getLocales } from 'expo-localization';
import type { L } from '../data/types';
import { storage } from './storage';

export type Lang = 'es' | 'en';

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** Resolve a bilingual pair. */
  t: (pair: L) => string;
  ready: boolean;
};

const LangContext = createContext<Ctx | null>(null);

const KEY = 'lang';

/**
 * First-run language.
 *
 * Spanish is the default, full stop — this is a Punta Cana product and the
 * Spanish is the source of truth, not a translation of the English. Device
 * locale is consulted only to confirm Spanish, never to override it into
 * English: an English-locale phone in Bávaro is exactly the visitor this app
 * is for, and they should land in Spanish with a one-tap toggle rather than
 * being quietly opted out of the thing they came to practise.
 */
function detect(): Lang {
  return 'es';
}

/** True when the device is already set to Spanish. Used to decide whether the
 *  welcome screen should point out that an English toggle exists. */
export function deviceSpeaksSpanish(): boolean {
  try {
    return (getLocales() ?? []).some((l) => l.languageCode?.toLowerCase() === 'es');
  } catch {
    return false;
  }
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const saved = await storage.get<Lang | null>(KEY, null);
      if (!alive) return;
      setLangState(saved ?? detect());
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    void storage.set(KEY, l);
  }, []);

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next: Lang = prev === 'es' ? 'en' : 'es';
      void storage.set(KEY, next);
      return next;
    });
  }, []);

  const t = useCallback((pair: L) => (lang === 'es' ? pair.es : pair.en), [lang]);

  const value = useMemo(
    () => ({ lang, setLang, toggle, t, ready }),
    [lang, setLang, toggle, t, ready],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}

/** Shorthand for screens: const t = useT(); t({ es: '…', en: '…' }) */
export function useT() {
  return useLang().t;
}

/* ---------- Spanish-first formatters ---------- */

/**
 * Dominican number formatting: decimal comma, dot thousands.
 * 1480 → "1.480" · 2.5 → "2,5"
 *
 * Done by hand rather than with toLocaleString. Hermes ships without full ICU
 * on Android unless you opt in, so toLocaleString('es-DO') silently returns
 * en-US formatting — the failure is invisible in a browser and then wrong on
 * the actual phone, which is the worst way for a bug to behave.
 */
export function formatNumber(n: number, lang: Lang, decimals = 0): string {
  const negative = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, fracPart] = fixed.split('.');

  const groupSep = lang === 'es' ? '.' : ',';
  const decimalSep = lang === 'es' ? ',' : '.';

  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
  const body = fracPart ? `${grouped}${decimalSep}${fracPart}` : grouped;
  return negative ? `-${body}` : body;
}

/** USD price. PayPal does not settle DOP, so USD is the real currency. */
export function formatUsd(n: number): string {
  return `US$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

/** Indicative only — never used for charging. */
export const DOP_PER_USD = 61;

export function formatDopHint(usd: number, lang: Lang): string {
  const dop = Math.round(usd * DOP_PER_USD);
  return `≈ RD$${formatNumber(dop, lang)}`;
}

const ES_DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ES_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "viernes 14 de agosto" / "Friday 14 August" */
export function formatLongDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return lang === 'es'
    ? `${ES_DAYS[d.getDay()]} ${d.getDate()} de ${ES_MONTHS[d.getMonth()]}`
    : `${EN_DAYS[d.getDay()]} ${d.getDate()} ${EN_MONTHS[d.getMonth()]}`;
}

/** 12-hour clock with a.m./p.m. — the Dominican convention. */
export function formatTime(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? (lang === 'es' ? 'p.m.' : 'PM') : lang === 'es' ? 'a.m.' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "en 12 días" / "in 12 days" — used by the membership countdown. */
export function formatDaysLeft(iso: string, lang: Lang): { days: number; text: string } {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / 86_400_000));
  if (days === 0) return { days, text: lang === 'es' ? 'vence hoy' : 'expires today' };
  if (days === 1) return { days, text: lang === 'es' ? 'queda 1 día' : '1 day left' };
  return {
    days,
    text: lang === 'es' ? `quedan ${formatNumber(days, lang)} días` : `${days} days left`,
  };
}
