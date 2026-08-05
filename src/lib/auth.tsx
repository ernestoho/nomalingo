/**
 * Accounts and session state.
 *
 * Offline-tolerant by design. On launch the app restores the last known user
 * from cache and renders immediately, then revalidates against the server. A
 * member on a dead connection stays signed in and keeps using the app; only an
 * explicit 401 from the server signs them out.
 *
 * The alternative — blocking the UI on a session check — means the app is
 * unusable exactly when the network is worst, which is most of the time in a
 * hotel in Bávaro.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, setUnauthorizedHandler, type ApiError, type AuthResponse, type AuthUser } from './api';
import { clearToken, getToken, setToken } from './session';
import { storage } from './storage';
import { clearOutbox, flush } from './outbox';
import { checkOnline, subscribeNet } from './net';

const CACHED_USER = 'auth.user';

export type AuthState = {
  /** Null when signed out. Populated from cache before the server confirms. */
  user: AuthUser | null;
  /** True once the initial restore has finished — gates the router. */
  ready: boolean;
  /** True while a sign-in / sign-up request is in flight. */
  busy: boolean;
  online: boolean;
  isAdmin: boolean;

  signUp: (input: { email: string; password: string; name: string }) => Promise<ApiError | null>;
  signIn: (input: { email: string; password: string }) => Promise<ApiError | null>;
  signOut: () => Promise<void>;
  /** Re-read the user from the server, e.g. after a role change. */
  revalidate: () => Promise<void>;
  /** Local-only patch so screens can reflect profile edits immediately. */
  patchUser: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* ---- connectivity ---- */
  useEffect(() => subscribeNet(({ online: o }) => setOnline(o)), []);

  /* ---- an expired token anywhere signs the app out ---- */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!mounted.current) return;
      setUser(null);
      void storage.remove(CACHED_USER);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  /* ---- restore on launch ---- */
  useEffect(() => {
    (async () => {
      const [token, cached] = await Promise.all([
        getToken(),
        storage.get<AuthUser | null>(CACHED_USER, null),
      ]);

      if (!token) {
        if (mounted.current) {
          setUser(null);
          setReady(true);
        }
        return;
      }

      // Render from cache first; correctness follows.
      if (cached && mounted.current) setUser(cached);
      if (mounted.current) setReady(true);

      const res = await api.get<{ user: AuthUser }>('/api/auth/me');
      if (!mounted.current) return;

      if (res.ok) {
        setUser(res.data.user);
        void storage.set(CACHED_USER, res.data.user);
        void flush();
      }
      // On an offline result the cached user deliberately survives. On a 401
      // the handler above has already cleared it.
    })();
  }, []);

  /* ---- flush the outbox whenever the network returns ---- */
  useEffect(() => {
    if (online && user) void flush();
  }, [online, user]);

  const persist = useCallback(async (payload: AuthResponse) => {
    await setToken(payload.token);
    await storage.set(CACHED_USER, payload.user);
    if (mounted.current) setUser(payload.user);
  }, []);

  const signUp = useCallback<AuthState['signUp']>(
    async ({ email, password, name }) => {
      setBusy(true);
      try {
        if (!(await checkOnline())) {
          return { ok: false, kind: 'offline', message: 'Necesitas conexión para crear tu cuenta.' };
        }
        const res = await api.post<AuthResponse>(
          '/api/auth/signup',
          { email, password, name },
          { auth: false },
        );
        if (!res.ok) return res;
        // A fresh account must not inherit a previous user's queued writes.
        await clearOutbox();
        await persist(res.data);
        return null;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [persist],
  );

  const signIn = useCallback<AuthState['signIn']>(
    async ({ email, password }) => {
      setBusy(true);
      try {
        if (!(await checkOnline())) {
          return { ok: false, kind: 'offline', message: 'Necesitas conexión para iniciar sesión.' };
        }
        const res = await api.post<AuthResponse>(
          '/api/auth/signin',
          { email, password },
          { auth: false },
        );
        if (!res.ok) return res;
        await clearOutbox();
        await persist(res.data);
        return null;
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    // Tell the server first so the token is actually revoked, but never let a
    // network failure trap someone in a session they asked to leave.
    try {
      await api.post('/api/auth/signout');
    } catch {
      /* ignore */
    }
    await clearToken();
    await storage.remove(CACHED_USER);
    await clearOutbox();
    if (mounted.current) setUser(null);
  }, []);

  const revalidate = useCallback(async () => {
    const res = await api.get<{ user: AuthUser }>('/api/auth/me');
    if (res.ok && mounted.current) {
      setUser(res.data.user);
      void storage.set(CACHED_USER, res.data.user);
    }
  }, []);

  const patchUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      void storage.set(CACHED_USER, next);
      return next;
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      busy,
      online,
      isAdmin: user?.role === 'admin',
      signUp,
      signIn,
      signOut,
      revalidate,
      patchUser,
    }),
    [user, ready, busy, online, signUp, signIn, signOut, revalidate, patchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
