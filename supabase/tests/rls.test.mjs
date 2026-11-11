import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Runs every migration against an in-process Postgres (PGlite) with a
// minimal stand-in for Supabase's auth schema, then checks RLS scenarios.
// Usage: npm run test:db
const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const migrations = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const db = new PGlite({ extensions: { pgcrypto } });

// Minimal stand-in for what Supabase provides.
await db.exec(`
  create schema extensions;
  create schema auth;
  create role anon nologin;
  create role authenticated nologin;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth, extensions to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  create publication supabase_realtime;
`);
for (const file of migrations) {
  await db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
  console.log('applied', file);
}

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
const C = '00000000-0000-0000-0000-00000000000c';
await db.exec(`insert into auth.users (id, raw_user_meta_data) values
  ('${A}', '{"full_name":"Owner A","university":"UT"}'),
  ('${B}', '{"name":"Student B"}'),
  ('${C}', '{}');`);

let pass = 0, fail = 0;
async function as(uid, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
  try { return (await db.query(sql, params)).rows; }
  finally { await db.exec('reset role;'); }
}
async function ok(name, fn) {
  try { await fn(); pass++; console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '→', e.message); }
}
async function rejects(name, fn) {
  try { await fn(); fail++; console.log('  ✗', name, '→ expected an error'); }
  catch (e) { pass++; console.log('  ✓', name, `(${e.message})`); }
}
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`); }

let classId, token, reqId, asgId;

await ok('profiles auto-created from metadata', async () => {
  const r = await as(A, `select full_name, university from profiles where id = $1`, [A]);
  eq(r, [{ full_name: 'Owner A', university: 'UT' }], 'profile');
  const b = await as(B, `select full_name from profiles where id = $1`, [B]);
  eq(b[0].full_name, 'Student B', 'google name fallback');
});
await ok('owner creates class with INSERT ... RETURNING', async () => {
  const r = await as(A, `insert into classes (course_name, instructor_name, term) values ('DB', 'Dr X', '1405-1') returning id`);
  classId = r[0].id;
  const m = await as(A, `select role from class_members where class_id = $1`, [classId]);
  eq(m, [{ role: 'owner' }], 'owner membership');
});
await ok('outsider cannot see class', async () => {
  eq((await as(C, `select * from classes`)).length, 0, 'rows');
});
await ok('owner creates invite (max 1 use)', async () => {
  token = (await as(A, `insert into class_invites (class_id, max_uses) values ($1, 1) returning token`, [classId]))[0].token;
});
await ok('non-owner cannot see invites', async () => {
  eq((await as(B, `select * from class_invites`)).length, 0, 'rows');
});
await ok('invite preview for non-member', async () => {
  const r = await as(B, `select course_name, is_valid, is_member from get_invite_preview($1)`, [token]);
  eq(r, [{ course_name: 'DB', is_valid: true, is_member: false }], 'preview');
});
await ok('B requests to join; owner notified and can see B profile', async () => {
  reqId = (await as(B, `select request_to_join($1) as id`, [token]))[0].id;
  const n = await as(A, `select type from notifications`);
  eq(n, [{ type: 'join_request_received' }], 'owner notif');
  const payload = (await as(A, `select payload from notifications`))[0].payload;
  eq([payload.course_name, payload.requester_name], ['DB', 'Student B'], 'names in payload');
  eq((await as(A, `select full_name from profiles where id = $1`, [B])).length, 1, 'requester profile visible');
});
await rejects('B cannot request twice', () => as(B, `select request_to_join($1)`, [token]));
await rejects('C blocked by max_uses', () => as(C, `select request_to_join($1)`, [token]));
await rejects('B cannot approve own request', () => as(B, `select respond_to_join_request($1, true)`, [reqId]));
await rejects('B cannot insert membership directly', () => as(B, `insert into class_members (class_id, user_id) values ($1, $2)`, [classId, B]));
await ok('owner approves; B becomes member and is notified', async () => {
  await as(A, `select respond_to_join_request($1, true)`, [reqId]);
  eq((await as(B, `select course_name from classes`)), [{ course_name: 'DB' }], 'B sees class');
  eq((await as(B, `select type from notifications`)), [{ type: 'join_request_approved' }], 'B notif');
});
await ok('B adds assignment; A notified, B not', async () => {
  asgId = (await as(B, `insert into assignments (class_id, title, priority, due_at) values ($1, 'HW1', 'high', now() + interval '3 days') returning id`, [classId]))[0].id;
  eq((await as(A, `select count(*)::int c from notifications where type = 'assignment_created'`))[0].c, 1, 'A notif');
  eq((await as(B, `select count(*)::int c from notifications where type = 'assignment_created'`))[0].c, 0, 'B notif');
});
await rejects('outsider cannot add assignment', () => as(C, `insert into assignments (class_id, title) values ($1, 'x')`, [classId]));
await ok('personal status is independent', async () => {
  await as(B, `insert into assignment_status (assignment_id, status) values ($1, 'done')
               on conflict (assignment_id, user_id) do update set status = excluded.status`, [asgId]);
  eq((await as(B, `select status from my_assignments`)), [{ status: 'done' }], 'B status');
  eq((await as(A, `select status from my_assignments`)), [{ status: 'todo' }], 'A status');
  eq((await as(A, `select * from assignment_status`)).length, 0, 'A cannot see B status rows');
});
await rejects('outsider cannot set status on class assignment', () => as(C, `insert into assignment_status (assignment_id, status) values ($1, 'done')`, [asgId]));
await ok('member cannot edit an assignment they did not create (0 rows)', async () => {
  const id2 = (await as(A, `insert into assignments (class_id, title) values ($1, 'Owner HW') returning id`, [classId]))[0].id;
  eq((await as(B, `update assignments set title = 'hacked' where id = $1 returning id`, [id2])).length, 0, 'rows');
});
await ok('owner can edit member assignment', async () => {
  eq((await as(A, `update assignments set title = 'HW1 (fixed)' where id = $1 returning id`, [asgId])).length, 1, 'rows');
});
await ok('B reports; owner notified and resolves', async () => {
  const rid = (await as(B, `insert into assignment_reports (assignment_id, reason) values ($1, 'wrong date') returning id`, [asgId]))[0].id;
  eq((await as(A, `select count(*)::int c from notifications where type = 'assignment_reported'`))[0].c, 1, 'notif');
  eq((await as(A, `update assignment_reports set status = 'resolved', resolved_at = now() where id = $1 returning id`, [rid])).length, 1, 'resolve');
});
await rejects('notification type cannot be edited', () => as(B, `update notifications set type = 'assignment_reported'`));
await ok('mark notification as read', async () => {
  eq((await as(B, `update notifications set read_at = now() returning id`)).length, 2, 'rows (approved + Owner HW)');
});
await ok('personal tasks are private', async () => {
  await as(B, `insert into personal_tasks (title) values ('gym')`);
  eq((await as(A, `select * from personal_tasks`)).length, 0, 'A');
  eq((await as(B, `select * from personal_tasks`)).length, 1, 'B');
});
await ok('owner row cannot be deleted', async () => {
  eq((await as(A, `delete from class_members where user_id = $1 returning user_id`, [A])).length, 0, 'rows');
});
await rejects('owner_id cannot be changed', () => as(A, `update classes set owner_id = $1`, [B]));
await ok('owner removes B; B loses access', async () => {
  eq((await as(A, `delete from class_members where class_id = $1 and user_id = $2 returning user_id`, [classId, B])).length, 1, 'rows');
  eq((await as(B, `select * from assignments`)).length, 0, 'B assignments');
});
await ok('owner revokes invite; preview invalid', async () => {
  await as(A, `update class_invites set revoked_at = now() where token = $1`, [token]);
  eq((await as(C, `select is_valid from get_invite_preview($1)`, [token])), [{ is_valid: false }], 'preview');
});
await ok('rejected requester still sees which class (name in payload)', async () => {
  const t2 = (await as(A, `insert into class_invites (class_id) values ($1) returning token`, [classId]))[0].token;
  const r2 = (await as(C, `select request_to_join($1) as id`, [t2]))[0].id;
  await as(A, `select respond_to_join_request($1, false)`, [r2]);
  eq((await as(C, `select * from classes`)).length, 0, 'C still cannot read class');
  eq((await as(C, `select type, payload ->> 'course_name' as course from notifications`)),
    [{ type: 'join_request_rejected', course: 'DB' }], 'C notif');
});
await rejects('anon cannot call request_to_join', async () => {
  await db.exec(`select set_config('request.jwt.claim.sub', '', false); set role anon;`);
  try { await db.query(`select request_to_join($1)`, [token]); } finally { await db.exec('reset role;'); }
});

// --- Class colors, sessions, reminders -------------------------------------------
await ok('new class gets a color its creator does not already use', async () => {
  const first = (await as(A, `select color from classes where id = $1`, [classId]))[0].color;
  const second = (await as(A, `insert into classes (course_name) values ('OS') returning id, color`))[0];
  if (second.color === first) throw new Error(`both classes are ${first}`);
  await as(A, `delete from classes where id = $1`, [second.id]);
});
await ok('owner can change the class color; invalid colors rejected', async () => {
  eq((await as(A, `update classes set color = 'teal' where id = $1 returning color`, [classId])), [{ color: 'teal' }], 'update');
});
await rejects('class color must be from the palette', () => as(A, `update classes set color = 'black' where id = $1`, [classId]));
let sessionId;
await ok('owner adds a weekly session', async () => {
  sessionId = (await as(A, `insert into class_sessions (class_id, weekday, start_time, end_time, room)
                            values ($1, 0, '10:00', '11:30', '203') returning id`, [classId]))[0].id;
});
await rejects('session must end after it starts', () =>
  as(A, `insert into class_sessions (class_id, weekday, start_time, end_time) values ($1, 1, '12:00', '11:00')`, [classId]));
await rejects('non-owner cannot add sessions', () =>
  as(C, `insert into class_sessions (class_id, weekday, start_time, end_time) values ($1, 2, '08:00', '09:00')`, [classId]));
await ok('outsider cannot see sessions', async () => {
  eq((await as(C, `select * from class_sessions`)).length, 0, 'rows');
});
await ok('users set their own reminder lead times', async () => {
  eq((await as(C, `update profiles set class_reminder_minutes = 15, deadline_reminder_hours = null where id = $1
                   returning class_reminder_minutes, deadline_reminder_hours`, [C])),
    [{ class_reminder_minutes: 15, deadline_reminder_hours: null }], 'C settings');
});
await rejects('clients cannot run the reminder job', () => as(A, `select send_due_reminders()`));
await rejects('clients cannot read the reminder log', () => as(A, `insert into reminder_log (user_id, kind, ref_id, occurs_at) values ($1, 'class', $1, now())`, [A]));
await ok('class reminder: sent once, 30 min before (Sat 10:00 Tehran)', async () => {
  // 2026-11-14 is a Saturday; A's default lead is 30 minutes. Deadline reminders off
  // here: HW1 is due "3 days after the test runs", which can fall in this window.
  await as(A, `update profiles set deadline_reminder_hours = null where id = $1`, [A]);
  const sent = (await db.query(`select send_due_reminders('2026-11-14 09:45:00+03:30') as n`)).rows[0].n;
  eq(sent, 1, 'first run');
  eq((await db.query(`select send_due_reminders('2026-11-14 09:50:00+03:30') as n`)).rows[0].n, 0, 'second run');
  const n = await as(A, `select payload ->> 'room' as room, payload ->> 'start_time' as t from notifications where type = 'class_starting'`);
  eq(n, [{ room: '203', t: '10:00' }], 'A notification');
  eq((await db.query(`select send_due_reminders('2026-11-14 09:20:00+03:30') as n`)).rows[0].n, 0, 'too early');
  await as(A, `update profiles set deadline_reminder_hours = 24 where id = $1`, [A]);
});
await ok('deadline reminder: sent before due unless done', async () => {
  const due = (await db.query(`select due_at from assignments where id = $1`, [asgId])).rows[0].due_at;
  const at = new Date(new Date(due).getTime() - 2 * 3600_000).toISOString();
  eq((await db.query(`select send_due_reminders($1) as n`, [at])).rows[0].n, 1, 'A (todo) reminded');
  eq((await as(A, `select count(*)::int c from notifications where type = 'assignment_due_soon'`))[0].c, 1, 'A notif');
  await as(A, `insert into assignment_status (assignment_id, status) values ($1, 'done')`, [asgId]);
  await db.query(`delete from reminder_log`);
  eq((await db.query(`select send_due_reminders($1) as n`, [at])).rows[0].n, 0, 'done → no reminder');
});

// --- Push tokens ----------------------------------------------------------------
const TOKEN = 'fcm-token-of-a-test-device-0001';
await ok('user registers a push token and sees only their own', async () => {
  await as(A, `select register_push_token($1)`, [TOKEN]);
  eq((await as(A, `select token from push_tokens`)), [{ token: TOKEN }], 'A sees it');
  eq((await as(C, `select * from push_tokens`)).length, 0, 'C sees none');
});
await rejects('clients cannot write push_tokens directly', () => as(C, `insert into push_tokens (token) values ('direct-insert-token-xx')`));
await ok('same device signing into another account moves the token', async () => {
  await as(C, `select register_push_token($1)`, [TOKEN]);
  eq((await as(A, `select * from push_tokens`)).length, 0, 'A lost it');
  eq((await as(C, `select count(*)::int c from push_tokens`))[0].c, 1, 'C has it');
});
await ok('unregister only removes your own token', async () => {
  await as(A, `select unregister_push_token($1)`, [TOKEN]);
  eq((await as(C, `select count(*)::int c from push_tokens`))[0].c, 1, 'A could not remove C token');
  await as(C, `select unregister_push_token($1)`, [TOKEN]);
  eq((await as(C, `select count(*)::int c from push_tokens`))[0].c, 0, 'C removed it');
});
await ok('push trigger is a no-op without pg_net (event notification still saved)', async () => {
  await as(C, `select register_push_token($1)`, [TOKEN]);
  await db.query(`insert into notifications (user_id, type, payload) values ($1, 'join_request_approved', '{}')`, [C]);
  eq((await as(C, `select count(*)::int c from notifications where type = 'join_request_approved'`))[0].c, 1, 'saved');
});

// --- Web Push subscriptions ------------------------------------------------------
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/test-browser-endpoint';
const P256DH = 'B'.repeat(87);
const AUTH = 'a'.repeat(22);
await ok('user registers a browser subscription and sees only their own', async () => {
  await as(A, `select register_web_push($1, $2, $3)`, [ENDPOINT, P256DH, AUTH]);
  eq((await as(A, `select endpoint from web_push_subscriptions`)), [{ endpoint: ENDPOINT }], 'A sees it');
  eq((await as(C, `select * from web_push_subscriptions`)).length, 0, 'C sees none');
});
await rejects('clients cannot write web_push_subscriptions directly', () =>
  as(C, `insert into web_push_subscriptions (endpoint, p256dh, auth) values ($1, $2, $3)`, [ENDPOINT + '2', P256DH, AUTH]));
await rejects('endpoint must be https', () => as(A, `select register_web_push($1, $2, $3)`, ['http://evil.test/x', P256DH, AUTH]));
await ok('same browser signing into another account moves the subscription', async () => {
  await as(C, `select register_web_push($1, $2, $3)`, [ENDPOINT, P256DH, AUTH]);
  eq((await as(A, `select * from web_push_subscriptions`)).length, 0, 'A lost it');
  eq((await as(C, `select count(*)::int c from web_push_subscriptions`))[0].c, 1, 'C has it');
});
await ok('unregister only removes your own subscription', async () => {
  await as(A, `select unregister_web_push($1)`, [ENDPOINT]);
  eq((await as(C, `select count(*)::int c from web_push_subscriptions`))[0].c, 1, 'A could not remove it');
  await as(C, `select unregister_web_push($1)`, [ENDPOINT]);
  eq((await as(C, `select count(*)::int c from web_push_subscriptions`))[0].c, 0, 'C removed it');
});
// --- Reminders scheduled on the phone (per device) ------------------------------------
const SESSION_REF = '00000000-0000-4000-8000-0000000000aa';
const PHONE1 = 'fcm-token-of-a-test-phone-0001';
const PHONE2 = 'fcm-token-of-a-test-phone-0002';
const item = (kind, at) => ({ kind, ref_id: SESSION_REF, occurs_at: at });
await ok('each phone reports its own scheduled reminders', async () => {
  await as(A, `select register_push_token($1)`, [PHONE1]);
  await as(A, `select register_push_token($1)`, [PHONE2]);
  await as(A, `select sync_phone_reminders($1, $2::jsonb)`, [PHONE1, JSON.stringify([item('class', '2026-11-14T06:30:00Z'), item('class', '2026-11-14T06:30:00Z')])]);
  await as(A, `select sync_phone_reminders($1, $2::jsonb)`, [PHONE2, JSON.stringify([])]);
  eq((await as(A, `select token, count(*)::int c from phone_reminders group by token`)), [{ token: PHONE1, c: 1 }], 'phone 2 did not wipe phone 1; duplicates collapsed');
  await as(A, `select sync_phone_reminders($1, '[]'::jsonb)`, [PHONE1]);
  eq((await as(A, `select count(*)::int c from phone_reminders`))[0].c, 0, 'replaced by empty list');
  await as(A, `select sync_phone_reminders($1, $2::jsonb)`, [PHONE1, JSON.stringify([item('deadline', '2026-11-15T20:00:00Z')])]);
  eq((await as(C, `select * from phone_reminders`)).length, 0, 'C cannot see A phones');
});
await rejects('cannot sync a phone that is not yours', () => as(C, `select sync_phone_reminders($1, '[]'::jsonb)`, [PHONE1]));
await rejects('reminder list must be an array', () => as(A, `select sync_phone_reminders($1, '{"kind":"class"}'::jsonb)`, [PHONE1]));
await rejects('reminder kind is checked', () =>
  as(A, `select sync_phone_reminders($1, $2::jsonb)`, [PHONE1, JSON.stringify([item('other', '2026-11-15T20:00:00Z')])]));
await rejects('clients cannot write phone_reminders directly', () =>
  as(A, `insert into phone_reminders (token, kind, ref_id, occurs_at) values ($1, 'class', $2, now())`, [PHONE1, SESSION_REF]));
await ok('phone moving to another account starts with an empty list', async () => {
  await as(C, `select register_push_token($1)`, [PHONE1]);
  eq((await as(C, `select count(*)::int c from phone_reminders`))[0].c, 0, 'list dropped');
  await as(C, `select unregister_push_token($1)`, [PHONE1]);
});
await ok('signing out on a phone drops its list', async () => {
  await as(A, `select sync_phone_reminders($1, $2::jsonb)`, [PHONE2, JSON.stringify([item('class', '2026-11-16T06:30:00Z')])]);
  await as(A, `select unregister_push_token($1)`, [PHONE2]);
  eq((await db.query(`select count(*)::int c from phone_reminders`)).rows[0].c, 0, 'cascade-deleted');
});

await ok('push trigger runs for reminders too and is a no-op without pg_net', async () => {
  await as(C, `select register_web_push($1, $2, $3)`, [ENDPOINT, P256DH, AUTH]);
  await db.query(`insert into notifications (user_id, type, payload) values ($1, 'assignment_due_soon', '{}')`, [C]);
  eq((await as(C, `select count(*)::int c from notifications where type = 'assignment_due_soon'`))[0].c >= 1, true, 'saved');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
