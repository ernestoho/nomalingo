/**
 * The single store every screen talks to.
 *
 * Optimistic by design: state updates first, the adapter write happens behind
 * it. On a phone with patchy Punta Cana wifi, waiting on a write to render a
 * tapped RSVP is the difference between "instant" and "laggy".
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SEED_MEETUPS } from '../../data/meetups';
import { SEED_CHATS } from '../../data/chats';
import { MEMBERSHIP_PLANS, OFFICIAL_EVENT, planById } from '../../data/official';
import type {
  ChatMessage,
  Meetup,
  Membership,
  MembershipPlan,
  Phrase,
  Profile,
  Ticket,
} from '../../data/types';
import { DEFAULT_SETTINGS, type Settings, type StoreAdapter } from './adapter';
import { LocalAdapter } from './local';
import { signQrPayload } from '../qr';
import { useAuth } from '../auth';
import { useSync } from '../content-sync';
import { enqueue, flush, hasPendingKind } from '../outbox';
import { api, type MeStateResponse } from '../api';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  email: '',
  age: '25–34',
  nationality: '',
  flag: '🌎',
  kind: 'visitor',
  native: 'EN',
  extra: [],
  learning: [{ code: 'ES', level: 'A2' }],
  interests: [],
  area: 'Bávaro',
  availability: [],
  until: null,
  meetPref: 'both',
  bio: '',
  photo: null,
};

type StoreValue = {
  ready: boolean;

  profile: Profile;
  hasProfile: boolean;
  onboarded: boolean;
  updateProfile: (patch: Partial<Profile>) => void;
  completeOnboarding: (profile: Profile) => void;

  meetups: Meetup[];
  findMeetup: (id: string) => Meetup | null;
  createMeetup: (m: Omit<Meetup, 'id' | 'userCreated'>) => Meetup;
  rsvps: string[];
  isGoing: (id: string) => boolean;
  toggleRsvp: (id: string) => boolean;

  getChat: (partnerId: number) => ChatMessage[];
  sendMessage: (partnerId: number, text: string) => void;
  appendMessage: (partnerId: number, msg: ChatMessage) => void;
  isUnread: (partnerId: number) => boolean;
  markRead: (partnerId: number) => void;
  chatPartnerIds: number[];

  phrases: Phrase[];
  addPhrase: (p: Omit<Phrase, 'savedAt'>) => void;
  removePhrase: (index: number) => void;

  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;

  membership: Membership | null;
  isMember: boolean;
  activateMembership: (planId: MembershipPlan['id']) => Membership;

  tickets: Ticket[];
  hasTicketFor: (eventId: string) => boolean;
  issueTicket: (eventId: string, kind: Ticket['kind'], usdPaid: number) => Ticket;

  usageKb: number;
  refreshUsage: () => void;
  /** Re-read server-owned state: RSVPs, membership, tickets, phrases. */
  refreshMe: () => Promise<void>;
  resetDemoData: () => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

const adapter: StoreAdapter = new LocalAdapter();

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // `revision` changes whenever admin-edited content lands, which is what makes
  // the derived lists below recompute without any screen knowing about sync.
  const { revision } = useSync();
  const { user, patchUser } = useAuth();

  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [hasProfile, setHasProfile] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [createdMeetups, setCreatedMeetups] = useState<Meetup[]>([]);
  const [rsvps, setRsvps] = useState<string[]>([]);
  const [chats, setChats] = useState<Record<number, ChatMessage[]>>({});
  const [readChats, setReadChats] = useState<number[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [usageKb, setUsageKb] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const snap = await adapter.load();
      if (!alive) return;
      setProfile(snap.profile ?? DEFAULT_PROFILE);
      setHasProfile(snap.profile !== null);
      setOnboarded(snap.onboarded);
      setCreatedMeetups(snap.createdMeetups);
      setRsvps(snap.rsvps);
      setChats(snap.chats);
      setReadChats(snap.readChats);
      setPhrases(snap.phrases);
      setSettings(snap.settings);
      setMembership(snap.membership);
      setTickets(snap.tickets);
      setUsageKb(await adapter.usageKb());
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Hydrate from the server once signed in.
   *
   * Runs after the local load, so the app is already interactive with cached
   * data when this lands. Server state wins for anything the server owns —
   * RSVPs, membership, tickets, phrases — because those are now real records
   * rather than device-local guesses. Settings and chats stay device-local.
   *
   * On an offline result nothing is overwritten: stale local data beats an
   * empty screen.
   */
  const refreshMe = useCallback(async () => {
    // Push anything queued offline before reading, so we don't immediately
    // overwrite a pending local change with older server state.
    await flush();
    const res = await api.get<MeStateResponse>('/api/me/state');
    if (!res.ok) return;
    {
      const alive = true;

      const s = res.data;

      // Belt and braces: even after flushing, refuse to overwrite the local
      // profile while a profile write is still queued. Losing a just-completed
      // onboarding to a stale server read is the worst bug in this whole path.
      const profilePending = await hasPendingKind('profile');
      if (!alive) return;

      if (!profilePending && s.profile && Object.keys(s.profile).length) {
        setProfile((prev) => ({ ...prev, ...(s.profile as Partial<Profile>) }));
        setHasProfile(true);
      }
      setOnboarded(Boolean(s.onboarded));
      setRsvps(s.rsvps ?? []);
      setMembership((s.membership as Membership | null) ?? null);
      setTickets((s.tickets as Ticket[]) ?? []);
      setPhrases((s.phrases as Phrase[]) ?? []);

      // Mirror locally so the next cold start has it before the network does.
      void adapter.saveRsvps(s.rsvps ?? []);
      void adapter.saveMembership((s.membership as Membership | null) ?? null);
      void adapter.saveTickets((s.tickets as Ticket[]) ?? []);
      void adapter.savePhrases((s.phrases as Phrase[]) ?? []);
      void adapter.setOnboarded(Boolean(s.onboarded));
    }
  }, []);

  /** Pull server-owned state whenever the signed-in user changes. */
  useEffect(() => {
    if (!user) return;
    void refreshMe();
  }, [user, refreshMe]);

  /* ---------- profile ---------- */

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        void adapter.saveProfile(next);
        // Queued rather than sent directly: an edit made in a dead zone still
        // reaches the server, and the outbox collapses rapid edits into one.
        // Chained, not fired side by side: flush must observe the queued item,
        // and storage writes are async.
        void enqueue({
          kind: 'profile',
          profile: next as unknown as Record<string, unknown>,
        }).then(flush);
        if (typeof patch.name === 'string') patchUser({ name: patch.name });
        return next;
      });
      setHasProfile(true);
    },
    [patchUser],
  );

  const completeOnboarding = useCallback(
    (p: Profile) => {
      setProfile(p);
      setHasProfile(true);
      setOnboarded(true);
      void adapter.saveProfile(p);
      void adapter.setOnboarded(true);
      void enqueue({
        kind: 'profile',
        profile: p as unknown as Record<string, unknown>,
        onboarded: true,
      }).then(flush);
      patchUser({ name: p.name, onboarded: true });
    },
    [patchUser],
  );

  /* ---------- meetups ---------- */

  const meetups = useMemo(
    () =>
      // SEED_MEETUPS is the registry's live array. Locally-created meetups are
      // merged ahead of it and de-duplicated by id, because once the outbox
      // flushes the same meetup also arrives from the server.
      (() => {
        const merged = [...createdMeetups, ...SEED_MEETUPS];
        const seen = new Set<string>();
        return merged
          .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      })(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createdMeetups, revision],
  );

  const findMeetup = useCallback(
    (id: string) => meetups.find((m) => m.id === id) ?? null,
    [meetups],
  );

  const createMeetup = useCallback((m: Omit<Meetup, 'id' | 'userCreated'>) => {
    // The id is generated here, not by the server, so a meetup created offline
    // keeps its identity when the outbox flushes and cannot be duplicated.
    const created: Meetup = { ...m, id: `u${Date.now().toString(36)}`, userCreated: true };
    setCreatedMeetups((prev) => {
      const next = [created, ...prev];
      void adapter.saveCreatedMeetups(next);
      return next;
    });
    // Creating a meetup implies attending it.
    setRsvps((prev) => {
      if (prev.includes(created.id)) return prev;
      const next = [...prev, created.id];
      void adapter.saveRsvps(next);
      return next;
    });

    void (async () => {
      await enqueue({
        kind: 'meetup',
        payload: {
          id: created.id,
          category: created.category,
          title: created.title,
          venueId: created.venueId,
          when: created.when,
          startsAt: created.startsAt,
          capacity: created.capacity,
          languages: created.languages,
          description: created.description,
        },
      });
      // Ordered: the meetup must exist server-side before its RSVP.
      await enqueue({ kind: 'rsvp', meetupId: created.id, going: true });
      await flush();
    })();

    return created;
  }, []);

  const isGoing = useCallback((id: string) => rsvps.includes(id), [rsvps]);

  const toggleRsvp = useCallback((id: string) => {
    let nowGoing = false;
    setRsvps((prev) => {
      const has = prev.includes(id);
      nowGoing = !has;
      const next = has ? prev.filter((x) => x !== id) : [...prev, id];
      void adapter.saveRsvps(next);
      return next;
    });
    // Optimistic: the UI already moved. The queue makes it true.
    void enqueue({ kind: 'rsvp', meetupId: id, going: nowGoing }).then(flush);
    return nowGoing;
  }, []);

  /* ---------- chats ---------- */

  const getChat = useCallback(
    (partnerId: number) => chats[partnerId] ?? SEED_CHATS[partnerId] ?? [],
    [chats],
  );

  const appendMessage = useCallback(
    (partnerId: number, msg: ChatMessage) => {
      setChats((prev) => {
        const current = prev[partnerId] ?? SEED_CHATS[partnerId] ?? [];
        const next = { ...prev, [partnerId]: [...current, msg] };
        void adapter.saveChat(partnerId, next[partnerId]);
        return next;
      });
    },
    [],
  );

  const sendMessage = useCallback(
    (partnerId: number, text: string) => {
      const now = new Date();
      let h = now.getHours();
      const suffix = h >= 12 ? 'p.m.' : 'a.m.';
      h = h % 12 || 12;
      appendMessage(partnerId, {
        fromPartner: false,
        text,
        time: `${h}:${String(now.getMinutes()).padStart(2, '0')} ${suffix}`,
      });
    },
    [appendMessage],
  );

  const isUnread = useCallback(
    (partnerId: number) => {
      const msgs = chats[partnerId] ?? SEED_CHATS[partnerId] ?? [];
      if (!msgs.length) return false;
      return !readChats.includes(partnerId);
    },
    [chats, readChats],
  );

  const markRead = useCallback((partnerId: number) => {
    setReadChats((prev) => {
      if (prev.includes(partnerId)) return prev;
      const next = [...prev, partnerId];
      void adapter.saveReadChats(next);
      return next;
    });
  }, []);

  const chatPartnerIds = useMemo(() => {
    const ids = new Set<number>([
      ...Object.keys(SEED_CHATS).map(Number),
      ...Object.keys(chats).map(Number),
    ]);
    return [...ids].filter((id) => (chats[id] ?? SEED_CHATS[id] ?? []).length > 0);
  }, [chats]);

  /* ---------- phrasebook ---------- */

  const addPhrase = useCallback((p: Omit<Phrase, 'savedAt'>) => {
    setPhrases((prev) => {
      if (prev.some((x) => x.wrong === p.wrong && x.right === p.right)) return prev;
      const next = [{ ...p, savedAt: new Date().toISOString() }, ...prev];
      void adapter.savePhrases(next);
      // The phrasebook is the one thing people would be upset to lose, so it
      // syncs like everything else rather than living only on the device.
      void enqueue({
        kind: 'phrase.add',
        wrong: p.wrong,
        right: p.right,
        why: p.why,
      }).then(flush);
      return next;
    });
  }, []);

  const removePhrase = useCallback((index: number) => {
    setPhrases((prev) => {
      const gone = prev[index];
      const next = prev.filter((_, i) => i !== index);
      void adapter.savePhrases(next);
      if (gone) {
        void enqueue({
          kind: 'phrase.remove',
          wrong: gone.wrong,
          right: gone.right,
        }).then(flush);
      }
      return next;
    });
  }, []);

  /* ---------- settings ---------- */

  const setSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        void adapter.saveSettings(next);
        return next;
      });
    },
    [],
  );

  /* ---------- membership ---------- */

  const isMember = useMemo(
    () => membership !== null && new Date(membership.until).getTime() > Date.now(),
    [membership],
  );

  const activateMembership = useCallback((planId: MembershipPlan['id']) => {
    const plan = planById(planId);
    // Renewing while still active extends from the existing expiry, so renewing
    // early never costs the user the days they already paid for.
    const base =
      membership && new Date(membership.until).getTime() > Date.now()
        ? new Date(membership.until)
        : new Date();
    const until = new Date(base.getTime() + plan.days * 86_400_000).toISOString();
    const next: Membership = {
      plan: planId,
      until,
      startedAt: membership?.startedAt ?? new Date().toISOString(),
    };
    setMembership(next);
    void adapter.saveMembership(next);
    return next;
  }, [membership]);

  /* ---------- tickets ---------- */

  const hasTicketFor = useCallback(
    (eventId: string) => tickets.some((t) => t.eventId === eventId),
    [tickets],
  );

  const issueTicket = useCallback(
    (eventId: string, kind: Ticket['kind'], usdPaid: number) => {
      const existing = tickets.find((t) => t.eventId === eventId);
      // Idempotent: a double-tap cannot mint two tickets for the same event.
      if (existing) return existing;

      const id = `t_${eventId}_${Date.now().toString(36)}`;
      const ticket: Ticket = {
        id,
        eventId,
        kind,
        boughtAt: new Date().toISOString(),
        usdPaid,
        qrPayload: signQrPayload({ ticketId: id, eventId, holder: profile.name || 'invitado' }),
      };
      setTickets((prev) => {
        const next = [ticket, ...prev];
        void adapter.saveTickets(next);
        return next;
      });
      return ticket;
    },
    [tickets, profile.name],
  );

  /* ---------- misc ---------- */

  const refreshUsage = useCallback(() => {
    void adapter.usageKb().then(setUsageKb);
  }, []);

  const resetDemoData = useCallback(async () => {
    await adapter.reset();
    setProfile(DEFAULT_PROFILE);
    setHasProfile(false);
    setOnboarded(false);
    setCreatedMeetups([]);
    setRsvps([]);
    setChats({});
    setReadChats([]);
    setPhrases([]);
    setSettings(DEFAULT_SETTINGS);
    setMembership(null);
    setTickets([]);
    setUsageKb(await adapter.usageKb());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      profile,
      hasProfile,
      onboarded,
      updateProfile,
      completeOnboarding,
      meetups,
      findMeetup,
      createMeetup,
      rsvps,
      isGoing,
      toggleRsvp,
      getChat,
      sendMessage,
      appendMessage,
      isUnread,
      markRead,
      chatPartnerIds,
      phrases,
      addPhrase,
      removePhrase,
      settings,
      setSetting,
      membership,
      isMember,
      activateMembership,
      tickets,
      hasTicketFor,
      issueTicket,
      usageKb,
      refreshUsage,
      refreshMe,
      resetDemoData,
    }),
    [
      ready, profile, hasProfile, onboarded, updateProfile, completeOnboarding,
      meetups, findMeetup, createMeetup, rsvps, isGoing, toggleRsvp,
      getChat, sendMessage, appendMessage, isUnread, markRead, chatPartnerIds,
      phrases, addPhrase, removePhrase, settings, setSetting,
      membership, isMember, activateMembership, tickets, hasTicketFor, issueTicket,
      usageKb, refreshUsage, refreshMe, resetDemoData,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export { OFFICIAL_EVENT, MEMBERSHIP_PLANS };
export type { Settings };
