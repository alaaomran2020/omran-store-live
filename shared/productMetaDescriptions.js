/**
 * Approved, factual SEO-only descriptions for five URLs flagged by OpenSEO
 * audit 8b0f5742-17f9-4ea0-bbbb-a2f5210d36e6 (2026-11-18).
 *
 * Each line is derived from the existing product name and approved catalog
 * description. This module does not alter the catalogue, sales copy, product
 * IDs, stock, prices, or URL policy. The first HTML response and hydrated SPA
 * import the same overrides to prevent metadata drift.
 */
export const PRODUCT_META_DESCRIPTION_OVERRIDES = Object.freeze({
  "OMR-RAM-2026-013": "ميدالية فانوس سداسي من الخشب بمقاس 8 سم، ضمن تشكيلة فوانيس رمضان. تعبئة الكرتونة المذكورة على الصورة: 100 دستة. للاستفسار عن السعر والتوافر عبر واتساب.",
  "OMR-RAM-2026-017": "ميدالية فانوس رباعي من الخشب بمقاس 8 سم، ضمن تشكيلة زينة رمضان. تعبئة الكرتونة المذكورة على الصورة: 100 دستة. للاستفسار عن السعر والتوافر عبر واتساب.",
  "OMR-RAM-0042": "ستائر رمضانية كرتونية متعددة الألوان بالدرجات الكريمي والأحمر والأزرق، مع رسوم شخصيات احتفالية وفوانيس، من تشكيلة عمران تويز.",
  "OMR-RAM-0043": "ستائر رمضانية كرتونية بدرجات داكنة، مع رسومات شخصيات وفانوس مضيء وهلال، من تشكيلة ستائر وزينة رمضان لدى عمران تويز.",
  "OMR-RAM-0066": "رانر سفرة رمضاني داكن برسومات شخصيات كرتونية وألوان متعددة، لتزيين طاولة الطعام ضمن تشكيلة مفارش رمضان لدى عمران تويز."
});

/** Fall back to current catalog SEO text for every other product. */
export function resolveProductMetaDescription(id, fallbackDescription) {
  return Object.hasOwn(PRODUCT_META_DESCRIPTION_OVERRIDES, id)
    ? PRODUCT_META_DESCRIPTION_OVERRIDES[id]
    : fallbackDescription;
}
