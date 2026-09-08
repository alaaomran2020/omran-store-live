import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE_URL = 'https://seekai.cc/v1/';
const DEFAULT_MODEL = 'glm-5.3-flash';
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

function buildRequestBody(source, model, { structuredOutput = true } = {}) {
  const body = {
    model,
    temperature: 0.2,
    max_tokens: 1200,
    messages: [
      {
        role: 'system',
        content: 'You prepare Egyptian Arabic toy catalog metadata. Return one JSON object only with fields: name, description, category, search_keywords, seo_title, seo_description, whatsapp_text. Use only supplied evidence. Never invent prices, ages, dimensions, materials, components, safety claims or stock. Use عرايس instead of دمى and عربيات instead of سيارات. Do not include POP UP products. Omit uncertain facts. Never make publication decisions. Do not add commentary before or after the JSON object.'
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
  if (structuredOutput) body.response_format = { type: 'json_object' };
  return body;
}

function retryableResponseError(message) {
  const error = new Error(message);
  error.retryableResponse = true;
  return error;
}

export function parseAssistantJson(data) {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== 'string') {
    throw retryableResponseError('AI response did not contain assistant text');
  }

  let cleaned = content.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    const finishReason = choice?.finish_reason ?? 'unknown';
    const hasReasoning = typeof choice?.message?.reasoning_content === 'string' && choice.message.reasoning_content.trim().length > 0;
    throw retryableResponseError(`AI returned empty content (finish_reason=${finishReason}, reasoning_content=${hasReasoning ? 'present' : 'absent'})`);
  }

  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace > 0 && lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('JSON root must be an object');
    }
    return parsed;
  } catch {
    throw retryableResponseError('AI response content was not a valid JSON object');
  }
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
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const structuredOutput = attempt === 1;
    const body = buildRequestBody(source, model, { structuredOutput });
    try {
      const response = await fetchImpl(requestUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const error = new Error(`AI request failed: HTTP ${response.status}`);
        error.retryableProvider = RETRYABLE_STATUS.has(response.status);
        throw error;
      }

      const data = await response.json();
      const proposed = parseAssistantJson(data);
      return {
        draft: validateDraft(source, proposed),
        provider: 'seekai',
        endpoint: requestUrl.origin + requestUrl.pathname,
        model: data.model ?? model,
        usage: data.usage ?? null,
        attempts_used: attempt,
        response_mode: structuredOutput ? 'json_object' : 'compatibility'
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        lastError = new Error('AI request timed out after 60 seconds');
        lastError.retryableProvider = true;
      } else {
        lastError = error;
      }
      const retryable = Boolean(lastError?.retryableProvider || lastError?.retryableResponse);
      if (attempt === attempts || !retryable) throw lastError;
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
  const inputText = (await readFile(input, 'utf8')).replace(/^\uFEFF/, '');
  const source = JSON.parse(inputText);
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
