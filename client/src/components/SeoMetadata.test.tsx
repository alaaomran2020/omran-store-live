// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { Product } from "@/lib/productsClient";
import {
  buildPageTitle,
  cleanDescriptionText,
  ProductStructuredData,
  SeoMetadata,
  setRobotsMeta,
} from "./SeoMetadata";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_ORIGIN } from "@shared/site";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const SPECIFICATIONS: Product["specifications"] = {
  productLengthCm: null, productWidthCm: null, productHeightCm: null,
  packageLengthCm: null, packageWidthCm: null, packageHeightCm: null,
  weightKg: null, material: null, piecesCount: null, powerSource: null,
  assemblyRequired: null, boxContents: null, boxContentsItems: [], playInstructions: null,
};

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "OMR-TEST-100",
    sku: "SKU-100",
    name: "مطبخ ألعاب للأطفال — 46 قطعة",
    price: null,
    category: "ألعاب تمثيل أدوار",
    description: "مطبخ أطفال كامل بأدوات وأواني وإكسسيرات كثيرة للعب التخيلي.",
    image: "/products/processed/test-main.webp",
    imageSource: "/products/processed/test-main.webp",
    active: true,
    sortOrder: 1,
    productPrompt: "",
    workflowStatus: "PUBLISHED",
    qaStatus: "PASS",
    sourceDriveId: null,
    processedImage: "/products/processed/test-main.webp",
    reviewReason: null,
    rowIndex: 1,
    ageMin: null,
    ageMax: null,
    galleryImages: ["/products/processed/test-2.webp"],
    videoUrl: null,
    videoPoster: null,
    videoDuration: null,
    options: [],
    brand: "Home Chef",
    tags: [],
    availability: "unknown",
    specifications: SPECIFICATIONS,
    ...overrides,
  };
}

function metaContent(nameOrProperty: string, attribute: "name" | "property" = "property"): string | null {
  return document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${nameOrProperty}"]`)?.content ?? null;
}

function canonicalCount(): number {
  return document.head.querySelectorAll('link[rel="canonical"]').length;
}

function currentCanonical(): string | null {
  return document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null;
}

function productJsonLd(): Record<string, unknown> {
  const script = document.getElementById("omran-product-jsonld");
  expect(script, "product JSON-LD script missing").toBeTruthy();
  const parsed = JSON.parse((script as HTMLScriptElement).textContent ?? "{}") as Record<string, unknown>;
  const graph = parsed["@graph"] as Record<string, unknown>[];
  expect(graph.find(node => (node["@type"] as string) === "Product")).toBeTruthy();
  return graph.find(node => (node["@type"] as string) === "Product")!;
}

function breadcrumbJsonLd(): Record<string, unknown> {
  const script = document.getElementById("omran-product-jsonld");
  const parsed = JSON.parse((script as HTMLScriptElement).textContent ?? "{}") as Record<string, unknown>;
  const graph = parsed["@graph"] as Record<string, unknown>[];
  const crumb = graph.find(node => (node["@type"] as string) === "BreadcrumbList");
  expect(crumb, "BreadcrumbList missing").toBeTruthy();
  return crumb!;
}

afterEach(() => {
  cleanup();
  // إعادة ضبط head بين الاختبارات.
  document.title = "";
  document.head.innerHTML = "";
});

// ---------------------------------------------------------------------------
// page metadata
// ---------------------------------------------------------------------------

describe("SeoMetadata — metadata الصفحة", () => {
  it("يطبّق metadata كاملة للرئيسية (title/canonical/OG/Twitter)", () => {
    render(<SeoMetadata path="/" title={HOME_TITLE} description={HOME_DESCRIPTION} />);

    expect(document.title).toBe(HOME_TITLE);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/`);
    expect(metaContent("description", "name")).toBe(HOME_DESCRIPTION);
    expect(metaContent("og:type")).toBe("website");
    expect(metaContent("og:url")).toBe(`${SITE_ORIGIN}/`);
    expect(metaContent("og:image")).toBe(`${SITE_ORIGIN}/brand/logo.png`);
    expect(metaContent("og:locale")).toBe("ar_EG");
    expect(metaContent("og:site_name")).toBe("شركة عمران التجارية");
    expect(metaContent("twitter:card", "name")).toBe("summary_large_image");
    expect(metaContent("twitter:title", "name")).toBe(HOME_TITLE);
    expect(metaContent("twitter:image", "name")).toBe(`${SITE_ORIGIN}/brand/logo.png`);
    // indexable افتراضيًا: لا meta robots.
    expect(metaContent("robots", "name")).toBeNull();
  });

  it("يطبّق noindex للفحوصات الداخلية ولا يتركها بعد الخروج", () => {
    const { unmount } = render(
      <SeoMetadata path="/404" title="الصفحة غير موجودة | عمران تويز" description="r" robots="noindex,follow" />
    );
    expect(metaContent("robots", "name")).toBe("noindex,follow");
    unmount();
    expect(metaContent("robots", "name")).toBeNull();
    expect(document.title).toBe(HOME_TITLE);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/`);
  });

  it("لا يسمح بأكثر من canonical واحد بعد عدة تنقلات", () => {
    const first = render(<SeoMetadata path="/products" title="لعب أطفال | شركة عمران التجارية" description="a" />);
    first.unmount();
    const second = render(<SeoMetadata path="/popup" title="POP UP – Gifts & Balloons | شركة عمران التجارية" description="b" />);
    expect(canonicalCount()).toBe(1);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/popup`);
    expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1);
    expect(document.head.querySelectorAll('meta[property="og:title"]').length).toBe(1);
    second.unmount();
    expect(canonicalCount()).toBe(1);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/`);
  });
});

// ---------------------------------------------------------------------------
// product metadata + JSON-LD
// ---------------------------------------------------------------------------

describe("ProductStructuredData — منتج", () => {
  it("يطبّق title/canonical/robots/OG الحقيقيين للمنتج", () => {
    const product = makeProduct();
    render(<ProductStructuredData product={product} catalogPath="/products" />);

    expect(document.title).toBe(`${product.name} | عمران تويز`);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products?product=${product.id}`);
    expect(metaContent("robots", "name")).toBe("index,follow");
    expect(metaContent("og:type")).toBe("product");
    expect(metaContent("og:url")).toBe(`${SITE_ORIGIN}/products?product=${product.id}`);
    expect(metaContent("og:image")).toBe(`${SITE_ORIGIN}/products/processed/test-main.webp`);
    expect(metaContent("twitter:image", "name")).toBe(`${SITE_ORIGIN}/products/processed/test-main.webp`);
  });

  it("ينشئ Product JSON-LD بالبيانات الحقيقية فقط", () => {
    const product = makeProduct();
    render(<ProductStructuredData product={product} catalogPath="/products" />);

    const schema = productJsonLd();
    expect(schema.name).toBe(product.name);
    expect(schema.url).toBe(`${SITE_ORIGIN}/products?product=${product.id}`);
    expect(schema.sku).toBe("SKU-100");
    expect(schema.category).toBe("ألعاب تمثيل أدوار");
    expect(schema.brand).toEqual({ "@type": "Brand", name: "Home Chef" });
    const images = schema.image as string[];
    expect(images).toEqual([
      `${SITE_ORIGIN}/products/processed/test-main.webp`,
      `${SITE_ORIGIN}/products/processed/test-2.webp`,
    ]);
    expect(images).toHaveLength(new Set(images).size);
  });

  it("لا ينشئ price/offer/availability/rating مطلقًا (سياسة بدون سعر)", () => {
    render(<ProductStructuredData product={makeProduct({ price: 850 })} catalogPath="/products" />);
    const text = document.getElementById("omran-product-jsonld")!.textContent ?? "";
    const schema = productJsonLd();

    expect(schema).not.toHaveProperty("offers");
    expect(schema).not.toHaveProperty("price");
    expect(schema).not.toHaveProperty("priceCurrency");
    expect(schema).not.toHaveProperty("availability");
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("review");
    expect(schema).not.toHaveProperty("gtin");
    expect(schema).not.toHaveProperty("mpn");
    expect(text).not.toContain("InStock");
    expect(text).not.toContain("\"price\"");
  });

  it("BreadcrumbList يطابق البنية: الرئيسية → القسم → المنتج", () => {
    const product = makeProduct();
    render(<ProductStructuredData product={product} catalogPath="/products" />);

    const crumb = breadcrumbJsonLd();
    const items = crumb.itemListElement as Record<string, unknown>[];
    expect(items).toHaveLength(3);
    expect(items.map(item => item.position)).toEqual([1, 2, 3]);
    expect(items[0].name).toBe("الرئيسية");
    expect(items[0].item).toBe(`${SITE_ORIGIN}/`);
    expect(items[1].name).toBe("لعب الأطفال");
    expect(items[1].item).toBe(`${SITE_ORIGIN}/products`);
    expect(items[2].name).toBe(product.name);
    expect(items[2].item).toBe(`${SITE_ORIGIN}/products?product=${product.id}`);
  });
});

describe("ProductStructuredData — دورة الحياة (stale state)", () => {
  it("منتج أ → منتج ب: لا تبقى بيانات المنتج القديم", () => {
    const productA = makeProduct({ id: "OMR-A", name: "منتج أول", processedImage: "/a.webp", image: "/a.webp", galleryImages: [] });
    const productB = makeProduct({ id: "OMR-B", name: "منتج ثانٍ", processedImage: "/b.webp", image: "/b.webp", galleryImages: [] });

    const { rerender } = render(<ProductStructuredData product={productA} catalogPath="/products" />);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products?product=OMR-A`);

    rerender(<ProductStructuredData product={productB} catalogPath="/products" />);

    expect(document.title).toBe(`${productB.name} | عمران تويز`);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products?product=OMR-B`);
    expect(metaContent("og:image")).toBe(`${SITE_ORIGIN}/b.webp`);
    expect(metaContent("og:title")).toBe(`${productB.name} | عمران تويز`);

    const scripts = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    const text = document.getElementById("omran-product-jsonld")!.textContent ?? "";
    expect(text).not.toContain("OMR-A");
    expect(text).toContain("OMR-B");
  });

  it("إغلاق المنتج يعيد metadata الصفحة ولا يترك JSON-LD", () => {
    const page = render(<SeoMetadata path="/products" title="لعب أطفال | شركة عمران التجارية" description="desc" />);
    const product = makeProduct();
    const dialog = render(<ProductStructuredData product={product} catalogPath="/products" />);

    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products?product=${product.id}`);

    dialog.unmount();

    expect(document.title).toBe("لعب أطفال | شركة عمران التجارية");
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products`);
    expect(document.getElementById("omran-product-jsonld")).toBeNull();
    expect(metaContent("og:type")).toBe("website");
    expect(metaContent("robots", "name")).toBeNull();
    page.unmount();
  });

  it("مسار كامل: Home → Product A → Product B → noindex → POP UP → Home", () => {
    const home = render(<SeoMetadata path="/" title={HOME_TITLE} description={HOME_DESCRIPTION} />);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/`);

    const productA = makeProduct({ id: "OMR-A", name: "منتج أول" });
    const productB = makeProduct({ id: "OMR-B", name: "منتج ثانٍ" });

    const pageProducts = render(<SeoMetadata path="/products" title="لعب أطفال | شركة عمران التجارية" description="d" />);
    const a = render(<ProductStructuredData product={productA} catalogPath="/products" />);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products?product=OMR-A`);

    a.rerender(<ProductStructuredData product={productB} catalogPath="/products" />);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products?product=OMR-B`);

    // بحث/فلتر → noindex (كما تفعل صفحة الكتالوج).
    a.unmount();
    setRobotsMeta("noindex,follow");
    expect(metaContent("robots", "name")).toBe("noindex,follow");
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products`);

    // POP UP معزول تمامًا.
    pageProducts.unmount();
    const popup = render(<SeoMetadata path="/popup" title="POP UP – Gifts & Balloons | شركة عمران التجارية" description="p" />);
    const popupProduct = makeProduct({ id: "POP-X", name: "بالونات معدنية", category: "بالونات", brand: null, sku: null });
    const popupDialog = render(<ProductStructuredData product={popupProduct} catalogPath="/popup" />);
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/popup?product=POP-X`);
    expect(metaContent("robots", "name")).toBe("index,follow");
    expect(document.title).toBe(`${popupProduct.name} | POP UP`);

    popupDialog.unmount();
    popup.unmount();
    home.rerender(<SeoMetadata path="/" title={HOME_TITLE} description={HOME_DESCRIPTION} />);

    // العودة للرئيسية: لا POP UP ولا منتج ولا noindex متبقٍ.
    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/`);
    expect(document.title).toBe(HOME_TITLE);
    expect(metaContent("robots", "name")).toBeNull();
    expect(document.getElementById("omran-product-jsonld")).toBeNull();
    expect(metaContent("og:title")).toBe(HOME_TITLE);
    home.unmount();
  });
});

describe("POP UP isolation", () => {
  it("منتج POP UP: canonical وعنوان ومسار يتبع POP UP فقط", () => {
    const product = makeProduct({ id: "POP-X", name: "بالونات معدنية", category: "بالونات" });
    const { unmount } = render(<ProductStructuredData product={product} catalogPath="/popup" />);

    expect(currentCanonical()).toBe(`${SITE_ORIGIN}/popup?product=POP-X`);
    expect(document.title).toBe(`${product.name} | POP UP`);
    const items = breadcrumbJsonLd().itemListElement as Record<string, unknown>[];
    expect(items[1].name).toBe("POP UP");
    expect(items[1].item).toBe(`${SITE_ORIGIN}/popup`);

    unmount();
    // لا تسرب بعد الخروج.
    expect(currentCanonical()).toBe(SITE_ORIGIN + "/");
    expect(document.getElementById("omran-product-jsonld")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// publication gate + fallbacks + safety
// ---------------------------------------------------------------------------

describe("publication gate وfallbacks", () => {
  it("منتج غير منشور (REJECTED/NEEDS_REVIEW/غير نشط) لا ينشئ metadata ولا JSON-LD", () => {
    render(<SeoMetadata path="/products" title="لعب أطفال | شركة عمران التجارية" description="d" />);
    for (const overrides of [
      { workflowStatus: "REJECTED" as const },
      { qaStatus: "NEEDS_REVIEW" as const },
      { active: false },
      { workflowStatus: null },
      { qaStatus: null },
    ]) {
      const { unmount } = render(<ProductStructuredData product={makeProduct(overrides)} catalogPath="/products" />);
      expect(document.getElementById("omran-product-jsonld"), JSON.stringify(overrides)).toBeNull();
      expect(currentCanonical()).toBe(`${SITE_ORIGIN}/products`);
      expect(document.title).toBe("لعب أطفال | شركة عمران التجارية");
      unmount();
    }
  });

  it("بدون وصف: fallback آمن مبني على الاسم والقسم فقط (لا claims)", () => {
    const product = makeProduct({ description: "" });
    render(<ProductStructuredData product={product} catalogPath="/products" />);

    const description = metaContent("description", "name") ?? "";
    expect(description).toContain(product.name);
    expect(description).toContain("ألعاب تمثيل أدوار");
    expect(description).toContain("عمران تويز");
    for (const claim of ["متوفر الآن", "أفضل", "أرخص", "رقم 1", "جنيه"]) {
      expect(description).not.toContain(claim);
    }
    const schema = productJsonLd();
    expect(schema).not.toHaveProperty("description");
  });

  it("بدون صورة: og:image يسقط على brand image الحقيقية", () => {
    const product = makeProduct({ processedImage: null, image: null, galleryImages: [] });
    render(<ProductStructuredData product={product} catalogPath="/products" />);

    expect(metaContent("og:image")).toBe(`${SITE_ORIGIN}/brand/logo.png`);
    expect(metaContent("twitter:image", "name")).toBe(`${SITE_ORIGIN}/brand/logo.png`);
    expect(productJsonLd()).not.toHaveProperty("image");
  });

  it("بدون SKU/brand: لا حقول فارغة في JSON-LD", () => {
    const product = makeProduct({ sku: null, brand: null });
    render(<ProductStructuredData product={product} catalogPath="/products" />);
    const schema = productJsonLd();
    expect(schema).not.toHaveProperty("sku");
    expect(schema).not.toHaveProperty("brand");
    const text = document.getElementById("omran-product-jsonld")!.textContent ?? "";
    expect(text).not.toContain("null");
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("[object Object]");
  });
});

describe("أمان الـURLs والـserialization", () => {
  it("يرفض data:/blob:/protocol-relative/localhost في صور المنتج", () => {
    for (const bad of [
      "data:image/png;base64,iVBORw0KGgo=",
      "blob:https://omrantoys.store/abc-123",
      "//evil.example.com/x.png",
      "http://localhost:3000/x.png",
      "https://127.0.0.1/x.png",
      "/mnt/user/x.png",
    ]) {
      const { unmount } = render(
        <ProductStructuredData product={makeProduct({ processedImage: bad, image: bad, galleryImages: [] })} catalogPath="/products" />
      );
      expect(metaContent("og:image"), bad).toBe(`${SITE_ORIGIN}/brand/logo.png`);
      expect(productJsonLd()).not.toHaveProperty("image");
      unmount();
    }
  });

  it("تسلسل آمن ضد script injection داخل JSON-LD", () => {
    const evilName = 'لعبة <script>alert("x")</script> & "quotes" — 👾';
    const { unmount } = render(
      <ProductStructuredData product={makeProduct({ name: evilName })} catalogPath="/products" />
    );
    const raw = document.getElementById("omran-product-jsonld")!.textContent ?? "";
    expect(raw).not.toContain("</script>");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const productNode = (parsed["@graph"] as Record<string, unknown>[]).find(
      node => (node["@type"] as string) === "Product"
    )!;
    expect(productNode.name).toBe(evilName);
    expect(raw.length).toBeGreaterThan(0);
    unmount();
  });

  it("يعالج منتج مفقود/route malformed بدون كسر الصفحة", () => {
    const { unmount } = render(<ProductStructuredData product={null} catalogPath="/products" />);
    expect(document.getElementById("omran-product-jsonld")).toBeNull();
    unmount();
    expect(() =>
      render(<SeoMetadata path="/products?product=bad&x" title="t" description="d" />)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

describe("cleanDescriptionText", () => {
  it("يزيل HTML وضغط الفراغات ويحترم الحد الأقصى بقطع عند كلمة", () => {
    expect(cleanDescriptionText("  مرحبا<br/>بالعالم  ")).toBe("مرحبا بالعالم");
    expect(cleanDescriptionText("<p>وصف</p> منتج", 160)).toBe("وصف منتج");
    const long = "كلمة ".repeat(40).trim(); // ~280 حرف
    const cleaned = cleanDescriptionText(long, 160);
    expect(cleaned.length).toBeLessThanOrEqual(161);
    expect(cleaned.endsWith("…")).toBe(true);
    expect(cleaned).not.toMatch(/\s{2,}/);
  });
});

describe("buildPageTitle", () => {
  it("يحتفظ بالعنوان القصير كما هو ويقطع الطويل دون تغيير الاسم المرئي لاحقًا", () => {
    expect(buildPageTitle("لعبة بسيطة", "عمران تويز")).toBe("لعبة بسيطة | عمران تويز");
    const longName = "مجموعة ".repeat(15) + "الألعاب التعليمية الشاملة جدًا";
    const title = buildPageTitle(longName, "عمران تويز");
    expect(title.length).toBeLessThanOrEqual(70);
    expect(title.endsWith("… | عمران تويز")).toBe(true);
    // الاسم الكامل محفوظ في JSON-LD لا في العنوان (يُختبر في productJsonLd أعلاه).
  });
});
