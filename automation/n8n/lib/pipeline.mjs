/**
 * OMRAN TOYS — منطق الـPipeline الصافي (Telegram → n8n → AI → Sheets).
 *
 * هذه الوحدة هي "مصدر الحقيقة" المُختبَر للدوال المضمّنة داخل Code nodes في
 * n8n workflow (automation/n8n/omran-toys-product-pipeline.json).
 * أي تعديل هنا يجب نسخه يدويًا إلى الـCode node المقابل — الملفان متطابقان.
 *
 * قواعد التصميم (مطابقة لبقية المشروع):
 *   - Web/ES APIs فقط، بلا تبعيات خارجية.
 *   - لا استثناء يوقف الرحلة: كل دالة ترجع نتيجة آمنة قابلة للفحص.
 *   - لا أسرار هنا إطلاقًا: التوكنات كلها في n8n Credentials / env.
 */

// ---------------------------------------------------------------------------
// أرقام عربية → لاتينية (نفس منطق shared/products.ts حتى تتطابق القيم)
// ---------------------------------------------------------------------------

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EXTENDED_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

export function toLatinDigits(value) {
  let out = "";
  for (const ch of String(value ?? "")) {
    const a = ARABIC_INDIC.indexOf(ch);
    if (a !== -1) {
      out += String(a);
      continue;
    }
    const p = EXTENDED_ARABIC_INDIC.indexOf(ch);
    out += p !== -1 ? String(p) : ch;
  }
  return out;
}

/** سعر آمن: "350" / "٣٥٠" / "1,250.5" / "350 جنيه" → رقم، وإلا null. */
export function parsePrice(raw) {
  const text = toLatinDigits(String(raw ?? "").trim())
    .replace(/[٬,\s]/g, "")
    .replace(/[٫]/g, ".");
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

// ---------------------------------------------------------------------------
// 1) تحليل الـCaption القادم من Telegram
//
// الحالات المدعومة:
//   (أ) صورة فقط                        → كل الحقول null
//   (ب) "السعر: 350"                    → price=350
//   (ج) "السعر: 350\nالقسم: ألعاب بنات" → price=350, category=...
//   (د) caption يحتوي رقمًا فقط "350"    → يُعتبر سعرًا
// ---------------------------------------------------------------------------

const CAPTION_KEYS = [
  { key: "price", patterns: [/^\s*(?:السعر|سعر|price)\s*[:：=]?\s*(.+)$/i] },
  {
    key: "category",
    patterns: [/^\s*(?:القسم|التصنيف|الفئة|category|cat)\s*[:：=]?\s*(.+)$/i],
  },
  { key: "name", patterns: [/^\s*(?:الاسم|اسم المنتج|name)\s*[:：=]?\s*(.+)$/i] },
];

export function parseCaption(caption) {
  const result = { price: null, category: null, name: null, notes: [] };
  const text = String(caption ?? "").trim();
  if (text === "") return result;

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    let matched = false;
    for (const { key, patterns } of CAPTION_KEYS) {
      for (const pattern of patterns) {
        const m = trimmed.match(pattern);
        if (m) {
          matched = true;
          if (key === "price") result.price = parsePrice(m[1]);
          else result[key] = m[1].trim();
          break;
        }
      }
      if (matched) break;
    }
    if (!matched) {
      // سطر عبارة عن رقم فقط → سعر؛ غير ذلك → ملاحظة تمريرها للـAI كما هي.
      const numericOnly = toLatinDigits(trimmed).match(
        /^\s*\d+(?:[.,٫]\d+)?\s*(?:ج\.?م|جنيه|le|egp)?\s*$/i
      );
      if (numericOnly && result.price === null) result.price = parsePrice(trimmed);
      else result.notes.push(trimmed);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2) Validation لمخرجات الـAI (بعد JSON.parse)
// ---------------------------------------------------------------------------

export const REVIEW_CONFIDENCE_THRESHOLD = 0.75;

/** slug آمن: لاتيني صغير وشرطات فقط؛ عند التعذر يُشتق من الـid. */
export function safeSlug(raw, fallbackId) {
  const slug = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (slug.length >= 3) return slug;
  return `product-${String(fallbackId ?? "").trim().toLowerCase() || "item"}`;
}

/**
 * يتحقق من مخرجات الـAI ويعيد {ok, product, problems, needsReview}.
 * لا يرمي أبدًا. `userPrice` (من الـcaption) يعلو دائمًا على سعر الـAI —
 * القاعدة 4/5 في الـSystem Prompt: سعر المستخدم لا يُغيَّر.
 */
export function validateAiProduct(raw, options = {}) {
  const problems = [];
  const src = raw && typeof raw === "object" ? raw : {};
  const categories = Array.isArray(options.categories) ? options.categories : [];

  const name = String(src.name ?? "").trim();
  if (name === "") problems.push("name_missing");

  let category = String(src.category ?? "").trim();
  if (category === "") problems.push("category_missing");
  // التصنيف يجب أن يكون من تصنيفات الموقع الموجودة (إن وُجدت قائمة)
  if (category !== "" && categories.length > 0 && !categories.includes(category)) {
    const relaxed = categories.find(
      c => c.replace(/\s+/g, "") === category.replace(/\s+/g, "")
    );
    if (relaxed) category = relaxed;
    else problems.push("category_unknown");
  }

  const description = String(src.description ?? "").trim();
  if (description === "") problems.push("description_missing");

  // سعر المستخدم أولًا، ثم سعر الـAI، وإلا null (يظهر "للاستفسار والكميات")
  let price = null;
  if (options.userPrice !== null && options.userPrice !== undefined) {
    price = parsePrice(options.userPrice);
  } else if (src.price !== null && src.price !== undefined) {
    price = parsePrice(src.price);
    if (price === null) problems.push("price_invalid");
  }

  let confidence = Number(src.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    problems.push("confidence_missing");
    confidence = 0;
  }

  const ok = !problems.some(p =>
    ["name_missing", "description_missing"].includes(p)
  );

  return {
    ok,
    problems,
    needsReview: true, // النشر يدوي دائمًا (قسم 11) — لا نشر تلقائي إطلاقًا
    lowConfidence: confidence < REVIEW_CONFIDENCE_THRESHOLD,
    product: {
      name: name || null,
      price,
      category: category || "",
      description: description || "",
      brand: src.brand ?? null,
      slug: safeSlug(src.slug, options.fallbackId),
      confidence,
    },
  };
}

// ---------------------------------------------------------------------------
// 3) توليد Product ID متسلسل: OT-00001, OT-00002, …
// ---------------------------------------------------------------------------

export function nextProductId(existingIds) {
  let max = 0;
  for (const raw of existingIds ?? []) {
    const m = String(raw ?? "").trim().match(/^OT-(\d+)$/i);
    if (m) max = Math.max(max, Number.parseInt(m[1], 10));
  }
  return `OT-${String(max + 1).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// 4) كشف التكرار
// ---------------------------------------------------------------------------

/** تطبيع عربي للمقارنة: إزالة التشكيل والتطويل وتوحيد الألف/الياء/التاء. */
export function normalizeArabic(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // تشكيل + تطويل
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function tokenSet(text) {
  return new Set(normalizeArabic(text).split(" ").filter(t => t.length > 1));
}

/** تشابه Jaccard بين اسمين بعد التطبيع (0..1). */
export function nameSimilarity(a, b) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter += 1;
  return inter / (setA.size + setB.size - inter);
}

export const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;

/**
 * يفحص التكرار ضد صفوف الشيت الحالية: تطابق id، تطابق اسم كامل بعد التطبيع،
 * أو تشابه ≥ 0.8. يرجع {duplicate, matches:[{id,name,reason}]}.
 */
export function findDuplicates(candidate, existingRows) {
  const matches = [];
  const candName = normalizeArabic(candidate?.name ?? "");
  const candId = String(candidate?.id ?? "").trim().toLowerCase();

  for (const row of existingRows ?? []) {
    const rowId = String(row?.id ?? "").trim().toLowerCase();
    const rowName = String(row?.name ?? "");
    if (candId && rowId && candId === rowId) {
      matches.push({ id: row.id, name: rowName, reason: "same_id" });
      continue;
    }
    if (candName && normalizeArabic(rowName) === candName) {
      matches.push({ id: row.id, name: rowName, reason: "same_name" });
      continue;
    }
    const similarity = nameSimilarity(candidate?.name ?? "", rowName);
    if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
      matches.push({
        id: row.id,
        name: rowName,
        reason: `similar_${similarity.toFixed(2)}`,
      });
    }
  }
  return { duplicate: matches.length > 0, matches };
}

// ---------------------------------------------------------------------------
// 5) تعديل سريع بلا AI: "السعر 399" / "الاسم عروسة أميرة" …
//    يوفر تكلفة استدعاء AI للتعديلات البسيطة الشائعة.
// ---------------------------------------------------------------------------

export function parseQuickEdit(text) {
  const trimmed = String(text ?? "").trim();
  if (trimmed === "") return null;

  const priceMatch = trimmed.match(
    /^\s*(?:السعر|سعر|price)\s*[:：=]?\s*(.+)$/i
  );
  if (priceMatch) {
    const price = parsePrice(priceMatch[1]);
    return price === null ? null : { price };
  }

  const nameMatch = trimmed.match(
    /^\s*(?:غير الاسم إلى|الاسم|اسم المنتج|name)\s*[:：=]?\s*(.+)$/i
  );
  if (nameMatch && nameMatch[1].trim() !== "") return { name: nameMatch[1].trim() };

  const categoryMatch = trimmed.match(
    /^\s*(?:القسم|التصنيف|category)\s*[:：=]?\s*(.+)$/i
  );
  if (categoryMatch && categoryMatch[1].trim() !== "")
    return { category: categoryMatch[1].trim() };

  const descMatch = trimmed.match(/^\s*(?:الوصف|description)\s*[:：=]?\s*(.+)$/is);
  if (descMatch && descMatch[1].trim() !== "")
    return { description: descMatch[1].trim() };

  // رقم فقط → سعر
  const numericOnly = toLatinDigits(trimmed).match(
    /^\s*\d+(?:[.,٫]\d+)?\s*(?:ج\.?م|جنيه|le|egp)?\s*$/i
  );
  if (numericOnly) {
    const price = parsePrice(trimmed);
    return price === null ? null : { price };
  }
  return null; // يحتاج AI
}

// ---------------------------------------------------------------------------
// 6) رسالة الـPreview (نص موحّد يستخدمه أكثر من node)
// ---------------------------------------------------------------------------

export function buildPreviewMessage(product, extra = {}) {
  const price =
    product.price === null || product.price === undefined
      ? "للاستفسار والكميات"
      : `${product.price} جنيه`;
  const lines = [
    "🧸 منتج جديد",
    "",
    `الاسم:\n${product.name ?? "—"}`,
    "",
    `السعر:\n${price}`,
    "",
    `القسم:\n${product.category || "—"}`,
    "",
    `الوصف:\n${product.description || "—"}`,
    "",
    `الثقة:\n${Number(product.confidence ?? 0).toFixed(2)}`,
    "",
    `الكود: ${extra.id ?? "—"}`,
    "",
    "الحالة:\n🟡 يحتاج مراجعة",
  ];
  if (extra.duplicateWarning) {
    lines.push("", "⚠️ يبدو أن هذا المنتج موجود بالفعل.");
    if (Array.isArray(extra.duplicateMatches) && extra.duplicateMatches.length) {
      lines.push(
        ...extra.duplicateMatches
          .slice(0, 3)
          .map(m => `↳ ${m.id ?? "?"} — ${m.name ?? ""}`)
      );
    }
  }
  if (extra.lowConfidence) lines.push("", "🔎 الثقة منخفضة — راجع البيانات قبل النشر.");
  if (Array.isArray(extra.problems) && extra.problems.length)
    lines.push("", `ملاحظات: ${extra.problems.join("، ")}`);
  return lines.join("\n");
}
