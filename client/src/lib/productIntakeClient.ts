const PRODUCT_INTAKE_ENDPOINT = "/admin/api/product-intake";
export type ProductIntakeSubmission = {
  productNameAr: string;
  sku: string;
  barcode: string;
  category: string;
  subcategory: string;
  brand: string;
  supplier: string;
  purchasePriceEgp: string;
  retailPriceEgp: string;
  wholesalePriceEgp: string;
  source: string;
  sourceReference: string;
  intakeNotes: string;
  photo: File;
};

export type ProductIntakeReceipt = {
  ok: boolean;
  intake_id: string;
  workflow_status: "NEEDS_REVIEW";
  qa_status: "NEEDS_REVIEW";
  drive_file_id?: string;
};

function append(form: FormData, key: string, value: string) {
  form.append(key, value.trim());
}

export async function submitProductIntake(input: ProductIntakeSubmission): Promise<ProductIntakeReceipt> {
  const intakeId = `INT-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const receivedAt = new Date().toISOString();
  const form = new FormData();

  append(form, "intake_id", intakeId);
  append(form, "received_at", receivedAt);
  append(form, "source", input.source);
  append(form, "source_reference", input.sourceReference);
  append(form, "barcode", input.barcode);
  append(form, "sku", input.sku);
  append(form, "product_name_ar", input.productNameAr);
  append(form, "category", input.category);
  append(form, "subcategory", input.subcategory);
  append(form, "brand", input.brand);
  append(form, "supplier", input.supplier);
  append(form, "purchase_price_egp", input.purchasePriceEgp);
  append(form, "retail_price_egp", input.retailPriceEgp);
  append(form, "wholesale_price_egp", input.wholesalePriceEgp);
  append(form, "intake_notes", input.intakeNotes);
  form.append("photo", input.photo, input.photo.name || `${intakeId}.jpg`);

  const response = await fetch(PRODUCT_INTAKE_ENDPOINT, {
    credentials: "include",
    method: "POST",
    body: form,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("الحساب غير مصرح له بإضافة منتجات. تواصل مع المالك.");
    if (response.status === 429) throw new Error("طلبات كثيرة. جرب بعد دقيقة.");
    if (response.status === 503) throw new Error("بوابة إدخال المنتجات غير مفعّلة بعد.");
    if (response.status === 409 || response.status === 502) throw new Error("حالة الإدخال غير مؤكدة؛ راجع سجل المراجعة قبل إعادة الإرسال.");
    throw new Error(`تعذر إرسال المنتج (${response.status})`);
  }

  const receipt = (await response.json()) as Partial<ProductIntakeReceipt>;
  if (!receipt.ok || receipt.intake_id !== intakeId) {
    throw new Error("تم استلام رد غير صالح من بوابة Product Intake");
  }

  return {
    ok: true,
    intake_id: intakeId,
    workflow_status: "NEEDS_REVIEW",
    qa_status: "NEEDS_REVIEW",
    drive_file_id: receipt.drive_file_id,
  };
}
