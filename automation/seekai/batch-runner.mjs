import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateDraft } from './product-engine.mjs';

const DEFAULT_INPUTS = [
  'automation/seekai/batch/inputs/01-remote-racing-car.json',
  'automation/seekai/batch/inputs/02-kitchen-46pcs.json',
  'automation/seekai/batch/inputs/03-home-chef-104pcs.json',
  'automation/seekai/batch/inputs/04-bubble-solution.json',
  'automation/seekai/batch/inputs/05-dog-piano.json'
];

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isReviewOnlyDraft(result) {
  const draft = result?.draft;
  return Boolean(
    draft &&
    draft.workflow_status === 'NEEDS_REVIEW' &&
    draft.qa_status === 'PENDING' &&
    draft.active === false &&
    draft.publish === false
  );
}

export async function runBatch({
  inputPaths = DEFAULT_INPUTS,
  outputDir = 'automation/seekai/batch/drafts',
  reportPath = join(outputDir, 'batch-report.json'),
  apiKey = process.env.SEEKAI_API_KEY,
  baseUrl = process.env.SEEKAI_BASE_URL,
  model = process.env.SEEKAI_MODEL,
  maxTokens = Number.parseInt(process.env.SEEKAI_MAX_TOKENS || '4096', 10),
  skipExisting = true,
  generate = generateDraft
} = {}) {
  if (!apiKey) throw new Error('SEEKAI_API_KEY is required');
  await mkdir(outputDir, { recursive: true });

  const summary = {
    started_at: new Date().toISOString(),
    review_only: true,
    attempted: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    total_tokens: 0,
    items: []
  };

  for (const inputPath of inputPaths) {
    const sourceText = (await readFile(inputPath, 'utf8')).replace(/^\uFEFF/, '');
    const source = JSON.parse(sourceText);
    const outputPath = join(outputDir, `${basename(inputPath, '.json')}.draft.json`);

    if (skipExisting && await fileExists(outputPath)) {
      const existing = JSON.parse((await readFile(outputPath, 'utf8')).replace(/^\uFEFF/, ''));
      if (!isReviewOnlyDraft(existing)) {
        throw new Error(`Existing draft failed review-only safety gate: ${outputPath}`);
      }
      summary.skipped += 1;
      summary.items.push({ product_id: source.id, status: 'SKIPPED_EXISTING', output: outputPath });
      console.log(`Skipped existing review draft for ${source.id}: ${outputPath}`);
      continue;
    }

    summary.attempted += 1;
    const options = { apiKey };
    if (baseUrl) options.baseUrl = baseUrl;
    if (model) options.model = model;
    if (Number.isFinite(maxTokens) && maxTokens > 0) options.maxTokens = maxTokens;

    try {
      const result = await generate(source, options);
      if (!isReviewOnlyDraft(result)) {
        throw new Error('Generated result failed review-only safety gate');
      }
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
      const tokens = Number(result?.usage?.total_tokens || 0);
      summary.created += 1;
      summary.total_tokens += Number.isFinite(tokens) ? tokens : 0;
      summary.items.push({
        product_id: source.id,
        status: 'CREATED',
        output: outputPath,
        usage: result.usage ?? null,
        attempts_used: result.attempts_used ?? null,
        response_mode: result.response_mode ?? null
      });
      console.log(`Draft saved for ${source.id}: ${outputPath}`);
    } catch (error) {
      summary.failed += 1;
      summary.items.push({ product_id: source.id, status: 'FAILED', output: outputPath, error: error.message });
      console.error(`Draft failed for ${source.id}: ${error.message}`);
    }
  }

  summary.finished_at = new Date().toISOString();
  await writeFile(reportPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(`Batch summary: created=${summary.created}, skipped=${summary.skipped}, failed=${summary.failed}. No catalog changes made.`);
  console.log(`Run report: ${reportPath}`);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBatch().then(summary => {
    if (summary.failed > 0) process.exitCode = 1;
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
