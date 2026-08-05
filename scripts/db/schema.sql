-- NómadaLingo schema.
--
-- Everything lives in a dedicated `nomadalingo` schema so this can share a
-- Neon database with anything else without collision risk.
--
-- Conventions:
--   * ids are text, generated app-side, so a row created offline keeps the
--     same id once it syncs. Serial ids would renumber and break references.
--   * bilingual copy is stored as jsonb {es, en} — the app's L type, exactly.
--   * every mutable table carries updated_at; the content version endpoint is
--     built from the max across them, which is what tells the app to refetch.

-- Every object below is fully qualified. `SET search_path` cannot be relied
-- on here: the Neon HTTP driver runs each statement in its own session, so a
-- search_path set in one statement is gone by the next and unqualified DDL
-- silently lands in `public`.
CREATE SCHEMA IF NOT EXISTS nomadalingo;

-- ---------------------------------------------------------------- accounts

CREATE TABLE IF NOT EXISTS nomadalingo.users (
  id            text PRIMARY KEY,
  email         text UNIQUE NOT NULL,
  name          text NOT NULL DEFAULT '',
  -- PBKDF2-SHA256. Format: pbkdf2$<iterations>$<salt_b64>$<hash_b64>
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  -- The whole Profile object the app already understands, stored as-is.
  profile       jsonb NOT NULL DEFAULT '{}'::jsonb,
  onboarded     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz
);

CREATE INDEX IF NOT EXISTS users_email_idx ON nomadalingo.users (lower(email));
CREATE INDEX IF NOT EXISTS users_created_idx ON nomadalingo.users (created_at DESC);

-- Sessions store only a hash of the token. A database leak must not hand
-- someone a working session.
CREATE TABLE IF NOT EXISTS nomadalingo.sessions (
  token_hash text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES nomadalingo.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_agent text
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON nomadalingo.sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON nomadalingo.sessions (expires_at);

-- Throttles credential stuffing. Keyed by email+ip.
CREATE TABLE IF NOT EXISTS nomadalingo.auth_attempts (
  id         bigserial PRIMARY KEY,
  key        text NOT NULL,
  at         timestamptz NOT NULL DEFAULT now(),
  ok         boolean NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_attempts_key_idx ON nomadalingo.auth_attempts (key, at DESC);

-- ---------------------------------------------------------------- content

CREATE TABLE IF NOT EXISTS nomadalingo.venues (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  type         text NOT NULL CHECK (type IN ('coworking','cafe','bar','beach','plaza')),
  area         text NOT NULL,
  rating       numeric(2,1),
  sponsor_deal jsonb,
  amenities    jsonb NOT NULL DEFAULT '[]'::jsonb,
  blurb        jsonb NOT NULL DEFAULT '{}'::jsonb,
  photo_seed   text NOT NULL DEFAULT 'cafe',
  published    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nomadalingo.meetups (
  id          text PRIMARY KEY,
  category    text NOT NULL,
  title       jsonb NOT NULL,
  venue_id    text NOT NULL REFERENCES nomadalingo.venues(id) ON DELETE RESTRICT,
  area        text NOT NULL,
  when_label  jsonb NOT NULL,
  starts_at   timestamptz NOT NULL,
  going       integer NOT NULL DEFAULT 0,
  capacity    integer NOT NULL DEFAULT 10,
  languages   jsonb NOT NULL DEFAULT '[]'::jsonb,
  attendees   jsonb NOT NULL DEFAULT '[]'::jsonb,
  description jsonb NOT NULL DEFAULT '{}'::jsonb,
  host_id     integer,
  -- Set when a member created it in-app rather than an admin.
  created_by  text REFERENCES nomadalingo.users(id) ON DELETE SET NULL,
  published   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meetups_starts_idx ON nomadalingo.meetups (starts_at);
CREATE INDEX IF NOT EXISTS meetups_venue_idx ON nomadalingo.meetups (venue_id);

CREATE TABLE IF NOT EXISTS nomadalingo.official_events (
  id         text PRIMARY KEY,
  title      jsonb NOT NULL,
  venue_id   text NOT NULL REFERENCES nomadalingo.venues(id) ON DELETE RESTRICT,
  area       text NOT NULL,
  when_label jsonb NOT NULL,
  starts_at  timestamptz NOT NULL,
  price_usd  numeric(10,2) NOT NULL,
  capacity   integer NOT NULL,
  -- Seeded figure; the app shows sold = this + real ticket count.
  sold_seed  integer NOT NULL DEFAULT 0,
  includes   jsonb NOT NULL DEFAULT '[]'::jsonb,
  blurb      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Exactly one event owns the top of Home at a time.
  is_current boolean NOT NULL DEFAULT false,
  published  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nomadalingo.membership_plans (
  id         text PRIMARY KEY,
  label      jsonb NOT NULL,
  price_usd  numeric(10,2) NOT NULL,
  days       integer NOT NULL,
  note       jsonb,
  active     boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- member data

CREATE TABLE IF NOT EXISTS nomadalingo.rsvps (
  user_id    text NOT NULL REFERENCES nomadalingo.users(id) ON DELETE CASCADE,
  meetup_id  text NOT NULL REFERENCES nomadalingo.meetups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, meetup_id)
);

CREATE TABLE IF NOT EXISTS nomadalingo.memberships (
  user_id    text PRIMARY KEY REFERENCES nomadalingo.users(id) ON DELETE CASCADE,
  plan       text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  until      timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nomadalingo.tickets (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES nomadalingo.users(id) ON DELETE CASCADE,
  event_id   text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('ticket','member-rsvp')),
  usd_paid   numeric(10,2) NOT NULL DEFAULT 0,
  qr_payload text NOT NULL,
  -- Set when the organiser scans it at the door.
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One ticket per person per event, enforced by the database rather than by
-- hoping the client behaves.
CREATE UNIQUE INDEX IF NOT EXISTS tickets_user_event_idx ON nomadalingo.tickets (user_id, event_id);
CREATE INDEX IF NOT EXISTS tickets_created_idx ON nomadalingo.tickets (created_at DESC);

CREATE TABLE IF NOT EXISTS nomadalingo.phrases (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES nomadalingo.users(id) ON DELETE CASCADE,
  wrong      text NOT NULL,
  right_text text NOT NULL,
  why        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phrases_user_idx ON nomadalingo.phrases (user_id, created_at DESC);

-- ---------------------------------------------------------------- checkout

-- Orders exist so capture can be idempotent on the order id. A double tap
-- cannot mint two tickets because the second capture finds the order already
-- captured and returns the same result.
CREATE TABLE IF NOT EXISTS nomadalingo.orders (
  id           text PRIMARY KEY,
  user_id      text NOT NULL REFERENCES nomadalingo.users(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('ticket','membership')),
  target_id    text NOT NULL,
  -- Price resolved server-side at creation. Never sent by the client.
  amount_usd   numeric(10,2) NOT NULL,
  status       text NOT NULL DEFAULT 'created'
                 CHECK (status IN ('created','approved','captured','cancelled')),
  provider     text NOT NULL DEFAULT 'mock',
  -- Populated once a real provider is wired in.
  provider_ref text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  captured_at  timestamptz
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON nomadalingo.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON nomadalingo.orders (status);

-- ---------------------------------------------------------------- sync

-- Bumped by every content write. The app polls this and refetches when it
-- changes, which is how an admin edit reaches a phone.
CREATE TABLE IF NOT EXISTS nomadalingo.content_version (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version    bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO nomadalingo.content_version (id, version) VALUES (1, 1)
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION nomadalingo.bump_content_version() RETURNS trigger AS $$
BEGIN
  UPDATE nomadalingo.content_version
     SET version = version + 1, updated_at = now()
   WHERE id = 1;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS venues_bump ON nomadalingo.venues;
CREATE TRIGGER venues_bump AFTER INSERT OR UPDATE OR DELETE ON nomadalingo.venues
  FOR EACH STATEMENT EXECUTE FUNCTION nomadalingo.bump_content_version();

DROP TRIGGER IF EXISTS meetups_bump ON nomadalingo.meetups;
CREATE TRIGGER meetups_bump AFTER INSERT OR UPDATE OR DELETE ON nomadalingo.meetups
  FOR EACH STATEMENT EXECUTE FUNCTION nomadalingo.bump_content_version();

DROP TRIGGER IF EXISTS official_bump ON nomadalingo.official_events;
CREATE TRIGGER official_bump AFTER INSERT OR UPDATE OR DELETE ON nomadalingo.official_events
  FOR EACH STATEMENT EXECUTE FUNCTION nomadalingo.bump_content_version();

DROP TRIGGER IF EXISTS plans_bump ON nomadalingo.membership_plans;
CREATE TRIGGER plans_bump AFTER INSERT OR UPDATE OR DELETE ON nomadalingo.membership_plans
  FOR EACH STATEMENT EXECUTE FUNCTION nomadalingo.bump_content_version();
