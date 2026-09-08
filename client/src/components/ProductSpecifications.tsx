import type { Product } from "@/lib/productsClient";

export function ProductSpecifications({ product }: { product: Product }) {
  const s = product.specifications;
  const productDimensions = [s.productLengthCm, s.productWidthCm, s.productHeightCm].every(value => value !== null)
    ? `${s.productLengthCm} × ${s.productWidthCm} × ${s.productHeightCm} سم`
    : null;
  const packageDimensions = [s.packageLengthCm, s.packageWidthCm, s.packageHeightCm].every(value => value !== null)
    ? `${s.packageLengthCm} × ${s.packageWidthCm} × ${s.packageHeightCm} سم`
    : null;
  const rows = [
    ["أبعاد المنتج", productDimensions],
    ["أبعاد العبوة", packageDimensions],
    ["الوزن", s.weightKg === null ? null : `${s.weightKg} كجم`],
    ["الخامة", s.material],
    ["عدد القطع", s.piecesCount === null ? null : String(s.piecesCount)],
    ["مصدر الطاقة", s.powerSource],
    ["التركيب", s.assemblyRequired === null ? null : s.assemblyRequired ? "يتطلب تركيب" : "لا يتطلب تركيب"],
  ].filter((row): row is string[] => Boolean(row[1]));

  const verifiedFieldCount = rows.length + (s.boxContentsItems.length > 0 || s.boxContents ? 1 : 0) + (s.playInstructions ? 1 : 0);
  const totalTrackedFields = 9;
  const completeness = Math.round((verifiedFieldCount / totalTrackedFields) * 100);

  if (!rows.length && !s.boxContents && !s.playInstructions) return null;

  return (
    <section aria-labelledby="product-specifications" className="rounded-2xl border border-brand-border bg-brand-cream/45 p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="product-specifications" className="text-sm font-extrabold text-brand-navy">المواصفات المعتمدة</h3>
          <p className="mt-1 text-[11px] font-bold leading-5 text-brand-muted">يظهر فقط ما هو موثق في بيانات المنتج.</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-extrabold text-brand-blue ring-1 ring-brand-border" aria-label={`اكتمال المواصفات ${completeness}%`}>
          {completeness}% موثق
        </span>
      </div>

      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-brand-border bg-white p-3">
              <dt className="text-[11px] font-bold text-brand-muted">{label}</dt>
              <dd className="mt-1 text-xs font-extrabold text-brand-navy">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(s.boxContentsItems.length > 0 || s.boxContents) && (
        <div className="mt-3 rounded-xl border border-brand-border bg-white p-3">
          <h4 className="text-sm font-extrabold text-brand-navy">محتويات العبوة</h4>
          {s.boxContentsItems.length > 1 ? (
            <ul className="mt-2 grid gap-1.5 text-sm leading-6 text-brand-muted">
              {s.boxContentsItems.map(item => <li key={item}>• {item}</li>)}
            </ul>
          ) : (
            <p className="mt-1 text-sm leading-7 text-brand-muted">{s.boxContentsItems[0] ?? s.boxContents}</p>
          )}
        </div>
      )}

      {s.playInstructions && (
        <div className="mt-3 rounded-xl border border-brand-border bg-white p-3">
          <h4 className="text-sm font-extrabold text-brand-navy">طريقة اللعب أو الاستخدام</h4>
          <p className="mt-1 text-sm leading-7 text-brand-muted">{s.playInstructions}</p>
        </div>
      )}
    </section>
  );
}
