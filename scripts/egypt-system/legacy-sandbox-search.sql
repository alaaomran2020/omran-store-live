-- Only run on a separately restored SQL Server review database.
-- Deliberately aborts on any database other than ESStores_20260924_REVIEW.
SET NOCOUNT ON;
IF DB_NAME() <> N'ESStores_20260924_REVIEW'
    THROW 50001, 'Refusing to query non-review database', 1;
SELECT DISTINCT i.Item_Id, ip.Item_Package_Id, i.Item_Name_AR
FROM ESStoreDbo.Items i
INNER JOIN ESStoreDbo.Item_Packages ip ON ip.Item_Id=i.Item_Id
WHERE i.Item_Name_AR LIKE N'%مطبخ%'
   OR i.Item_Name_AR LIKE N'%عرو%'
   OR i.Item_Name_AR LIKE N'%حصال%'
   OR i.Item_Name_AR LIKE N'%سيار%'
   OR i.Item_Name_AR LIKE N'%ريموت%'
   OR i.Item_Name_AR LIKE N'%طائر%'
   OR i.Item_Name_AR LIKE N'%طائره%'
   OR i.Item_Name_AR LIKE N'%كرات%'
   OR i.Item_Name_AR LIKE N'%مائي%'
ORDER BY i.Item_Name_AR, i.Item_Id, ip.Item_Package_Id;
-- Save results to a PRIVATE UTF-8 CSV. Name-only matches are NEVER verified.
