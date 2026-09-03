import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "@shared/products";

/**
 * توافق Pipeline إدارة المنتجات (Telegram → n8n → Google Sheets) مع الموقع.
 *
 * الـPipeline تكتب في الشيت حقول التشغيل First-Class:
 *   workflow_status | qa_status | source_drive_id | processed_image | review_reason
 * (+ created_at / updated_at التي يتجاهلها المحلل تمامًا).
 *
 * قاعدة النشر الرسمية (Fail-Closed):
 *   PUBLIC = active === true AND workflow_status === "PUBLISHED"
 *            AND qa_status === "PASS"
 * غياب أي حالة أو قيمتها غير المعروفة → NOT PUBLIC — مهما كان active.
 */

const HEADER =
  "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status,source_drive_id,processed_image,review_reason,created_at,updated_at";

const row = (cells: string[]) => cells.join(",");

const SHEET = [
  HEADER,
  // منتج قديم منشور — صفّحت الـPipeline حالته صراحة (PUBLISHED + PASS)
  row([
    "001", "سيارة أطفال سباق", "250", "سيارات", "وصف", "", "TRUE", "1", "",
    "PUBLISHED", "PASS", "1AaBbCcDdEeFfGgHhIiJj", "", "", "2026-08-01T00:00:00Z", "2026-09-01T10:00:00Z",
  ]),
  // منتج أنشأته الـPipeline ونُشر بالموافقة
  row([
    "OT-00001", "عروسة أميرة بفستان وردي", "350", "عرائس", "عروسة قماش ناعمة",
    "https://drive.google.com/file/d/1AaBbCcDdEeFfGgHhIiJjKkLl/view", "TRUE", "",
    "", "PUBLISHED", "PASS", "1AaBbCcDdEeFfGgHhIiJjKkLl", "", "",
    "2026-09-01T10:00:00Z", "2026-09-01T11:00:00Z",
  ]),
  // منتج تحت المراجعة: حتى لو active=TRUE لا يُنشر — البوابة تمنعه
  row([
    "OT-00002", "مكعبات تحت المراجعة", "180", "ألعاب تعليمية", "وصف",
    "", "TRUE", "", "", "REVIEW", "REVIEW", "", "", "بانتظار مراجعة الصورة",
    "2026-09-02T09:00:00Z", "2026-09-02T09:00:00Z",
  ]),
  // منتج مرفوض: مخفي أيضًا (active=FALSE)
  row([
    "OT-00003", "منتج مرفوض", "99", "أخرى", "وصف",
    "", "FALSE", "", "", "REJECTED", "FAILED", "", "", "مرفوض",
    "2026-09-02T09:30:00Z", "2026-09-02T09:30:00Z",
  ]),
].join("\n");

describe("أعمدة الـPipeline First-Class مع بوابة النشر", () => {
  it("المنتجات المنشورة رسميًا (PUBLISHED + PASS + active) تظهر فقط", () => {
    const products = parseProductsCsv(SHEET);
    expect(products.map(p => p.id)).toEqual(["001", "OT-00001"]);
    const doll = products.find(p => p.id === "OT-00001")!;
    expect(doll.name).toBe("عروسة أميرة بفستان وردي");
    expect(doll.price).toBe(350);
    expect(doll.qaStatus).toBe("PASS");
    expect(doll.workflowStatus).toBe("PUBLISHED");
    // رابط Drive يُحوَّل تلقائيًا لصيغة العرض المباشر — بلا أي كود جديد
    expect(doll.image).toBe(
      "https://drive.google.com/thumbnail?id=1AaBbCcDdEeFfGgHhIiJjKkLl&sz=w1000"
    );
  });

  it("REVIEW active=true لا يُنشر (البوابة لا تعتمد على active فقط)", () => {
    const publicCatalog = parseProductsCsv(SHEET);
    expect(publicCatalog.some(p => p.id === "OT-00002")).toBe(false);
    expect(publicCatalog.some(p => p.id === "OT-00003")).toBe(false);

    // التشخيص (includeInactive) يرى كل الصفوف — بلا فقد للبيانات
    const adminCatalog = parseProductsCsv(SHEET, { includeInactive: true });
    expect(adminCatalog.find(p => p.id === "OT-00002")?.workflowStatus).toBe(
      "REVIEW"
    );
    expect(adminCatalog.find(p => p.id === "OT-00003")?.workflowStatus).toBe(
      "REJECTED"
    );
  });

  it("نقص حالة النشر/الجودة مع active=TRUE → NOT PUBLIC (Fail-Closed)", () => {
    const sheet = [
      HEADER,
      // active فارغ (=TRUE) لكن بلا workflow ولا qa — لا يُنشر أبدًا
      row(["OT-00009", "منتج بلا حالات", "10", "", "وصف", "", "", "", "", "", "", "", "", "", "", ""]),
    ].join("\n");
    expect(parseProductsCsv(sheet)).toHaveLength(0);
    const diag = parseProductsCsv(sheet, { includeNonPublished: true });
    expect(diag).toHaveLength(1);
    expect(diag[0].workflowStatus).toBe("");
    expect(diag[0].qaStatus).toBe("");
  });
});
