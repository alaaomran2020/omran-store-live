// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the WCAG 2.2 AA colour and zoom contract for the storefront.
 *
 * These assertions read the real design tokens, so a future brand tweak that
 * drops text below 4.5:1 fails CI instead of shipping silently.
 */

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`missing colour token --color-${name}`);
  return match[1];
}

function channel(value: number): number {
  return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const raw = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(index => parseInt(raw.slice(index, index + 2), 16) / 255);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground);
  const b = luminance(background);
  const [high, low] = a > b ? [a, b] : [b, a];
  return (high + 0.05) / (low + 0.05);
}

const WHITE = "#ffffff";

/** Text pairs actually rendered by the storefront (token on token background). */
const TEXT_PAIRS: Array<[string, string, string]> = [
  ["brand-red على أبيض", "brand-red", WHITE],
  ["brand-red على brand-cream", "brand-red", "brand-cream"],
  ["brand-red على brand-sky", "brand-red", "brand-sky"],
  ["brand-blue على أبيض", "brand-blue", WHITE],
  ["brand-blue على brand-cream", "brand-blue", "brand-cream"],
  ["brand-navy على أبيض", "brand-navy", WHITE],
  ["brand-navy على brand-sky", "brand-navy", "brand-sky"],
  ["brand-muted على أبيض", "brand-muted", WHITE],
  ["brand-muted على brand-cream", "brand-muted", "brand-cream"],
  ["أبيض على brand-navy", "brand-surface", "brand-navy"],
  ["أبيض على brand-blue", "brand-surface", "brand-blue"],
  ["brand-yellow على brand-navy", "brand-yellow", "brand-navy"],
];

/** WhatsApp CTAs always render white text on the WhatsApp green. */
const WHITE_ON_SURFACE: Array<[string, string]> = [
  ["whatsapp", "زر واتساب الأساسي"],
  ["whatsapp-hover", "زر واتساب عند المرور"],
];

describe("WCAG 2.2 AA — تباين النصوص", () => {
  for (const [label, foreground, background] of TEXT_PAIRS) {
    it(`يحقق ${label} نسبة 4.5:1 على الأقل`, () => {
      const ratio = contrast(
        foreground === "brand-surface" ? WHITE : token(foreground),
        background.startsWith("#") ? background : token(background)
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  for (const [tokenName, label] of WHITE_ON_SURFACE) {
    it(`${label} يحقق 4.5:1 مع النص الأبيض`, () => {
      expect(contrast(WHITE, token(tokenName))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("يبقي مؤشر التركيز النصي غير النصي عند 3:1 على الأقل", () => {
    expect(contrast(token("brand-blue"), WHITE)).toBeGreaterThanOrEqual(3);
    expect(contrast(token("brand-blue"), token("brand-cream"))).toBeGreaterThanOrEqual(3);
  });
});

describe("WCAG 2.2 AA — التكبير واللغة", () => {
  it("لا يمنع تكبير الصفحة على الموبايل", () => {
    const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/);
    expect(viewport).toBeTruthy();
    const content = viewport![1];
    expect(content).not.toContain("user-scalable=no");
    expect(content).not.toContain("maximum-scale");
  });

  it("يعلن لغة الصفحة واتجاهها", () => {
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
  });
});
