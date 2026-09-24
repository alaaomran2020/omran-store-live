-- Egypt System -> Omran inventory snapshot source query
-- Source verified from ESStores_20260924_15_41_37.bak.
-- IMPORTANT: this query reuses Egypt System's own VwTransStockDetails ledger.
-- It does not connect the storefront/admin UI to SQL Server.

SET NOCOUNT ON;

WITH Stock AS (
    SELECT
        Item_Package_Id,
        Store_Id,
        CAST(ISNULL(SUM(Qty), 0) AS decimal(18,3)) AS OnHandQty
    FROM ESStoreDbo.VwTransStockDetails
    GROUP BY Item_Package_Id, Store_Id
)
SELECT
    st.Item_Package_Id,
    ip.Item_Id,
    i.Item_Name_AR,
    ip.Package_Id,
    st.Store_Id,
    s.Store_Name_AR,
    st.OnHandQty
FROM Stock st
INNER JOIN ESStoreDbo.Item_Packages ip
    ON ip.Item_Package_Id = st.Item_Package_Id
INNER JOIN ESStoreDbo.Items i
    ON i.Item_Id = ip.Item_Id
INNER JOIN ESStoreDbo.Stores s
    ON s.Store_Id = st.Store_Id
ORDER BY st.Store_Id, st.Item_Package_Id;
