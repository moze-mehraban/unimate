-- =====================================================================
-- UniMate — initial schema
-- Profiles, classes, membership, invites, join requests, assignments,
-- per-student status, reports, personal tasks, notifications.
-- Every table has RLS enabled; privileged flows go through
-- SECURITY DEFINER functions with explicit checks.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.member_role        as enum ('owner', 'member');
create type public.join_request_status as enum ('pending', 'approved', 'rejected');
create type public.priority_level     as enum ('low', 'medium', 'high');
create type public.task_status        as enum ('todo', 'in_progress', 'done');
create type public.report_status      as enum ('open', 'resolved', 'dismissed');
create type public.notification_type  as enum (
  'assignment_created',
  'join_request_received',
  'join_request_approved',
  'join_request_rejected',
  'assignment_reported'
);

-- ---------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  university  text not null default '' check (char_length(university) <= 160),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically on sign-up (email or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, university, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'university', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Classes & membership
-- ---------------------------------------------------------------------
create table public.classes (
  id               uuid primary key default gen_random_uuid(),
  course_name      text not null check (char_length(course_name) between 1 and 160),
  instructor_name  text not null default '' check (char_length(instructor_name) <= 120),
  term             text not null default '' check (char_length(term) <= 60),
  owner_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index classes_owner_idx on public.classes (owner_id);

create trigger classes_updated_at before update on public.classes
  for each row execute function public.set_updated_at();

create table public.class_members (
  class_id   uuid not null references public.classes (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       public.member_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index class_members_user_idx on public.class_members (user_id);
-- Exactly one owner row per class.
create unique index class_members_one_owner on public.class_members (class_id) where role = 'owner';

-- Membership helpers. SECURITY DEFINER so policies on class_members
-- can use them without recursing into their own RLS.
create or replace function public.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_class_owner(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- The creator becomes the owner member automatically.
create or replace function public.handle_new_class()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.class_members (class_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_class_created after insert on public.classes
  for each row execute function public.handle_new_class();

-- Ownership cannot be changed through a plain UPDATE.
create or replace function public.prevent_owner_change()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'owner_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger classes_owner_immutable before update on public.classes
  for each row execute function public.prevent_owner_change();

-- ---------------------------------------------------------------------
-- Invite links (private, revocable, optional expiry / max uses)
-- ---------------------------------------------------------------------
create table public.class_invites (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  token       text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  expires_at  timestamptz,
  max_uses    integer check (max_uses is null or max_uses > 0),
  use_count   integer not null default 0,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index class_invites_class_idx on public.class_invites (class_id);

-- ---------------------------------------------------------------------
-- Join requests
-- ---------------------------------------------------------------------
create table public.join_requests (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  invite_id   uuid references public.class_invites (id) on delete set null,
  status      public.join_request_status not null default 'pending',
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references public.profiles (id) on delete set null
);

create index join_requests_class_idx on public.join_requests (class_id, status);
create unique index join_requests_one_pending
  on public.join_requests (class_id, user_id) where status = 'pending';

-- ---------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------
create table public.assignments (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes (id) on delete cascade,
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  title        text not null check (char_length(title) between 1 and 200),
  description  text not null default '' check (char_length(description) <= 5000),
  due_at       timestamptz,
  priority     public.priority_level not null default 'medium',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index assignments_class_due_idx on public.assignments (class_id, due_at);

create trigger assignments_updated_at before update on public.assignments
  for each row execute function public.set_updated_at();

create or replace function public.prevent_assignment_move()
returns trigger
language plpgsql
as $$
begin
  if new.class_id <> old.class_id or new.created_by is distinct from old.created_by then
    raise exception 'class_id and created_by cannot be changed';
  end if;
  return new;
end;
$$;

create trigger assignments_immutable_cols before update on public.assignments
  for each row execute function public.prevent_assignment_move();

-- Personal status per student. A missing row means 'todo'.
create table public.assignment_status (
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status         public.task_status not null default 'todo',
  updated_at     timestamptz not null default now(),
  primary key (assignment_id, user_id)
);

create index assignment_status_user_idx on public.assignment_status (user_id);

create trigger assignment_status_updated_at before update on public.assignment_status
  for each row execute function public.set_updated_at();

-- Reports about wrong / inaccurate assignments.
create table public.assignment_reports (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.assignments (id) on delete cascade,
  reporter_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason         text not null check (char_length(reason) between 1 and 1000),
  status         public.report_status not null default 'open',
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  resolved_by    uuid references public.profiles (id) on delete set null
);

create index assignment_reports_assignment_idx on public.assignment_reports (assignment_id);

-- ---------------------------------------------------------------------
-- Personal tasks (not tied to any class)
-- ---------------------------------------------------------------------
create table public.personal_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  description  text not null default '' check (char_length(description) <= 5000),
  due_at       timestamptz,
  priority     public.priority_level not null default 'medium',
  status       public.task_status not null default 'todo',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index personal_tasks_user_due_idx on public.personal_tasks (user_id, due_at);

create trigger personal_tasks_updated_at before update on public.personal_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notification_type not null,
  class_id    uuid references public.classes (id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Profile visibility (defined here because it reads join_requests).
create or replace function public.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id = auth.uid()
    -- classmates
    or exists (
      select 1
      from public.class_members me
      join public.class_members other on other.class_id = me.class_id
      where me.user_id = auth.uid() and other.user_id = p_user_id
    )
    -- people who asked to join a class I own
    or exists (
      select 1
      from public.join_requests r
      join public.classes c on c.id = r.class_id
      where r.user_id = p_user_id and c.owner_id = auth.uid()
    );
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles           enable row level security;
alter table public.classes            enable row level security;
alter table public.class_members      enable row level security;
alter table public.class_invites      enable row level security;
alter table public.join_requests      enable row level security;
alter table public.assignments        enable row level security;
alter table public.assignment_status  enable row level security;
alter table public.assignment_reports enable row level security;
alter table public.personal_tasks     enable row level security;
alter table public.notifications      enable row level security;

-- profiles: see yourself, classmates and join requesters; edit only yourself.
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_profile(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- classes (owner_id check lets INSERT ... RETURNING see the new row
-- before the AFTER trigger has created the owner membership)
create policy classes_select on public.classes for select to authenticated
  using (owner_id = auth.uid() or public.is_class_member(id));
create policy classes_insert on public.classes for insert to authenticated
  with check (owner_id = auth.uid());
create policy classes_update on public.classes for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy classes_delete on public.classes for delete to authenticated
  using (owner_id = auth.uid());

-- class_members: inserts only via triggers/RPC. Owner removes members;
-- a member may leave. The owner row is never deleted directly.
create policy class_members_select on public.class_members for select to authenticated
  using (public.is_class_member(class_id));
create policy class_members_delete on public.class_members for delete to authenticated
  using (role <> 'owner' and (user_id = auth.uid() or public.is_class_owner(class_id)));

-- class_invites: owner only.
create policy class_invites_select on public.class_invites for select to authenticated
  using (public.is_class_owner(class_id));
create policy class_invites_insert on public.class_invites for insert to authenticated
  with check (public.is_class_owner(class_id) and created_by = auth.uid() and use_count = 0 and revoked_at is null);
create policy class_invites_update on public.class_invites for update to authenticated
  using (public.is_class_owner(class_id)) with check (public.is_class_owner(class_id));
create policy class_invites_delete on public.class_invites for delete to authenticated
  using (public.is_class_owner(class_id));

-- join_requests: requester sees own; owner sees class requests.
-- Writes only via request_to_join / respond_to_join_request.
create policy join_requests_select on public.join_requests for select to authenticated
  using (user_id = auth.uid() or public.is_class_owner(class_id));

-- assignments: any member reads/creates; creator or owner edits/deletes.
create policy assignments_select on public.assignments for select to authenticated
  using (public.is_class_member(class_id));
create policy assignments_insert on public.assignments for insert to authenticated
  with check (public.is_class_member(class_id) and created_by = auth.uid());
create policy assignments_update on public.assignments for update to authenticated
  using (created_by = auth.uid() or public.is_class_owner(class_id))
  with check (public.is_class_member(class_id));
create policy assignments_delete on public.assignments for delete to authenticated
  using (created_by = auth.uid() or public.is_class_owner(class_id));

-- assignment_status: strictly personal.
create policy assignment_status_select on public.assignment_status for select to authenticated
  using (user_id = auth.uid());
create policy assignment_status_insert on public.assignment_status for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_class_member((select a.class_id from public.assignments a where a.id = assignment_id))
  );
create policy assignment_status_update on public.assignment_status for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy assignment_status_delete on public.assignment_status for delete to authenticated
  using (user_id = auth.uid());

-- assignment_reports: members report; reporter and owner read; owner resolves.
create policy assignment_reports_select on public.assignment_reports for select to authenticated
  using (
    reporter_id = auth.uid()
    or public.is_class_owner((select a.class_id from public.assignments a where a.id = assignment_id))
  );
create policy assignment_reports_insert on public.assignment_reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and status = 'open'
    and public.is_class_member((select a.class_id from public.assignments a where a.id = assignment_id))
  );
create policy assignment_reports_update on public.assignment_reports for update to authenticated
  using (public.is_class_owner((select a.class_id from public.assignments a where a.id = assignment_id)))
  with check (public.is_class_owner((select a.class_id from public.assignments a where a.id = assignment_id)));

-- personal_tasks: owner only.
create policy personal_tasks_all on public.personal_tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: read / mark read / delete your own. Created by triggers only.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Column-level hardening on top of RLS.
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke update on public.class_invites from authenticated;
grant update (revoked_at, expires_at, max_uses) on public.class_invites to authenticated;

revoke update on public.assignment_reports from authenticated;
grant update (status, resolved_at, resolved_by) on public.assignment_reports to authenticated;

revoke update on public.profiles from authenticated;
grant update (full_name, university, avatar_url) on public.profiles to authenticated;

-- =====================================================================
-- RPCs
-- =====================================================================

-- Public preview of an invite (lets a non-member see what they join).
create or replace function public.get_invite_preview(p_token text)
returns table (
  class_id uuid,
  course_name text,
  instructor_name text,
  term text,
  is_valid boolean,
  is_member boolean,
  has_pending_request boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.course_name,
    c.instructor_name,
    c.term,
    (i.revoked_at is null
      and (i.expires_at is null or i.expires_at > now())
      and (i.max_uses is null or i.use_count < i.max_uses)) as is_valid,
    exists (select 1 from public.class_members m where m.class_id = c.id and m.user_id = auth.uid()),
    exists (select 1 from public.join_requests r
            where r.class_id = c.id and r.user_id = auth.uid() and r.status = 'pending')
  from public.class_invites i
  join public.classes c on c.id = i.class_id
  where i.token = p_token;
$$;

-- Request to join a class using an invite token.
create or replace function public.request_to_join(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite  public.class_invites;
  v_request uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_invite from public.class_invites where token = p_token for update;

  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'invite revoked' using errcode = 'P0001';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    raise exception 'invite expired' using errcode = 'P0001';
  end if;
  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'invite usage limit reached' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.class_members
             where class_id = v_invite.class_id and user_id = auth.uid()) then
    raise exception 'already a member' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.join_requests
             where class_id = v_invite.class_id and user_id = auth.uid() and status = 'pending') then
    raise exception 'request already pending' using errcode = 'P0001';
  end if;

  insert into public.join_requests (class_id, user_id, invite_id)
  values (v_invite.class_id, auth.uid(), v_invite.id)
  returning id into v_request;

  update public.class_invites set use_count = use_count + 1 where id = v_invite.id;

  return v_request;
end;
$$;

-- Owner approves or rejects a pending request.
create or replace function public.respond_to_join_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.join_requests;
begin
  select * into v_req from public.join_requests where id = p_request_id for update;

  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  if not public.is_class_owner(v_req.class_id) then
    raise exception 'only the class owner can respond' using errcode = '42501';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'request already handled' using errcode = 'P0001';
  end if;

  update public.join_requests
  set status = case when p_approve then 'approved'::public.join_request_status
                    else 'rejected'::public.join_request_status end,
      decided_at = now(),
      decided_by = auth.uid()
  where id = p_request_id;

  if p_approve then
    insert into public.class_members (class_id, user_id, role)
    values (v_req.class_id, v_req.user_id, 'member')
    on conflict do nothing;
  end if;
end;
$$;

revoke execute on function public.get_invite_preview(text)            from public, anon;
revoke execute on function public.request_to_join(text)               from public, anon;
revoke execute on function public.respond_to_join_request(uuid, boolean) from public, anon;
grant  execute on function public.get_invite_preview(text)            to authenticated;
grant  execute on function public.request_to_join(text)               to authenticated;
grant  execute on function public.respond_to_join_request(uuid, boolean) to authenticated;

-- =====================================================================
-- Views
-- =====================================================================

-- All class assignments visible to the caller, with their personal status.
create view public.my_assignments
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
  coalesce(s.status, 'todo'::public.task_status) as status
from public.assignments a
join public.classes c on c.id = a.class_id
left join public.assignment_status s
  on s.assignment_id = a.id and s.user_id = auth.uid();

-- =====================================================================
-- Notification triggers
-- =====================================================================

create or replace function public.notify_assignment_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, class_id, payload)
  select m.user_id, 'assignment_created', new.class_id,
         jsonb_build_object('assignment_id', new.id, 'title', new.title, 'due_at', new.due_at)
  from public.class_members m
  where m.class_id = new.class_id
    and m.user_id is distinct from new.created_by;
  return new;
end;
$$;

create trigger on_assignment_created after insert on public.assignments
  for each row execute function public.notify_assignment_created();

create or replace function public.notify_join_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.classes where id = new.class_id;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, class_id, payload)
    values (v_owner, 'join_request_received', new.class_id,
            jsonb_build_object('request_id', new.id, 'user_id', new.user_id));
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status <> 'pending' then
    insert into public.notifications (user_id, type, class_id, payload)
    values (new.user_id,
            case when new.status = 'approved' then 'join_request_approved'::public.notification_type
                 else 'join_request_rejected'::public.notification_type end,
            new.class_id,
            jsonb_build_object('request_id', new.id));
  end if;
  return new;
end;
$$;

create trigger on_join_request_change after insert or update on public.join_requests
  for each row execute function public.notify_join_request();

create or replace function public.notify_assignment_reported()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class uuid;
  v_owner uuid;
  v_title text;
begin
  select a.class_id, c.owner_id, a.title into v_class, v_owner, v_title
  from public.assignments a join public.classes c on c.id = a.class_id
  where a.id = new.assignment_id;

  insert into public.notifications (user_id, type, class_id, payload)
  values (v_owner, 'assignment_reported', v_class,
          jsonb_build_object('report_id', new.id, 'assignment_id', new.assignment_id,
                             'title', v_title, 'reason', new.reason));
  return new;
end;
$$;

create trigger on_assignment_reported after insert on public.assignment_reports
  for each row execute function public.notify_assignment_reported();

-- Trigger-only functions must not be callable as RPCs.
revoke execute on function public.handle_new_user()            from public, anon, authenticated;
revoke execute on function public.handle_new_class()           from public, anon, authenticated;
revoke execute on function public.notify_assignment_created()  from public, anon, authenticated;
revoke execute on function public.notify_join_request()        from public, anon, authenticated;
revoke execute on function public.notify_assignment_reported() from public, anon, authenticated;

-- =====================================================================
-- Realtime (postgres_changes respects RLS)
-- =====================================================================
alter publication supabase_realtime add table
  public.assignments,
  public.class_members,
  public.join_requests,
  public.notifications;
