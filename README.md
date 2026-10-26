# Basketwise

Smart Grocery Comparison and Recommendation System is a CS3111 Web Technology course project for Pune. Shoppers build exact-product grocery lists, compare complete basket costs including store fees, and save price snapshots. The initial catalog contains 30 illustrative products and six fictional stores serving Kothrud.

Team members: read the [handoff notes](docs/TEAM-HANDOFF.md) for responsibilities, current status, setup, API integration work and acceptance checks.

## Start on Windows

Use PowerShell 7 and Node.js 22.12+ (or a compatible newer release). Docker is not needed for normal builds or startup. On a new computer, run these once:

```powershell
.\scripts\setup-native.ps1
.\scripts\build-native.ps1
```

Setup downloads a private Java 21 JDK and MySQL 8.4 distribution under `%LOCALAPPDATA%\Basketwise`. It does not replace other Java or MySQL installations. The first build downloads frontend and Maven dependencies. The Maven Wrapper handles Maven installation.

For everyday use:

```powershell
.\scripts\start.ps1
```

Open **http://localhost:18080** when the script reports ready. It starts native MySQL on localhost:3307 and the Java application on localhost:18080 in the background. React is already packaged inside the JAR; no separate frontend server is needed.

```powershell
.\scripts\stop.ps1                 # Stop both native processes; retain data
Get-Content .runtime\app.log -Tail 40
Get-Content .runtime\app-error.log -Tail 40
```

After source changes, stop the app, run `build-native.ps1`, then start it again. Rebuilding an existing running JAR can fail because Windows locks it. Java uses a 384 MB maximum heap; this is not a limit on the entire process's memory. MySQL uses a 128 MB InnoDB buffer pool.

Create a shopper account from the sign-in screen. For administration, open the ignored `.env` file and use `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Keep `.env` private. The administrator is created on first startup; editing its password in `.env` does not reset an existing account. Native MySQL's private `client.ini` also contains credentials and must not be shared.

Database files live at `%LOCALAPPDATA%\Basketwise\mysql-data`. Do not delete this folder: it holds accounts, lists, plans, reviews and catalog edits. The migration backup, when present, is in the ignored `.runtime\backups` directory. See [native Windows setup](docs/NATIVE-WINDOWS.md) for details. Both ports are bound to localhost; this is a local demonstration setup.

## Stack

React 19, TypeScript, Vite, React Router, Redux Toolkit/RTK Query, and Tailwind CSS form the frontend. Java 21, Spring Boot 3.5.6, Spring Security, Spring Data JPA, Flyway, and MySQL 8.4 form the backend. Dependency lockfiles and the Maven parent pin the tested dependency resolution. Spring serves the production frontend and REST API from the same origin.

## Project files

The source and build configuration are included so the project can be explained, changed, and rebuilt for the course demonstration.

| File or directory | Purpose |
|---|---|
| `backend/pom.xml` | Java version, Spring Boot parent, application dependencies, and Maven build plugin |
| `backend/src/main/java/com/basketwise/` | REST endpoints, security configuration, business rules, entities, and repositories |
| `backend/src/main/resources/db/migration/` | Versioned MySQL schema |
| `frontend/src/` | React pages, shared components, Redux state, and API queries |
| `frontend/package.json` and `package-lock.json` | Frontend commands and dependency versions |
| `scripts/setup-native.ps1`, `build-native.ps1`, `start.ps1`, `stop.ps1` | Native Windows setup, build and lifecycle |
| `compose.yml` and `Dockerfile` | Optional Docker alternative; not used by the default startup |
| `docs/` | Design notes, syllabus mapping, API collection, demonstration steps, and recorded test results |

## Frontend development

Start the packaged native backend, then run Vite in a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to port 18080, preserving same-origin session cookies. Do not run the packaged app and development backend on port 18080 simultaneously.

## Build and test

For unit tests and frontend/browser checks, start the native app and run:

```powershell
.\scripts\test.ps1
```

This runs the account and comparison-engine Java unit tests, frontend tests/build, and Playwright against the packaged application on port 18080. Browser tests create sample accounts and feedback in the local database.

The full Java API integration suite still uses an isolated MySQL Testcontainer. Docker is optional for running the app, but required for this specific suite. When you want to run it, start Docker Desktop and use:

```powershell
.\scripts\test.ps1 -WithDockerIntegration
```

The Maven Wrapper 3.3.4 uses its official script-only distribution and downloads Maven 3.9.9 on first use; no wrapper JAR is required. Third-party notices are in `docs/THIRD-PARTY.md`.

## Main workflows

1. Browse products and add exact brands/pack sizes to a draft list.
2. Adjust quantities, optionally set a rupee budget, and save the list after signing in.
3. Compare complete single-store baskets and two-store plans. Open details for per-item allocation and price timestamps.
4. Save a plan, reload the app, and reopen it in Saved plans. Recalculation uses current stock and prices; the original snapshot remains unchanged.
5. As administrator, update inventory or offers and verify subsequent comparisons change.
6. Publish product or store/service feedback. Feedback is not purchase-verified.

The draft is in memory; save it to retain it across reloads. Accounts, saved lists, plans, inventory, and feedback persist in MySQL. Login sessions are in backend memory and end when the backend restarts; saved data remains.

Use **New grocery list** to start another list or **Save as new list** to copy a saved list without overwriting it. Locality selectors include service areas maintained by administrators. Feedback cannot be published for an invisible or unavailable store. To preserve exact variants, stocked/listed products keep their brand and pack size; create a new product for another variant.

## Scope and limitations

All seeded stores, brands, stock, prices, and delivery estimates are illustrative. Baner and Viman Nagar are available to demonstrate the no-coverage state until an administrator adds serviceable stores. There are no live retailer integrations, orders, stock reservations, checkout, payments, subscriptions, password-reset emails, or trained AI models. Offers are simple dated item discounts; delivery fees are fixed per used online store. Pickup travel costs are not estimated.

See `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/COURSE-PROJECT.md`, `docs/DEMO.md`, and `docs/VERIFICATION.md` for technical design, syllabus mapping, SDG positioning, cost assumptions, and test evidence. Import `docs/Basketwise.postman_collection.json` into Postman for API exploration.
