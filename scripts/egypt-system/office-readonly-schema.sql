-- Read-only metadata discovery to confirm exact Egypt System column names.
SET NOCOUNT ON;
SELECT s.name AS schema_name,t.name AS table_name,c.column_id,c.name AS column_name,ty.name AS sql_data_type
FROM sys.schemas s
JOIN sys.tables t ON t.schema_id=s.schema_id
JOIN sys.columns c ON c.object_id=t.object_id
JOIN sys.types ty ON ty.user_type_id=c.user_type_id
WHERE s.name=N'ESStoreDbo'
  AND t.name IN(N'Items',N'Item_Packages',N'Item_Barcodes',N'Stores')
ORDER BY t.name,c.column_id;
