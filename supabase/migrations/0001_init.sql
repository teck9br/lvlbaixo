-- Voice Room ("lvlbaixo") — initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- users: one row per person who has ever entered a display name.
-- Not tied to Supabase Auth — there are no per-user accounts, just a
-- name + a signed session cookie (see lib/auth/session.ts).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null check (char_length(trim(username)) between 1 and 32),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_banned boolean not null default false
);

create index if not exists users_username_idx on users (lower(username));

-- ─────────────────────────────────────────────────────────────────────────
-- rooms: the fixed channel list. Not user-creatable — seeded once and
-- edited by an admin only (see server_settings / future admin tooling).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null check (type in ('text', 'voice')),
  category text not null check (category in ('text', 'voice', 'afk')),
  position integer not null,
  topic text,
  created_at timestamptz not null default now()
);

create index if not exists rooms_position_idx on rooms (position);
create index if not exists rooms_category_idx on rooms (category);

-- ─────────────────────────────────────────────────────────────────────────
-- messages: chat history for text rooms (only bate-papo-do-uol is actively
-- written to today, but the table is generic for any text room).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  username text not null,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx on messages (room_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- server_settings: single-row table holding the server name. Never
-- exposed to the client.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists server_settings (
  id integer primary key default 1,
  server_name text not null default 'lvlbaixo',
  updated_at timestamptz not null default now(),
  constraint server_settings_singleton check (id = 1)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
--
-- This app does not use Supabase Auth, so every request from the browser
-- carries the anon key. We keep that key deliberately powerless:
--   * rooms + messages: readable (needed for Supabase Realtime to push
--     postgres_changes to the chat UI), never writable by anon.
--   * users / server_settings: no anon access at all.
-- All writes (posting a message, creating a user, minting a LiveKit
-- token) go through Next.js API routes using the
-- service role key, which bypasses RLS and additionally checks our own
-- signed session cookie. See lib/auth/session.ts.
-- ─────────────────────────────────────────────────────────────────────────
alter table users enable row level security;
alter table rooms enable row level security;
alter table messages enable row level security;
alter table server_settings enable row level security;

drop policy if exists "rooms are publicly readable" on rooms;
create policy "rooms are publicly readable"
  on rooms for select
  to anon, authenticated
  using (true);

drop policy if exists "messages are publicly readable" on messages;
create policy "messages are publicly readable"
  on messages for select
  to anon, authenticated
  using (true);

-- No policies are created for INSERT/UPDATE/DELETE on any table for the
-- anon/authenticated roles, and no policies at all for users/server_settings,
-- which means those operations are denied by default under RLS. The
-- service role used by API routes bypasses RLS entirely.
