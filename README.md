# IDX-Exchange-SDE

## Property search API

The backend serves `GET /api/properties` with optional `city`, `zipcode`,
`minPrice`, `maxPrice`, `beds`, `baths`, `limit`, `offset`, `sortBy`, and
`sortOrder` query parameters. The default page is 20 records at offset 0;
`limit` must be between 1 and 100. Sorting defaults to
`ListingContractDate DESC`; supported `sortBy` values are the actual SQL
columns `id`, `L_SystemPrice`, `ListingContractDate`, `LM_Int2_3`, and `L_Keyword2`.
`sortOrder` accepts `ASC` or `DESC`. Invalid or unknown query parameters return
HTTP 400 with an `error` message. Results use `id ASC` as a stable tie-breaker.

City search uses the declared `L_City` column and compares
`LOWER(TRIM(L_City))` with `LOWER(TRIM(?))`, so differences in letter case or
surrounding spaces do not prevent matches. After importing `rets_property`,
you may apply
[`backend/sql/property_search_indexes.sql`](./backend/sql/property_search_indexes.sql)
to add the filter indexes and a persisted normalized city column.

To inspect the plan for the common beds-plus-price filter, run this before
applying the index SQL and again after it (use the same database and data):

```sql
EXPLAIN SELECT id FROM rets_property
WHERE L_SystemPrice >= 300000 AND L_Keyword2 = 3;
```

The columns in the tabular `EXPLAIN` output are: `id` (select identifier),
`select_type` (query type), `table` (table read), `partitions` (partitions
accessed, if any), `type` (access strategy, such as a full `ALL` scan or an
indexed `range`), `possible_keys` (indexes eligible for the predicates), `key`
(the chosen index), `key_len` (bytes of the chosen index used), `ref` (values
or columns compared to the index), `rows` (estimated rows examined),
`filtered` (estimated percentage surviving the remaining predicates), and
`Extra` (additional execution details).

On the local MySQL 8.4.11 dataset (55,212 table rows), before the composite
index the plan used `type=ALL`, `key=NULL`, and estimated 37,424 rows. After
adding `(L_Keyword2, L_SystemPrice)`, it used `type=range`,
`key=idx_rets_property_beds_price`, `key_len=10`, and estimated 18,712 rows
(50% fewer estimated rows). `EXPLAIN ANALYZE` returned the same 17,993 matches;
the median of three runs was 3.18 ms with the index versus 3,381 ms with
`IGNORE INDEX (idx_rets_property_beds_price)` to force the table-scan plan.
These timings are specific to this local dataset and server. The script also
adds `(L_Zip, L_SystemPrice)` for ZIP-plus-price searches. The script temporarily
relaxes the session SQL mode because the imported table contains a legacy
zero-date default; it restores the prior mode after the DDL. An index may not
be chosen for a small table even when it is valid.
Also verify the filter indexes:

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

Use the filter form to combine city, ZIP code, price, beds, and baths criteria.
Clear Filters resets the form and reloads all properties. Frontend API and
component unit tests run with `cd frontend` followed by `npm test`.

Property cards link to `/property/:id`. The detail page shows the listing photos,
description, property facts, map, and open houses. Open-house remarks are read
from the `OpenHouseRemarks` field in each record's `all_data` JSON value.

### Google Maps Embed API

The detail page uses the Google Maps Embed API iframe and does not require a
Maps npm package. Create a Google Cloud project, enable **Maps Embed API**, and
create an API key in **APIs & Services > Credentials**. Restrict the key to the
Maps Embed API and the `http://localhost:3000/*` HTTP referrer. Add this to
`frontend/.env` (do not commit the key):

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_key
```

Vite is configured to expose this `REACT_APP_` variable to the frontend.
Restart the frontend dev server after changing `.env`.
