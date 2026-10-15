/** Single canonical route for approved product detail pages, on both JS and first HTML response. */
import type { ProductCatalog } from "./productCatalog";

export function productPagePath(id: string, catalog: ProductCatalog): string {
  const department = catalog === "popup" ? "/popup" : "/products";
  return `${department}/p/${encodeURIComponent(id.trim())}`;
}

export function productIdFromPath(pathname: string, catalog: ProductCatalog): string | null {
  const prefix = (catalog === "popup" ? "/popup" : "/products") + "/p/";
  if (!pathname.startsWith(prefix)) return null;
  const encoded = pathname.slice(prefix.length);
  if (!encoded || encoded.includes("/")) return null;
  try {
    const id = decodeURIComponent(encoded);
    return /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
