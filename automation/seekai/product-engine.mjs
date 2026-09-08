import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://seekai.cc/v1/';
const DEFAULT_MODEL = 'qwen3.8-flash';
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    verified: {
      price: source.price ?? null,
      sku: source.sku ?? null,
      image: source.image ?? null,
      age: source.age ?? null,
      dimensions: source.dimensions ?? null
    },
    workflow_status: 'NEEDS_REVIEW',
    qa_status: 'PENDING',
    active: false,
    publish: false
  };
}

function buildRequestBody(source, model) {
  return {
    model,
    temperature: 0.2,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You prepare Egyptian Arabic toy catalog metadata. Return one JSON object only with fields: name, description, category, search_keywords, seo_title, seo_description, whatsapp_text. Use only supplied evidence. Never invent prices, ages, dimensions, materials, components, safety claims or stock. Use عرايس instead of دمى and عربيات instead of سيارات. Do not include POP UP products. Omit uncertain facts. Never make publication decisions.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          id: source.id,
          name: source.name,
          description: source.description,
          category: source.category,
          verified_age: source.age,
          verified_dimensions: source.dimensions
        })
      }
    ]
  };
}

export async function generateDraft(source, {
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  model = DEFAULT_MODEL,
  fetchImpl = fetch,
  attempts = 3,
  retryDelayMs = 800
} = {}) {
  if (!apiKey) throw new Error('API key is required');
  const endpoint = new URL(baseUrl);
  if (endpoint.protocol !== 'https:') throw new Error('HTTPS is required');
  const requestUrl = new URL('chat/completions', endpoint);
  const body = buildRequestBody(source, model);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetchImpl(requestUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const error = new Error(`AI request failed: HTTP ${response.status}`);
        if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts) throw error;
        lastError = error;
      } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string') throw new Error('Invalid AI response');
        const proposed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
        return {
          draft: validateDraft(source, proposed),
          provider: 'seekai',
          endpoint: requestUrl.origin + requestUrl.pathname,
          model: data.model ?? model,
          usage: data.usage ?? null,
          attempts_used: attempt
        };
      }
    } catch (error) {
      lastError = error;
      if (error?.name === 'AbortError') lastError = new Error('AI request timed out after 60 seconds');
      if (attempt === attempts || (!String(lastError.message).includes('HTTP 5') && !String(lastError.message).includes('HTTP 429') && error?.name !== 'AbortError')) throw lastError;
    } finally {
      clearTimeout(timeout);
    }
    await sleep(retryDelayMs * attempt);
  }
  throw lastError ?? new Error('AI request failed');
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Usage: node automation/seekai/product-engine.mjs input.json output.json');
  const source = JSON.parse(await readFile(input, 'utf8'));
  const result = await generateDraft(source, {
    apiKey: process.env.SEEKAI_API_KEY,
    baseUrl: process.env.SEEKAI_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.SEEKAI_MODEL || DEFAULT_MODEL
  });
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(`Review draft saved for ${result.draft.product_id}. No catalog changes made.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
