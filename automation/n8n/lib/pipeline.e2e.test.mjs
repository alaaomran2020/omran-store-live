/**
 * محاكاة الرحلة الكاملة (E2E بلا خدمات خارجية):
 *
 *   Telegram (caption) → parseCaption → AI (مُحاكى) → Validation → ID → تكرار
 *   → صف Google Sheets → Approve/Reject/Edit → CSV → shared/products.ts
 *   → ما يراه زائر omrantoys.store فعليًا.
 *
 * الطرف الأول هو نفس الدوال المضمّنة في n8n Code nodes، والطرف الأخير هو
 * محلل الموقع الحقيقي — فالاختبار يثبت التوافق بين النظامين من طرف لطرف.
 */
import { describe, expect, it } from "vitest";
import { parseProductsCsv } from "@shared/products";
import {
  buildPreviewMessage,
  findDuplicates,
  nextProductId,
  parseCaption,
  parseQuickEdit,
  validateAiProduct,
} from "./pipeline.mjs";

// ------------------------- محاكاة Google Sheet -------------------------

const COLUMNS = [
  "id", "name", "price", "category", "description", "image",
  "active", "sort_order", "product_prompt", "workflow_status",
  "qa_status", "source_drive_id", "processed_image", "review_reason",
  "created_at", "updated_at",
];

class FakeSheet {
  constructor(rows = []) {
    this.rows = rows.map(r => ({ ...r }));
  }
  read() {
    return this.rows.map(r => ({ ...r }));
  }
  append(row) {
    this.rows.push({ ...row });
  }
  /** appendOrUpdate بمطابقة عمود id — نفس سلوك Google Sheets node. */
  appendOrUpdate(partial) {
    const i = this.rows.findIndex(
      r => String(r.id).trim() === String(partial.id).trim()
    );
    if (i === -1) this.rows.push({ ...partial });
    else this.rows[i] = { ...this.rows[i], ...partial };
  }
  /** الشيت كما ينشره Google: CSV برأس أعمدة — ما يقرأه Cloudflare Worker. */
  toCsv() {
    const escape = v => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      COLUMNS.join(","),
      ...this.rows.map(r => COLUMNS.map(c => escape(r[c])).join(",")),
    ].join("\n");
  }
}

/** ما تفعله n8n Code node «فحص النتيجة»: AI → صف REVIEW جاهز للإدراج. */
function intakeProduct(sheet, { caption, aiResponse }) {
  const rows = sheet.read();
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean))];
  const ids = rows.map(r => r.id);
  const parsed = parseCaption(caption);

  let raw = null;
  try {
    raw = JSON.parse(aiResponse);
  } catch {
    raw = null;
  }
  const id = nextProductId(ids);
  const v = validateAiProduct(raw, {
    categories,
    userPrice: parsed.price,
    fallbackId: id,
  });
  const dup = findDuplicates({ id, name: v.product.name }, rows);
  if (!v.ok || raw === null) return { ok: false, error: "⚠️ تعذر تحليل المنتج." };

  const now = "2026-09-02T12:00:00.000Z";
  const row = {
    id,
    name: v.product.name,
    price: v.product.price === null ? "" : String(v.product.price),
    category: v.product.category || parsed.category || "",
    description: v.product.description,
    image: `https://drive.google.com/file/d/FAKE_DRIVE_${id}/view`,
    active: "FALSE",
    sort_order: "",
    product_prompt: "",
    workflow_status: "REVIEW",
    qa_status: "REVIEW",
    source_drive_id: `FAKE_DRIVE_${id}`,
    processed_image: "",
    review_reason: "بانتظار مراجعة بشرية قبل النشر",
    created_at: now,
    updated_at: now,
  };
  sheet.append(row);
  return {
    ok: true,
    row,
    duplicate: dup.duplicate,
    preview: buildPreviewMessage(v.product, {
      id,
      duplicateWarning: dup.duplicate,
      duplicateMatches: dup.matches,
      lowConfidence: v.lowConfidence,
    }),
  };
}

const approve = (sheet, id) =>
  sheet.appendOrUpdate({
    id,
    active: "TRUE",
    workflow_status: "PUBLISHED",
    qa_status: "PASS",
    review_reason: "",
    updated_at: "2026-09-02T12:05:00.000Z",
  });
const reject = (sheet, id) =>
  sheet.appendOrUpdate({
    id,
    active: "FALSE",
    workflow_status: "REJECTED",
    qa_status: "FAILED",
    review_reason: "رفض بواسطة المالك",
    updated_at: "2026-09-02T12:05:00.000Z",
  });

/** ما يراه الزائر: نفس محلل الموقع الذي يشغّل /api/products على Cloudflare. */
const publicSite = sheet => parseProductsCsv(sheet.toCsv());

// --------------------------------- السيناريوهات ---------------------------------

const EXISTING = [
  {
    id: "001", name: "سيارة أطفال سباق", price: "250", category: "سيارات",
    description: "سيارة أطفال بتصميم رياضي", image: "", active: "TRUE",
    sort_order: "1", product_prompt: "", workflow_status: "PUBLISHED",
    qa_status: "PASS", source_drive_id: "", processed_image: "", review_reason: "",
    created_at: "", updated_at: "",
  },
  {
    id: "002", name: "عروسة قماش كبيرة", price: "320", category: "عرائس",
    description: "عروسة قماش ناعمة", image: "", active: "TRUE",
    sort_order: "2", product_prompt: "", workflow_status: "PUBLISHED",
    qa_status: "PASS", source_drive_id: "", processed_image: "", review_reason: "",
    created_at: "", updated_at: "",
  },
];

const AI_OK = JSON.stringify({
  name: "مكعبات تعليمية 100 قطعة",
  price: null,
  category: "سيارات", // سيصححها caption؟ لا — التصنيف من القائمة الموجودة
  description: "مكعبات ملونة تنمي مهارات البناء والتركيز عند الأطفال.",
  brand: null,
  slug: "building-blocks-100",
  confidence: 0.92,
});

describe("الرحلة الكاملة: صورة → REVIEW → نشر → الموقع", () => {
  it("منتج جديد بسعر من الـcaption: يُنشأ REVIEW مخفيًا ثم يظهر بعد النشر", () => {
    const sheet = new FakeSheet(EXISTING);
    const before = publicSite(sheet).map(p => p.id);

    const result = intakeProduct(sheet, {
      caption: "السعر: 350",
      aiResponse: AI_OK,
    });
    expect(result.ok).toBe(true);
    expect(result.row.id).toBe("OT-00001");
    expect(result.row.price).toBe("350"); // سعر المستخدم لا يُغيَّر
    expect(result.row.active).toBe("FALSE");
    expect(result.row.workflow_status).toBe("REVIEW");
    expect(result.preview).toContain("🟡 يحتاج مراجعة");

    // قبل الموافقة: الموقع لا يتغير — المنتجات الحالية سليمة تمامًا
    const during = publicSite(sheet);
    expect(during.map(p => p.id)).toEqual(before);

    // ✅ نشر
    approve(sheet, "OT-00001");
    const after = publicSite(sheet);
    const published = after.find(p => p.id === "OT-00001");
    expect(published).toBeDefined();
    expect(published.price).toBe(350);
    expect(published.image).toContain("drive.google.com/thumbnail?id=FAKE_DRIVE_OT-00001");
    // ولم يفقد أي منتج قديم
    for (const id of before) expect(after.some(p => p.id === id)).toBe(true);
  });

  it("منتج بلا سعر: null → «للاستفسار والكميات» على الموقع بعد النشر", () => {
    const sheet = new FakeSheet(EXISTING);
    const result = intakeProduct(sheet, { caption: "", aiResponse: AI_OK });
    expect(result.row.price).toBe("");
    approve(sheet, result.row.id);
    const product = publicSite(sheet).find(p => p.id === result.row.id);
    expect(product.price).toBeNull(); // الواجهة تعرضه "للاستفسار والكميات"
  });

  it("منتج مكرر: تحذير في المعاينة ولا يُنشر تلقائيًا", () => {
    const sheet = new FakeSheet(EXISTING);
    const result = intakeProduct(sheet, {
      caption: "السعر: 320",
      aiResponse: JSON.stringify({
        name: "عروسه قماش كبيره", // نفس المنتج بإملاء مختلف
        price: null, category: "عرائس",
        description: "عروسة قماش ناعمة وآمنة.",
        slug: "cloth-doll", confidence: 0.9,
      }),
    });
    expect(result.duplicate).toBe(true);
    expect(result.preview).toContain("⚠️ يبدو أن هذا المنتج موجود بالفعل.");
    // ظل مخفيًا عن الزوار
    expect(publicSite(sheet).some(p => p.id === result.row.id)).toBe(false);
  });

  it("رفض: يبقى مخفيًا للأبد وworkflow_status=REJECTED", () => {
    const sheet = new FakeSheet(EXISTING);
    const result = intakeProduct(sheet, { caption: "350", aiResponse: AI_OK });
    reject(sheet, result.row.id);
    expect(publicSite(sheet).some(p => p.id === result.row.id)).toBe(false);
    expect(sheet.read().find(r => r.id === result.row.id).workflow_status).toBe("REJECTED");
  });

  it("تعديل: «السعر 399» يحدّث الصف الموجود فقط ثم يُنشر", () => {
    const sheet = new FakeSheet(EXISTING);
    const result = intakeProduct(sheet, { caption: "السعر: 350", aiResponse: AI_OK });

    // ✏️ تعديل سريع بلا AI — نفس منطق node «دمج التعديل»
    const quick = parseQuickEdit("السعر 399");
    expect(quick).toEqual({ price: 399 });
    sheet.appendOrUpdate({
      id: result.row.id,
      price: String(quick.price),
      active: "FALSE",
      workflow_status: "REVIEW",
      updated_at: "2026-09-02T12:10:00.000Z",
    });

    approve(sheet, result.row.id);
    const product = publicSite(sheet).find(p => p.id === result.row.id);
    expect(product.price).toBe(399);
    expect(product.name).toBe("مكعبات تعليمية 100 قطعة"); // لم يُعد إنشاؤه
  });

  it("رد AI تالف: رسالة خطأ، لا صف جديد، والموقع سليم", () => {
    const sheet = new FakeSheet(EXISTING);
    const before = sheet.read().length;
    const result = intakeProduct(sheet, {
      caption: "السعر: 100",
      aiResponse: "عذرًا لا أستطيع تحليل هذه الصورة",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("⚠️ تعذر تحليل المنتج.");
    expect(sheet.read().length).toBe(before);
    expect(publicSite(sheet)).toHaveLength(2);
  });

  it("تسلسل المعرفات لا يتصادم عبر منتجات متتالية", () => {
    const sheet = new FakeSheet(EXISTING);
    const a = intakeProduct(sheet, { caption: "1", aiResponse: AI_OK });
    const b = intakeProduct(sheet, { caption: "2", aiResponse: AI_OK });
    const c = intakeProduct(sheet, { caption: "3", aiResponse: AI_OK });
    expect([a.row.id, b.row.id, c.row.id]).toEqual(["OT-00001", "OT-00002", "OT-00003"]);
  });
});
