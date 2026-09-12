import type { ProductCatalog } from "@/lib/productCatalog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Props = {
  catalog: ProductCatalog;
  category?: string;
  productName?: string;
  className?: string;
};

export function CatalogBreadcrumbs({ catalog, category, productName, className = "" }: Props) {
  const catalogPath = catalog === "popup" ? "/popup" : "/products";
  const catalogLabel = catalog === "popup" ? "POP UP" : "لعب الأطفال";
  const categoryPath = category
    ? `${catalogPath}?category=${encodeURIComponent(category)}`
    : catalogPath;

  return (
    <Breadcrumb aria-label="مسار الصفحة" className={className}>
      <BreadcrumbList className="flex-nowrap overflow-hidden text-xs font-bold text-brand-muted sm:text-sm">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink href="/" className="hover:text-brand-blue">الرئيسية</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="shrink-0" />
        <BreadcrumbItem className="shrink-0">
          {category || productName ? (
            <BreadcrumbLink href={catalogPath} className="hover:text-brand-blue">{catalogLabel}</BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="font-extrabold text-brand-navy">{catalogLabel}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {category && (
          <>
            <BreadcrumbSeparator className="shrink-0" />
            <BreadcrumbItem className={productName ? "shrink-0" : "min-w-0"}>
              {productName ? (
                <BreadcrumbLink href={categoryPath} className="hover:text-brand-blue">{category}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate font-extrabold text-brand-navy">{category}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
        {productName && (
          <>
            <BreadcrumbSeparator className="shrink-0" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate font-extrabold text-brand-navy">{productName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
