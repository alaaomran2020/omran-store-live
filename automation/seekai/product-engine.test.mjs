import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft, generateDraft, parseAssistantJson } from './product-engine.mjs';

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

test('uses confirmed SeekAI endpoint, GLM model and JSON response mode', async () => {
  let captured;
  const result = await generateDraft(source, {
    apiKey: 'test',
    fetchImpl: async (url, options) => {
      captured = { url: String(url), body: JSON.parse(options.body) };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          model: 'glm-5.3-flash',
          choices: [{ message: { content: JSON.stringify({ description: 'لعبة عربية للأطفال', search_keywords: ['عربيات'] }) }, finish_reason: 'stop' }],
          usage: { total_tokens: 20 }
        })
      };
    }
  });
  assert.equal(captured.url, 'https://seekai.cc/v1/chat/completions');
  assert.equal(captured.body.model, 'glm-5.3-flash');
  assert.deepEqual(captured.body.response_format, { type: 'json_object' });
  assert.equal(result.draft.suggested_description, 'لعبة عربية للأطفال');
  assert.equal(result.usage.total_tokens, 20);
  assert.equal(result.attempts_used, 1);
  assert.equal(result.response_mode, 'json_object');
});

test('parses assistant content while ignoring GLM reasoning_content', () => {
  const parsed = parseAssistantJson({
    choices: [{
      finish_reason: 'stop',
      message: {
        role: 'assistant',
        content: '```json\n{"description":"اختبار"}\n```',
        reasoning_content: 'Internal reasoning that must not be parsed as catalog data.'
      }
    }]
  });
  assert.equal(parsed.description, 'اختبار');
});

test('falls back without response_format after an empty GLM response', async () => {
  const requestBodies = [];
  let calls = 0;
  const result = await generateDraft(source, {
    apiKey: 'test',
    retryDelayMs: 0,
    fetchImpl: async (_url, options) => {
      calls += 1;
      requestBodies.push(JSON.parse(options.body));
      if (calls === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: 'glm-5.3-flash',
            choices: [{ finish_reason: 'stop', message: { content: '', reasoning_content: 'reasoning only' } }]
          })
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          model: 'glm-5.3-flash',
          choices: [{ finish_reason: 'stop', message: { content: '{"description":"نجح الوضع المتوافق"}' } }]
        })
      };
    }
  });
  assert.equal(calls, 2);
  assert.deepEqual(requestBodies[0].response_format, { type: 'json_object' });
  assert.equal('response_format' in requestBodies[1], false);
  assert.equal(result.draft.suggested_description, 'نجح الوضع المتوافق');
  assert.equal(result.attempts_used, 2);
  assert.equal(result.response_mode, 'compatibility');
});

test('reports a clear error after repeated empty responses', async () => {
  await assert.rejects(
    generateDraft(source, {
      apiKey: 'test',
      attempts: 2,
      retryDelayMs: 0,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '', reasoning_content: 'reasoning only' } }] })
      })
    }),
    /AI returned empty content/
  );
});

test('retries transient provider failures then succeeds', async () => {
  let calls = 0;
  const result = await generateDraft(source, {
    apiKey: 'test',
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls < 3) return { ok: false, status: 503 };
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '{"description":"اختبار"}' }, finish_reason: 'stop' }] }) };
    }
  });
  assert.equal(calls, 3);
  assert.equal(result.attempts_used, 3);
});
