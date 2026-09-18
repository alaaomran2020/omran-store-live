-- READ-ONLY verification query. SQL Server 2000 compatible.
-- Target: first real canonical candidate POP-PDF-0316098ECE / سبورة بروجيكتور.
-- Expected report evidence: 2026-05-14, Qty=2, Price=310.
SET NOCOUNT ON;
SELECT TOP 20
  Header_Id,
  Transaction_No,
  Transaction_Date,
  Transaction_Type,
  Detail_Id,
  Item_Id,
  Item_Package_Id,
  Item_Name_AR,
  Store_Id,
  ToStore_Id,
  Color_Id,
  Qty,
  CalcQty,
  Content,
  Price,
  Item_Backage_Barcode
FROM ESStoreDbo.RptTransactions
WHERE Item_Name_AR LIKE N'%سبورة بروجيكتور%'
  AND Transaction_Date = '20260514'
  AND Qty = 2
  AND Price = 310
ORDER BY Header_Id, Detail_Id;