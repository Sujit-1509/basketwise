# CS3111 project alignment

## Project purpose

The Smart Grocery Comparison and Recommendation System helps shoppers in Pune compare the complete cost of an exact grocery list across online services and neighbourhood shops. It demonstrates the React + Spring Boot + relational database architecture listed in Practical 7 of the supplied CS3111 Web Technology syllabus, applied to a grocery comparison domain.

## Course evidence

| Course content | Implemented evidence | Demonstration |
|---|---|---|
| Unit II: React components, JSX, props, composition | App shell, ProductCard, BasketCard, shared feedback/loading components | Reusable product cards with exact selected quantities |
| Unit II: state, events, forms, router | Controlled search/filter/list inputs, React Router, guarded routes | Search, change quantities, navigate without reload |
| Unit II: Redux | Typed Redux draft slice and Redux Toolkit store | Shared basket count and list across routes |
| Unit IV: Spring Boot and Maven | Java 21 application, pinned Maven parent, wrapper | Build and start backend |
| Unit IV: Spring Security | Login/logout, encoded passwords, roles, sessions, CSRF | Shopper denied admin API, administrator allowed |
| Unit IV: JPA and SQL | JPA repositories, MySQL, Flyway migrations | Save lists, update inventory, preserve data across restart |
| Unit IV: REST and Postman | Documented REST endpoints and Postman collection | Run registration, comparison, list, and plan requests |
| Unit IV: monitoring/testing/deployment | Actuator health, JUnit/Mockito, MySQL Testcontainers, multi-stage Docker image | Health request and repeatable test/build results |
| Unit V: TypeScript, hooks, state and APIs | Typed models/hooks, RTK Query caching/invalidation, deferred search | Catalog edit refreshes dependent queries |
| Unit V: architecture and performance | Lazy route chunks, memoized product cards, indexed offer lookup | Inspect bundle sizes and React Profiler test output |
| Unit III: sessions/cookies and MVC concepts | Servlet-based Spring MVC with session authentication | Explain cookie/session lifecycle |

Unit III's handwritten Servlet/JSP applications, Unit I's PHP/Laravel, Unit VI's Express backend, and Unit V's SSR are not implemented. Node/npm are build tooling. The project does not claim to satisfy all practical exercises or substitute for the minimum-six lab requirement. The syllabus supplies project/presentation assessment categories but no detailed project-specific marking rubric.

## SDG and cost

The project proposes a connection to SDG 12 through grocery planning and informed purchasing. Price comparison alone does not demonstrate sustainable consumption or reduced food waste. Future expiry reminders and measured waste tracking could connect more directly to Target 12.3. The secondary link to SDG 2 is indirect: identifying affordable food baskets may support access, without proving improved nutrition or reduced hunger.

Official references: [UN Goal 12](https://sdgs.un.org/goals/goal12), [UN Goal 2](https://sdgs.un.org/goals/goal2).

For a self-developed local college demonstration on an existing computer, required software licensing and hosting expenditure is â‚¹0. Allow â‚¹0â€“â‚¹2,000 for incidental expenses. This excludes purchasing hardware, paid development/AI subscriptions, ongoing catalog-entry labour, maintenance, and future commercial hosting or integrations. No paid AI API is used in this implementation.

## Presentation outline

1. Explain the problem: individually cheap products do not necessarily produce the cheapest complete basket after fees.
2. Show the handwritten requirements translated into the list and comparison workflow.
3. Present React â†’ Spring MVC â†’ JPA â†’ MySQL and the ER diagram.
4. Demonstrate exact matching, inventory checks, single-store and two-store comparisons.
5. Demonstrate authentication, role enforcement, server-calculated snapshots, and persistence.
6. Explain the exhaustive oracle, integration tests, browser verification, and measured frontend behavior.
7. Discuss course coverage, the limits of the SDG connection, estimated cost, and future scope.
