-- Web Push: browsers subscribe (service worker + VAPID) and get the same notifications
-- as phones. Browsers can't schedule reminders on their own the way the Android app
-- does, so class/deadline reminders are pushed to browsers too (never to FCM).

create table public.web_push_subscriptions (
  endpoint    text primary key check (endpoint ~ '^https://' and char_length(endpoint) <= 2048),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  p256dh      text not null check (char_length(p256dh) between 40 and 200),
  auth        text not null check (char_length(auth) between 10 and 100),
  updated_at  timestamptz not null default now()
);

create index web_push_subscriptions_user_idx on public.web_push_subscriptions (user_id);

-- Read your own; writes go through the functions below.
alter table public.web_push_subscriptions enable row level security;
create policy web_push_subscriptions_select on public.web_push_subscriptions for select to authenticated
  using (user_id = auth.uid());

/** Saves this browser's subscription for the current user (takes it over from another account). */
create or replace function public.register_web_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.web_push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
$$;

/** Removes this browser's subscription for the current user (turned off, or signing out). */
create or replace function public.unregister_web_push(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.web_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.register_web_push(text, text, text) from public, anon;
revoke execute on function public.unregister_web_push(text) from public, anon;
grant execute on function public.register_web_push(text, text, text) to authenticated;
grant execute on function public.unregister_web_push(text) to authenticated;

/**
 * Hands a notification to the send-push Edge Function (via pg_net) when the recipient
 * has somewhere to receive it: events go to phones (FCM) and browsers, reminders only
 * to browsers. Still a no-op until the Vault secrets exist (see 20261112000000).
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
     and (new.type in ('class_starting', 'assignment_due_soon')
          or not exists (select 1 from public.push_tokens where user_id = new.user_id)) then
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

-- Every type now; queue_push decides who can receive what.
drop trigger on_notification_push on public.notifications;
create trigger on_notification_push after insert on public.notifications
  for each row execute function public.queue_push();
