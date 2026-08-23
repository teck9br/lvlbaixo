-- Removes the server access-password gate. The app now only asks for a
-- name (see AppRoot.tsx) — anyone with the URL can join.
alter table server_settings drop column if exists access_password_hash;
