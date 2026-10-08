-- Run once against the database after importing the rets_property table.
ALTER TABLE rets_property
  ADD COLUMN L_City_Normalized VARCHAR(50)
    AS (LOWER(TRIM(L_City))) PERSISTENT;

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
