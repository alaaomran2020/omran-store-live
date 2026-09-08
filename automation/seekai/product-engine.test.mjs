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
  await assert.rejects(generateDraft(source, { model: 'test' }), /API key/);
});
test('accepts a mocked response without network access', async () => {
  const result = await generateDraft(source, { apiKey: 'test', model: 'test', fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ description: 'لعبة عربية للأطفال', search_keywords: ['عربيات'] }) } }], usage: { total_tokens: 20 } }) }) });
  assert.equal(result.draft.suggested_description, 'لعبة عربية للأطفال');
  assert.equal(result.usage.total_tokens, 20);
});
