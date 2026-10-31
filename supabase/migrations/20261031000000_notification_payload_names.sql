-- Store display names in notification payloads.
--
-- A rejected requester isn't a class member, so RLS hides the class from them
-- and the notification couldn't say which class it was about. Snapshotting the
-- names also keeps old notifications readable after a rename.

create or replace function public.notify_assignment_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course text;
  v_creator text;
begin
  select course_name into v_course from public.classes where id = new.class_id;
  select full_name into v_creator from public.profiles where id = new.created_by;

  insert into public.notifications (user_id, type, class_id, payload)
  select m.user_id, 'assignment_created', new.class_id,
         jsonb_build_object('assignment_id', new.id, 'title', new.title, 'due_at', new.due_at,
                            'course_name', v_course, 'creator_name', coalesce(v_creator, ''))
  from public.class_members m
  where m.class_id = new.class_id
    and m.user_id is distinct from new.created_by;
  return new;
end;
$$;

create or replace function public.notify_join_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_course text;
  v_requester text;
begin
  select owner_id, course_name into v_owner, v_course from public.classes where id = new.class_id;

  if tg_op = 'INSERT' then
    select full_name into v_requester from public.profiles where id = new.user_id;
    insert into public.notifications (user_id, type, class_id, payload)
    values (v_owner, 'join_request_received', new.class_id,
            jsonb_build_object('request_id', new.id, 'user_id', new.user_id,
                               'course_name', v_course, 'requester_name', coalesce(v_requester, '')));
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status <> 'pending' then
    insert into public.notifications (user_id, type, class_id, payload)
    values (new.user_id,
            case when new.status = 'approved' then 'join_request_approved'::public.notification_type
                 else 'join_request_rejected'::public.notification_type end,
            new.class_id,
            jsonb_build_object('request_id', new.id, 'course_name', v_course));
  end if;
  return new;
end;
$$;

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
  v_course text;
begin
  select a.class_id, c.owner_id, a.title, c.course_name into v_class, v_owner, v_title, v_course
  from public.assignments a join public.classes c on c.id = a.class_id
  where a.id = new.assignment_id;

  insert into public.notifications (user_id, type, class_id, payload)
  values (v_owner, 'assignment_reported', v_class,
          jsonb_build_object('report_id', new.id, 'assignment_id', new.assignment_id,
                             'title', v_title, 'reason', new.reason, 'course_name', v_course));
  return new;
end;
$$;

-- `create or replace` keeps the earlier revokes, but restate them so this file stands alone.
revoke execute on function public.notify_assignment_created()  from public, anon, authenticated;
revoke execute on function public.notify_join_request()        from public, anon, authenticated;
revoke execute on function public.notify_assignment_reported() from public, anon, authenticated;

-- Backfill names on existing notifications.
update public.notifications n
set payload = n.payload || jsonb_build_object('course_name', c.course_name)
from public.classes c
where c.id = n.class_id and not n.payload ? 'course_name';

update public.notifications n
set payload = n.payload || jsonb_build_object('requester_name', p.full_name)
from public.profiles p
where n.type = 'join_request_received'
  and p.id = (n.payload ->> 'user_id')::uuid
  and not n.payload ? 'requester_name';
