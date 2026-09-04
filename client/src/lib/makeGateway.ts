export const MAKE_GATEWAY_URL =
  "https://hook.eu1.make.com/qq87neltq7g7uftz8q38tpbghsjo5r7s";

export function makeCatalogUrl(): string {
  const url = new URL(MAKE_GATEWAY_URL);
  url.searchParams.set("action", "catalog");
  return url.toString();
}
