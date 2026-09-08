import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runBatch } from './batch-runner.mjs';

const reviewResult = source => ({
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
  usage: { total_tokens: 1 },
  attempts_used: 1,
  response_mode: 'mock'
});

test('writes one separate review draft per input without publishing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omran-seekai-batch-'));
  const inputA = join(root, 'a.json');
  const inputB = join(root, 'b.json');
  const outputDir = join(root, 'drafts');
  await writeFile(inputA, JSON.stringify({ id: 'A', name: 'منتج أ', price: 10 }), 'utf8');
  await writeFile(inputB, JSON.stringify({ id: 'B', name: 'منتج ب', price: 20 }), 'utf8');

  const summary = await runBatch({
    inputPaths: [inputA, inputB],
    outputDir,
    reportPath: join(root, 'report.json'),
    apiKey: 'test-only',
    generate: async source => reviewResult(source)
  });

  assert.equal(summary.created, 2);
  assert.equal(summary.failed, 0);
  const draftA = JSON.parse(await readFile(join(outputDir, 'a.draft.json'), 'utf8'));
  const draftB = JSON.parse(await readFile(join(outputDir, 'b.draft.json'), 'utf8'));
  assert.equal(draftA.draft.product_id, 'A');
  assert.equal(draftB.draft.product_id, 'B');
  assert.equal(draftA.draft.workflow_status, 'NEEDS_REVIEW');
  assert.equal(draftA.draft.active, false);
  assert.equal(draftA.draft.publish, false);
});

test('resumes safely by skipping existing review-only drafts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omran-seekai-resume-'));
  const input = join(root, 'a.json');
  const outputDir = join(root, 'drafts');
  const output = join(outputDir, 'a.draft.json');
  await writeFile(input, JSON.stringify({ id: 'A', name: 'منتج أ' }), 'utf8');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(outputDir, { recursive: true }));
  await writeFile(output, JSON.stringify(reviewResult({ id: 'A', name: 'منتج أ' })), 'utf8');

  let calls = 0;
  const summary = await runBatch({
    inputPaths: [input],
    outputDir,
    reportPath: join(root, 'report.json'),
    apiKey: 'test-only',
    generate: async source => { calls += 1; return reviewResult(source); }
  });

  assert.equal(calls, 0);
  assert.equal(summary.created, 0);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.failed, 0);
});

test('continues after one product failure and records a local report', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omran-seekai-failure-'));
  const inputA = join(root, 'a.json');
  const inputB = join(root, 'b.json');
  const outputDir = join(root, 'drafts');
  const reportPath = join(root, 'report.json');
  await writeFile(inputA, JSON.stringify({ id: 'A', name: 'منتج أ' }), 'utf8');
  await writeFile(inputB, JSON.stringify({ id: 'B', name: 'منتج ب' }), 'utf8');

  const summary = await runBatch({
    inputPaths: [inputA, inputB],
    outputDir,
    reportPath,
    apiKey: 'test-only',
    generate: async source => {
      if (source.id === 'A') throw new Error('provider timeout');
      return reviewResult(source);
    }
  });

  assert.equal(summary.created, 1);
  assert.equal(summary.failed, 1);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(report.review_only, true);
  assert.equal(report.items[0].status, 'FAILED');
  assert.equal(report.items[1].status, 'CREATED');
});

test('blocks an existing draft that violates the review-only gate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omran-seekai-unsafe-'));
  const input = join(root, 'a.json');
  const outputDir = join(root, 'drafts');
  await writeFile(input, JSON.stringify({ id: 'A', name: 'منتج أ' }), 'utf8');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(outputDir, { recursive: true }));
  await writeFile(join(outputDir, 'a.draft.json'), JSON.stringify({ draft: { publish: true } }), 'utf8');

  await assert.rejects(runBatch({
    inputPaths: [input],
    outputDir,
    reportPath: join(root, 'report.json'),
    apiKey: 'test-only',
    generate: async source => reviewResult(source)
  }), /safety gate/);
});

test('requires a private API key before starting a paid batch', async () => {
  await assert.rejects(runBatch({ apiKey: '' }), /SEEKAI_API_KEY/);
});
