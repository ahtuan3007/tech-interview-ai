import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the server boundaries with a fake Supabase transport; no cloud writes.
function load(file, { role = 'ADMIN', signedIn = true, env = {}, fetch } = {}) {
  const writes = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'user' } : null } }) },
    from(table) {
      const chain = {
        select: () => chain, eq: () => chain,
        maybeSingle: async () => ({ data: table === 'profiles' ? { role } : { id: 'saved' } }),
        single: async () => ({ data: { id: 'saved' } }),
        insert: (payload) => { writes.push(payload); return chain; },
        update: (payload) => { writes.push(payload); return chain; },
        delete: () => { writes.push('delete'); return chain; },
      };
      return chain;
    },
  };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: (name) => name === 'next/cache'
      ? { revalidatePath() {} } : { createClient: async () => client },
    process: { env }, Response, Request, AbortSignal, fetch,
  });
  return { api: exports, writes };
}

const valid = () => ({
  title: 'Two Sum', category: 'Arrays & Hashing', difficulty: 'EASY', content: 'Find two indices.',
  expected_time_complexity: 'O(n)', expected_space_complexity: 'O(n)',
  test_cases: [{ id: 'tc-1', input: '  input\n', expected_output: '[0,1]', is_hidden: false }],
  starter_code: { typescript: '', javascript: '', python: '' }, hints: ['Try a map'],
});
const id = '00000000-0000-4000-8000-000000000001';

test('guests and candidates cannot create, update or delete through actions', async () => {
  for (const options of [{ signedIn: false }, { role: 'INTERVIEWEE' }]) {
    const { api, writes } = load('app/questions/actions.ts', options);
    assert.equal((await api.saveQuestion(valid())).success, false);
    assert.equal((await api.saveQuestion(valid(), id)).success, false);
    assert.equal((await api.deleteQuestion(id)).success, false);
    assert.equal(writes.length, 0);
  }
});

test('malformed nested data and unconfirmed drafts never reach database writes', async () => {
  const { api, writes } = load('app/questions/actions.ts');
  const malformed = [null, { ...valid(), category: 3 }, { ...valid(), hints: [null] },
    { ...valid(), starter_code: null }, { ...valid(), test_cases: [null] },
    { ...valid(), test_cases: [{ ...valid().test_cases[0], expected_output: 'TODO: review' }] },
    { ...valid(), test_cases: [valid().test_cases[0], valid().test_cases[0]] }];
  for (const input of malformed) assert.equal((await api.saveQuestion(input)).success, false);
  assert.equal(writes.length, 0);
});

test('admin writes match schema and preserve exact input whitespace', async () => {
  const { api, writes } = load('app/questions/actions.ts');
  const input = valid();
  input.weight = 100;
  input.test_cases[0].weight = 100;
  input.starter_code.unexpected = 'discard';
  assert.equal((await api.saveQuestion(input)).success, true);
  assert.equal(writes[0].test_cases[0].input, '  input\n');
  assert.equal('weight' in writes[0], false);
  assert.equal('weight' in writes[0].test_cases[0], false);
  assert.equal('unexpected' in writes[0].starter_code, false);
});

test('AI endpoint rejects guests and candidates', async () => {
  for (const [options, status] of [[{ signedIn: false }, 401], [{ role: 'INTERVIEWEE' }, 403]]) {
    const { api } = load('app/api/ai/generate-test-cases/route.ts', options);
    assert.equal((await api.POST(new Request('http://localhost', { method: 'POST', body: '{}' }))).status, status);
  }
});

test('AI rejects null JSON and creates five fallback cases with two public cases', async () => {
  const { api } = load('app/api/ai/generate-test-cases/route.ts');
  const request = (body) => new Request('http://localhost', { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await api.POST(request(null))).status, 400);
  for (const title of ['Two Sum', 'Valid Parentheses', 'LRU Cache', 'Unknown problem']) {
    const response = await api.POST(request({ title, content: 'A sufficiently detailed description' }));
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.mode, 'fallback');
    assert.equal(data.test_cases.length, 5);
    assert.equal(data.test_cases.filter((item) => !item.is_hidden).length, 2);
    assert.equal(data.test_cases.filter((item) => item.is_hidden).length, 3);
  }
});

test('malformed LLM cases fall back instead of crashing', async () => {
  const { api } = load('app/api/ai/generate-test-cases/route.ts', {
    env: { OPENAI_API_KEY: 'test-only' },
    fetch: async () => Response.json({ choices: [{ message: { content: JSON.stringify({
      test_cases: [null, null, null, null, null], starter_code: {}, hints: [],
    }) } }] }),
  });
  const response = await api.POST(new Request('http://localhost', { method: 'POST',
    body: JSON.stringify({ title: 'Two Sum', content: 'Find indices that sum to target.' }) }));
  assert.equal((await response.json()).mode, 'fallback');
});
