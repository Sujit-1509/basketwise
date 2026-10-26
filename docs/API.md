# REST API

Base URL is `http://localhost:18080/api`. Prices, fees, budget, and totals use integer **paise**. Dates use ISO 8601 UTC. Error responses have `{ "message": "..." }`. Preserve cookies when testing requests.

## Sessions and CSRF

Call `GET /auth/csrf`, retain its session cookie, and send the returned `token` in the returned `headerName` for every POST/PUT/PATCH/DELETE. Obtain a new token after login/logout. Spring's login endpoint expects `application/x-www-form-urlencoded`; other writes expect JSON.

| Method | Endpoint | Input / behavior | Access |
|---|---|---|---|
| GET | `/auth/csrf` | Returns token and headerName | Public |
| POST | `/auth/register` | name, email, password; creates SHOPPER, does not sign in | Public + CSRF |
| POST | `/auth/login` | Form fields email and password; establishes session | Public + CSRF |
| POST | `/auth/logout` | Invalidates session | CSRF |
| GET | `/auth/me` | `{user: null}` or safe account fields | Public |
| GET | `/products?q=&brand=` | Search active products | Public |
| GET | `/stores?locality=Kothrud` | Active stores serving exact locality | Public |
| GET | `/catalog?locality=Kothrud` | Products, eligible stores, effective offers, sampleData | Public |
| GET | `/localities` | Default Pune localities plus distinct active-store service areas | Public |
| POST | `/comparisons` | Comparison request below | Signed in |
| GET | `/lists` | Current user's lists and items | Signed in |
| POST | `/lists` | name, locality, optional budget, items (may be empty) | Signed in |
| GET | `/lists/{id}` | Reopen one owned list | Owner |
| PUT | `/lists/{id}` | Replace owned list and items | Owner |
| DELETE | `/lists/{id}` | Delete owned list and items | Owner |
| PATCH | `/lists/{id}/name` | `{ "name": "Monthly staples" }`; rename only | Owner |
| POST | `/lists/{id}/duplicate` | `{ "name": "Next month" }`; independent copy, returns 201 | Owner |
| DELETE | `/lists/{id}/items` | Empty list; preserve name, locality and budget | Owner |
| POST | `/lists/{id}/items` | `{ "productId": 2, "quantity": 1 }`; add packs, merge existing product | Owner |
| PUT | `/lists/{id}/items/{productId}` | `{ "quantity": 3 }`; set an existing line's pack count | Owner |
| DELETE | `/lists/{id}/items/{productId}` | Remove line; already absent is a successful no-op | Owner |
| GET | `/plans` | Current user's immutable snapshots | Signed in |
| POST | `/plans` | name, request, basketKey; recomputes server totals | Signed in |
| DELETE | `/plans/{id}` | Delete owned plan | Owner |
| GET | `/suggestions` | Up to six active products, ranked by saved-plan frequency | Signed in |
| GET | `/reviews?targetType=PRODUCT&targetId=1` | Public author display name, rating, comment | Public |
| POST | `/reviews` | targetType PRODUCT/STORE, targetId, rating 1–5, comment | Signed in |
| DELETE | `/reviews/{id}` | Delete own review | Owner |
| GET | `/admin/catalog` | All products, stores, raw inventory | Admin |
| POST / PUT | `/admin/products` / `/admin/products/{id}` | Product fields | Admin |
| POST / PUT | `/admin/stores` / `/admin/stores/{id}` | Store fields | Admin |
| DELETE | `/admin/products/{id}`, `/admin/stores/{id}` | Soft archive; history preserved | Admin |
| PUT | `/admin/inventory` | Upsert by storeId/productId | Admin |

`GET /actuator/health` is public, outside the `/api` prefix, and exposes only health status.

## Saved basket editing

All list reads and mutations return the existing `ListView` shape: `{ "list": { "id", "ownerId", "name", "locality", "budget", "updatedAt" }, "items": [{ "id", "listId", "productId", "quantity" }] }`. Delete-list returns `{ "ok": true }`. Item order is unspecified; use productId as the UI key. Names and localities are trimmed on full saves; rename trims the name. Money remains integer paise.

A saved list can contain zero to 100 distinct products. Each line has 1–999 whole packs. Adding an existing product increments its quantity; exceeding 999 returns 400 without changing the list. Full-list replacement still rejects duplicate product IDs instead of silently combining ambiguous input. Adding and changing quantities require an active catalog product. Removing, clearing, renaming and duplicating remain available when an old product is archived. A duplicate retains the archived product ID; remove it before comparing. An empty list can be saved or duplicated, but cannot be compared or saved as a priced plan.

Mutations lock the owned shopping-list row for the transaction. READ_COMMITTED isolation ensures an incremental request that waited for the lock reads the previous request's committed quantities. This serializes increments and other mutations of the same list without blocking edits to other lists. A full PUT intentionally replaces the whole list: a stale client's PUT can overwrite a newer edit. Use item endpoints for individual edits; full-document conflict detection is not implemented. POST add is not idempotent: do not retry an uncertain response automatically; refetch the list first.

Missing and unowned list IDs both return 404. Item PUT returns 404 when the line is absent. Missing sessions return 401 (a write without a valid CSRF token can return 403 first). No list operation reserves stock, changes inventory, or edits saved price snapshots. Totals must still come from `/comparisons`; a list itself has no retailer-specific total.

## Comparison request

```json
{"locality":"Kothrud","budget":50000,"items":[{"productId":2,"quantity":1},{"productId":3,"quantity":2}]}
```

The response contains `singleStores`, `splitStores`, nullable `bestSingle`/`bestSplit`, `splitSavings`, and an explanatory `message`. Every basket contains `key`, `stores`, `items`, `missing`, `subtotal`, `discount`, `fees`, `total`, `complete`, and nullable `overBudget`. Allocation records contain exact product and store IDs, quantity, unit price, MRP, line total, stale flag, and timestamp. Match names using catalog products/stores. A basket with no available lines may have an empty stores array; its key still identifies its candidate store.

To save, send `{ "name": "Weekly essentials", "request": <comparison-request>, "basketKey": "1" }`. The server recalculates availability and prices rather than accepting client totals. If the candidate is no longer complete, saving returns 400. A saved plan's `snapshot` is a JSON string containing `request`, `basket`, and the selected `products` as they were at saving time. The saved total may differ from a previously displayed quote if an administrator updated inventory in between.

## Admin fields

- Product: name, brand, packSize, category, local illustration imageUrl, mrp, active. Illustration paths must match `/images/[a-z-]+.svg`. Brand and pack size cannot change after a product has inventory or list references; create a separate product for another variant. Names, MRP, category, illustration, and active status remain editable subject to price validation.
- Store: name, type ONLINE/LOCAL, address, localities, fee, deliveryMinutes, active. LOCAL fee is always normalized to zero.
- Inventory: storeId, productId, stock, regularPrice, optional offerPrice/offerText/offerStart/offerEnd. Regular selling price cannot exceed MRP. An offer needs valid ordered dates and cannot exceed regular selling price. Clearing offerPrice removes the active discount. The server assigns updatedAt.

Common status codes: 400 invalid input, 401 missing/incorrect authentication, 403 insufficient role or CSRF failure, 404 missing/unowned record, 409 duplicate email or conflicting record. Missing optional budget means no budget comparison; a zero budget remains a real zero budget.
