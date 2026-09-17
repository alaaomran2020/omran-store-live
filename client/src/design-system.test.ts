// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const designSystem = readFileSync(new URL("./design-system.css", import.meta.url), "utf8");
const main = readFileSync(new URL("./main.tsx", import.meta.url), "utf8");
const button = readFileSync(new URL("./components/ui/button.tsx", import.meta.url), "utf8");
const input = readFileSync(new URL("./components/ui/input.tsx", import.meta.url), "utf8");

describe("Omran Toys design system 2026.09", () => {
  it("is loaded by the SPA entrypoint", () => {
    expect(main).toContain('import "./design-system.css"');
  });

  it("keeps the approved current production anchors", () => {
    expect(designSystem).toContain("--color-omran-blue-600: #1769e0");
    expect(designSystem).toContain("--color-omran-navy-800: #123b6d");
    expect(designSystem).toContain("--color-omran-red-600: #c62828");
    expect(designSystem).toContain("--color-omran-yellow-400: #ffc83d");
  });

  it("defines semantic colors instead of forcing raw colors into components", () => {
    for (const token of [
      "--color-action-primary",
      "--color-surface-page",
      "--color-content-primary",
      "--color-stroke-default",
      "--color-focus-brand",
      "--color-state-success",
      "--color-state-warning",
      "--color-state-error",
      "--color-state-info",
    ]) {
      expect(designSystem).toContain(token);
    }
  });

  it("defines typography, spacing, radius, elevation and motion foundations", () => {
    expect(designSystem).toContain("--font-family-ui:");
    expect(designSystem).toContain("--space-1: 4px");
    expect(designSystem).toContain("--space-32: 128px");
    expect(designSystem).toContain("--radius-md-system: 12px");
    expect(designSystem).toContain("--elevation-2:");
    expect(designSystem).toContain("--motion-standard: 220ms");
  });

  it("preserves the minimum 44px interactive target in core primitives", () => {
    expect(button).toContain("min-h-11");
    expect(button).toContain('icon: "size-11 p-0"');
    expect(input).toContain("h-11");
  });

  it("includes a dedicated WhatsApp button treatment without replacing brand primary", () => {
    expect(button).toContain("whatsapp:");
    expect(button).toContain("bg-whatsapp");
    expect(button).toContain('default: "bg-primary');
  });

  it("neutralizes motion durations when reduced motion is requested", () => {
    expect(designSystem).toContain("@media (prefers-reduced-motion: reduce)");
    expect(designSystem).toContain("--motion-standard: 0ms");
  });
});
