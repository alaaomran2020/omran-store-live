import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "dotenv";
import { fetchProductsPayload, isPubliclyVisible, type Product } from "../shared/products";

const ROOT = resolve(import.meta.dirname, "..");
const ENV_FILE = resolve(ROOT, ".env.production");
const OUTPUT_FILE = resolve(ROOT, "client/src/lib/publicProductsSnapshot.ts");
const PUBLIC_DIR = resolve(ROOT, "public");
const GENERATED_IMAGE_DIR = resolve(PUBLIC_DIR, "products/processed/generated");

const MIME_EXTENSION: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/avif": "avif",
};

async function readSheetUrl(): Promise<string> {
  const envText = await readFile(ENV_FILE, "utf8");
  const fileEnv = parse(envText);
  const url =
    process.env.PRODUCTS_SHEET_URL ||
    process.env.VITE_PRODUCTS_SHEET_URL ||
    process.env.NEXT_PUBLIC_PRODUCTS_SHEET_URL ||
    fileEnv.PRODUCTS_SHEET_URL ||
    fileEnv.VITE_PRODUCTS_SHEET_URL ||
    fileEnv.NEXT_PUBLIC_PRODUCTS_SHEET_URL ||
    "";

  if (!url) throw new Error("Public products sheet URL is not configured");
  return url;
}

function validateProducts(products: Product[]): void {
  if (products.length === 0) {
    throw new Error("Refusing to generate an empty public storefront snapshot");
  }

  const ids = new Set<string>();
  for (const product of products) {
    if (!isPubliclyVisible(product)) {
      throw new Error(`Publication gate violation in snapshot: ${product.id}`);
    }
    if (!product.id.trim()) throw new Error("Snapshot contains a product without an ID");
    if (ids.has(product.id)) throw new Error(`Duplicate public product ID: ${product.id}`);
    ids.add(product.id);
    if (!product.image) throw new Error(`Public product has no displayable image: ${product.id}`);
  }
}

function safeProductSlug(id: string): string {
  const slug = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`Cannot create an image filename for product: ${id}`);
  return slug;
}

function isRemoteUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function publicPathToFile(publicPath: string): string {
  if (!publicPath.startsWith("/")) {
    throw new Error(`Expected a root-relative public asset path, got: ${publicPath}`);
  }
  const filePath = resolve(PUBLIC_DIR, `.${publicPath}`);
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(`${PUBLIC_DIR}/`)) {
    throw new Error(`Unsafe public asset path: ${publicPath}`);
  }
  return filePath;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function downloadVerifiedImage(
  product: Product,
  sourceUrl: string,
  preferredPublicPath?: string
): Promise<string> {
  const response = await fetch(sourceUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
    headers: {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
      "user-agent": "OmranToys-Storefront-Build/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Image download failed for ${product.id}: ${response.status} ${response.statusText}`
    );
  }

  const mime = (response.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const extension = MIME_EXTENSION[mime];
  if (!extension) {
    throw new Error(`Non-image/unsupported response for ${product.id}: ${mime || "unknown"}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength < 1_024) {
    throw new Error(
      `Downloaded image is suspiciously small for ${product.id}: ${bytes.byteLength} bytes`
    );
  }

  let publicPath = preferredPublicPath;
  if (publicPath) {
    const preferredExtension = publicPath.split(".").pop()?.toLowerCase();
    if (preferredExtension !== extension) publicPath = undefined;
  }
  publicPath ??=
    `/products/processed/generated/product-${safeProductSlug(product.id)}-main.${extension}`;

  const filePath = publicPathToFile(publicPath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  return publicPath;
}

async function localizeProductImages(products: Product[]): Promise<Product[]> {
  await rm(GENERATED_IMAGE_DIR, { recursive: true, force: true });
  await mkdir(GENERATED_IMAGE_DIR, { recursive: true });

  const localized: Product[] = [];
  let staged = 0;

  for (const product of products) {
    const image = product.image!;

    if (image.startsWith("/")) {
      const existingFile = publicPathToFile(image);
      if (await fileExists(existingFile)) {
        localized.push(product);
        continue;
      }

      const provenance = isRemoteUrl(product.processedImage)
        ? product.processedImage
        : isRemoteUrl(product.imageSource)
          ? product.imageSource
          : null;
      if (!provenance) {
        throw new Error(
          `Local image is missing and has no remote provenance: ${product.id} -> ${image}`
        );
      }

      const localPath = await downloadVerifiedImage(product, provenance, image);
      localized.push({ ...product, image: localPath, processedImage: localPath });
      staged += 1;
      continue;
    }

    if (!isRemoteUrl(image)) {
      throw new Error(`Unsupported image source for ${product.id}: ${image}`);
    }

    const localPath = await downloadVerifiedImage(product, image);
    localized.push({ ...product, image: localPath, processedImage: localPath });
    staged += 1;
  }

  console.log(`Staged ${staged} remote product images into Cloudflare Pages assets`);
  return localized;
}

function renderSnapshot(products: Product[]): string {
  const serialized = JSON.stringify(products, null, 2);
  return `import type { Product } from "@shared/products";\n\n/**\n * AUTO-GENERATED last-known-good public catalog snapshot.\n *\n * Source: Omran Trading Master Database / published products CSV.\n * Images: verified at build time and staged into same-origin Cloudflare Pages assets.\n * Generator: scripts/generate-public-products-snapshot.ts\n * Gate: active=true + workflow_status=PUBLISHED + qa_status=PASS.\n *\n * Do not edit this file manually. Production CI refreshes it before tests/build.\n */\nexport const PUBLIC_PRODUCTS_SNAPSHOT: Product[] = ${serialized} as Product[];\n`;
}

async function main() {
  const sheetUrl = await readSheetUrl();
  const payload = await fetchProductsPayload(sheetUrl, (url, init) => fetch(url, init), {
    timeoutMs: 20_000,
  });

  if (payload.status !== "ok") {
    throw new Error(`Products source is not healthy: ${payload.status}`);
  }

  validateProducts(payload.products);
  const localizedProducts = await localizeProductImages(payload.products);
  validateProducts(localizedProducts);
  await writeFile(OUTPUT_FILE, renderSnapshot(localizedProducts), "utf8");

  console.log(
    `Generated public storefront snapshot: ${localizedProducts.length} verified products`
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
