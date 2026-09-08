import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateDraft } from './product-engine.mjs';

const DEFAULT_INPUTS = [
  'automation/seekai/batch/inputs/01-remote-racing-car.json',
  'automation/seekai/batch/inputs/02-kitchen-46pcs.json',
  'automation/seekai/batch/inputs/03-home-chef-104pcs.json'
];

export async function runBatch({
  inputPaths = DEFAULT_INPUTS,
  outputDir = 'automation/seekai/batch/drafts',
  apiKey = process.env.SEEKAI_API_KEY,
  baseUrl = process.env.SEEKAI_BASE_URL,
  model = process.env.SEEKAI_MODEL,
  generate = generateDraft
} = {}) {
  if (!apiKey) throw new Error('SEEKAI_API_KEY is required');
  await mkdir(outputDir, { recursive: true });
  const results = [];

  for (const inputPath of inputPaths) {
    const sourceText = (await readFile(inputPath, 'utf8')).replace(/^\uFEFF/, '');
    const source = JSON.parse(sourceText);
    const outputPath = join(outputDir, `${basename(inputPath, '.json')}.draft.json`);

    const options = { apiKey };
    if (baseUrl) options.baseUrl = baseUrl;
    if (model) options.model = model;

    const result = await generate(source, options);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    results.push({ product_id: source.id, output: outputPath, usage: result.usage ?? null });
    console.log(`Draft saved for ${source.id}: ${outputPath}`);
  }

  console.log(`Batch complete: ${results.length} review drafts. No catalog changes made.`);
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBatch().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
