import type { Product } from "@/lib/productsClient";

export function ProductSpecifications({ product }: { product: Product }) {
  const s = product.specifications;
  const productDimensions = [s.productLengthCm, s.productWidthCm, s.productHeightCm].every(value => value !== null) ? `${s.productLengthCm} × ${s.productWidthCm} × ${s.productHeightCm} سم` : null;
  const packageDimensions = [s.packageLengthCm, s.packageWidthCm, s.packageHeightCm].every(value => value !== null) ? `${s.packageLengthCm} × ${s.packageWidthCm} × ${s.packageHeightCm} سم` : null;
  const rows = [
    ["أبعاد المنتج", productDimensions], ["أبعاد العبوة", packageDimensions], ["الوزن", s.weightKg === null ? null : `${s.weightKg} كجم`],
    ["الخامة", s.material], ["عدد القطع", s.piecesCount === null ? null : String(s.piecesCount)], ["مصدر الطاقة", s.powerSource],
    ["التركيب", s.assemblyRequired === null ? null : s.assemblyRequired ? "يتطلب تركيب" : "لا يتطلب تركيب"],
  ].filter((row): row is string[] => Boolean(row[1]));
  if (!rows.length && !s.boxContents && !s.playInstructions) return null;
  return <section aria-labelledby="product-specifications"><h3 id="product-specifications" className="text-sm font-extrabold text-brand-navy">المواصفات المعتمدة</h3>{rows.length > 0 && <dl className="mt-2 grid grid-cols-2 gap-2">{rows.map(([label, value]) => <div key={label} className="rounded-xl border border-brand-border bg-white p-3"><dt className="text-[11px] font-bold text-brand-muted">{label}</dt><dd className="mt-1 text-xs font-extrabold text-brand-navy">{value}</dd></div>)}</dl>}{s.boxContents && <div className="mt-3"><h4 className="text-sm font-extrabold text-brand-navy">محتويات العبوة</h4><p className="mt-1 text-sm leading-7 text-brand-muted">{s.boxContents}</p></div>}{s.playInstructions && <div className="mt-3"><h4 className="text-sm font-extrabold text-brand-navy">طريقة اللعب أو الاستخدام</h4><p className="mt-1 text-sm leading-7 text-brand-muted">{s.playInstructions}</p></div>}</section>;
}
