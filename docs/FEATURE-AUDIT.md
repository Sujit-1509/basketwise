# Complete MVP feature audit

Audit date: 16 October 2026, Asia/Kolkata. Target: the packaged application at http://localhost:18080, backed by MySQL 8.4. This audit covers the implemented, agreed MVP and fixes discovered in its less common workflows.

## Result

The expanded automated suite has **51 unique tests**: 25 Java tests, 12 React/Redux/navigation tests, and 14 Playwright end-to-end/asset checks. The Java comparison test additionally checks 400 deterministic generated catalogs against an independent exhaustive oracle. A separate live browser/API check enumerates assignments using the public catalog to verify complete totals.

The supplied Postman collection was executed with Newman: the shopper folder completed 12 requests and 13 assertions, and the public folder completed three requests and three assertions. These checks are additional to the 51-test suite.

## Coverage

| Feature | Verification | Result |
|---|---|---|
| Shopper registration and login | Real browser registration, incorrect credentials, duplicate/invalid email, password limits | Passed |
| Sessions, CSRF and sign-out | Real token/session login and logout; HTTP-only cookie checked; unauthenticated access denied | Passed |
| Account and admin isolation | Other users cannot change/delete lists, plans or reviews; shopper cannot promote itself or access admin | Passed |
| Login return destinations | Product feedback selection survives login; external/unrecognized return URLs rejected | Passed |
| Search and filters | Search, brand selection, category selection, empty results and reset | Passed |
| Images and catalog information | All 19 SVG images return correct media content; brand, pack, MRP and item prices visible | Passed |
| Grocery list controls | Add, increment/decrement, quantity limits, remove, empty state and budget validation | Passed |
| Multiple saved lists | Create, copy as new, rename, update quantities, reopen and delete | Passed |
| Deleted-list recovery | Deleting the currently loaded list clears its saved identity; saving creates a new list | Passed |
| Explicit alternatives | Brand changes only after acceptance; quantity retained; comparison uses replacement product ID | Passed |
| Exact variant identity | Admin cannot change brand/pack for a stocked or listed product; a new product is required | Passed |
| Store comparisons | Complete/incomplete baskets, missing items, fixed delivery fees, zero pickup fees, totals and budget overruns | Passed |
| Online/local/split views | Correct store filtering, split allocation, stock checks, deterministic ranking and savings explanation | Passed |
| Offer timing | Active, expired and future offers; start/end boundary behavior; no double discount | Passed |
| Freshness | Older-than-24-hour inventory flagged in catalog and allocations | Passed |
| Saved plan history | Server-calculated snapshots ignore client totals and stay unchanged after stock, price or store changes | Passed |
| Recalculation and deletion | Recalculate current prices; delete snapshots; retain original snapshot until explicitly deleted | Passed |
| Repeat-product suggestions | Explain saved-plan frequency; filter archived products before selecting the top six; refresh after plan deletion | Passed |
| Feedback | Product and store targets, ratings, comments, ownership, no-store state, purchase-verification disclaimer | Passed |
| Admin products and stores | Create, edit, archive, reactivate through the active field; validate MRP and store fees | Passed through UI/API paths |
| Admin inventory and offers | UI stock/price edits, dated discount creation/removal, invalid-price rejection | Passed |
| Serviceable localities | Admin-maintained areas appear in shopper selectors; archived stores stop providing coverage | Passed |
| Request validation | Null list entries, duplicate items, invalid quantities/budgets/ratings, missing parameters, malformed IDs and unknown products | Passed |
| Error recovery | Failed catalog request shows an error and recovers on recalculation; failed sign-out keeps draft/account state and allows retry | Passed |
| Responsive layouts | Overview at 375–1440px; list, comparison, history, feedback and admin at phone width | Passed without page overflow |
| Persistence | Saved account/list/snapshot retained through prior MySQL restart and subsequent backend replacements | Rechecked against running data |

## Repairs made during this audit

- Added **New grocery list** and **Save as new list**, and removed stale saved IDs when a loaded list is deleted.
- Made locality choices come from active store coverage rather than only three hardcoded options.
- Prevented feedback publication without a visible valid target; retained the chosen product through sign-in and showed current-target reviews while loading.
- Made admin New actions actually clear unsaved forms; new product/store submissions also reset the creation form.
- Refilled recommendations from active products after filtering archived entries, and refreshed them after catalog edits.
- Preserved exact brand/pack identity once referenced by inventory or saved lists.
- Returned HTTP 400 for null list entries and missing/malformed query/path parameters instead of HTTP 500.
- Added visible budget validation, comparison catalog-error recovery, sign-out failure feedback, accurate empty-store badges, and an explicit no-single-store-baseline savings state.

Five defects were reproduced before repair and rerun afterward. Machine-readable before/after results are in `evidence/feature-audit-before.json` and `evidence/feature-audit-after.json`.

## Evidence and limits

`evidence/backend-tests.txt` and JUnit XML files contain the Java results. `evidence/frontend-tests.txt`, `evidence/frontend-build.txt`, `evidence/browser-packaged.txt`, `evidence/postman-shopper.txt`, and `evidence/postman-public.txt` record the other checks. Browser fixtures use their own accounts and archive their own product/store records. No real admin credentials or session-cookie dumps are included in the source archive.

Stores, prices, stock, and delivery estimates remain illustrative. Live retailer integrations, real ordering, payments, reservations, subscriptions, password-reset email, SSR and trained machine learning remain outside this MVP. The audit does not establish that every possible input or production deployment is fault-free.
