# NómadaLingo

A language-exchange and community app for Punta Cana, Dominican Republic.
Digital nomads, expats, travellers and Dominicans practising languages together.

Native iOS + Android via Expo (managed workflow, TypeScript, Expo Router), with
the same codebase deployed to the web.

- **Live web build:** https://nomadalingo.expo.app
- **EAS project:** `@remoto/nomadalingo`
- **Brand line:** «Dos idiomas. Un coro.»

The name always carries the accent — **NómadaLingo** — in every language, every
string, the app name and the splash.

---

## Setup

```sh
npm install
npx expo start           # dev server; press a / i / w
npm run typecheck        # tsc --noEmit
```

Requires Node 20+. Everything is a config plugin, so there is no `ios/` or
`android/` directory to maintain — EAS generates them at build time.

---

## Project layout

```
src/
  app/                    Expo Router root (routes only — nothing else lives here)
    _layout.tsx           fonts, providers, splash hold, stack config
    index.tsx             boot gate: onboarding vs tabs
    (onboarding)/         welcome · auth · steps
    (tabs)/               index (Home) · discover · meetups · inbox · profile
    chat/[id].tsx         event/[id].tsx      venue/[id].tsx
    official/[id].tsx     create-meetup.tsx   membership.tsx
    checkout.tsx          wallet.tsx          scan.tsx
    edit-profile.tsx      settings.tsx
  components/             Logo, ui kit, icons, MapCard, PartnerCard
  theme/tokens.ts         the only file holding colour/spacing/type values
  lib/                    i18n, store, match, device, haptics, qr, storage
  data/                   areas, venues, personas, meetups, official event
assets/img/               bundled photography
```

**Routes only in the router root.** A component or helper placed under
`src/app` becomes a route. This also matters for API routes later: a `+api.ts`
outside `src/app` is silently ignored — the export succeeds, prints no API
routes, and the endpoint 404s in production with nothing in the logs.

---

## Architecture

### The store seam

Every byte of persistence goes through one module:

```
screens → useStore() → StoreAdapter → LocalAdapter → AsyncStorage
```

Screens never import `AsyncStorage` or `lib/storage`. Adding a backend means
writing an `ApiAdapter` that implements `StoreAdapter` (`src/lib/store/adapter.ts`)
and changing one line in `src/lib/store/index.tsx`:

```ts
const adapter: StoreAdapter = new LocalAdapter();   // → new ApiAdapter(baseUrl)
```

No screen changes. That is the entire point of the seam.

Writes are optimistic: state updates first, persistence follows. On patchy
Punta Cana wifi, waiting on a write before rendering a tapped RSVP is the
difference between "instant" and "laggy".

### Language

Spanish is the default and the source of truth; English is a toggle, persisted,
reachable from the welcome screen and Settings.

Strings are written inline as `{ es, en }` pairs at their point of use rather
than looked up from a key dictionary:

```tsx
const t = useT();
<Txt>{t({ es: 'Encuentros cerca de ti', en: 'Meetups near you' })}</Txt>
```

A key dictionary makes it easy to ship a screen whose English silently falls
back to Spanish. With pairs, a missing translation is a type error.

The Spanish is Dominican, not neutral translation Spanish — `coro`, `colmado`,
`guagua`, `un chin`, `¿qué lo que?`. **Safety copy is the deliberate exception:**
plain, pan-Hispanic, no slang, no emoji, never a joke. A rule that needs
cultural decoding is not a rule.

Numbers are formatted by hand (`formatNumber`), not with `toLocaleString`.
Hermes ships without full ICU on Android unless you opt in, so
`toLocaleString('es-DO')` silently returns US formatting — invisible in a
browser, wrong on the phone.

### Matching

`src/lib/match.ts`. Recomputed from the saved profile on every render, never
cached, so editing your profile visibly reorders Home.

| Signal | Points |
|---|---|
| They teach a language you're learning | Nativo 46 · C1/C2 37 · B2 28 · else 18 |
| They're learning a language you teach | 36 |
| Shared interests | 5 each, capped at 15 |
| Same area | 9 |
| Within 9 km | 5 |
| Schedules overlap | 4 |

Capped at 99. There is no appearance input and no field for one.

Distance is a haversine between real area centroids. **Bávaro and Friusa are
0.105 km apart**, so the `< 1.5 km` branch is load-bearing: without it the UI
renders "A 0 km de ti", which reads as a bug. Every score ships with its
reasons — a number with no explanation is what makes recommendation UIs feel
arbitrary.

### Platform splits

`MapCard.native.tsx` / `MapCard.web.tsx` — `react-native-maps` has no web build,
so the split is by filename, not a runtime `Platform` check. A runtime check
still pulls the module into the web bundle and breaks it.

Camera (`scan.tsx`) is dynamically imported and only on native; the web build
gets a paste-and-verify fallback so the screen stays testable.

Haptics degrade to no-ops off-device. They are only genuinely felt on a real
phone — not on web, not in a simulator.

---

## What is real and what is illustrative

These distinctions are kept in the product, not just in this file.

- **Venues are real, publicly listed places** in Punta Cana, shown as
  illustrative hosts. Nothing implies a signed partnership, and sponsor deals
  are illustrative until real agreements exist. Venue photos are category
  images, not photographs of the specific businesses.
- **Member profiles are illustrative personas**, not real people. Avatars are
  drawn from initials rather than faces — putting invented faces on invented
  people is the part that would actually mislead someone.
- **Chat replies are scripted** and labelled as demo replies in the UI.
- Practical information was researched in 2026 and changes.
- Credit where it is due: the real local precedent is the **Nómada Language
  Social Club**, founded in Punta Cana in February 2026 by **Jennifer Ventura**.

---

## Payments — mock gateway, real plumbing

Superseded by the "Payments (still mock)" section above; kept here for the
membership rules and the PayPal notes, which still apply.

Orders, entitlements and tickets are now genuine database records. The only
simulated step is the card charge itself.

Membership is **one-time with an expiry, never auto-renewing**. Renewing while
active extends from the existing expiry, not from today, so renewing early
never costs the user days they paid for. Plans: US$7 / 30 days, US$49 / 365 days.
Prices are USD; any DOP figure is an indicative conversion only.

### Wiring PayPal for real

**Never let the client decide a payment succeeded.** A client-side-only
integration is defeated with devtools in seconds and hands out free tickets and
free membership. Amount and entitlement are decided server-side.

There is no maintained Expo-compatible PayPal SDK. Use this flow:

1. `expo.web.output` is already `"server"` and the API routes already exist.
2. Replace the stub inside these, keeping everything around them:
   - `src/app/api/checkout/create-order+api.ts` — already resolves the price
     server-side; add the PayPal order creation and return their approve URL
     instead of `/mock-pay`.
   - `src/app/api/checkout/capture+api.ts` — already idempotent on the order id
     and already writes the entitlement; add the PayPal capture call.
   - `src/app/api/checkout/webhook+api.ts` — **still to write.** Verify
     PayPal's signature; handle refunds and disputes.
3. In the app, open the approve URL with
   `WebBrowser.openAuthSessionAsync(approveUrl, 'nomadalingo://paypal-return')`.
   The `nomadalingo` scheme is already configured.
4. Confirm the export prints an `API routes (n)` line. A successful export
   without that section means nothing server-side shipped.

The server runtime is **Cloudflare Workers, not Node**: no `child_process`, no
real filesystem, no raw TCP database drivers. Use `crypto.subtle` and an
HTTP-accessible database (Neon, Turso, PlanetScale, Supabase, D1).

### Ticket QR

`src/lib/qr.ts` produces a versioned, tamper-evident payload with the exact
shape the real one will have. **The current signature is an FNV-1a checksum,
not a cryptographic signature** — it detects corruption and casual edits, but
would not stop a determined forger. A real HMAC needs a secret, and a secret
cannot live in a client bundle.

When the backend lands, `signQrPayload` moves server-side and this module keeps
only `parseQrPayload` / `verifyQrPayload`. The payload format does not change,
so the organiser's scanner does not change either.

---

## Accounts, database and admin

The app is backed by **Neon Postgres**, reached from Expo Router API routes
running on Cloudflare Workers.

### Where things live

```
src/server/          server-only code (never imported by a screen)
  db.ts              Neon HTTP client — @neondatabase/serverless
  crypto.ts          PBKDF2 hashing, session tokens, HMAC ticket signing
  http.ts            responses, validation, session lookup, rate limiting
src/app/api/         the endpoints (25 of them)
  auth/              signup · signin · signout · me
  content+api.ts     all public content in one call
  content/version    tiny poll endpoint that drives live updates
  me/                state · profile
  checkout/          create-order · capture · order
  tickets/verify     door scanner
  admin/             overview · venues · meetups · official · plans · users
scripts/db/
  schema.sql         the whole schema, every object fully qualified
  migrate.ts         idempotent apply + seed
```

Everything is inside a dedicated **`nomadalingo` schema**, so the database can
be shared with other projects safely.

> **Do not rely on `SET search_path`.** The Neon HTTP driver runs each statement
> in its own session, so a search_path set in one statement is gone by the next
> and unqualified DDL silently lands in `public`. Every object in `schema.sql`
> is written as `nomadalingo.<name>` for exactly this reason. This bit us once
> already.

### Running migrations

```
RunWithCredentials(
  skillName: "nomadalingo-neon",
  command: "npx tsx scripts/db/migrate.ts"
)
```

Idempotent — every DDL is `IF NOT EXISTS` and every seed is an upsert keyed on
id. The seed reads the app's own TypeScript data modules, so the database and
the bundled fallback can never disagree.

### Environment variables

| Name | Visibility | Used for |
|---|---|---|
| `DATABASE_URL` | sensitive | Neon pooled connection string |
| `QR_SECRET` | sensitive | HMAC key for ticket QR signing |
| `ADMIN_EMAIL` | plaintext | the address that is granted `admin` on signup |

**Use `sensitive`, not `secret`, for anything the deployed server must read.**
EAS `secret` variables are only exposed on build machines and never reach the
Hosting runtime — a deployment with a `secret` DATABASE_URL comes up with no
database and no error, which is a genuinely confusing hour to debug.

Never prefix any of these `EXPO_PUBLIC_`; that inlines them into the client
bundle for every user to read.

### Auth

- Passwords: **PBKDF2-SHA256, 100,000 iterations**, per-password salt, verified
  in constant time. Not bcrypt or argon2 — those are native modules and cannot
  run in a V8 isolate. 100k is the ceiling Cloudflare Workers allows; it throws
  above that, and because `verifyPassword` catches, exceeding it presents as
  "every password is wrong" rather than as an error.
- Sessions: opaque 256-bit tokens, stored **hashed** in the database, 60-day
  expiry, revoked server-side on sign-out.
- Storage: OS keychain via `expo-secure-store` on device, `localStorage` on web.
- Sign-in failures are rate limited per IP (8 in 15 minutes) and the error text
  is identical for "no such account" and "wrong password", so the form cannot
  be used to enumerate who has an account.
- **Admin is granted by configuration, never by request.** The signup endpoint
  compares against `ADMIN_EMAIL`; a client cannot ask for the role.

### Offline and online

The device database is a **cache**, not the source of truth.

- Reads: bundled seed → cached content → server, each replacing the last.
- Writes: applied optimistically, queued in an **outbox**, flushed when the
  network returns. Every queued operation is idempotent server-side, because a
  flush can be interrupted after the server committed.
- Connectivity uses NetInfo's `isInternetReachable`, not just `isConnected` —
  hotel wifi routinely reports a connection while a captive portal eats every
  request.
- The `SyncBar` appears only when offline or when writes are pending.

Two ordering rules worth preserving, both learned the hard way:

1. **`await enqueue(...)` before `flush()`.** Fired side by side, flush reads
   storage before the enqueue write lands, finds an empty queue and sends
   nothing — the write then sits until the next trigger.
2. **`flush()` returns the in-flight promise** rather than bailing out when one
   is already running. Returning early lets the caller believe the queue has
   drained and read stale server state, which silently overwrote a
   freshly-completed onboarding with the empty profile from signup.

### Admin dashboard

At `/(admin)`, inside the same app, gated on `role = 'admin'`. Works on phone
and browser from one deployment. Sections: overview, venues, meetups, events
and plans, members.

Content edits reach the member app through `content_version` — a single row
bumped by trigger on every content write. The app polls it while foregrounded
and refetches only when the number changes. Not a websocket: Workers cannot
hold one without Durable Objects. In practice an edit appears within seconds.

### Payments (still mock)

The flow is the real PayPal shape with the provider call stubbed:

1. `POST /api/checkout/create-order` — **the server resolves the price from its
   own records.** The client never sends an amount, and "members get in free"
   is decided server-side too.
2. The user approves at `/mock-pay`, which stands exactly where PayPal's hosted
   page will stand.
3. `POST /api/checkout/capture` — **idempotent on the order id.** A double tap,
   a retry, or a replayed offline write all return the same result.
4. The entitlement is written server-side and the ticket QR is signed with
   **HMAC-SHA256** using `QR_SECRET`, so a screenshot of someone else's QR
   fails verification.

Going live means replacing the stub inside `create-order` and `capture` with
real PayPal calls. Ownership checks, idempotency, pricing and entitlement
writing all stay exactly as they are.

---

## Environment variables (original build)

```sh
eas env:set --name PAYPAL_CLIENT_ID --value … --environment production --visibility sensitive
eas env:set --name PAYPAL_SECRET    --value … --environment production --visibility secret
eas env:pull --environment production      # writes .env — gitignored
```

**`EXPO_PUBLIC_` means public.** Prefixed values are inlined into the client
bundle at export time and are readable by anyone who opens devtools. A secret
with that prefix is a published secret. The PayPal secret must never carry it.

Because prefixed values bake in at *export* time, `eas env:pull` must run
*before* `expo export`, not after.

### Mock → real PayPal

1. Add `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET` as **sensitive** env vars.
2. Implement the two stubs above against PayPal sandbox.
3. Point the app at PayPal's approve URL via
   `WebBrowser.openAuthSessionAsync(url, 'nomadalingo://paypal-return')` — the
   scheme is already configured.
4. Test end to end in sandbox.
5. Switch the PayPal base URL to `api-m.paypal.com` via an env var, never a
   code edit, and swap in live credentials.
6. Remove the mock notice from `src/app/checkout.tsx` and delete
   `src/app/mock-pay.tsx`.

---

## Deploying

```sh
eas env:pull --environment production   # only once env vars exist
npx expo export --platform web
eas deploy --prod
```

**Export immediately before every deploy.** `eas deploy` ships whatever sits in
`dist/`; deploying without re-exporting republishes the previous build and looks
completely successful doing it.

`expo.web.output` is `"server"`, which is required for API routes. Static
pre-rendering executes each route in Node at build time, so a route importing a
native-only module at the top level will break the export — the map and camera
are platform-split and lazily imported for exactly this reason.

Two deploy gotchas that cost real time:

- `eas deploy` ships whatever is in `dist/`. Deploying without re-exporting
  republishes the previous build and reports success. Always export first.
- After switching output modes, the production alias can keep serving the old
  deployment. `eas deploy:alias --prod --id <deploymentId>` re-points it.

### Native builds

```sh
eas build --platform android --profile preview     # installable APK
eas build --platform ios     --profile production  # needs an Apple Developer account
```

`preview` produces a directly installable APK; `production` produces an AAB for
Play. `appVersionSource` is `"remote"`, so EAS owns version and build numbers —
do not also bump them by hand in `app.json` or the two sources will disagree.

iOS has not been run on a real device or simulator for this build: it compiles
and typechecks, but nobody has looked at it. Treat it as unverified.

---

## Where to add a backend

In rough order of value:

1. **Password reset and email verification.** Needs an email provider. The
   highest-value missing piece — right now a forgotten password is unrecoverable.
2. **Real messaging.** `SEED_CHATS` and `SCRIPTED_REPLIES` in `src/data/chats.ts`
   are the seam. The UI already labels scripted replies, so removing them is
   subtractive. Chats are the last thing still device-local.
3. **Payments**, per the section above.
4. **Social sign-in.** The Google and Apple buttons are visual only and say so.
5. **Verification badges.** Profile shows "Perfil completo" from real profile
   completeness rather than claiming a verification it cannot substantiate. Do
   not turn that into a verification badge without a real process behind it.

---

## Known gaps

Being straight about what is not done:

- **No password reset and no email verification.** Both need an email provider,
  which is another account and another credential. This is the most important
  next thing.
- iOS is untested on device — no Apple Developer account was available.
- Payments are mock: real orders and entitlements, no actual charge.
- Social sign-in buttons are inert and say so.
- Chat is still scripted, labelled as demo, and device-local. Real messaging is
  the next substantial backend piece.
- Member personas remain illustrative until real people sign up.
- Reporting and blocking are described in Settings but not implemented.
- Some spacing and font sizes still drift from the token scale in a few
  screens; the palette is centralised but a handful of one-off hex values
  remain in screen files.
