# Basketwise

Smart Grocery Comparison and Recommendation System is a CS3111 Web Technology course project for Pune. Shoppers build exact-product grocery lists, compare complete basket costs including store fees, and save price snapshots. The initial catalog contains 30 illustrative products and six fictional stores serving Kothrud.

## Start on Windows

Install and start Docker Desktop with Linux containers. Open PowerShell 7 in this project directory, then run:

```powershell
.\scripts\start.ps1
```

Open **http://localhost:18080** after the application reports `Started Application`. The first build downloads Node, Java 21, Maven, and MySQL dependencies and can take several minutes. No change to the computer's existing Java installation is needed.

```powershell
docker compose logs -f app
docker compose ps
```

Create a shopper account from the sign-in screen. For administration, open the ignored `.env` file created by setup and use `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Setup generates random passwords and never prints them. Keep `.env` private. The initial administrator is created on first startup; changing its password in `.env` later does not reset an existing account.

```powershell
docker compose stop       # Stop; retain data
docker compose start     # Restart the existing containers
docker compose down      # Remove containers; retain the named MySQL volume
```

Do not remove the MySQL volume unless you intend to erase local accounts, lists, and history. No paid API key is required. Ports are bound to localhost; this configuration is for a local demonstration.

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
| `compose.yml` and `Dockerfile` | Local database and application builds |
| `docs/` | Design notes, syllabus mapping, API collection, demonstration steps, and recorded test results |

## Development without the full Docker build

Use a Java 21 **JDK**, Node 22.12+ (or a compatible newer release), Docker Desktop, and PowerShell 7. A Java 8 runtime is insufficient. Set `$env:JAVA_HOME` to your Java 21 JDK for this terminal only.

```powershell
.\scripts\setup.ps1
docker compose up -d db
Get-Content .env | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
$env:DB_URL = 'jdbc:mysql://localhost:3307/basketwise?connectionTimeZone=UTC'
cd backend
$env:PORT = '18080'
.\mvnw.cmd spring-boot:run
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to port 18080, preserving same-origin session cookies. Do not run the packaged app and development backend on port 18080 simultaneously.

## Build and test

With Java 21 configured, Docker running for Testcontainers, and dependencies installed:

```powershell
cd backend
.\mvnw.cmd test
cd ..\frontend
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests expect a running backend on port 18080; they start Vite if needed. Set `E2E_URL=http://127.0.0.1:18080` to test the packaged application instead. Tests create uniquely named sample shopper accounts and feedback in the local app database. Java integration tests use their own disposable MySQL Testcontainer, separate from app data.

On a machine without a JDK, run backend tests in the included Maven/Java 21 image:

```powershell
$backendPath = (Resolve-Path .\backend).Path
docker run --rm -v "${backendPath}:/app" -v basketwise-maven:/root/.m2 -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal -w /app maven:3.9.9-eclipse-temurin-21 mvn -B test
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
