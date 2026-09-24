# Egypt System Inventory Reconciliation Contract v1

## Source of truth

The inspected source is the SQL Server backup `ESStores_20260924_15_41_37.bak`.

Verified SQL objects used by inventory reconciliation:

- `ESStoreDbo.Items`
- `ESStoreDbo.Item_Packages`
- `ESStoreDbo.Item_Barcodes`
- `ESStoreDbo.Item_Stock`
- `ESStoreDbo.Stores`
- `ESStoreDbo.Trans_Header` / `Trans_Details`
- `ESStoreDbo.Daily_Trans_Header` / `Daily_Trans_Details`
- `ESStoreDbo.Posted_Daily_Trans_Header` / `Posted_Daily_Trans_Details`
- `ESStoreDbo.VwTransStockDetails`

## Authoritative stock equation

Egypt System's own report logic calculates opening stock with:

`SUM(Qty) FROM ESStoreDbo.VwTransStockDetails`

filtered by `Item_Package_Id`, date and `Store_Id`.

For current on-hand stock, Omran therefore reuses the same normalized ledger and does **not**
re-implement transaction signs in the storefront:

```sql
SELECT Item_Package_Id, Store_Id, ISNULL(SUM(Qty), 0) AS OnHandQty
FROM ESStoreDbo.VwTransStockDetails
GROUP BY Item_Package_Id, Store_Id;
```

The backup also exposes the underlying report sign rules: transaction types
`1,3,10,23,102,104,31` add stock; `2,4,9,22,103,105,32` remove stock;
inventory adjustment types `5,6,101` use signed Qty; POS type 2 adds and POS type 1 removes;
store transfers use types 7/8 by direction. These rules are evidence for the view, not a second
independent implementation.

## Runtime boundary

The storefront and `/admin/inventory` never connect to SQL Server.

Flow:

```
Egypt System SQL Server (work PC)
        -> offline export query
        -> versioned JSON snapshot
        -> omran-store-live /admin/inventory
```

No SQL credentials, connection strings, API keys or server ports are shipped to the browser.

## Reconciliation key

A numeric quantity may be displayed only when all of these are fixed:

`product_id <-> Item_Id + Item_Package_Id + Store_Id`

Preferred evidence order:

1. exact barcode;
2. exact trusted SKU/reference;
3. explicit manual confirmation of package;
4. name-only matches remain `CANDIDATE`.

`CANDIDATE` and `REJECTED` mappings never expose a numeric quantity.

## First real candidate

Backup evidence contains Egypt System item `Item_Id=370` named
`مطبخ × علبه بني 46 ق`, while the live catalog contains
`OMR-IG-KIT-46` / `مطبخ ألعاب للأطفال — 46 قطعة`.

This is recorded as `CANDIDATE`, not `VERIFIED`, because the raw backup inspection did not
reliably recover its `Item_Package_Id` or barcode. The contract intentionally fails closed.

## Snapshot contract

`public/data/egypt-system-inventory.json` is the only runtime source consumed by the admin UI.
A valid production export sets `status=READY`, `generated_at`, and fills `rows` from
`scripts/egypt-system/export-inventory.sql`.

The file may contain zero rows; that state means "not exported yet", never "zero stock".
