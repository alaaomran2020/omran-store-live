import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "@shared/products";

/**
 * توافق Pipeline إدارة المنتجات (Telegram → n8n → Google Sheets) مع الموقع
 * تحت **بوابة النشر الثلاثية** (Fail-Closed):
 *
 *   PUBLIC = active === true AND workflow_status === "PUBLISHED" AND qa_status === "PASS"
 *
 * الـPipeline تكتب للشيت الأعمدة التشغيلية:
 *   workflow_status | qa_status | created_at | updated_at
 * الإنشاء: active=FALSE + REVIEW + NEEDS_REVIEW
 * النشر (✅): active=TRUE + PUBLISHED + PASS
 * الرفض (❌): active=FALSE + REJECTED
 *
 * غياب أي مفتاح (أعمدة قديمة فارغة) لا يعني أبدًا PUBLISHED أو PASS.
 */
const HEADER =
  "id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status,created_at,updated_at";

const row = (cells: string[]) => cells.join(",");

const SHEET = [
  HEADER,
  // منتج قديم منشور بالصيغة الرسمية — كل المفاتيح الثلاثة صريحة
  row(["001", "سيارة أطفال سباق", "250", "سيارات", "وصف", "", "TRUE", "1", "", "PUBLISHED", "PASS", "", ""]),
  // منتج أنشأته الـPipeline ونُشر بالموافقة (✅)
  row([
    "OT-00001", "عروسة أميرة بفستان وردي", "350", "عرائس", "عروسة قماش ناعمة",
    "https://drive.google.com/file/d/1AaBbCcDdEeFfGgHhIiJjKkLl/view", "TRUE", "",
    "", "PUBLISHED", "PASS", "2026-09-01T10:00:00Z", "2026-09-01T11:00:00Z",
  ]),
  // منتج تحت المراجعة: active=FALSE — مخفي مهما كانت بقية الأعمدة
  row([
    "OT-00002", "مكعبات تحت المراجعة", "180", "ألعاب تعليمية", "وصف",
    "", "FALSE", "", "", "REVIEW", "NEEDS_REVIEW", "2026-09-02T09:00:00Z", "2026-09-02T09:00:00Z",
  ]),
  // منتج مرفوض: مخفي
  row([
    "OT-00003", "منتج مرفوض", "99", "أخرى", "وصف",
    "", "FALSE", "", "", "REJECTED", "NEEDS_REVIEW", "2026-09-02T09:30:00Z", "2026-09-02T09:30:00Z",
  ]),
  // صف legacy قديم: الأعمدة التشغيلية غائبة تمامًا → ليس عامًا (Fail-Closed)
  row(["LEGACY-1", "منتج قديم بلا دليل", "75", "أخرى", "وصف قديم", "", "TRUE", "9", "برومبت قديم", "", "", "", ""]),
  // active=TRUE + PUBLISHED لكن QA ما زال NEEDS_REVIEW → ليس عامًا
  row([
    "OT-00004", "منتج بQA معلق", "120", "أخرى", "وصف",
    "", "TRUE", "", "", "PUBLISHED", "NEEDS_REVIEW", "2026-09-02T10:00:00Z", "",
  ]),
].join("\n");

describe("بوابة النشر الثلاثية مع أعمدة الـPipeline", () => {
  it("لا يظهر عامًا إلا active=TRUE + PUBLISHED + PASS", () => {
    const products = parseProductsCsv(SHEET);
    expect(products.map(p => p.id)).toEqual(["001", "OT-00001"]);
  });

  it("المنشور بالموافقة يحمل الحقول التشغيلية First-Class", () => {
    const doll = parseProductsCsv(SHEET).find(p => p.id === "OT-00001")!;
    expect(doll.name).toBe("عروسة أميرة بفستان وردي");
    expect(doll.price).toBe(350);
    expect(doll.workflowStatus).toBe("PUBLISHED");
    expect(doll.qaStatus).toBe("PASS");
    expect(doll.reviewReason).toBeNull();
    // رابط Drive يُحوّل تلقائيًا لصيغة العرض المباشر — بلا أي كود جديد
    expect(doll.image).toBe(
      "https://drive.google.com/thumbnail?id=1AaBbCcDdEeFfGgHhIiJjKkLl&sz=w1000"
    );
  });

  it("REVIEW/REJECTED/NEEDS_REVIEW/Legacy مخفية عن الموقع العام", () => {
    const publicCatalog = parseProductsCsv(SHEET);
    for (const id of ["OT-00002", "OT-00003", "LEGACY-1", "OT-00004"]) {
      expect(publicCatalog.some(p => p.id === id)).toBe(false);
    }

    // لوحة الإدارة (includeInactive) تراها كلها — مع سبب معزول قابل للمراجعة
    const adminCatalog = parseProductsCsv(SHEET, { includeInactive: true });
    expect(adminCatalog.map(p => p.id).sort()).toEqual(
      ["001", "OT-00001", "OT-00002", "OT-00003", "LEGACY-1", "OT-00004"].sort()
    );
    expect(adminCatalog.find(p => p.id === "OT-00002")!.reviewReason).toContain("inactive");
    expect(adminCatalog.find(p => p.id === "LEGACY-1")!.reviewReason).toContain("missing_workflow_status");
    expect(adminCatalog.find(p => p.id === "OT-00004")!.reviewReason).toContain("qa_status_needs_review");
  });

  it("طبقة توافق product_prompt التشغيلية القديمة (qa=PASS) تبقى مقبولة كدليل QA", () => {
    // الشيت الحي الحقيقي يستخدم هذا الشكل: qa داخل product_prompt قبل اعتماد
    // عمود qa_status الصريح. الدليل الصريح (PASS) يُقبل؛ الفراغ لا يُقبل.
    const csv = [
      HEADER,
      "OMR-RAW-001,محلول فقاعات,,ألعاب خارجية,,https://drive.google.com/uc?export=view&id=1dtiEbbptINTXxtQAwpkKpI2fxBAxYbLm,TRUE,2,source_drive_id=1I_QGGoYTxq7zdfd5UgWFReB7MS9Tg36U; qa=PASS; processed=product-omr-raw-001-main.webp,PUBLISHED,,,",
      "OMR-RAW-002,حقيبة رسم,,ألعاب تعليمية,,https://drive.google.com/uc?export=view&id=1ORWMwfpwHgF-Usqg1oBvzCx4FIVhj18T,TRUE,3,source_drive_id=1Sdozgd1CS2oAtJcUN-fjIhQzmAq_AuVl; qa=NEEDS_REVIEW; reason=product identity unclear,PUBLISHED,,,",
    ].join("\n");

    const products = parseProductsCsv(csv);
    expect(products.map(p => p.id)).toEqual(["OMR-RAW-001"]);

    const [bubble] = products;
    expect(bubble.qaStatus).toBe("PASS");
    expect(bubble.workflowStatus).toBe("PUBLISHED");
    expect(bubble.sourceDriveId).toBe("1I_QGGoYTxq7zdfd5UgWFReB7MS9Tg36U");
    expect(bubble.processedImage).toBe("product-omr-raw-001-main.webp");

    // qa=NEEDS_REVIEW في الـmetadata → معزول مع سبب موثّق
    const admin = parseProductsCsv(csv, { includeInactive: true });
    const bag = admin.find(p => p.id === "OMR-RAW-002")!;
    expect(bag.qaStatus).toBe("NEEDS_REVIEW");
    expect(bag.reviewReason).toContain("qa_status_needs_review");
    expect(bag.reviewReason).toContain("product identity unclear");
  });

  it("برومبت وصفي حر (ليس metadata) لا يُفهم كدليل QA", () => {
    const csv = [
      HEADER,
      "1,لعبة وصفية,100,ألعاب,وصف,,TRUE,1,سيارة رياضية حمراء على خلفية بيضاء مستودع,PUBLISHED,,",
    ].join("\n");
    const products = parseProductsCsv(csv);
    expect(products).toHaveLength(0); // لا qa → ليس عامًا
    const admin = parseProductsCsv(csv, { includeInactive: true });
    expect(admin[0].reviewReason).toBe("missing_qa_status");
    expect(admin[0].productPrompt).toBe("سيارة رياضية حمراء على خلفية بيضاء مستودع");
  });
});
