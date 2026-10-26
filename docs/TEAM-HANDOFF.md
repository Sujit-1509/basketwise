# Basketwise team handoff

Updated 26 October 2026. Repository: https://github.com/Sujit-1509/basketwise

The workload estimates are Sujit 60%, Suhani 25%, and Rohit 15%. Sujit owns backend rules, database work, security and final integration. Suhani owns the frontend and its API integration. Rohit owns sample data, cross-feature testing and documentation. Each person fixes defects in their own work.

## Start here

Use PowerShell 7 and Node.js 22.12+ on Windows. Clone the repository, then run:

```powershell
git clone https://github.com/Sujit-1509/basketwise.git
cd basketwise
.\scripts\setup-native.ps1
.\scripts\build-native.ps1
.\scripts\start.ps1
```

Open http://localhost:18080. For later starts, only `start.ps1` is needed. Stop with `stop.ps1`; stop before rebuilding. Java 21 and MySQL 8.4 are installed privately under `%LOCALAPPDATA%\Basketwise`. Docker Desktop is not required for normal builds or demonstrations. Read [NATIVE-WINDOWS.md](NATIVE-WINDOWS.md) before changing database settings.

A fresh clone creates its own database and sample data. Sujit's accounts, database backup and credentials are not in GitHub. Setup generates a local `.env`; open it locally for the initial administrator login. Never commit `.env`, `client.ini`, SQL dumps or database files. Create a shopper account through the app for ordinary use.

## Current status

| Area | Ready | Remaining work |
|---|---|---|
| Core application | Catalog, accounts, comparison engine, saved plans, feedback and administration | Expanded location and retailer-import contracts |
| Saved-basket backend | Seven new endpoints, empty saved lists, ownership checks, serialized item updates | Connect new endpoints to frontend controls |
| Windows runtime | Native Java/MySQL setup, build, start and stop scripts | Other team members should verify setup on their own machines |
| Evidence | Backend API tests and native browser regression results | Test the new UI wiring once Suhani adds it |

The existing screens still use their previous Redux/full-list save flow. Backend support does not mean the new rename, duplicate, clear and item-mutation endpoints are already connected to buttons.

## First backend milestone: saved baskets

The API supports creating an empty list, reopening it by ID, adding packs, setting quantities, removing items, renaming, duplicating and clearing. Existing list saves and comparison calls remain available. See [API.md](API.md) for exact requests, responses and error handling.

Verified on 26 October 2026: 31 backend tests passed (24 API integration, six comparison-engine, one account-service). The six new integration tests cover list lifecycle, access control, invalid edits, archived products, the 100-product limit and concurrent additions. MySQL 8.4 applied both Flyway migrations successfully. [Verification record and source hashes](evidence/backend-lists-2026-10-26/verification.json) identify the tested source files. Frontend wiring and browser verification of these new controls remain pending. The updated Postman scripts passed syntax validation; the updated collection has not been run against a live app.

After moving to native Windows, seven Java unit tests, 12 frontend tests and 14 existing browser tests passed. These are a separate run, with overlapping coverage; do not add the totals and claim 64 unique tests. [Native verification](evidence/native-windows-2026-10-26/verification.json) records the migration and runtime checks. All nine database tables matched their source row counts and content hashes before regression tests created additional sample records.

## Suhani: frontend, 25%

Main files: `frontend/src/state.ts`, `frontend/src/types.ts`, `frontend/src/pages/GroceryList.tsx`, `frontend/src/pages/Catalogue.tsx`, `frontend/src/ui.tsx` and `frontend/src/style.css`. Check the current component structure before editing; reuse the existing API wrapper and shared controls.

Suhani's integration sequence:

1. Use the existing guest Redux draft until a shopper signs in and explicitly saves it. Saving returns a list ID; do not implicitly create a list for every catalog click.
2. For a saved basket, call the item endpoints for individual edits. Use full PUT only for an intentional full save. The server merges repeated additions of the exact same product ID.
3. Add RTK Query endpoints with the existing CSRF wrapper. Invalidate the Lists tag after each successful mutation, including rename, duplicate and clear. Reopen by ID after a refresh. Keep the full basket and mini-basket on one canonical client state, and refetch if a mutation's outcome is uncertain.
4. Preserve the selected list's identity when clearing its contents. A duplicate gets a new ID. Treat server 400/401/403/404 errors as visible states, and never display an unsuccessful mutation as saved.
5. Fetch comparison totals after basket changes; do not sum prices from different stores into a claimed checkout total. Disable comparison for empty lists. No UI wiring for these new endpoints is included in this backend milestone.

Use the contract in [API.md](API.md). All writes, including PATCH rename, need CSRF. Full-list PUT replaces the whole list and can overwrite a stale client's changes. POST item-add increments a quantity and is not idempotent: after a network timeout, refetch before deciding whether to retry. Use productId as the key; response item order is not guaranteed.

First deliverable: one saved-basket screen that can reopen, rename, duplicate, clear, add, update and remove items, with the mini-basket showing the same state. Include loading/error states and demonstrate the flow on desktop and mobile. Then continue the search/filter and comparison-dashboard improvements from the work plan.

## Rohit: testing, data and documentation, 15%

Main files: `frontend/e2e/*.spec.ts`, `backend/src/test/java/com/basketwise/ApiIntegrationTest.java`, `docs/Basketwise.postman_collection.json`, `docs/DEMO.md` and `docs/evidence/`. Sample catalog generation is in `backend/src/main/java/com/basketwise/SeedData.java`; coordinate changes there with Sujit.

Rohit's acceptance checklist:

- Add the same product twice: one line, combined quantity. Try zero, fractions, 1000 packs, and an increment above 999; the saved data must remain unchanged on rejection.
- Rename and clear a list; locality and budget must survive. Duplicate it; changes to one copy must not change the other. Repeat with an empty list.
- Sign in as another user and try every list endpoint with the first user's ID; expect 404. Check missing sessions and CSRF failures too.
- Reopen saved data after reload. Archive a product: existing lists retain it, new additions fail, and removal still works.
- Send simultaneous additions to the same saved basket; every successful increment must be retained. Do not automatically repeat an add after a network timeout.
- Check UI synchronization and persistence after the frontend connects these operations. Backend integration tests do not prove that the new buttons or mini-basket are wired.

Run `scripts/test.ps1` against a running native app for seven Java unit tests plus frontend/browser checks. The full Java API suite uses a disposable MySQL Testcontainer and needs Docker: start Docker Desktop and run `scripts/test.ps1 -WithDockerIntegration`. Browser tests create sample accounts and feedback in the app database. Do not run them against data that must stay free of test records.

For each bug, record the route, steps, expected result, actual result and a screenshot or relevant response. Record the commit under test, command, date, result and any skipped checks. Keep the dated evidence already in the repository; put new runs in a new dated folder. First deliverable: a test report for Suhani's saved-basket flow and an updated demonstration script.

## Sujit: backend and integration, 60%

Main files: `backend/src/main/java/com/basketwise/Api.java`, `GroceryService.java`, `ComparisonEngine.java`, `Repositories.java`, `SecurityConfig.java`, `backend/src/main/resources/db/migration/`, and `scripts/`. Keep price calculations and authorization on the server.

Continue with explicit location/serviceability contracts, then the authorized retailer import interface, normalized product identities, freshness and failure handling. Review existing comparison tests when those contracts change. Current catalog prices and stores remain fictional sample data. No live retailer connection or checkout handoff has been added in this milestone.

## Working together

- Start a branch from the latest main, for example `suhani/saved-basket-ui`, `rohit/basket-tests`, or `sujit/location-serviceability`.
- Agree on API changes before changing frontend assumptions. Update API.md with any new field or changed behavior.
- Keep commits focused and include the checks actually run. Use a pull request for review; Sujit handles final integration.
- Preserve exact product identity, integer-paise calculations, owner privacy and immutable saved plans. An alternative brand or pack needs explicit shopper acceptance.
- Keep sample data labelled. Do not describe recommendations as trained machine learning, claim retailer checkout succeeded, or claim measured food-waste reduction.
