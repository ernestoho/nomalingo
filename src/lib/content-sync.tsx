/**
 * Keeps app content in step with the database.
 *
 * How an admin edit reaches a phone, in order of cost:
 *
 *   1. Bundled seed renders instantly on a cold install, offline.
 *   2. Cached content from the last sync replaces it on launch.
 *   3. A full fetch replaces that as soon as the network allows.
 *   4. While the app is foregrounded, a tiny version endpoint is polled; a
 *      full refetch happens only when the number actually changes.
 *   5. Returning to the foreground triggers a version check immediately.
 *
 * Not a websocket, and deliberately so: EAS Hosting runs on Cloudflare Workers,
 * which cannot hold a persistent connection without Durable Objects. Polling a
 * few bytes every half minute is the honest engineering answer here, and in
 * practice an edit shows up within seconds.
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
import { AppState, type AppStateStatus } from 'react-native';
import { api, type ContentResponse } from './api';
import { storage } from './storage';
import { applyContent, contentSource, subscribeContent } from '../data/registry';
import { subscribeNet } from './net';

const CACHE_KEY = 'content.cache';
const POLL_MS = 30_000;

export type SyncState = {
  /** Bumped whenever live content changes, so consumers can re-render. */
  revision: number;
  syncing: boolean;
  lastSyncAt: number | null;
  /** 'seed' before any sync, then 'cache' or 'server'. */
  source: 'seed' | 'cache' | 'server';
  online: boolean;
  refresh: () => Promise<void>;
};

const SyncContext = createContext<SyncState | null>(null);

export function ContentSyncProvider({ children }: { children: React.ReactNode }) {
  const [revision, setRevision] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [online, setOnline] = useState(true);

  const knownVersion = useRef<number>(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /* Any registry change bumps the revision, which re-renders the tree. */
  useEffect(() => subscribeContent(() => setRevision((r) => r + 1)), []);
  useEffect(() => subscribeNet(({ online: o }) => setOnline(o)), []);

  const fetchContent = useCallback(async () => {
    if (mounted.current) setSyncing(true);
    try {
      const res = await api.get<ContentResponse>('/api/content', { auth: false });
      if (!res.ok) return;

      applyContent(
        {
          venues: res.data.venues as never,
          meetups: res.data.meetups as never,
          plans: res.data.plans as never,
          official: res.data.official as never,
          version: res.data.version,
        },
        'server',
      );
      knownVersion.current = res.data.version ?? 0;
      await storage.set(CACHE_KEY, res.data);
      if (mounted.current) setLastSyncAt(Date.now());
    } finally {
      if (mounted.current) setSyncing(false);
    }
  }, []);

  /* Boot: cache first, then network. */
  useEffect(() => {
    (async () => {
      const cached = await storage.get<ContentResponse | null>(CACHE_KEY, null);
      if (cached) {
        applyContent(
          {
            venues: cached.venues as never,
            meetups: cached.meetups as never,
            plans: cached.plans as never,
            official: cached.official as never,
            version: cached.version,
          },
          'cache',
        );
        knownVersion.current = cached.version ?? 0;
      }
      await fetchContent();
    })();
  }, [fetchContent]);

  /* Cheap version poll while foregrounded. */
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const checkVersion = async () => {
      const res = await api.get<{ version: number }>('/api/content/version', { auth: false });
      if (!res.ok) return;
      if (res.data.version !== knownVersion.current) {
        await fetchContent();
      }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(() => void checkVersion(), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void checkVersion();
        start();
      } else {
        stop();
      }
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      stop();
      sub.remove();
    };
  }, [fetchContent]);

  const value = useMemo<SyncState>(
    () => ({
      revision,
      syncing,
      lastSyncAt,
      source: contentSource(),
      online,
      refresh: fetchContent,
    }),
    [revision, syncing, lastSyncAt, online, fetchContent],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <ContentSyncProvider>');
  return ctx;
}
