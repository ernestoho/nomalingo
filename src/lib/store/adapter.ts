/**
 * The persistence contract.
 *
 * Screens never import storage, AsyncStorage, or fetch. They call the store,
 * the store calls an adapter, and the adapter decides where bytes live.
 * Today that is LocalAdapter (device only). Adding a backend means writing an
 * ApiAdapter with these same methods and changing one line in the provider —
 * no screen changes, which is the entire point of the seam.
 */

import type {
  ChatMessage,
  Meetup,
  Membership,
  Phrase,
  Profile,
  Ticket,
} from '../../data/types';

export type Settings = {
  showArea: boolean;
  discoverable: boolean;
  readReceipts: boolean;
  notifySuggestions: boolean;
  notifyEvents: boolean;
  notifyCorrections: boolean;
};

export type Snapshot = {
  profile: Profile | null;
  onboarded: boolean;
  createdMeetups: Meetup[];
  rsvps: string[];
  chats: Record<number, ChatMessage[]>;
  readChats: number[];
  phrases: Phrase[];
  settings: Settings;
  membership: Membership | null;
  tickets: Ticket[];
};

export interface StoreAdapter {
  /** Load everything the app needs at boot, in one round trip. */
  load(): Promise<Snapshot>;

  saveProfile(profile: Profile): Promise<void>;
  setOnboarded(value: boolean): Promise<void>;

  saveCreatedMeetups(meetups: Meetup[]): Promise<void>;
  saveRsvps(ids: string[]): Promise<void>;

  saveChat(partnerId: number, messages: ChatMessage[]): Promise<void>;
  saveReadChats(ids: number[]): Promise<void>;

  savePhrases(phrases: Phrase[]): Promise<void>;
  saveSettings(settings: Settings): Promise<void>;

  saveMembership(membership: Membership | null): Promise<void>;
  saveTickets(tickets: Ticket[]): Promise<void>;

  usageKb(): Promise<number>;
  reset(): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = {
  showArea: true,
  discoverable: true,
  readReceipts: false,
  notifySuggestions: true,
  notifyEvents: true,
  notifyCorrections: true,
};
