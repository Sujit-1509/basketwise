# Demonstration script

Start Docker Desktop and run `scripts/start.ps1`. Use http://localhost:18080. All brands, stores, prices, stock, and delivery estimates are illustrative. Initial credentials are in the ignored local `.env`; do not display it during a presentation.

1. Open the overview on a desktop viewport. Explain the exact-product catalog and the distinction between an item-price estimate and a final store basket.
2. Add Everyday Basmati Rice from Grain & Good and Fine White Sugar from Pantry Co. Open My grocery list. Set quantities and an optional budget.
3. Choose Save grocery list. Register a fresh shopper account, then save again. Show the account-specific saved list.
4. Compare the basket. Explain item subtotal, MRP savings, per-store fees, completeness, and timestamps. Expand item allocations.
5. Select Split stores. Compare its total with the best single-store option; explain that a split can cost more after fees. Return to all stores and save a complete plan.
6. Open Saved plans and reload the page. Show the historical timestamp and immutable quoted prices. Use Recalculate now to obtain current results.
7. Sign out and sign in as the administrator using private local credentials. Open Catalog administration, choose an inventory record, adjust its price or stock, and save.
8. Sign in as the shopper again. Show that new comparisons reflect the change while the saved snapshot retains its original total.
9. Publish product or store/service feedback. Explain that reviews are not verified purchases and that this system does not place orders.
10. In My grocery list, choose Baner to demonstrate no coverage. Return to Kothrud. Show explicit acceptance of a matching alternative brand.
11. Resize to a phone viewport. Show category/search controls, quantity buttons, and stacked comparison cards without horizontal page overflow.
12. Open `/actuator/health`; run the test commands and Postman collection. Present the syllabus mapping and scope limitations.

The first draft is in memory; save it before refreshing. Backend restarts end sessions but retain MySQL data. Do not claim that sample delivery times or prices are current market data.
