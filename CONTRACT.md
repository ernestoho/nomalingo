# NómadaLingo — build contract

Read this before writing any screen. It is the shared vocabulary; deviating
from it is what makes nineteen screens look like nineteen different apps.

Project root: `/agent/workspace/nomadalingo`. Expo SDK 57, TypeScript, Expo
Router with the router root at **`src/app`**.

---

## Brand — not open to interpretation

- Name is always **NómadaLingo**, with the accent, in every string, both
  languages. Never "NomadaLingo", never "Nomad Lingo".
- Brand line: **«Dos idiomas. Un coro.»**
- Feel: friendly, premium, tropical Caribbean. Rounded cards (16–22 radius),
  soft shadows, generous spacing. No neon gradients. **Nothing that reads like
  a dating app.**
- It is not a dating app, but that is *not the headline*. Sell the features:
  practice, friendships, networking, meetups, venues. The non-dating line
  appears in exactly two places in the whole product — one of the three
  community rules in onboarding, and one row in Settings & Safety. Nowhere
  else. Do not add guardrail messaging.

## Language

Spanish is the default and the source of truth; English is a toggle.

**Every user-visible string is written inline as a bilingual pair.** There is
no key dictionary. Import `useT` and call it:

```tsx
import { useT } from '../../lib/i18n';
const t = useT();
<Txt>{t({ es: 'Encuentros cerca de ti', en: 'Meetups near you' })}</Txt>
```

The Spanish must be **Dominican**, not neutral translation Spanish: `coro`,
`colmado`, `guagua`, `un chin`, `¿qué lo que?`. Warm and local for community
and social copy.

**Safety copy is the exception**: plain, pan-Hispanic, no slang, no emoji,
never a joke. A rule that needs cultural decoding is not a rule.

Formatting helpers live in `src/lib/i18n.tsx`: `formatNumber` (decimal comma,
dot thousands), `formatUsd`, `formatDopHint` (indicative only), `formatLongDate`,
`formatTime` (12-hour with a.m./p.m.), `formatDaysLeft`.

## Imports you will need

```tsx
// UI kit — use these, never raw Pressable/TouchableOpacity/Text
import {
  Screen, Row, Spacer, Divider, Txt, SectionHeader, PressableScale, Button,
  Card, Chip, Tag, SegmentedControl, Avatar, ScoreRing, LevelDots, ProgressBar,
  Skeleton, PartnerSkeleton, EmptyState, Field, ToggleRow, BackButton,
  ScreenHeader, Disclosure, Stat,
} from '../../components/ui';

import { color, palette, radius, space, type, font, shadow, motion, categoryTint } from '../../theme/tokens';
import { Logo, Wordmark, PinMark, Monogram } from '../../components/Logo';
import { HomeIcon, CompassIcon, CalendarIcon, ChatIcon, UserIcon, PinIcon,
         ClockIcon, UsersIcon, StarIcon, CheckIcon, PlusIcon, ChevronRight,
         SearchIcon, BellIcon, ShareIcon, ShieldIcon, VerifiedIcon, CameraIcon,
         TicketIcon, GlobeIcon, SlidersIcon, SparkIcon } from '../../components/icons';
import MapCard from '../../components/MapCard';

import { useT, useLang, formatUsd, formatNumber, formatLongDate, formatTime, formatDaysLeft, formatDopHint } from '../../lib/i18n';
import { useStore } from '../../lib/store';
import { rankPartners, score, areaDistanceKm, nearestArea } from '../../lib/match';
import * as haptics from '../../lib/haptics';
import { pickAvatar, detectArea, scheduleMeetupReminder, shareText, isWeb, isNative } from '../../lib/device';

import { PARTNERS, partnerById, avatarTint } from '../../data/partners';
import { VENUES, venueById, venueName, SPONSOR_VENUES } from '../../data/venues';
import { SEED_MEETUPS, CATEGORY_ORDER, nextWeekday } from '../../data/meetups';
import { OFFICIAL_EVENT, MEMBERSHIP_PLANS, MEMBER_PERKS, planById, FREE_LIMITS } from '../../data/official';
import { SEED_CHATS, SCRIPTED_REPLIES, STARTERS } from '../../data/chats';
import { venuePhoto, HERO_PHOTO } from '../../data/photos';
import { AREAS, AREA_NAMES, LANGUAGES, LEVELS, INTERESTS, AVAILABILITY,
         CONNECTION_MODES, MEET_PREFS, USER_KINDS, MEETUP_CATEGORIES, VENUE_TYPES,
         AMENITIES, langLabel, langFlag, levelLabel, levelDots, interestLabel,
         interestEmoji, availLabel, categoryLabel, categoryEmoji,
         venueTypeLabel, venueTypeEmoji, amenityLabel, amenityEmoji } from '../../data/reference';
```

Adjust `../../` depth to the file's location.

## Store API (`useStore()`)

```
ready, profile, hasProfile, onboarded
updateProfile(patch), completeOnboarding(profile)
meetups, findMeetup(id), createMeetup(m), rsvps, isGoing(id), toggleRsvp(id)
getChat(partnerId), sendMessage(partnerId, text), appendMessage(partnerId, msg)
isUnread(partnerId), markRead(partnerId), chatPartnerIds
phrases, addPhrase({wrong,right,why}), removePhrase(index)
settings, setSetting(key, value)
membership, isMember, activateMembership(planId)
tickets, hasTicketFor(eventId), issueTicket(eventId, kind, usdPaid)
usageKb, refreshUsage(), resetDemoData()
```

Settings keys: `showArea, discoverable, readReceipts, notifySuggestions,
notifyEvents, notifyCorrections`.

Screens **never** import AsyncStorage or `../lib/storage` directly.

## Types

All in `src/data/types.ts`. Note the shapes:
`LangSkill = { code, level }`, `Partner.teaches/learning: LangSkill[]`,
`L = { es, en }`, `Meetup.venueId` (never free text), `Profile.learning: LangSkill[]`.

## Matching

`rankPartners(PARTNERS, profile, lang)` → `{ partner, score, reasons }[]`,
already sorted. Show the score as `NN%` and join `reasons` with ` · `.
Never show a score without its reasons.

## Premium feel — required, audited

- Everything tappable is `PressableScale` or `Button`. **Never**
  `TouchableOpacity`, never a bare `Pressable`.
- Haptics confirm **state changes and decisions only** — RSVP, toggle, purchase,
  completing an onboarding step. Never navigation, never scrolling.
  `PressableScale` already fires a selection tick; do not double up.
- Loading uses `Skeleton` / `PartnerSkeleton`, never a bare spinner.
- Empty states use `EmptyState` and teach: say what goes here and offer the one
  action that fills it.
- Never request a permission on mount. An empty state or an explicit button
  earns the prompt first.
- Lists: `FlatList` with `keyExtractor`, `contentContainerStyle` padding.
  Horizontal rails get `showsHorizontalScrollIndicator={false}`.
- Screen horizontal padding is `space.base` (16).

## Honesty rules — keep these in the product

Use the `<Disclosure>` component, quietly, where relevant:
- Venues are real, publicly listed places shown as **illustrative hosts**.
  Never imply a signed partnership. Sponsor deals are illustrative.
- Member profiles are **illustrative personas**, not real people.
- Scripted chat replies are labelled as demo behaviour.
- Practical info researched in 2026 and subject to change.
- Credit the real local precedent: the **Nómada Language Social Club**, founded
  in Punta Cana in February 2026 by **Jennifer Ventura**.

## Payments — NOT wired up in this build

The user chose to skip PayPal. Build the money screens fully, but:
- Checkout shows a clear, calm notice that payments are not connected yet and
  this confirms locally so the rest of the flow can be tried.
- `issueTicket` / `activateMembership` grant the entitlement locally. They are
  already idempotent.
- Do **not** write PayPal API calls, and do not invent a server URL.

## Navigation

`expo-router`, typed routes. Use `router.push('/venue/pyhex')`,
`useLocalSearchParams()`, `router.back()`.

Routes that exist:
```
/(onboarding)/welcome  /(onboarding)/auth  /(onboarding)/steps
/(tabs)                /(tabs)/discover    /(tabs)/meetups
/(tabs)/inbox          /(tabs)/profile
/chat/[id]     /event/[id]    /venue/[id]    /official/[id]
/create-meetup /membership    /checkout      /wallet
/edit-profile  /settings      /scan
```

Header on stack screens: `<ScreenHeader title="…" onBack={() => router.back()} />`.

## Do not

- Do not run npm install, expo start, or expo export. The orchestrator does that.
- Do not edit files outside the ones you are told to create.
- Do not add dependencies. Everything you need is installed.
- Do not create `+api.ts` files.
