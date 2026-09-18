-- Omran Trading Company - Egypt System inventory bridge
-- Fail-closed: no Egypt System quantity affects stock until its lineage is VERIFIED.
-- Proven lineage: Trans_Details.Qty -> VwTransactions/RptTransactions.Qty -> RptItemCard Qty.
-- CalcQty and Content remain separate columns and are NOT part of the stock Qty expression.
BEGIN;
CREATE TABLE egypt_system_transaction_type_map (
  transaction_type integer PRIMARY KEY,
  direction_rule text NOT NULL CHECK (direction_rule IN ('IN','OUT','SIGNED')),
  evidence_note text NOT NULL
);
INSERT INTO egypt_system_transaction_type_map (transaction_type,direction_rule,evidence_note) VALUES
(1,'IN','RptItemCard'),(3,'IN','RptItemCard'),(23,'IN','RptItemCard'),(31,'IN','RptItemCard'),
(2,'OUT','RptItemCard'),(4,'OUT','RptItemCard'),(22,'OUT','RptItemCard'),(32,'OUT','RptItemCard'),
(5,'SIGNED','RptItemCard Qty sign'),(6,'SIGNED','RptItemCard Qty sign'),(101,'SIGNED','RptItemCard Qty sign')
ON CONFLICT (transaction_type) DO NOTHING;
CREATE TABLE egypt_system_inventory_stage (
  source_row_id text PRIMARY KEY,
  source_transaction_id text,
  source_detail_id text,
  transaction_date timestamptz NOT NULL,
  transaction_type integer NOT NULL REFERENCES egypt_system_transaction_type_map(transaction_type),
  store_id text NOT NULL,
  source_item_id text NOT NULL,
  source_item_package_id text NOT NULL,
  source_color_id text,
  product_id text REFERENCES products(product_id) ON DELETE SET NULL,
  sku text,
  qty numeric(18,4),
  qty_source text NOT NULL DEFAULT 'UNKNOWN' CHECK (qty_source IN ('RPTITEMCARD_QTY','RPTTRANSACTIONS_QTY','VWTRANSACTIONS_QTY','TRANS_DETAILS_QTY','TRANS_DETAILS_CALCQTY','TRANS_DETAILS_CONTENT','UNKNOWN')),
  lineage_status text NOT NULL DEFAULT 'UNVERIFIED' CHECK (lineage_status IN ('UNVERIFIED','VERIFIED','REJECTED')),
  lineage_note text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  CHECK (lineage_status <> 'VERIFIED' OR (
    qty IS NOT NULL AND qty <> 0
    AND qty_source = 'TRANS_DETAILS_QTY'
    AND source_transaction_id IS NOT NULL
    AND source_detail_id IS NOT NULL
    AND source_item_package_id IS NOT NULL
  ))
);
CREATE VIEW egypt_system_verified_movements AS
SELECT s.*, CASE WHEN m.direction_rule='IN' THEN abs(s.qty) WHEN m.direction_rule='OUT' THEN -abs(s.qty) ELSE s.qty END AS quantity_delta
FROM egypt_system_inventory_stage s
JOIN egypt_system_transaction_type_map m USING (transaction_type)
WHERE s.lineage_status='VERIFIED' AND s.product_id IS NOT NULL AND s.qty IS NOT NULL AND s.qty<>0;
CREATE VIEW egypt_system_inventory_balance AS
SELECT product_id,sku,store_id,sum(quantity_delta) AS on_hand_qty,max(transaction_date) AS source_updated_at
FROM egypt_system_verified_movements GROUP BY product_id,sku,store_id;
COMMIT;