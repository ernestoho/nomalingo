/**
 * Device-only adapter. Everything the user creates survives a force-quit
 * because every mutation writes through immediately — there is no "save"
 * button anywhere in the app and there should not be one.
 */

import { storage } from '../storage';
import { DEFAULT_SETTINGS, type Settings, type Snapshot, type StoreAdapter } from './adapter';
import type { ChatMessage, Meetup, Membership, Phrase, Profile, Ticket } from '../../data/types';

const K = {
  profile: 'profile',
  onboarded: 'onboarded',
  created: 'created',
  rsvps: 'rsvps',
  chats: 'chats',
  readChats: 'readChats',
  phrases: 'phrases',
  settings: 'settings',
  membership: 'membership',
  tickets: 'tickets',
} as const;

export class LocalAdapter implements StoreAdapter {
  async load(): Promise<Snapshot> {
    const [
      profile,
      onboarded,
      createdMeetups,
      rsvps,
      chats,
      readChats,
      phrases,
      settings,
      membership,
      tickets,
    ] = await Promise.all([
      storage.get<Profile | null>(K.profile, null),
      storage.get<boolean>(K.onboarded, false),
      storage.get<Meetup[]>(K.created, []),
      storage.get<string[]>(K.rsvps, []),
      storage.get<Record<number, ChatMessage[]>>(K.chats, {}),
      storage.get<number[]>(K.readChats, []),
      storage.get<Phrase[]>(K.phrases, []),
      storage.get<Settings>(K.settings, DEFAULT_SETTINGS),
      storage.get<Membership | null>(K.membership, null),
      storage.get<Ticket[]>(K.tickets, []),
    ]);

    return {
      profile,
      onboarded,
      createdMeetups,
      rsvps,
      chats,
      readChats,
      phrases,
      // Merge so a settings key added in a later version does not come back
      // undefined for someone who onboarded on an older build.
      settings: { ...DEFAULT_SETTINGS, ...settings },
      membership,
      tickets,
    };
  }

  saveProfile = (profile: Profile) => storage.set(K.profile, profile).then(() => undefined);
  setOnboarded = (v: boolean) => storage.set(K.onboarded, v).then(() => undefined);
  saveCreatedMeetups = (m: Meetup[]) => storage.set(K.created, m).then(() => undefined);
  saveRsvps = (ids: string[]) => storage.set(K.rsvps, ids).then(() => undefined);
  saveReadChats = (ids: number[]) => storage.set(K.readChats, ids).then(() => undefined);
  savePhrases = (p: Phrase[]) => storage.set(K.phrases, p).then(() => undefined);
  saveSettings = (s: Settings) => storage.set(K.settings, s).then(() => undefined);
  saveMembership = (m: Membership | null) => storage.set(K.membership, m).then(() => undefined);
  saveTickets = (t: Ticket[]) => storage.set(K.tickets, t).then(() => undefined);

  async saveChat(partnerId: number, messages: ChatMessage[]): Promise<void> {
    const all = await storage.get<Record<number, ChatMessage[]>>(K.chats, {});
    all[partnerId] = messages;
    await storage.set(K.chats, all);
  }

  usageKb = () => storage.usageKb();

  async reset(): Promise<void> {
    // Language preference deliberately survives a demo reset — wiping the UI
    // into a language the user cannot read is a hostile way to handle it.
    const lang = await storage.get<string | null>('lang', null);
    await storage.clearAll();
    if (lang) await storage.set('lang', lang);
  }
}
