import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, generateDraft } from './product-engine.mjs';

const source = { id: 'OMR-001', name: 'عربية بالريموت', price: 350, dimensions: null };

test('preserves verified fields and requires review', () => {
  const draft = validateDraft(source, { name: 'عربية سباق', search_keywords: ['عربية', 'عربية', 'سيارة'], price: 1, workflow_status: 'PUBLISHED' });
  assert.equal(draft.verified.price, 350);
  assert.equal(draft.workflow_status, 'NEEDS_REVIEW');
  assert.equal(draft.publish, false);
  assert.deepEqual(draft.search_keywords, ['عربية', 'سيارة']);
});

test('rejects POP UP catalog', () => {
  assert.throws(() => validateDraft({ ...source, catalog: 'popup' }, {}), /POP UP/);
});

test('does not call provider without credentials', async () => {
  await assert.rejects(generateDraft(source), /API key/);
});

test('uses confirmed SeekAI endpoint, model and JSON response mode', async () => {
  let captured;
  const result = await generateDraft(source, {
    apiKey: 'test',
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options, body: JSON.parse(options.body) };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ description: 'لعبة عربية للأطفال', search_keywords: ['عربيات'] }) } }], usage: { total_tokens: 20 } }) };
    }
  });
  assert.equal(captured.url, 'https://seekai.cc/v1/chat/completions');
  assert.equal(captured.body.model, 'qwen3.8-flash');
  assert.deepEqual(captured.body.response_format, { type: 'json_object' });
  assert.equal(result.draft.suggested_description, 'لعبة عربية للأطفال');
  assert.equal(result.usage.total_tokens, 20);
  assert.equal(result.attempts_used, 1);
});

test('retries transient provider failures then succeeds', async () => {
  let calls = 0;
  const result = await generateDraft(source, {
    apiKey: 'test',
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) return { ok: false, status: 503 };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"description":"اختبار"}' } }] }) };
    }
  });
  assert.equal(calls, 3);
  assert.equal(result.attempts_used, 3);
});
