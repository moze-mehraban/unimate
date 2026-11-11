-- Push notifications (FCM). The phone registers its FCM token; event notifications
-- (not reminders, which the app schedules locally) are handed to the send-push
-- Edge Function, which delivers them through FCM.

create table public.push_tokens (
  token       text primary key check (char_length(token) between 10 and 4096),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  platform    text not null default 'android' check (platform in ('android', 'ios')),
  updated_at  timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- Read your own tokens; writes go through the functions below.
alter table public.push_tokens enable row level security;
create policy push_tokens_select on public.push_tokens for select to authenticated
  using (user_id = auth.uid());

/** Saves this device's token for the current user (takes it over if another account had it). */
create or replace function public.register_push_token(p_token text, p_platform text default 'android')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
$$;

/** Removes this device's token for the current user (on sign-out). */
create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

/**
 * Hands an event notification to the send-push Edge Function (via pg_net).
 * Does nothing until both Vault secrets exist:
 *   push_function_url  e.g. https://<ref>.supabase.co/functions/v1/send-push
 *   push_function_key  shared secret, the same value as the function's PUSH_FUNCTION_KEY
 * and nothing where pg_net/Vault aren't installed (the PGlite tests).
 */
create or replace function public.queue_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  if to_regnamespace('net') is null or to_regnamespace('vault') is null then
    return new;
  end if;
  if not exists (select 1 from public.push_tokens where user_id = new.user_id) then
    return new;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'push_function_key';
  if v_url is null or v_key is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key)
  );
  return new;
end;
$$;

revoke execute on function public.queue_push() from public, anon, authenticated;

-- Reminders (class_starting, assignment_due_soon) are scheduled on the phone itself.
create trigger on_notification_push after insert on public.notifications
  for each row
  when (new.type in ('assignment_created', 'join_request_received', 'join_request_approved',
                     'join_request_rejected', 'assignment_reported'))
  execute function public.queue_push();

-- pg_net where available (Supabase local and cloud).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end;
$$;
