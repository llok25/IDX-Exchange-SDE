# IDX-Exchange-SDE

## Property search API

The backend serves `GET /api/properties` with optional `city`, `zipcode`,
`minPrice`, `maxPrice`, `beds`, `baths`, `limit`, and `offset` query parameters.
The default page is 20 records at offset 0; `limit` must be between 1 and 100.
The response contains `total`, `limit`, `offset`, and `results`. Invalid or
unknown query parameters return HTTP 400 with an `error` message.

City search uses the declared `L_City` column and compares
`LOWER(TRIM(L_City))` with `LOWER(TRIM(?))`, so differences in letter case or
surrounding spaces do not prevent matches. After importing `rets_property`,
you may apply
[`backend/sql/property_search_indexes.sql`](./backend/sql/property_search_indexes.sql)
to add the filter indexes and a persisted normalized city column.

To check the query plan, run this before applying the index SQL and again after
it (use the same database and data):

```sql
EXPLAIN SELECT id FROM rets_property
WHERE L_SystemPrice >= 300000 AND L_Keyword2 = 3;
```

Compare the `key` and estimated `rows` columns. The post-index plan should name
an index in `key` rather than show `NULL`. Also verify all filter indexes:

```sql
SHOW INDEXES FROM rets_property;
EXPLAIN SELECT id FROM rets_property
WHERE L_City_Normalized = LOWER(TRIM('Irvine'));
```

Filter values are passed separately with MySQL prepared statements rather than
being concatenated into SQL. SQL injection occurs when untrusted input is
interpreted as part of the SQL program (for example, changing a filter into an
additional condition or destructive command). Prepared-statement placeholders
keep query structure fixed and transmit each value as data, not executable SQL.

Run the backend tests with `cd backend` followed by `npm test`.
