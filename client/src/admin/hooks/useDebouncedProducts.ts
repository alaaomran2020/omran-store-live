import { useEffect, useMemo, useState } from "react";
import type { AdminProduct } from "@/lib/admin/adminCatalog";

/** بحث مخمد مشترك لصفحات الإدارة — يرسم فقط المطابق ويتحمل 3000+ منتج. */
export function useDebouncedProducts(products: readonly AdminProduct[], delayMs = 250) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), delayMs);
    return () => clearTimeout(timer);
  }, [search, delayMs]);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return products.filter(product => {
      if (query) {
        const haystack = [product.id, product.sku ?? "", product.name, product.category, product.description]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [products, debouncedSearch]);

  return { search, setSearch, filter, setFilter, filtered, debouncedSearch };
}
