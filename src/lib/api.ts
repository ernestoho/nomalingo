/**
 * Typed client for the app's own API.
 *
 * Design notes that matter for a phone in Punta Cana:
 *
 *   - Every call has a timeout. Without one, a request on a captive-portal
 *     hotel wifi hangs forever and the UI just sits there — which reads as a
 *     frozen app, not a network problem.
 *   - A network failure is a distinct outcome from an HTTP error. The caller
 *     needs to tell "we are offline, use the cache" apart from "the server
 *     said no", and a thrown Error flattens that distinction.
 *   - A 401 clears the stored token exactly once, so an expired session logs
 *     you out cleanly instead of failing every subsequent request forever.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearToken, getToken } from './session';

/**
 * Where the API lives.
 *
 * On web it is same-origin, so a relative path is correct and avoids CORS
 * entirely. On device there is no origin, so it must be absolute — the
 * deployed hosting URL, overridable for local development.
 */
export const API_BASE: string = (() => {
  const override = process.env.EXPO_PUBLIC_API_BASE;
  if (override) return override.replace(/\/$/, '');
  if (Platform.OS === 'web') return '';
  const fromConfig = (Constants.expoConfig?.extra as { apiBase?: string } | undefined)?.apiBase;
  return (fromConfig ?? 'https://nomadalingo.expo.app').replace(/\/$/, '');
})();

const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'offline'; message: string }
  | { ok: false; kind: 'http'; status: number; message: string; code?: string; field?: string };

export type ApiError = Extract<ApiResult<unknown>, { ok: false }>;

let onUnauthorized: (() => void) | null = null;

/** Lets the session provider react to an expired token app-wide. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number; auth?: boolean } = {},
): Promise<ApiResult<T>> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, auth = true, ...rest } = init;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...((rest.headers as Record<string, string>) ?? {}),
    };
    if (rest.body && !headers['content-type']) headers['content-type'] = 'application/json';

    if (auth) {
      const token = await getToken();
      if (token) headers.authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    let body: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // A non-JSON body from an API route means something upstream is
        // serving HTML — usually a route that did not deploy.
        return {
          ok: false,
          kind: 'http',
          status: res.status,
          message: 'El servidor devolvió una respuesta inesperada.',
        };
      }
    }

    if (!res.ok) {
      if (res.status === 401) {
        await clearToken();
        onUnauthorized?.();
      }
      const b = (body ?? {}) as { error?: string; code?: string; field?: string };
      return {
        ok: false,
        kind: 'http',
        status: res.status,
        message: b.error ?? 'Algo salió mal.',
        code: b.code,
        field: b.field,
      };
    }

    return { ok: true, data: (body ?? {}) as T };
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    return {
      ok: false,
      kind: 'offline',
      message: aborted ? 'La conexión tardó demasiado.' : 'Sin conexión.',
    };
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, opts?: { timeoutMs?: number; auth?: boolean }) =>
    request<T>(path, { method: 'GET', ...opts }),

  post: <T>(path: string, body?: unknown, opts?: { timeoutMs?: number; auth?: boolean }) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...opts }),

  put: <T>(path: string, body?: unknown, opts?: { timeoutMs?: number; auth?: boolean }) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...opts }),

  del: <T>(path: string, body?: unknown, opts?: { timeoutMs?: number; auth?: boolean }) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined, ...opts }),
};

/* ------------------------------------------------------------------ */
/*  response shapes                                                     */
/* ------------------------------------------------------------------ */

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'member' | 'admin';
  onboarded: boolean;
  profile: Record<string, unknown>;
};

export type AuthResponse = { token: string; user: AuthUser };

export type ContentResponse = {
  venues: unknown[];
  meetups: unknown[];
  official: unknown | null;
  plans: unknown[];
  version: number;
};

export type MeStateResponse = {
  profile: Record<string, unknown>;
  onboarded: boolean;
  role: 'member' | 'admin';
  rsvps: string[];
  membership: { plan: string; until: string; startedAt: string } | null;
  tickets: unknown[];
  phrases: unknown[];
};
