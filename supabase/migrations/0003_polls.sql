-- Polls: a poll is a special kind of chat message. Each poll message row in
-- `messages` has `poll_id` set (and `content` left null); the question,
-- options and live vote tally live in their own tables so votes can update
-- without inserting new chat messages.

create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms (id) on delete cascade,
  question text not null check (char_length(trim(question)) between 1 and 300),
  -- [{ "id": "0", "label": "..." }, ...] — fixed at creation time, so a
  -- simple jsonb column avoids a join just to render the choices.
  options jsonb not null,
  created_by_user_id uuid references users (id) on delete set null,
  created_by_username text not null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists polls_room_idx on polls (room_id);

create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  option_id text not null,
  user_id uuid not null references users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  -- One active vote per person per poll — voting again changes it (see the
  -- upsert in the votes API route) instead of adding a second ballot.
  unique (poll_id, user_id)
);

create index if not exists poll_votes_poll_idx on poll_votes (poll_id);

-- Realtime needs the full old row on UPDATE/DELETE to know which person's
-- vote changed or was retracted — default replica identity only carries the
-- primary key for those.
alter table poll_votes replica identity full;

alter table messages
  add column if not exists poll_id uuid references polls (id) on delete cascade;

create index if not exists messages_poll_idx on messages (poll_id) where poll_id is not null;

-- A message is either regular text or a poll placeholder, never both/neither.
alter table messages drop constraint if exists messages_content_check;
alter table messages alter column content drop not null;
alter table messages add constraint messages_content_check
  check (
    (poll_id is not null and content is null)
    or (poll_id is null and content is not null and char_length(content) between 1 and 4000)
  );

alter table polls enable row level security;
alter table poll_votes enable row level security;

drop policy if exists "polls are publicly readable" on polls;
create policy "polls are publicly readable"
  on polls for select
  to anon, authenticated
  using (true);

drop policy if exists "poll votes are publicly readable" on poll_votes;
create policy "poll votes are publicly readable"
  on poll_votes for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated — same as
-- messages, all writes go through API routes using the service role key.
