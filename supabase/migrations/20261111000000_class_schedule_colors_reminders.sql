-- Class colors, weekly class sessions (time + room), and reminder notifications
-- before class sessions and assignment deadlines.

-- =====================================================================
-- Class colors
-- =====================================================================

-- Palette keys; the apps map each key to a color that works in light and dark themes.
create or replace function public.random_class_color()
returns text
language sql
volatile
set search_path = ''
as $$
  select (array['indigo','rose','emerald','amber','sky','violet','teal','orange','pink','lime'])[1 + floor(random() * 10)::int];
$$;

alter table public.classes
  add column color text not null default public.random_class_color()
  check (color in ('indigo','rose','emerald','amber','sky','violet','teal','orange','pink','lime'));

-- Existing classes: palette order by age, so they all differ (up to 10).
update public.classes c
set color = (array['indigo','rose','emerald','amber','sky','violet','teal','orange','pink','lime'])[1 + (o.n - 1) % 10]
from (select id, row_number() over (order by created_at) as n from public.classes) o
where o.id = c.id;

-- New classes: a random color the creator's other classes don't use yet (the column
-- default, any color, once all ten are taken). The owner can change it later; this
-- trigger only runs on insert.
create or replace function public.pick_class_color()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_free text[];
begin
  select array_agg(p.color) into v_free
  from unnest(array['indigo','rose','emerald','amber','sky','violet','teal','orange','pink','lime']) as p(color)
  where p.color not in (
    select c.color from public.classes c
    join public.class_members m on m.class_id = c.id
    where m.user_id = new.owner_id
  );
  if v_free is not null then
    new.color := v_free[1 + floor(random() * array_length(v_free, 1))::int];
  end if;
  return new;
end;
$$;

create trigger classes_pick_color before insert on public.classes
  for each row execute function public.pick_class_color();

revoke execute on function public.pick_class_color() from public, anon, authenticated;

-- =====================================================================
-- Weekly class sessions
-- =====================================================================

create table public.class_sessions (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  -- 0 = Saturday … 6 = Friday (Iranian week).
  weekday     smallint not null check (weekday between 0 and 6),
  -- Tehran wall-clock times.
  start_time  time not null,
  end_time    time not null,
  room        text not null default '' check (char_length(room) <= 80),
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);

create index class_sessions_class_idx on public.class_sessions (class_id);

alter table public.class_sessions enable row level security;

create policy class_sessions_select on public.class_sessions for select to authenticated
  using (public.is_class_member(class_id));
create policy class_sessions_insert on public.class_sessions for insert to authenticated
  with check (public.is_class_owner(class_id));
create policy class_sessions_update on public.class_sessions for update to authenticated
  using (public.is_class_owner(class_id)) with check (public.is_class_owner(class_id));
create policy class_sessions_delete on public.class_sessions for delete to authenticated
  using (public.is_class_owner(class_id));

-- =====================================================================
-- Reminder settings (null = off)
-- =====================================================================

alter table public.profiles
  add column class_reminder_minutes smallint default 30
    check (class_reminder_minutes between 1 and 1440),
  add column deadline_reminder_hours smallint default 24
    check (deadline_reminder_hours between 1 and 168);

grant update (class_reminder_minutes, deadline_reminder_hours) on public.profiles to authenticated;

-- =====================================================================
-- Reminder notifications
-- =====================================================================

alter type public.notification_type add value if not exists 'class_starting';
alter type public.notification_type add value if not exists 'assignment_due_soon';

-- One row per reminder sent, so each one goes out once even though the job runs repeatedly.
create table public.reminder_log (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('class', 'deadline')),
  ref_id     uuid not null,
  occurs_at  timestamptz not null,
  sent_at    timestamptz not null default now(),
  primary key (user_id, kind, ref_id, occurs_at)
);

-- Internal bookkeeping: RLS on with no policies, so clients can't read or write it.
alter table public.reminder_log enable row level security;

/**
 * Sends the reminders that are due at p_now:
 * - before each class session, per member's class_reminder_minutes;
 * - before each assignment deadline, per member's deadline_reminder_hours,
 *   unless that member has marked it done.
 * Safe to run as often as you like; reminder_log dedupes.
 */
create or replace function public.send_due_reminders(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (p_now at time zone 'Asia/Tehran')::date;
  v_count integer := 0;
  v_rows integer;
begin
  -- Class sessions: occurrences today and tomorrow (leads are at most 24h).
  with occurrences as (
    select s.id as session_id, s.class_id, s.start_time, s.end_time, s.room,
           ((d.day + s.start_time) at time zone 'Asia/Tehran') as starts_at
    from public.class_sessions s
    cross join (values (v_today), (v_today + 1)) as d(day)
    -- Postgres dow: 0 = Sunday; our weekday: 0 = Saturday.
    where s.weekday = (extract(dow from d.day)::int + 1) % 7
  ),
  due as (
    select m.user_id, o.*
    from occurrences o
    join public.class_members m on m.class_id = o.class_id
    join public.profiles p on p.id = m.user_id
    where p.class_reminder_minutes is not null
      and p_now >= o.starts_at - make_interval(mins => p.class_reminder_minutes)
      and p_now < o.starts_at
  ),
  logged as (
    insert into public.reminder_log (user_id, kind, ref_id, occurs_at)
    select user_id, 'class', session_id, starts_at from due
    on conflict do nothing
    returning user_id, ref_id, occurs_at
  )
  insert into public.notifications (user_id, type, class_id, payload)
  select d.user_id, 'class_starting', d.class_id,
         jsonb_build_object(
           'session_id', d.session_id,
           'course_name', c.course_name,
           'starts_at', d.starts_at,
           'start_time', to_char(d.start_time, 'HH24:MI'),
           'end_time', to_char(d.end_time, 'HH24:MI'),
           'room', d.room)
  from logged l
  join due d on d.user_id = l.user_id and d.session_id = l.ref_id and d.starts_at = l.occurs_at
  join public.classes c on c.id = d.class_id;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  -- Assignment deadlines.
  with due as (
    select m.user_id, a.id as assignment_id, a.class_id, a.title, a.due_at
    from public.assignments a
    join public.class_members m on m.class_id = a.class_id
    join public.profiles p on p.id = m.user_id
    left join public.assignment_status st on st.assignment_id = a.id and st.user_id = m.user_id
    where a.due_at is not null
      and p.deadline_reminder_hours is not null
      and coalesce(st.status, 'todo') <> 'done'
      and p_now >= a.due_at - make_interval(hours => p.deadline_reminder_hours)
      and p_now < a.due_at
  ),
  logged as (
    insert into public.reminder_log (user_id, kind, ref_id, occurs_at)
    select user_id, 'deadline', assignment_id, due_at from due
    on conflict do nothing
    returning user_id, ref_id
  )
  insert into public.notifications (user_id, type, class_id, payload)
  select d.user_id, 'assignment_due_soon', d.class_id,
         jsonb_build_object(
           'assignment_id', d.assignment_id,
           'title', d.title,
           'due_at', d.due_at,
           'course_name', c.course_name)
  from logged l
  join due d on d.user_id = l.user_id and d.assignment_id = l.ref_id
  join public.classes c on c.id = d.class_id;
  get diagnostics v_rows = row_count;
  v_count := v_count + v_rows;

  -- Old log rows are never needed again.
  delete from public.reminder_log where occurs_at < p_now - interval '7 days';

  return v_count;
end;
$$;

revoke execute on function public.send_due_reminders(timestamptz) from public, anon, authenticated;
revoke execute on function public.random_class_color() from anon;

-- Run every 5 minutes where pg_cron exists (Supabase local and cloud). The PGlite
-- test harness has no pg_cron and calls send_due_reminders() directly instead.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('unimate-send-reminders', '*/5 * * * *', 'select public.send_due_reminders()');
  end if;
end;
$$;

-- =====================================================================
-- my_assignments: add the class color (new columns can only go at the end)
-- =====================================================================

create or replace view public.my_assignments
with (security_invoker = true)
as
select
  a.id,
  a.class_id,
  c.course_name,
  a.title,
  a.description,
  a.due_at,
  a.priority,
  a.created_by,
  a.created_at,
  a.updated_at,
  coalesce(s.status, 'todo'::public.task_status) as status,
  c.color as class_color
from public.assignments a
join public.classes c on c.id = a.class_id
left join public.assignment_status s
  on s.assignment_id = a.id and s.user_id = auth.uid();
