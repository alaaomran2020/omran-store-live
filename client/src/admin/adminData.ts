import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/productsClient";

export const adminCatalogQueryKey = ["admin", "catalog"] as const;

export function useAdminCatalog() {
  return useQuery({
    queryKey: adminCatalogQueryKey,
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
