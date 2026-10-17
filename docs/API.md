# REST API

Base URL is `http://localhost:18080/api`. Prices, fees, budget, and totals use integer **paise**. Dates use ISO 8601 UTC. Error responses have `{ "message": "..." }`. Preserve cookies when testing requests.

## Sessions and CSRF

Call `GET /auth/csrf`, retain its session cookie, and send the returned `token` in the returned `headerName` for every POST/PUT/DELETE. Obtain a new token after login/logout. Spring's login endpoint expects `application/x-www-form-urlencoded`; other writes expect JSON.

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
| POST | `/lists` | name plus comparison request | Signed in |
| PUT | `/lists/{id}` | Replace owned list and items | Owner |
| DELETE | `/lists/{id}` | Delete owned list and items | Owner |
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
