-- Run once against the database after importing the rets_property table.
-- The source table has a legacy zero-date default, so relax validation only
-- for this session while MySQL rebuilds it for the generated column/indexes.
SET @property_search_sql_mode = @@SESSION.sql_mode;
SET SESSION sql_mode = '';

ALTER TABLE rets_property
  ADD COLUMN L_City_Normalized VARCHAR(50)
    AS (LOWER(TRIM(L_City))) STORED;

CREATE INDEX idx_rets_property_city_normalized
  ON rets_property (L_City_Normalized);
CREATE INDEX idx_rets_property_zip
  ON rets_property (L_Zip);
CREATE INDEX idx_rets_property_price
  ON rets_property (L_SystemPrice);
CREATE INDEX idx_rets_property_beds
  ON rets_property (L_Keyword2);
CREATE INDEX idx_rets_property_baths
  ON rets_property (LM_Dec_3);
CREATE INDEX idx_rets_property_beds_price
  ON rets_property (L_Keyword2, L_SystemPrice);
CREATE INDEX idx_rets_property_zip_price
  ON rets_property (L_Zip, L_SystemPrice);

SET SESSION sql_mode = @property_search_sql_mode;
