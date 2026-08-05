/** Shared domain types. Every screen and the store speak these. */

/** A bilingual string. Spanish is the source of truth; English is the toggle. */
export type L = { es: string; en: string };

export type LangCode = 'ES' | 'EN' | 'FR' | 'DE' | 'IT' | 'PT' | 'JA';

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Nativo';

/** A language paired with the speaker's level in it. */
export type LangSkill = { code: LangCode; level: Level };

export type AreaName =
  | 'Bávaro'
  | 'Verón'
  | 'Cap Cana'
  | 'Downtown Punta Cana'
  | 'Arena Gorda'
  | 'Uvero Alto'
  | 'Friusa'
  | 'Cabeza de Toro'
  | 'Higüey';

export type Area = { name: AreaName; lat: number; lng: number };

export type UserKind = 'local' | 'visitor' | 'expat';

export type MeetPref = 'online' | 'inperson' | 'both';

/** Illustrative persona. Not a real person — see the honesty rules. */
export type Partner = {
  id: number;
  name: string;
  age: number;
  flag: string;
  kind: UserKind;
  area: AreaName;
  role: L;
  /** Languages they can teach. */
  teaches: LangSkill[];
  /** Languages they are learning. */
  learning: LangSkill[];
  interests: string[];
  availability: string[];
  online: boolean;
  bio: L;
  /** Deterministic avatar seed so faces stay stable across renders. */
  avatarSeed: string;
};

export type VenueType = 'coworking' | 'cafe' | 'bar' | 'beach' | 'plaza';

/**
 * A real, publicly listed place shown as an illustrative host.
 * `sponsorDeal` being present does NOT imply a signed partnership.
 */
export type Venue = {
  id: string;
  name: string;
  type: VenueType;
  area: AreaName;
  rating: number | null;
  sponsorDeal: L | null;
  amenities: string[];
  blurb: L;
  photoSeed: string;
};

export type MeetupCategory = 'Café' | 'Coworking' | 'Playa' | 'Bachata' | 'Networking';

/** A community meetup. Seeded ones and user-created ones share this shape. */
export type Meetup = {
  id: string;
  category: MeetupCategory;
  title: L;
  /** Must reference a venue in the directory — never free text. */
  venueId: string;
  area: AreaName;
  when: L;
  /** ISO date used for reminder scheduling. */
  startsAt: string;
  going: number;
  capacity: number;
  languages: LangCode[];
  attendees: number[];
  description: L;
  hostId: number | null;
  /** True for meetups the user created on-device. */
  userCreated?: boolean;
};

/** The one paid, organiser-run event. Owns the top of Home. */
export type OfficialEvent = {
  id: string;
  title: L;
  venueId: string;
  area: AreaName;
  when: L;
  startsAt: string;
  priceUsd: number;
  capacity: number;
  sold: number;
  includes: L[];
  blurb: L;
};

export type MembershipPlan = {
  id: 'monthly' | 'annual';
  label: L;
  priceUsd: number;
  days: number;
  note: L | null;
};

export type ChatMessage = {
  /** True when the partner sent it, false when the user did. */
  fromPartner: boolean;
  text: string;
  time: string;
  /** Attaches the suggested-correction card. */
  correction?: { wrong: string; right: string; why: L };
  /** Attaches an inline meetup card. */
  meetupId?: string;
  /** Scripted demo reply — surfaced to the user as such. */
  scripted?: boolean;
};

/** What onboarding writes and the whole app reads. */
export type Profile = {
  name: string;
  email: string;
  age: string;
  nationality: string;
  flag: string;
  kind: UserKind;
  native: LangCode;
  /** Additional languages the user can teach. */
  extra: LangSkill[];
  learning: LangSkill[];
  interests: string[];
  area: AreaName;
  availability: string[];
  /** Only meaningful for visitors. ISO date. */
  until: string | null;
  meetPref: MeetPref;
  bio: string;
  /** Local file URI from the image picker. */
  photo: string | null;
};

export type Ticket = {
  id: string;
  eventId: string;
  kind: 'ticket' | 'member-rsvp';
  boughtAt: string;
  /** Signed payload the organiser's scanner verifies. */
  qrPayload: string;
  usdPaid: number;
};

export type Membership = {
  plan: MembershipPlan['id'];
  /** ISO. Renewing while active extends from this, not from today. */
  until: string;
  startedAt: string;
};

export type Phrase = {
  wrong: string;
  right: string;
  why: L;
  savedAt: string;
};

export type MatchResult = {
  partner: Partner;
  score: number;
  reasons: string[];
};
