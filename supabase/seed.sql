-- Seed data for Voice Room ("lvlbaixo").
-- Run once after 0001_init.sql. Safe to re-run (upserts by slug).
--
-- IMPORTANT: the default password below is "changeme123". Change it
-- immediately after seeding — see README.md "Como configurar o acesso".

insert into server_settings (id, server_name, access_password_hash)
values (1, 'lvlbaixo', crypt('changeme123', gen_salt('bf')))
on conflict (id) do nothing;

-- category: text
insert into rooms (name, slug, type, category, position) values
  ('link-gc', 'link-gc', 'text', 'text', 1),
  ('regras', 'regras', 'text', 'text', 2),
  ('bate-papo-do-uol', 'bate-papo-do-uol', 'text', 'text', 3)
on conflict (slug) do update set
  name = excluded.name,
  position = excluded.position,
  category = excluded.category,
  type = excluded.type;

-- category: voice
insert into rooms (name, slug, type, category, position) values
  ('CS de Cadeira 🎮🚨', 'cs-de-cadeira', 'voice', 'voice', 4),
  ('CS de Rua', 'cs-de-rua', 'voice', 'voice', 5)
on conflict (slug) do update set
  name = excluded.name,
  position = excluded.position,
  category = excluded.category,
  type = excluded.type;

-- category: afk
insert into rooms (name, slug, type, category, position) values
  ('GAY POR:', 'gay-por', 'voice', 'afk', 6)
on conflict (slug) do update set
  name = excluded.name,
  position = excluded.position,
  category = excluded.category,
  type = excluded.type;

-- Seed the "regras" channel with a starter message so it isn't empty on
-- first load. Guarded so re-running seed.sql doesn't duplicate it.
insert into messages (room_id, user_id, username, content)
select r.id, null, 'lvlbaixo', 'Bem-vindo(a)! Leia as regras e divirta-se. 🎮'
from rooms r
where r.slug = 'regras'
  and not exists (
    select 1 from messages m where m.room_id = r.id
  );
