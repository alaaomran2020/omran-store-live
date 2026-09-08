import type { Product, ProductOptionGroup } from "@/lib/productsClient";
import { extractProductColors } from "@/lib/productColors";

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeLabel).filter(Boolean)));
}

export function productOptionGroups(product: Product): ProductOptionGroup[] {
  const groups = product.options
    .map(group => ({ name: normalizeLabel(group.name), values: unique(group.values) }))
    .filter(group => group.name && group.values.length > 0);

  const hasColorGroup = groups.some(group => /^(اللون|الألوان|color|colors)$/i.test(group.name));
  if (!hasColorGroup) {
    const legacyColors = extractProductColors(product.description);
    if (legacyColors.length > 0) groups.unshift({ name: "اللون", values: legacyColors });
  }

  return groups;
}

export function productColors(product: Product): string[] {
  const group = productOptionGroups(product).find(item => /^(اللون|الألوان|color|colors)$/i.test(item.name));
  return group?.values ?? [];
}

export function nonColorProductOptions(product: Product): ProductOptionGroup[] {
  return productOptionGroups(product).filter(item => !/^(اللون|الألوان|color|colors)$/i.test(item.name));
}
