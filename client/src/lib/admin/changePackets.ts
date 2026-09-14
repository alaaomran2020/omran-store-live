/**
 * حزم التعديل اليدوية الموثّقة — القناة التشغيلية المعتمدة عندما لا تكون بوابة
 * الكتابة المباشرة مفعّلة (راجع VipOperations للنمط القائم حاليًا).
 *
 * تُنتج TSV مطابقًا لأعمدة الشيت الرئيسي يمكن لصقُه مباشرة في Google Sheets
 * دون كسر الأعمدة، مع تحييد حقن الصيغ (shared/audit.safeCsvCell). كل حزمة
 * تحمل ترويسة تعريفية بالموظف والوقت والسبب للمراجعة قبل الاعتماد.
 */
import { safeCsvCell } from "@shared/audit";

export type ChangePacket = {
  title: string;
  fileName: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  notes: string[];
};

export function packetToTsv(packet: ChangePacket): string {
  const lines = [
    `# ${packet.title}`,
    `# generated_at=${new Date().toISOString()}`,
    ...packet.notes.map(note => `# note=${note}`),
    packet.headers.map(safeCsvCell).join("\t"),
    ...packet.rows.map(row => row.map(safeCsvCell).join("\t")),
  ];
  return `${lines.join("\n")}\n`;
}

export function downloadPacket(packet: ChangePacket): void {
  const blob = new Blob(["\uFEFF", packetToTsv(packet)], {
    type: "text/tab-separated-values;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = packet.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function copyPacket(packet: ChangePacket): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(packetToTsv(packet));
    return true;
  } catch {
    return false;
  }
}

const stamp = () => new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

export function productChangePacket(
  product: { id: string; name: string },
  changes: Partial<Record<string, string | number | boolean | null>>,
  actor: { id: string; name: string },
  reason: string
): ChangePacket {
  return {
    title: `تعديل منتج: ${product.name} (${product.id})`,
    fileName: `product-update-${product.id}-${stamp()}.tsv`,
    headers: ["id", ...Object.keys(changes), "change_reason", "changed_by", "changed_at"],
    rows: [
      [
        product.id,
        ...Object.values(changes),
        reason,
        actor.name,
        new Date().toISOString(),
      ],
    ],
    notes: [
      `الموظف: ${actor.name} (${actor.id})`,
      "ألصق الصف في الشيت الرئيسي بنفس ترتيب الأعمدة ثم راجعه قبل النشر.",
      "النشر يتطلب active=TRUE و workflow_status=PUBLISHED و qa_status=PASS.",
    ],
  };
}

export function categoryChangePacket(
  changes: { id: string; name?: string; sortOrder?: number; visible?: boolean }[],
  actor: { id: string; name: string }
): ChangePacket {
  return {
    title: "تعديلات الأقسام",
    fileName: `category-update-${stamp()}.tsv`,
    headers: ["id", "name", "sort_order", "visible", "changed_by", "changed_at"],
    rows: changes.map(c => [c.id, c.name ?? "", c.sortOrder ?? "", c.visible ?? true, actor.name, new Date().toISOString()]),
    notes: ["يلزم لصق التعديلات في ورقة الأقسام ثم إعادة توليد الفهرس."],
  };
}

export function inventoryChangePacket(
  changes: { id: string; availability: string; availableQty?: number | null; lowStockThreshold?: number | null }[],
  actor: { id: string; name: string }
): ChangePacket {
  return {
    title: "تحديثات المخزون",
    fileName: `inventory-update-${stamp()}.tsv`,
    headers: ["id", "availability", "available_qty", "low_stock_threshold", "changed_by", "changed_at"],
    rows: changes.map(c => [c.id, c.availability, c.availableQty ?? "", c.lowStockThreshold ?? "", actor.name, new Date().toISOString()]),
    notes: ["الكميات تُعتمد فقط من جرد موثّق — لا تقدير."],
  };
}
