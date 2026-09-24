export type EgyptMatchStatus = "CANDIDATE" | "VERIFIED" | "REJECTED";

export type EgyptInventoryRow = {
  Item_Package_Id: string | number;
  Item_Id: string | number;
  Item_Name_AR: string;
  Package_Id: string | number | null;
  Store_Id: string | number;
  Store_Name_AR: string;
  OnHandQty: number;
};

export type EgyptProductMapping = {
  product_id: string;
  egypt_item_id: string;
  egypt_item_name_ar: string;
  egypt_item_package_id: string | null;
  store_id: string;
  store_name_ar: string;
  match_status: EgyptMatchStatus;
  match_method: string;
  note: string;
};

export type EgyptInventorySnapshot = {
  version: number;
  source_system: "EGYPT_SYSTEM";
  database: "ESStores";
  schema: "ESStoreDbo";
  backup_file: string;
  stock_basis: string;
  generated_at: string | null;
  status: "READY" | "AWAITING_SQL_EXPORT" | "ERROR";
  rows: EgyptInventoryRow[];
  mappings: EgyptProductMapping[];
};

export type ReconciledEgyptInventory = {
  mapping: EgyptProductMapping;
  row: EgyptInventoryRow | null;
  onHandQty: number | null;
  isVerified: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRow(value: unknown): EgyptInventoryRow | null {
  if (!isRecord(value)) return null;
  const qty = Number(value.OnHandQty);
  if (
    (typeof value.Item_Package_Id !== "string" && typeof value.Item_Package_Id !== "number") ||
    (typeof value.Item_Id !== "string" && typeof value.Item_Id !== "number") ||
    typeof value.Item_Name_AR !== "string" ||
    (typeof value.Store_Id !== "string" && typeof value.Store_Id !== "number") ||
    typeof value.Store_Name_AR !== "string" ||
    !Number.isFinite(qty)
  ) return null;
  return {
    Item_Package_Id: value.Item_Package_Id,
    Item_Id: value.Item_Id,
    Item_Name_AR: value.Item_Name_AR,
    Package_Id: typeof value.Package_Id === "string" || typeof value.Package_Id === "number" ? value.Package_Id : null,
    Store_Id: value.Store_Id,
    Store_Name_AR: value.Store_Name_AR,
    OnHandQty: qty,
  };
}

export async function fetchEgyptSystemInventory(): Promise<EgyptInventorySnapshot> {
  const response = await fetch("/data/egypt-system-inventory.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`egypt_inventory_http_${response.status}`);
  const body: unknown = await response.json();
  if (!isRecord(body) || body.source_system !== "EGYPT_SYSTEM" || !Array.isArray(body.rows) || !Array.isArray(body.mappings)) {
    throw new Error("egypt_inventory_invalid_contract");
  }
  return {
    version: Number(body.version ?? 1),
    source_system: "EGYPT_SYSTEM",
    database: String(body.database ?? "ESStores"),
    schema: String(body.schema ?? "ESStoreDbo"),
    backup_file: String(body.backup_file ?? ""),
    stock_basis: String(body.stock_basis ?? ""),
    generated_at: typeof body.generated_at === "string" ? body.generated_at : null,
    status: body.status === "READY" || body.status === "ERROR" ? body.status : "AWAITING_SQL_EXPORT",
    rows: body.rows.map(normalizeRow).filter((row): row is EgyptInventoryRow => row !== null),
    mappings: body.mappings.filter(isRecord).flatMap(item => {
      const status = item.match_status;
      if (
        typeof item.product_id !== "string" ||
        typeof item.egypt_item_id !== "string" ||
        typeof item.egypt_item_name_ar !== "string" ||
        typeof item.store_id !== "string" ||
        typeof item.store_name_ar !== "string" ||
        (status !== "CANDIDATE" && status !== "VERIFIED" && status !== "REJECTED")
      ) return [];
      return [{
        product_id: item.product_id,
        egypt_item_id: item.egypt_item_id,
        egypt_item_name_ar: item.egypt_item_name_ar,
        egypt_item_package_id: typeof item.egypt_item_package_id === "string" ? item.egypt_item_package_id : null,
        store_id: item.store_id,
        store_name_ar: item.store_name_ar,
        match_status: status,
        match_method: String(item.match_method ?? ""),
        note: String(item.note ?? ""),
      }];
    }),
  };
}

export function reconcileEgyptProduct(
  snapshot: EgyptInventorySnapshot | undefined,
  productId: string
): ReconciledEgyptInventory | null {
  if (!snapshot) return null;
  const mapping = snapshot.mappings.find(item => item.product_id === productId);
  if (!mapping) return null;

  // Fail closed: numeric inventory is exposed only after an explicit VERIFIED
  // product/package/store mapping.
  if (mapping.match_status !== "VERIFIED" || !mapping.egypt_item_package_id) {
    return { mapping, row: null, onHandQty: null, isVerified: false };
  }

  const row = snapshot.rows.find(item =>
    String(item.Item_Package_Id) === mapping.egypt_item_package_id &&
    String(item.Store_Id) === mapping.store_id
  ) ?? null;

  return {
    mapping,
    row,
    onHandQty: row ? row.OnHandQty : null,
    isVerified: Boolean(row),
  };
}
