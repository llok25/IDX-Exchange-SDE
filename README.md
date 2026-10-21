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

## Property details and open houses

`GET /api/properties/:id` returns one property identified by its `L_ListingID`.
`GET /api/properties/:id/openhouses` returns that listing's open-house records,
ordered by `OpenHouseDate` and `OH_StartTime`. The listing ID must contain only
digits and be no longer than the database column's 255-character limit. Unknown
listing IDs return 404; database failures return 500.

The open-houses route is registered before the dynamic `/:id` route to make its
more specific path take precedence. Express checks routes in registration
order, so specific routes should be registered before broad parameterized
routes to avoid a broader match intercepting a request first.

The server logs each completed request with its timestamp, method, URL, status
code, and duration in milliseconds.

Run the backend tests with `cd backend` followed by `npm test`.

## Listings frontend

Run the React listings page with `cd frontend`, `npm install`, and `npm run dev`.
The Vite development server listens on port 3000 and proxies `/api` requests to
the Express server on port 5000. Start the backend separately. The page loads
the first 20 properties and displays the total result count; property images
are parsed defensively from `L_Photos` and listings without usable photos show
a placeholder instead.
