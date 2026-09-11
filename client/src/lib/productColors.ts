const COLOR_HEX: Record<string, string> = {
  "اسود": "#111827",
  "أسود": "#111827",
  "رصاصي": "#9CA3AF",
  "رصاصي غامق": "#4B5563",
  "احمر": "#DC2626",
  "أحمر": "#DC2626",
  "بيج": "#E7D3B1",
  "بيرجاندي": "#7F1D1D",
  "زيتي": "#556B2F",
  "ابيض": "#FFFFFF",
  "أبيض": "#FFFFFF",
  "بيبي بلو": "#7DD3FC",
  "بني": "#92400E",
  "بينك": "#F472B6",
  "اصفر": "#FACC15",
  "أصفر": "#FACC15",
  "موف": "#8B5CF6",
  "موڤ": "#8B5CF6",
  "اورانج": "#F97316",
  "اورانچ": "#F97316",
  "جولد": "#D4AF37",
  "ازرق": "#2563EB",
  "أزرق": "#2563EB",
  "ازرق غامق": "#1E3A8A",
  "أزرق غامق": "#1E3A8A",
  "فوشيا": "#D946EF",
  "سيلفر": "#C0C0C0",
  "روز جولد": "#B76E79",
  "روز بينك": "#FB7185",
  "مينت جرين": "#6EE7B7",
};

function normalizeColor(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * تستخرج الألوان الموثقة من وصف المنتج بصيغة:
 * "الألوان المتاحة: أسود، أحمر، ...".
 * لا يتم اختراع أي لون غير موجود في المصدر.
 */
export function extractProductColors(description: string | null | undefined): string[] {
  if (!description) return [];
  const match = description.match(/الألوان\s+المتاحة\s*[:：]\s*([^.\n]+)/i);
  if (!match?.[1]) return [];

  return Array.from(
    new Set(
      match[1]
        .replaceAll("/", "،")
        .split(/[،,|]+/)
        .map(normalizeColor)
        .filter(Boolean)
    )
  );
}

export function productColorHex(color: string): string {
  return COLOR_HEX[normalizeColor(color)] ?? "#E5E7EB";
}
