import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runBatch } from './batch-runner.mjs';

test('writes one separate review draft per input without publishing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omran-seekai-batch-'));
  const inputA = join(root, 'a.json');
  const inputB = join(root, 'b.json');
  const outputDir = join(root, 'drafts');
  await writeFile(inputA, JSON.stringify({ id: 'A', name: 'منتج أ', price: 10 }), 'utf8');
  await writeFile(inputB, JSON.stringify({ id: 'B', name: 'منتج ب', price: 20 }), 'utf8');

  const generate = async source => ({
    draft: {
      product_id: source.id,
      source_name: source.name,
      verified: { price: source.price },
      workflow_status: 'NEEDS_REVIEW',
      qa_status: 'PENDING',
      active: false,
      publish: false
    },
    provider: 'mock',
    model: 'mock',
    usage: { total_tokens: 1 }
  });

  const results = await runBatch({
    inputPaths: [inputA, inputB],
    outputDir,
    apiKey: 'test-only',
    generate
  });

  assert.equal(results.length, 2);
  const draftA = JSON.parse(await readFile(join(outputDir, 'a.draft.json'), 'utf8'));
  const draftB = JSON.parse(await readFile(join(outputDir, 'b.draft.json'), 'utf8'));
  assert.equal(draftA.draft.product_id, 'A');
  assert.equal(draftB.draft.product_id, 'B');
  assert.equal(draftA.draft.workflow_status, 'NEEDS_REVIEW');
  assert.equal(draftA.draft.active, false);
  assert.equal(draftA.draft.publish, false);
});

test('requires a private API key before starting a paid batch', async () => {
  await assert.rejects(runBatch({ apiKey: '' }), /SEEKAI_API_KEY/);
});
