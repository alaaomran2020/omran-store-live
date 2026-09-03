/// <reference types="@cloudflare/workers-types" />

import {
  buildSocialFeed,
  createFeedCache,
  type SocialFeedEnv,
} from "../shared/socialFeed";
import {
  applyOverridesToProducts,
  applyPublicationGate,
  createProductsCache,
  fetchProductsPayload,
  type OverridesManifest,
} from "../shared/products";

/**
 * omran-store-live edge router — Web Standard APIs only (no framework-specific
 * handler signatures, no Node polyfills).
 *
 * Responsibility is deliberately narrow: in the hybrid topology this worker only
 * ever sees `/api/*` and `/manus-storage/*` (see `run_worker_first` in
 * wrangler.toml). `/api/social/feed` (the Facebook/Instagram product feed) is
 * answered HERE at the edge; the remaining API paths are forwarded to the
 * container behind the Cloudflare Tunnel — if one is configured at all;
 * everything else is answered by Workers Assets.
 *
 * Design rules, in priority order:
 *   1. Fail closed. Only an explicit path allowlist may reach the origin, so a
 *      misconfigured hostname can never turn the edge into an open proxy.
 *   2. Never buffer. The request and response bodies stream through as
 *      ReadableStreams; no `await req.text()`/`arrayBuffer()` on the hot path,
 *      which is how an edge worker turns into a memory problem.
 *   3. Preserve auth. Cookies (including the `__Host-` session cookie) and
 *      `Authorization` pass through untouched; only hop-by-hop headers are
 *      dropped, per RFC 9110 §7.6.1.
 *   4. Bound everything: body size, origin timeout, and no edge caching of API
 *      responses.
 */

interface Env extends SocialFeedEnv {
  /** Bound Assets namespace ([assets] binding = "ASSETS"). */
  ASSETS?: Fetcher;
  /** Tunnel hostname of the container, e.g. https://origin.omrantoys.store */
  ORIGIN_BASE_URL?: string;
  MAX_BODY_BYTES?: string;
  ORIGIN_TIMEOUT_MS?: string;
  /**
   * رابط Google Sheet المنشور كـCSV (Publish to web → CSV). المصدر الوحيد
   * لمنتجات المتجر. عام تمامًا: ليس سرًا وليس مفتاح API — يُضبط في
   * `[vars]` داخل wrangler.toml.
   */
  PRODUCTS_SHEET_URL?: string;
}

const API_PREFIXES = ["/api/", "/manus-storage/"] as const;

/** Hop-by-hop headers must not be forwarded by a proxy (RFC 9110 §7.6.1). */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

/** Statuses that must not carry a response body (Fetch spec). */
const BODYLESS = new Set([101, 204, 205, 304]);

/** Paths that must never be size-capped or buffered; keep this list tiny. */
const isAllowedPath = (pathname: string): boolean =>
  API_PREFIXES.some(prefix => pathname.startsWith(prefix));

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function json(
  status: number,
  error: string,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

/**
 * Copy headers for proxying, dropping hop-by-hop entries. Returns the mutated
 * copy plus whether a body length was advertised, so the caller can enforce the
 * size ceiling before touching the payload.
 */
function copyHeaders(
  source: Headers,
  strip: string[] = []
): { headers: Headers; declaredLength: number | null } {
  const headers = new Headers();
  let declaredLength: number | null = null;
  for (const [key, value] of source.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || strip.includes(lower)) continue;
    if (lower === "content-length") {
      const n = Number.parseInt(value, 10);
      declaredLength = Number.isFinite(n) ? n : null;
      // Forwarded after validation; Content-Length is recomputed by the runtime.
      continue;
    }
    headers.set(key, value);
  }
  return { headers, declaredLength };
}

/**
 * Facebook/Instagram feed cache — module scope, so it lives as long as the
 * isolate and is shared by every request this isolate serves. Tokens are read
 * from Worker secrets (`wrangler secret put …`) and never leave the edge.
 */
const feedCache = createFeedCache();

async function handleSocialFeed(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json(405, "method_not_allowed", { allow: "GET, HEAD" });
  }
  try {
    const feed = await feedCache.get(() =>
      buildSocialFeed(env, (url, init) => fetch(url, init))
    );
    return new Response(request.method === "HEAD" ? null : JSON.stringify(feed), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        // Browsers/edge may hold it briefly; the worker cache (5 min) is the
        // real sync interval.
        "cache-control": "public, max-age=60",
        "x-edge": "omran-store-live",
      },
    });
  } catch {
    return json(502, "social_feed_unavailable");
  }
}

/**
 * كتالوج المنتجات (Google Sheets → CSV) — كاش على مستوى الـisolate تمامًا مثل
 * feedCache أعلاه. لا مفتاح API ولا OAuth: الرابط عام ومنشور بواسطة صاحب المتجر.
 *
 * تجاوزات المدراء (تعديلات لوحة الإدارة في MySQL) تُدمج عبر manifest خفيف
 * يُقرأ من الأصل (ORIGIN_BASE_URL) — البيانات عامة والكاش قصير، وإن تعذّر
 * الأصل يُقدَّم كتالوج الشيت كما هو (تدهور سلس، لا انقطاع).
 */
const productsCache = createProductsCache();

/** كاش manifest التجاوزات: 60 ثانية فقط، ولا يُخزَّن الفشل (يعيد المحاولة فورًا). */
const overridesManifestCache: {
  data: OverridesManifest | null;
  at: number;
} = { data: null, at: 0 };
const OVERRIDES_MANIFEST_TTL_MS = 60_000;
const OVERRIDES_MANIFEST_TIMEOUT_MS = 4_000;

async function fetchOverridesManifest(
  env: Env
): Promise<OverridesManifest | null> {
  const now = Date.now();
  if (overridesManifestCache.data && now - overridesManifestCache.at < OVERRIDES_MANIFEST_TTL_MS) {
    return overridesManifestCache.data;
  }
  const base = (env.ORIGIN_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OVERRIDES_MANIFEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}/api/admin/products/overrides-manifest`, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as OverridesManifest;
      if (!Array.isArray(data?.overrides)) return null;
      overridesManifestCache.data = data;
      overridesManifestCache.at = now;
      return data;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // الأصل غير متاح: نُقدّم الشيت كما هو، ونعيد المحاولة في الطلب التالي
    return null;
  }
}

async function handleProducts(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json(405, "method_not_allowed", { allow: "GET, HEAD" });
  }
  let payload;
  try {
    payload = await productsCache.get(() =>
      fetchProductsPayload(env.PRODUCTS_SHEET_URL, (u, init) => fetch(u, init))
    );
  } catch {
    // Google غير متاح ولا نسخة قديمة في الكاش: حالة محترمة، لا خطأ للزائر.
    payload = {
      products: [],
      status: "error" as const,
      fetchedAt: new Date().toISOString(),
    };
  }

  // دمج تجاوزات المدراء فوق كتالوج الشيت (إن وُجدت)
  if (payload.status === "ok" && payload.products.length > 0) {
    const manifest = await fetchOverridesManifest(env);
    if (manifest && manifest.overrides.length > 0) {
      payload = {
        ...payload,
        products: applyOverridesToProducts(payload.products, manifest.overrides),
      };
    }
    // Final Publication Guard — يمر ثانية فوق النتيجة بعد أي Overrides (لا
    // يمكن لأي تجاوز اجتيازها) ويكون آخر قرار قبل الاستجابة العامة.
    payload = {
      ...payload,
      products: applyPublicationGate(payload.products),
    };
  }
  return new Response(
    request.method === "HEAD" ? null : JSON.stringify(payload),
    {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control":
          payload.status === "ok" ? "public, max-age=60" : "no-store",
        "x-edge": "omran-store-live",
        "x-publication-gate":
          payload.status === "ok" ? "active+published+pass" : "not-applied",
      },
    }
  );
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // ---- www → apex: permanent redirect preserving path + query.
    // مسارات HTML/robots/sitemap على www تدخل الـWorker عبر run_worker_first
    // (انظر wrangler.toml) فيُفرَض النطاق الأساسي من الحافة. الأصول المُجزّأة
    // (hashed assets) تبقى على طبقة الأصول للأداء، ويكمل توحيد النطاق بقاعدة
    // Cloudflare على مستوى الـzone (إجراء خارجي موثّق في docs).
    if (url.hostname === "www.omrantoys.store") {
      return new Response(null, {
        status: 301,
        headers: {
          location: `https://omrantoys.store${url.pathname}${url.search}`,
          "cache-control": "public, max-age=3600",
        },
      });
    }

    // ---- Edge health check: خفيف، لا يعتمد على SPA ولا على الأصل ولا يعرض
    // أي أسرار. يُستخدم كفحص صحة Production في CI/CD.
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "omran-store-live",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "x-edge": "omran-store-live",
          },
        }
      );
    }

    // ---- كتالوج المنتجات من Google Sheets: يُجاب هنا على الحافة.
    // القراءة تتم من الحافة لا من متصفح الزائر، فلا مشاكل CORS، ونتيجة واحدة
    // مخزّنة مؤقتًا تخدم كل الزوار خلال مدة الكاش بدل طلب لكل تفاعل.
    if (url.pathname === "/api/products") {
      return handleProducts(request, env);
    }

    // ---- مرآة الكتالوج خارج /api/*: نفس المعالج ونفس الكاش تمامًا.
    // سبب وجودها: لو تملّك route قديم أكثر تحديدًا (مثل omrantoys.store/api/*)
    // المسار الأساسي، يبقى هذا المسار يصل إلى هذا الـWorker عبر route
    // omrantoys.store/* — فيستمر ظهور المنتجات حتى تُصحَّح الـroutes.
    // العميل (productsClient.ts) يجرّب /api/products أولًا ثم هذه المرآة.
    if (url.pathname === "/edge-api/products") {
      return handleProducts(request, env);
    }

    // ---- Facebook/Instagram product feed: answered at the edge, never
    // proxied. This keeps the storefront 100% Cloudflare — no origin server
    // is required for the public site.
    if (url.pathname === "/api/social/feed") {
      return handleSocialFeed(request, env);
    }

    // ---- Static client: only reachable if run_worker_first is widened to true.
    if (!isAllowedPath(url.pathname)) {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return json(404, "not_found");
    }

    const base = (env.ORIGIN_BASE_URL ?? "").trim().replace(/\/+$/, "");
    // https only: session cookies are `Secure`, so an http origin would silently
    // drop them. Loopback http is permitted purely so `pnpm preview:edge` can
    // exercise this worker against a local container.
    const isLoopback =
      /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(base);
    if (!/^https:\/\//.test(base) && !isLoopback) {
      // Misconfiguration must be loud, and must never fall back to "proxy
      // whatever the client asked for".
      return json(500, "origin_base_url_unset_or_insecure", {
        "x-edge-error": "ORIGIN_BASE_URL must be an https:// origin hostname",
      });
    }

    // ---- Reject anything that could be read as an absolute/target override.
    // Only the pathname is inspected: a tRPC batch `?input={"json":{...}}`
    // legitimately contains "//" inside its JSON, while `//evil.com` in the
    // *pathname* is the protocol-relative trick that would make
    // `new URL(path, base)` resolve to an attacker host.
    if (url.pathname.startsWith("//") || url.pathname.includes("\\")) {
      return json(400, "malformed_path");
    }
    const path = `${url.pathname}${url.search}`;

    // ---- Bound the payload before it is streamed.
    const maxBytes = positiveInt(env.MAX_BODY_BYTES, 1_048_576);
    const { headers: reqHeaders, declaredLength } = copyHeaders(
      request.headers,
      ["host"]
    );
    if (request.method !== "GET" && request.method !== "HEAD") {
      if (declaredLength !== null && declaredLength > maxBytes) {
        return json(413, "request_body_too_large", {
          "x-max-body-bytes": String(maxBytes),
        });
      }
      if (request.headers.get("content-encoding")) {
        // We stream bytes through without decompressing, so a compressed body
        // makes the declared (or absent) length meaningless as a guard.
        return json(415, "unsupported_request_encoding", {
          "x-edge-error": "request bodies must be sent uncompressed",
        });
      }
    }

    // Preserve the client's view of the origin for redirect/cookie construction
    // in the app, and mark the scheme for Express `trust proxy`.
    reqHeaders.set("x-forwarded-host", url.host);
    reqHeaders.set("x-forwarded-proto", "https");
    if (!reqHeaders.has("x-forwarded-for")) {
      const cfIp = request.headers.get("cf-connecting-ip");
      if (cfIp) reqHeaders.set("x-forwarded-for", cfIp);
    }

    // Re-check the allowlist on the RESOLVED target: `new URL()` collapses `..`
    // segments, so `/api/../secret` would otherwise be forwarded to an origin
    // path that was never allowlisted.
    let target: URL;
    try {
      target = new URL(path, base);
    } catch {
      return json(400, "malformed_path");
    }
    if (!isAllowedPath(target.pathname) || target.host !== new URL(base).host) {
      return json(400, "path_outside_allowlist");
    }

    const timeoutMs = positiveInt(env.ORIGIN_TIMEOUT_MS, 30_000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let upstream: Response;
    try {
      upstream = await fetch(target.toString(), {
        method: request.method,
        headers: reqHeaders,
        // Streams, never buffered; null for methods that forbid a body.
        body:
          request.method === "GET" || request.method === "HEAD"
            ? null
            : request.body,
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      return json(
        aborted ? 504 : 502,
        aborted ? "origin_timeout" : "origin_unreachable",
        {
          "x-edge-error": aborted
            ? `origin did not respond within ${timeoutMs}ms`
            : "tunnel origin fetch failed",
        }
      );
    } finally {
      clearTimeout(timer);
    }

    // ---- Rebuild the response: same bytes, hardened cache policy.
    const { headers: resHeaders } = copyHeaders(upstream.headers);
    // API responses are never edge-cacheable (session-scoped, and tRPC batches
    // are per-user). Assets keep their own immutable policy from `/_headers`.
    resHeaders.set("cache-control", "no-store");
    resHeaders.set("x-edge", "omran-store-live");

    if (BODYLESS.has(upstream.status) || request.method === "HEAD") {
      return new Response(null, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: resHeaders,
      });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  },
};
