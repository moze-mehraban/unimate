-- Reminders on phones. The Android app schedules reminders locally, but only for what it
-- saw when it was last open. Each phone now reports what it scheduled (per FCM token),
-- and send-push sends any other reminder (e.g. for an assignment added while the app
-- was closed) to that phone through FCM, so nothing is missed and nothing comes twice.
-- Per device, because two phones on one account may know different things.

create table public.phone_reminders (
  token      text not null references public.push_tokens (token) on delete cascade,
  kind       text not null check (kind in ('class', 'deadline')),
  ref_id     uuid not null,
  occurs_at  timestamptz not null,
  primary key (token, kind, ref_id, occurs_at)
);

-- Read the lists of your own phones; writes go through sync_phone_reminders.
alter table public.phone_reminders enable row level security;
create policy phone_reminders_select on public.phone_reminders for select to authenticated
  using (exists (select 1 from public.push_tokens t where t.token = phone_reminders.token and t.user_id = auth.uid()));

/**
 * Replaces the list of reminders scheduled on this phone (identified by its FCM token,
 * which must be registered to the current user).
 * p_items: [{"kind": "class"|"deadline", "ref_id": uuid, "occurs_at": timestamptz}, …]
 * (same keys as reminder_log: session start or deadline).
 */
create or replace function public.sync_phone_reminders(p_token text, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.push_tokens where token = p_token and user_id = auth.uid()) then
    raise exception 'unknown device' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 1000 then
    raise exception 'invalid reminder list' using errcode = '22023';
  end if;
  delete from public.phone_reminders where token = p_token;
  insert into public.phone_reminders (token, kind, ref_id, occurs_at)
  select distinct p_token, x.kind, x.ref_id, x.occurs_at
  from jsonb_to_recordset(p_items) as x(kind text, ref_id uuid, occurs_at timestamptz);
end;
$$;

revoke execute on function public.sync_phone_reminders(text, jsonb) from public, anon;
grant execute on function public.sync_phone_reminders(text, jsonb) to authenticated;

-- The same phone signing into another account starts with an empty list.
create or replace function public.register_push_token(p_token text, p_platform text default 'android')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.phone_reminders r
  using public.push_tokens t
  where r.token = p_token and t.token = p_token and t.user_id <> auth.uid();

  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end;
$$;

/**
 * Hands a notification to send-push when the recipient can receive it somewhere:
 * any phone (FCM) or browser (Web Push). send-push decides per device; for reminders
 * it skips each phone that already scheduled that reminder itself.
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
  if not exists (select 1 from public.web_push_subscriptions where user_id = new.user_id)
     and not exists (select 1 from public.push_tokens where user_id = new.user_id) then
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
