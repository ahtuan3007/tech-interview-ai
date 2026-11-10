import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const candidate = '00000000-0000-4000-8000-000000000001';
const interviewer = '00000000-0000-4000-8000-000000000002';
const stranger = '00000000-0000-4000-8000-000000000003';
const roomId = '00000000-0000-4000-8000-000000000004';
const questionId = '00000000-0000-4000-8000-000000000005';
const future = () => new Date(Date.now() + 3600000).toISOString();
const input = (overrides = {}) => ({ question_id: questionId, session_mode: 'AI_MOCK_INTERVIEW',
  interviewer_id: null, scheduled_at: '', start_now: true, ...overrides });
const session = (overrides = {}) => ({ id: roomId, interviewee_id: candidate, interviewer_id: null,
  question_id: questionId, session_mode: 'AI_MOCK_INTERVIEW', status: 'SCHEDULED',
  scheduled_at: new Date(Date.now() - 1000).toISOString(), created_at: new Date().toISOString(), ...overrides });

function setup(options = {}) {
  const state = { userId: candidate, role: 'INTERVIEWEE', current: session(), questionExists: true, ...options };
  const writes = [];
  const filters = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: state.userId ? { id: state.userId } : null } }) },
    from(table) {
      let operation = 'read';
      const chain = {
        select: () => chain,
        eq: (...args) => { filters.push(args); return chain; },
        lte: (...args) => { filters.push(args); return chain; },
        insert: (data) => { operation = 'insert'; writes.push({ table, data }); return chain; },
        update: (data) => { operation = 'update'; writes.push({ table, data }); return chain; },
        single: async () => ({ data: state.insertError ? null : { id: roomId }, error: state.insertError }),
        maybeSingle: async () => {
          if (table === 'profiles') return { data: { role: state.role } };
          if (table === 'questions') return { data: state.questionExists ? { id: questionId } : null };
          if (operation === 'update') {
            if (state.raceStatus) { state.current = { ...state.current, status: state.raceStatus }; return { data: null }; }
            return { data: state.updateError ? null : { id: roomId }, error: state.updateError };
          }
          return { data: state.current, error: state.readError };
        },
      };
      return chain;
    },
  };
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(file);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    cache.set(filename, exports);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { exports, Date, console, require: (name) => {
      if (name === 'server-only') return {};
      if (name === 'next/cache') return { revalidatePath() {} };
      if (name === '@/utils/supabase/server') return { createClient: async () => client };
      return load(name.startsWith('@/') ? `${name.slice(2)}.ts` : path.resolve(path.dirname(filename), `${name}.ts`));
    } });
    return exports;
  }
  return { actions: load('app/interviews/actions.ts'), access: load('utils/interviews/server.ts'),
    validation: load('utils/interviews/validation.ts'), writes, filters };
}

test('guest cannot create a scheduled interview', async () => {
  const { actions, writes } = setup({ userId: null });
  assert.equal((await actions.scheduleInterview(input())).success, false);
  assert.equal(writes.length, 0);
});

test('AI quick start uses authenticated candidate and no second participant', async () => {
  const { actions, writes } = setup();
  const result = await actions.scheduleInterview(input({ interviewee_id: stranger, status: 'COMPLETED', id: stranger }));
  assert.equal(result.success, true);
  assert.equal(result.lobbyPath, `/room/${roomId}/lobby`);
  assert.equal(result.roomPath, `/room/${roomId}`);
  const payload = writes[0].data;
  assert.equal(payload.interviewee_id, candidate);
  assert.equal(payload.interviewer_id, null);
  assert.equal(payload.status, 'SCHEDULED');
  assert.ok(Math.abs(Date.now() - Date.parse(payload.scheduled_at)) < 10000);
  assert.equal('id' in payload, false);
});

test('peer scheduling preserves an explicitly assigned different interviewer and UTC time', async () => {
  const { actions, writes } = setup();
  const date = future();
  assert.equal((await actions.scheduleInterview(input({ session_mode: 'PEER_TO_PEER',
    interviewer_id: interviewer, start_now: false, scheduled_at: date }))).success, true);
  assert.equal(writes[0].data.interviewer_id, interviewer);
  assert.equal(writes[0].data.scheduled_at, date);
});

test('malformed inputs, past schedules and self-pairing never reach a write', async () => {
  const { actions, writes } = setup();
  for (const data of [null, input({ question_id: 'bad' }), input({ session_mode: 'OTHER' }),
    input({ start_now: 'true' }), input({ interviewer_id: interviewer }),
    input({ session_mode: 'PEER_TO_PEER', interviewer_id: candidate, start_now: false, scheduled_at: future() }),
    input({ session_mode: 'PEER_TO_PEER', interviewer_id: null, start_now: false, scheduled_at: future() }),
    input({ session_mode: 'PEER_TO_PEER', interviewer_id: interviewer }),
    input({ start_now: false, scheduled_at: '2020-01-01T12:00:00Z' }),
    input({ start_now: false, scheduled_at: '2030-01-01T12:00:00' })]) {
    assert.equal((await actions.scheduleInterview(data)).success, false);
  }
  assert.equal(writes.length, 0);
});

test('missing questions and schema mismatch cannot return a fake room link', async () => {
  const missing = setup({ questionExists: false });
  assert.equal((await missing.actions.scheduleInterview(input())).success, false);
  assert.equal(missing.writes.length, 0);
  const broken = setup({ insertError: { code: '42703' } });
  const result = await broken.actions.scheduleInterview(input());
  assert.equal(result.success, false);
  assert.match(result.error, /cấu hình/);
  assert.equal(result.roomPath, undefined);
});

test('room authorization rejects an unrelated user even if RLS returns a row', async () => {
  const { actions, access, writes } = setup({ userId: stranger });
  assert.equal((await access.getInterviewAccess(roomId)).kind, 'not-found');
  assert.equal((await actions.enterInterview(roomId)).success, false);
  assert.equal(writes.length, 0);
});

test('candidate, assigned interviewer and admin may access a peer session', async () => {
  for (const options of [{ userId: candidate }, { userId: interviewer }, { userId: stranger, role: 'ADMIN' }]) {
    const { access } = setup({ ...options, current: session({ session_mode: 'PEER_TO_PEER', interviewer_id: interviewer }) });
    assert.equal((await access.getInterviewAccess(roomId)).kind, 'allowed');
  }
});

test('guests, invalid room IDs and RLS-hidden sessions are denied', async () => {
  assert.equal((await setup({ userId: null }).access.getInterviewAccess(roomId)).kind, 'unauthenticated');
  assert.equal((await setup().access.getInterviewAccess('bad')).kind, 'not-found');
  assert.equal((await setup({ current: null }).access.getInterviewAccess(roomId)).kind, 'not-found');
});

test('future and ended interviews cannot be started', async () => {
  for (const current of [session({ scheduled_at: future() }), session({ status: 'COMPLETED' }), session({ status: 'EXPIRED' })]) {
    const { actions, writes } = setup({ current });
    assert.equal((await actions.enterInterview(roomId)).success, false);
    assert.equal(writes.length, 0);
  }
});

test('AI starts independently and scheduled transition uses compare-and-set', async () => {
  const { actions, writes, filters } = setup();
  const result = await actions.enterInterview(roomId);
  assert.equal(result.success, true);
  assert.equal(result.roomPath, `/room/${roomId}`);
  assert.deepEqual(JSON.parse(JSON.stringify(writes[0].data)), { status: 'LIVE' });
  assert.ok(filters.some(([column, value]) => column === 'status' && value === 'SCHEDULED'));
});

test('already-live sessions and concurrent entrants are idempotent; ended races are rejected', async () => {
  const live = setup({ current: session({ status: 'LIVE' }) });
  assert.equal((await live.actions.enterInterview(roomId)).success, true);
  assert.equal(live.writes.length, 0);
  assert.equal((await setup({ raceStatus: 'LIVE' }).actions.enterInterview(roomId)).success, true);
  assert.equal((await setup({ raceStatus: 'COMPLETED' }).actions.enterInterview(roomId)).success, false);
});

test('RLS update rejection does not return an entry link', async () => {
  const { actions } = setup({ updateError: { code: '42501' } });
  const result = await actions.enterInterview(roomId);
  assert.equal(result.success, false);
  assert.match(result.error, /RLS/);
  assert.equal(result.roomPath, undefined);
});
