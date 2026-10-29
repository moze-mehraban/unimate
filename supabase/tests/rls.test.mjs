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
await rejects('anon cannot call request_to_join', async () => {
  await db.exec(`select set_config('request.jwt.claim.sub', '', false); set role anon;`);
  try { await db.query(`select request_to_join($1)`, [token]); } finally { await db.exec('reset role;'); }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
