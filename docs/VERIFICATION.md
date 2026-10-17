# Verification evidence

Validation date: 16 October 2026, Asia/Kolkata. The tested application uses React/TypeScript with Spring Boot 3.5.6 on Java 21 and MySQL 8.4. All results concern this local application and its illustrative catalog.

The expanded feature audit is documented in [FEATURE-AUDIT.md](FEATURE-AUDIT.md), including reproduced defects, fixes, and coverage by feature.

## Completed checks

| Check | Result | Evidence |
|---|---|---|
| Java unit and integration suite | 25 tests passed; zero failures/errors/skips | `evidence/backend-tests.txt` and JUnit XML files |
| Independent comparison oracle | 400 reproducible generated catalogs agreed with exhaustive allocation enumeration | `ComparisonEngineTest.randomCatalogsAgreeWithIndependentExhaustiveOracle` |
| React/Redux/navigation tests | 12 passed | `ProductCard.test.tsx`, `state.test.ts` |
| TypeScript and production frontend build | Passed | `npm run build` |
| Postman collection through Newman | 15 requests and 16 assertions passed | `evidence/postman-shopper.txt`, `evidence/postman-public.txt` |
| Browser workflows and asset checks against the packaged Docker application | 14 passed | `evidence/browser-packaged.txt` |
| Multi-stage Docker build and non-root runtime | Passed | Running container uses uid 100, gid 101; health is UP |
| Backend and MySQL restart persistence | Passed | Fresh login recovered the same saved list and byte-identical snapshot |
| Viewport inspection | No horizontal document overflow at 375, 390, 768, 1024, 1440px | Screenshot inspection and browser geometry checks |
| Browser runtime errors on overview | None | Chromium `pageerror` collection |

Backend integration tests use an independent disposable MySQL Testcontainer, apply Flyway migrations, validate the JPA schema, seed the catalog, and exercise Spring Security's real filter chain. Tests cover public catalog/health, actual CSRF-token login/logout, invalid credentials, missing authentication, input validation, shopper/admin separation, ownership of lists/plans/reviews, list replacement/deletion, unknown-product/no-coverage responses, and immutable snapshots after admin price updates. Client-supplied totals do not control saved snapshot totals. Regression cases also verify that fractional pack quantities are rejected rather than truncated and that multi-byte passwords exceeding BCrypt's byte limit receive a useful validation response.

Comparison tests cover whole-line quantities, insufficient stock, local fee normalization, fees reversing apparent item savings, missing complete baskets, deterministic ties, budget overruns, and offer start/end boundaries. The independent oracle recursively enumerates allowed per-item store assignments with at most two used stores; it does not call the engine's pair-selection helper.

Browser tests cover administrator inventory editing and product/store creation/archive; shopper registration, list creation, comparison, snapshot saving, reload, recalculation, feedback and sign-out; and mobile list editing. Test accounts and comments are created in the local application database; integration-test data is isolated in its disposable database.

## Performance observations

The final local production build's initial application JavaScript is approximately 363.81 kB uncompressed and 118.58 kB gzip. Login, list, comparison, history, feedback, and admin screens are separate lazy route chunks. RTK Query deduplicates catalog/account requests and invalidates dependent caches after writes. Catalog offer indexing avoids repeatedly scanning all inventory for every product card.

A React Profiler component test sampled an initial product-card render at 1.451 ms and a repeated update with identical memoized props at 0.007 ms on this machine. This is a small diagnostic sample, not a general performance guarantee or production benchmark.

## Runtime notes

The pinned Flyway/MySQL driver logs a recommendation to upgrade because its tested database-version range predates MySQL 8.4. Schema migration, Hibernate validation, actual MySQL integration tests, and application startup succeeded. Mockito logs the Java 21 dynamic-agent warning during its mock test; it does not cause a test failure.

The final Docker application serves its production React assets and API from the same port. Actual restart verification replaced the backend container and restarted MySQL, then signed in again and checked the original account, list ID, plan ID, and exact snapshot string. The new session cookie was confirmed HTTP-only with SameSite=Lax. The original public sample catalog contains 30 active products, six active stores, and 180 inventory rows; browser-created fixture products/stores are archived.

Port 8080 belongs to an existing service on this computer. Basketwise therefore uses localhost **18080** for the packaged application and **5173** for Vite. Existing services were left running.

Production authentication hardening, commercial deployment, retailer integration reliability, nutritional outcomes, and reduced food waste are outside this local verification. The catalog and delivery estimates are sample data.
