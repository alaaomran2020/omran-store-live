# Omran Store — Make + Telegram Product Automation

هذه الطبقة تشغّل إدخال المنتجات والمخزون بدون VPS وبدون Backend خاص بالمتجر.

## الهدف

الموظف يرسل فقط:

- صورة المنتج
- سعر الشراء
- سعر البيع
- الكمية
- الباركود إن وُجد

ثم تتولى Make بقية العملية: التعرف على المنتج، إنشاء/تحديث SKU، فحص التكرار، تجهيز الوصف، تحديث Google Sheets، حفظ الصورة في Google Drive، وحماية النشر عبر Publication Gate.

## مصدر الحقيقة

Google Sheets يبقى مصدر الحقيقة للمتجر. المتجر الحالي يقرأ CSV المنشور للويب، لذلك لا نضيف API جديد ولا VPS ولا قاعدة بيانات خادمية.

قاعدة الظهور العامة ثابتة:

```text
active = true
AND workflow_status = PUBLISHED
AND qa_status = PASS
```

أي منتج غير مكتمل يبقى `REVIEW / NEEDS_REVIEW` ولا يظهر للعملاء.

## سيناريو الإدخال

```text
Telegram Bot / Private Staff Group
  -> Receive photo + purchase price + sale price + qty + barcode
  -> Parse & validate facts
  -> Search barcode / SKU in Google Sheets
  -> Existing product? update stock/price history
  -> New product? AI enrichment + SKU generation
  -> Save source image to Google Drive
  -> Upsert Products row
  -> Upsert Inventory row
  -> Write Price_History and Audit_Log
  -> Send confirmation to Telegram
```

## صيغة رسالة الموظف

أبسط صيغة معتمدة:

```text
شراء 85
بيع 120
كمية 6
باركود 6221234567890
```

يمكن حذف سطر الباركود إذا لم يوجد. يمنع طلب اسم المنتج أو الوصف أو التصنيف من الموظف.

## قواعد عدم الاختلاق

الـAI يمكنه اقتراح:

- name
- category
- description
- tags

ولا يجوز له اختراع:

- purchase_price
- sale_price
- quantity
- barcode
- brand
- age
- technical specs غير الظاهرة/غير الموثقة

## Sheets

### Products

يحافظ على أعمدة المتجر الحالية:

```text
id,name,price,category,description,image,active,sort_order,product_prompt,workflow_status,qa_status,source_drive_id,processed_image,review_reason
```

ويُستخدم `product_prompt` لحفظ metadata التشغيلية التي لا تعرض للعميل، مثل:

```text
sku=OT-00127;barcode=6221234567890;purchase_price=85;qty=6;source=telegram
```

### Inventory

```text
product_id,sku,barcode,available_qty,low_stock_threshold,reorder_qty,inventory_status,last_updated
```

### Price_History

```text
product_id,sku,barcode,purchase_price,sale_price,qty_received,recorded_at,source,operator
```

### Audit_Log

```text
event_id,event_type,product_id,sku,barcode,actor,source,details,status,created_at
```

## Barcode logic

1. ابحث عن الباركود أولًا.
2. إذا وُجد: تعامل معه كصنف موجود ولا تنشئ سجلًا جديدًا تلقائيًا.
3. إذا لم يوجد: ابحث باسم/SKU/تشابه الصورة كحاجز ثانوي.
4. إذا لم يوجد تطابق: أنشئ SKU داخليًا مثل `OT-00128`.
5. الباركود ليس إجباريًا، لكن إذا أُرسل يصبح المفتاح الأقوى للتطابق.

## Stock rules

القيم الافتراضية:

```text
0      -> OUT_OF_STOCK
1..3   -> LOW_STOCK
4+     -> IN_STOCK
```

يمكن تغيير `low_stock_threshold` لكل صنف داخل Inventory.

## Publication flow

المنتج الجديد يبدأ دائمًا:

```text
active=false
workflow_status=REVIEW
qa_status=NEEDS_REVIEW
```

بعد اكتمال الصورة + السعر + الهوية + المراجعة:

```text
active=true
workflow_status=PUBLISHED
qa_status=PASS
```

وبذلك يلتقطه المتجر الحالي من Google Sheets بدون أي Deploy لكل منتج.

## القنوات

- Staff intake: Telegram Bot أو جروب خاص.
- Management alerts: قناة Telegram منفصلة.
- Google Drive: حفظ الصور الأصلية والمعتمدة.
- Google Sheets: Products + Inventory + Price_History + Audit_Log.

## مبدأ التصميم

لا أسرار أو Tokens داخل الريبو. كل Connections تُحفظ داخل Make فقط.