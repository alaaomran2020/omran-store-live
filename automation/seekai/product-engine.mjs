import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function validateDraft(source, proposed) {
  if (!source || !source.id || !source.name) throw new Error('A verified product id and name are required');
  if (source.id.startsWith('POP-') || source.catalog === 'popup') throw new Error('POP UP requires its own independent pipeline');
  const text = value => typeof value === 'string' ? value.trim() : '';
  const unique = values => [...new Set(values.filter(Boolean))];
  const keywords = unique((Array.isArray(proposed.search_keywords) ? proposed.search_keywords : []).map(text)).slice(0, 20);
  return {
    product_id: source.id,
    catalog: 'omran-toys',
    source_name: source.name,
    suggested_name: text(proposed.name) || source.name,
    suggested_description: text(proposed.description),
    suggested_category: text(proposed.category),
    search_keywords: keywords,
    seo_title: text(proposed.seo_title),
    seo_description: text(proposed.seo_description),
    whatsapp_text: text(proposed.whatsapp_text),
    verified: { price: source.price ?? null, sku: source.sku ?? null, image: source.image ?? null, age: source.age ?? null, dimensions: source.dimensions ?? null },
    workflow_status: 'NEEDS_REVIEW',
    qa_status: 'PENDING',
    active: false,
    publish: false
  };
}

export async function generateDraft(source, { apiKey, baseUrl, model, fetchImpl = fetch } = {}) {
  if (!apiKey || !model) throw new Error('API key and model are required');
  const endpoint = new URL(baseUrl || 'https://seekai.cc/v1/');
  if (endpoint.protocol !== 'https:') throw new Error('HTTPS is required');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetchImpl(new URL('chat/completions', endpoint), {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1200,
        messages: [
          { role: 'system', content: 'You prepare Egyptian Arabic toy catalog metadata. Return JSON only. Fields: name, description, category, search_keywords, seo_title, seo_description, whatsapp_text. Use only supplied evidence. Never invent prices, ages, dimensions, materials, components, safety claims or stock. Use عرايس and عربيات. Do not include POP UP products. Uncertain facts must be omitted. No publication decisions.' },
          { role: 'user', content: JSON.stringify({ id: source.id, name: source.name, description: source.description, category: source.category, verified_age: source.age, verified_dimensions: source.dimensions }) }
        ] })
    });
    if (!response.ok) throw new Error(`AI request failed: HTTP ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Invalid AI response');
    const proposed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    return { draft: validateDraft(source, proposed), usage: data.usage ?? null, model: data.model ?? model };
  } finally { clearTimeout(timeout); }
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node automation/seekai/product-engine.mjs input.json output.json');
  const source = JSON.parse(await readFile(input, 'utf8'));
  const result = await generateDraft(source, { apiKey: process.env.SEEKAI_API_KEY, baseUrl: process.env.SEEKAI_BASE_URL, model: process.env.SEEKAI_MODEL });
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(`Review draft saved for ${result.draft.product_id}. No catalog changes made.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
