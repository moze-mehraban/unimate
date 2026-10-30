-- Profiles for users who signed up before the schema existed (the
-- on_auth_user_created trigger only covers new sign-ups). Classes, members and
-- assignments reference profiles, so those users couldn't create anything.
-- Idempotent: users who already have a profile are skipped.
insert into public.profiles (id, full_name, university, avatar_url)
select
  u.id,
  left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), 120),
  left(coalesce(u.raw_user_meta_data ->> 'university', ''), 160),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;
