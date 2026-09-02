import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "@shared/products";

/**
 * توافق Pipeline إدارة المنتجات (Telegram → n8n → Google Sheets) مع الموقع.
 *
 * الـPipeline تضيف للشيت ثلاثة أعمدة تشغيلية فقط:
 *   workflow_status | created_at | updated_at
 * والقاعدة (قسم 2 من المتطلبات): هذه الأعمدة يجب ألا تؤثر على الموقع إطلاقًا —
 * الظهور يُحكم حصريًا عبر عمود `active` الموجود أصلًا.
 */

const HEADER =
  "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,created_at,updated_at";

const row = (cells: string[]) => cells.join(",");

const SHEET = [
  HEADER,
  // منتج قديم منشور (قبل الـPipeline — الأعمدة الجديدة فارغة)
  row(["001", "سيارة أطفال سباق", "250", "سيارات", "وصف", "", "TRUE", "1", "", "", "", ""]),
  // منتج أنشأته الـPipeline ونُشر بالموافقة
  row([
    "OT-00001", "عروسة أميرة بفستان وردي", "350", "عرائس", "عروسة قماش ناعمة",
    "https://drive.google.com/file/d/1AaBbCcDdEeFfGgHhIiJjKkLl/view", "TRUE", "",
    "", "PUBLISHED", "2026-09-01T10:00:00Z", "2026-09-01T11:00:00Z",
  ]),
  // منتج تحت المراجعة: active=FALSE — يجب ألا يظهر مهما كانت workflow_status
  row([
    "OT-00002", "مكعبات تحت المراجعة", "180", "ألعاب تعليمية", "وصف",
    "", "FALSE", "", "", "REVIEW", "2026-09-02T09:00:00Z", "2026-09-02T09:00:00Z",
  ]),
  // منتج مرفوض: أيضًا مخفي
  row([
    "OT-00003", "منتج مرفوض", "99", "أخرى", "وصف",
    "", "FALSE", "", "", "REJECTED", "2026-09-02T09:30:00Z", "2026-09-02T09:30:00Z",
  ]),
].join("\n");

describe("أعمدة الـPipeline الجديدة لا تكسر كتالوج الموقع", () => {
  it("المنتجات القديمة والجديدة المنشورة تظهر كما هي", () => {
    const products = parseProductsCsv(SHEET);
    expect(products.map(p => p.id)).toEqual(["001", "OT-00001"]);
    const doll = products.find(p => p.id === "OT-00001")!;
    expect(doll.name).toBe("عروسة أميرة بفستان وردي");
    expect(doll.price).toBe(350);
    // رابط Drive يُحوَّل تلقائيًا لصيغة العرض المباشر — بلا أي كود جديد
    expect(doll.image).toBe(
      "https://drive.google.com/thumbnail?id=1AaBbCcDdEeFfGgHhIiJjKkLl&sz=w1000"
    );
  });

  it("REVIEW/REJECTED مخفية عبر active=FALSE (وليس عبر workflow_status)", () => {
    const publicCatalog = parseProductsCsv(SHEET);
    expect(publicCatalog.some(p => p.id === "OT-00002")).toBe(false);
    expect(publicCatalog.some(p => p.id === "OT-00003")).toBe(false);

    // لوحة الإدارة (includeInactive) تراها — نفس سلوك اليوم بلا تغيير
    const adminCatalog = parseProductsCsv(SHEET, { includeInactive: true });
    expect(adminCatalog.some(p => p.id === "OT-00002")).toBe(true);
  });

  it("workflow_status وحده لا يخفي منتجًا active فارغ/TRUE", () => {
    // صف بحالة REVIEW لكن active فارغ (خطأ تشغيلي محتمل): يظهر — لذلك
    // الـPipeline مُلزمة بكتابة FALSE صراحة عند الإنشاء (موثق ومختبَر في n8n).
    const sheet = [
      HEADER,
      row(["OT-00009", "منتج بلا active", "10", "", "وصف", "", "", "", "", "REVIEW", "", ""]),
    ].join("\n");
    const products = parseProductsCsv(sheet);
    expect(products).toHaveLength(1); // يؤكد أن الحكم لعمود active فقط
  });
});
