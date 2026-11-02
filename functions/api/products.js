/**
 * Retire the legacy public products API. The current storefront reads its
 * approved build-time catalog snapshot; it does not need /api/products.
 *
 * The previous endpoint leaked numeric prices, a wholesale price inside a
 * description, and operational catalog fields. Returning a sanitized copy
 * would risk exposing future internal fields and reintroduce two sources of
 * truth. Fail closed instead; the storefront remains available at /products.
 *
 * IMPORTANT: Confirm that Cloudflare routes /api/products to this Pages
 * Function before production deployment; another Worker route may win.
 */
export function onRequest() {
  return new Response(
    JSON.stringify({
      status: "retired",
      catalogPath: "/products",
    }),
    {
      status: 410,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store, max-age=0",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
