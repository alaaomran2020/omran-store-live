# Product Engine — Publication Gate (Fail-Closed)

التاريخ: 2026-09-03 · Branch: `arena/01a06540-omran-store-live` (PR من `main`)

---

## ROOT CAUSE

1. **حقول النشر لم تكن أول-فئة**: `shared/products.ts` قرأ `active` و`product_prompt`
   فقط. `workflow_status` كان موجودًا في الشيت لكن المحلل يتجاهله —
   كانت حالة النشر تُشتق ضمنيًا من `active` (الفارغ = معروض).
2. **لا بوابة نشر نهائية**: `applyOverridesToProducts` كانت تسمح لـ`active=true`
   من لوحة الإدارة بإظهار أي منتج — بما فيه NEEDS_REVIEW — في الـPublic API.
3. **البيانات القديمة تُعرض افتراضيًا**: أي صف بحقول ناقصة (بلا صورة/QA/source)
   كان يمر للزوار طالما `active` غير FALSE.
4. **الـpipeline يكتب `workflow_status` فقط** (REVIEW/PUBLISHED/REJECTED) بلا
   `qa_status`، فلا يوجد أثر لمراجعة الجودة على مستوى الشيت.

## SCHEMA CHANGES (backward-compatible)

- `Product` أصبح يحمل أول-فئة:
  - `workflowStatus: "PUBLISHED" | "REVIEW" | "NEEDS_REVIEW" | "REJECTED" | "DRAFT" | ""`
  - `qaStatus: "PASS" | "NEEDS_REVIEW" | "REVIEW" | "PENDING" | "FAILED" | ""`
  - `sourceDriveId: string | null`
  - `processedImage: string | null`
  - `reviewReason: string`
- `PRODUCT_COLUMNS` وسّعت (9 → 14 عمودًا) مع مرادفات عربية للرأس
  (`حالة_النشر`, `حالة_المراجعة`, `معرف_المصدر`, `سبب_المراجعة`، …).
- أعمدة الـpipeline والـupsert أصبحت متزامنة:
  `automation/n8n/omran-toys-product-pipeline*.json`,
  `automation/n8n/lib/pipeline.e2e.test.mjs`, `scripts/upsert-sheet.mjs`
  (ranges `A:L` → `A:P`).
- طبقة compatibility محافظة: `parseLegacyPromptMetadata` تقرأ `source_drive_id=`,
  `qa=`, `processed=` من `product_prompt` **فقط** عندما يكون العمود الأول-فئة فارغًا،
  ولا تُشتق `workflow_status` من البرومبت إطلاقًا.

## PUBLICATION POLICY

```
PUBLIC PRODUCT = active === true
                 AND workflowStatus === "PUBLISHED"
                 AND qaStatus === "PASS"
```

- **Fail-Closed**: غياب أي حالة = "" = NOT PUBLIC. `active=true` وحدها لا تكفي.
- بوابتان:
  1. `parseProductsCsv` (وضع public الافتراضي) — بوابة عند القراءة.
  2. `applyPublicationGate` بعد `applyOverridesToProducts` في `worker/index.ts`
     — **Final Publication Guard** قبل أي Public response. Overrides لا تملك
     حقول نشر، ولا يمكنها تجاوزها.
- Admin/diagnostics يحافظان على القراءة الكاملة:
  `{ includeInactive: true }` / `{ includeNonPublished: true }`
  (وضع تشخيصي لا يمر بالبوابة) — بلا فقد للبيانات غير المؤكدة.

## TEST RESULTS (محلياً، Node 22 + pnpm 10.4.1)

| Gate | Result |
|---|---|
| `pnpm check` (tsc root + worker) | ✅ PASS |
| `pnpm test` (vitest) | ✅ 19 files / 183 tests |
| `pnpm lint` (oxlint) | ✅ 0 errors (24 warnings pre-existing) |
| `pnpm build` (vite + esbuild) | ✅ PASS |

Regression suite الجديد `server/products.publication.test.ts` (19 اختبارًا) يغطي:
1. active+PASS+PUBLISHED → INCLUDED
2. active=false → EXCLUDED (ويبقى في التشخيص)
3. NEEDS_REVIEW → EXCLUDED
4. REVIEW → EXCLUDED
5. missing QA → EXCLUDED
6. missing workflow → EXCLUDED
7. malformed rows → الكتالوج لا ينكسر
8. duplicate IDs → لا تسريب ولا فقد (تفريغ حتمي مستقر)
9. blank price → `price: null`
10. Arabic data → preserved
11. CSV quoted/newlines → preserved
12. Overrides → لا تتجاوز البوابة

بالإضافة: `worker/edge.publication.test.ts` يثبت البوابة على الحافة
(`x-publication-gate: active+published+pass`).

## REGRESSION RISKS

- الشيت الحالي بلا أعمدة `qa_status`/`workflow_status` في معظم الصفوف
  → بعد هذا التغيير، لن يظهر أي منتج حتى تُحدَّث الشيت
  (`automation/db-publication-plan-2026-09-03.csv` يحدد الصفوف المستهدفة:
  3 PUBLISHED+PASS، 2 NEEDS_REVIEW). هذا مقصود (Fail-Closed) ويتطلب كتابة الشيت.
- `applyOverridesToProducts` تبقى كما هي للوحة (دمج فقط) — الإخفاء/الدمج لم يتغير.
- نصوص الاختبارات ذات الـCSV القصير (9 أعمدة) كانت ستُفلتر فورًا؛ تم تحديثها
  بحقول النشر المعتمدة بلا تغيير نيتها.

## ROLLBACK PLAN

1. `git revert <merge-commit>` على `main` ثم merge (أو مباشرة):
   - يعيد `shared/products.ts` و`worker/index.ts` للسلوك السابق
     (active فقط) — لا حاجة لمس Cloudflare، فالعمل كله في كود الـWorker.
2. إعادة نشر تلقائية عبر `Deploy to Cloudflare` بعد merge.
3. الشيت: ملف `automation/db-publication-plan-2026-09-03.csv` غير مُطبَّق —
   لا يلزم تراجع للشيت (لم يُكتب شيء بعد).

## RELATION TO PR #14

هذا PR لا يمس الـHomepage إطلاقًا، ولا يعتمد على
`feat/professional-storefront` (#14). قرار #14 يُؤجَّل حتى اكتمال بقية البوابات
(راجع التقرير النهائي).
