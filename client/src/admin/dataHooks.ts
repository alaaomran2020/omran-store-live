/**
 * خطّافات بيانات لوحة الإدارة (TanStack Query) — نقطة قراءة واحدة لكل الصفحات.
 * كل قراءة تُخزَّن مؤقتًا وتُحدَّث يدويًا عبر زر التحديث، ولا تُختلق بيانات
 * عند فشل المصدر: حالة not_configured تُمرَّر للصفحة لتعرض حالة صادقة.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminCatalog, type AdminProduct } from "@/lib/admin/adminCatalog";
import {
  readAuditLog,
  readCustomers,
  readWhatsAppMetrics,
} from "@/lib/admin/adminGateway";
import {
  inventoryDistribution,
  productsByCategory,
  qaDistribution,
  summarizeCatalog,
  workflowDistribution,
} from "@shared/adminMetrics";
import { runCatalogQuality, type QualityRunResult } from "@shared/catalogQuality";

const STALE_MS = 5 * 60 * 1000;

export function useAdminCatalog() {
  const query = useQuery({
    queryKey: ["admin", "catalog-full"],
    queryFn: fetchAdminCatalog,
    staleTime: STALE_MS,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
  return {
    products: query.data?.products ?? [],
    source: query.data?.source ?? null,
    fetchedAt: query.data?.fetchedAt ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refresh: () => query.refetch(),
    isRefreshing: query.isFetching,
  };
}

type CatalogStats = {
  kpis: ReturnType<typeof summarizeCatalog>;
  workflow: ReturnType<typeof workflowDistribution>;
  qa: ReturnType<typeof qaDistribution>;
  inventory: ReturnType<typeof inventoryDistribution>;
  categoriesOmran: ReturnType<typeof productsByCategory>;
  categoriesPopup: ReturnType<typeof productsByCategory>;
};

export function useCatalogStats(products: AdminProduct[]): CatalogStats {
  return useMemo(
    () => ({
      kpis: summarizeCatalog(products),
      workflow: workflowDistribution(products),
      qa: qaDistribution(products),
      inventory: inventoryDistribution(products),
      categoriesOmran: productsByCategory(products, { brand: "OMRAN", limit: 10 }),
      categoriesPopup: productsByCategory(products, { brand: "POPUP", limit: 6 }),
    }),
    [products]
  );
}

export function useQuality(products: AdminProduct[]): QualityRunResult {
  return useMemo(() => {
    const rawWorkflow: Record<string, string | null> = {};
    for (const product of products) {
      rawWorkflow[product.id] = product.rawWorkflow;
    }
    return runCatalogQuality(products, { rawWorkflow });
  }, [products]);
}

export function useWhatsAppMetrics() {
  return useQuery({
    queryKey: ["admin", "whatsapp-metrics"],
    queryFn: readWhatsAppMetrics,
    staleTime: STALE_MS,
    retry: 1,
  });
}

export function useAuditLog() {
  return useQuery({
    queryKey: ["admin", "audit-log"],
    queryFn: readAuditLog,
    staleTime: STALE_MS,
    retry: 1,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["admin", "customers"],
    queryFn: readCustomers,
    staleTime: STALE_MS,
    retry: 1,
  });
}
