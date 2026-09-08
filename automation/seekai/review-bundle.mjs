import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function assertReviewOnly(result, path) {
  const draft = result?.draft;
  if (!draft || draft.workflow_status !== 'NEEDS_REVIEW' || draft.qa_status !== 'PENDING' || draft.active !== false || draft.publish !== false) {
    throw new Error(`Unsafe or invalid review draft: ${path}`);
  }
}

export async function buildReviewBundle({
  draftsDir = 'automation/seekai/batch/drafts',
  outputPath = 'seekai-batch-review.json'
} = {}) {
  const names = (await readdir(draftsDir))
    .filter(name => name.endsWith('.draft.json'))
    .sort((a, b) => a.localeCompare(b, 'en'));

  if (names.length === 0) throw new Error(`No review drafts found in ${draftsDir}`);

  const drafts = [];
  let totalTokens = 0;
  for (const name of names) {
    const path = join(draftsDir, name);
    const parsed = JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
    assertReviewOnly(parsed, path);
    drafts.push(parsed);
    const tokens = Number(parsed?.usage?.total_tokens || 0);
    if (Number.isFinite(tokens)) totalTokens += tokens;
  }

  const bundle = {
    generated_at: new Date().toISOString(),
    review_only: true,
    draft_count: drafts.length,
    known_total_tokens: totalTokens,
    note: 'Review bundle only. No Google Sheet, catalog, storefront or publication changes are performed by this file.',
    drafts
  };

  await writeFile(outputPath, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
  console.log(`Collected ${drafts.length} review drafts into ${outputPath}`);
  return bundle;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildReviewBundle().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
