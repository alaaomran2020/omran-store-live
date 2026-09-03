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
 * omran-store-live edge router — API-only Cloudflare Worker.
 *
 * Storefront HTML/assets are owned exclusively by Cloudflare Pages
 * (omrantoys-live-app). This Worker receives only the API-specific routes in
 * wrangler.toml and never redirects or serves storefront HTML.
 */
interface Env extends SocialFeedEnv {
  /** Dedicated backend hostname, e.g. https://origin.omrantoys.store. */
  ORIGIN_BASE_URL?: string;
  MAX_BODY_BYTES?: string;
  ORIGIN_TIMEOUT_MS?: string;
  /** Public Google Sheet CSV used by the Product Engine. */
  PRODUCTS_SHEET_URL?: string;
}

const API_PREFIXES = ["/api/", "/manus-storage/"] as const;

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

const BODYLESS = new Set([101, 204, 205, 304]);

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
      continue;
    }

    headers.set(key, value);
  }

  return { headers, declaredLength };
}

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
        "cache-control": "public, max-age=60",
        "x-edge": "omran-store-live",
      },
    });
  } catch {
    return json(502, "social_feed_unavailable");
  }
}

const productsCache = createProductsCache();

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

  if (
    overridesManifestCache.data &&
    now - overridesManifestCache.at < OVERRIDES_MANIFEST_TTL_MS
  ) {
    return overridesManifestCache.data;
  }

  const base = (env.ORIGIN_BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      OVERRIDES_MANIFEST_TIMEOUT_MS
    );

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
    // Product API remains available from the trusted Sheet when admin origin is
    // unavailable; no unverified data is introduced by this fallback.
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
      fetchProductsPayload(env.PRODUCTS_SHEET_URL, (url, init) =>
        fetch(url, init)
      )
    );
  } catch {
    payload = {
      products: [],
      status: "error" as const,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (payload.status === "ok" && payload.products.length > 0) {
    const manifest = await fetchOverridesManifest(env);

    if (manifest && manifest.overrides.length > 0) {
      payload = {
        ...payload,
        products: applyOverridesToProducts(payload.products, manifest.overrides),
      };
    }
  }

  // Final publication guard: public responses are fail-closed.
  payload = {
    ...payload,
    products: applyPublicationGate(payload.products),
  };

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

    // Product Engine is answered at the edge on both apex and www with no
    // hostname redirect. Both routes therefore return the same JSON contract.
    if (url.pathname === "/api/products") {
      return handleProducts(request, env);
    }

    if (url.pathname === "/edge-api/products") {
      return handleProducts(request, env);
    }

    if (url.pathname === "/api/social/feed") {
      return handleSocialFeed(request, env);
    }

    // The Worker is API-only. Any accidental non-API request fails closed
    // instead of serving a second storefront implementation.
    if (!isAllowedPath(url.pathname)) {
      return json(404, "not_found");
    }

    const base = (env.ORIGIN_BASE_URL ?? "").trim().replace(/\/+$/, "");
    const isLoopback =
      /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(base);

    if (!/^https:\/\//.test(base) && !isLoopback) {
      return json(500, "origin_base_url_unset_or_insecure", {
        "x-edge-error": "ORIGIN_BASE_URL must be an https:// origin hostname",
      });
    }

    if (url.pathname.startsWith("//") || url.pathname.includes("\\")) {
      return json(400, "malformed_path");
    }

    const path = `${url.pathname}${url.search}`;
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
        return json(415, "unsupported_request_encoding", {
          "x-edge-error": "request bodies must be sent uncompressed",
        });
      }
    }

    reqHeaders.set("x-forwarded-host", url.host);
    reqHeaders.set("x-forwarded-proto", "https");

    if (!reqHeaders.has("x-forwarded-for")) {
      const cfIp = request.headers.get("cf-connecting-ip");
      if (cfIp) reqHeaders.set("x-forwarded-for", cfIp);
    }

    let target: URL;

    try {
      target = new URL(path, base);
    } catch {
      return json(400, "malformed_path");
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(base);
    } catch {
      return json(500, "origin_base_url_invalid");
    }

    if (!isAllowedPath(target.pathname) || target.host !== baseUrl.host) {
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

    const { headers: resHeaders } = copyHeaders(upstream.headers);
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
