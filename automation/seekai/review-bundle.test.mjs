import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildReviewBundle } from './review-bundle.mjs';

function result(id, tokens = 10) {
  return {
    draft: {
      product_id: id,
      workflow_status: 'NEEDS_REVIEW',
      qa_status: 'PENDING',
      active: false,
      publish: false
    },
    usage: { total_tokens: tokens }
  };
}

test('collects review-only drafts and totals known successful tokens', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omran-seekai-review-'));
  const draftsDir = join(root, 'drafts');
  const outputPath = join(root, 'review.json');
  await mkdir(draftsDir, { recursive: true });
  await writeFile(join(draftsDir, '01-a.draft.json'), JSON.stringify(result('A', 12)), 'utf8');
  await writeFile(join(draftsDir, '02-b.draft.json'), JSON.stringify(result('B', 8)), 'utf8');

  const bundle = await buildReviewBundle({ draftsDir, outputPath });
  assert.equal(bundle.review_only, true);
  assert.equal(bundle.draft_count, 2);
  assert.equal(bundle.known_total_tokens, 20);
  const saved = JSON.parse(await readFile(outputPath, 'utf8'));
  assert.equal(saved.drafts[0].draft.product_id, 'A');
});

test('rejects a draft that could publish automatically', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omran-seekai-review-unsafe-'));
  const draftsDir = join(root, 'drafts');
  await mkdir(draftsDir, { recursive: true });
  const unsafe = result('A');
  unsafe.draft.publish = true;
  await writeFile(join(draftsDir, '01-a.draft.json'), JSON.stringify(unsafe), 'utf8');

  await assert.rejects(buildReviewBundle({ draftsDir, outputPath: join(root, 'review.json') }), /Unsafe or invalid review draft/);
});
