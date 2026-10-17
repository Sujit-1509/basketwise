import { test, expect } from "@playwright/test";
import { shopper, write, fixture, loginAdmin, addSeedItems } from "./support";
import type { Catalog, Snapshot } from "../src/types";

const pageErrors = new WeakMap<object, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => expect(pageErrors.get(page)).toEqual([]));

test("catalog search, category, brand, no-results and clear filters work", async ({
  page,
}) => {
  await page.goto("/catalogue");
  await page.getByLabel("Search groceries").fill("basmati");
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page.getByLabel("Filter by brand").selectOption("Grain & Good");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("1 kg");
  await page.getByLabel("Search groceries").fill("nothing-matches-this");
  await expect(
    page.getByRole("heading", { name: "No matching groceries" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByRole("button", { name: "Dairy", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(5);
  await expect(
    page
      .locator(".product-card")
      .first()
      .getByRole("img", { name: "Full Cream Milk illustration", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".product-card").filter({ has: page.locator("del") }),
  ).toHaveCount(5);
});

test("lists support create, clone, edit, delete and saving after deleting the loaded list", async ({
  page,
}) => {
  await shopper(page);
  await addSeedItems(page);
  await page.getByRole("link", { name: /My grocery list/ }).click();
  const first = `Audit list A ${Date.now()}`,
    second = `Audit list B ${Date.now()}`;
  await page.getByLabel("List name", { exact: true }).fill(first);
  await page
    .getByRole("button", { name: "Save grocery list", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.getByLabel("List name", { exact: true }).fill(second);
  await page
    .getByRole("button", { name: "Save as new list", exact: true })
    .click();
  await expect
    .poll(
      async () => (await (await page.request.get("/api/lists")).json()).length,
    )
    .toBe(2);
  await page.getByLabel("Quantity for Everyday Basmati Rice").fill("3");
  await page
    .getByRole("button", { name: "Save grocery list", exact: true })
    .click();
  await expect
    .poll(async () => {
      const lists = await (await page.request.get("/api/lists")).json();
      return lists
        .find((v: any) => v.list.name === second)
        ?.items.find((i: any) => i.productId === 2)?.quantity;
    })
    .toBe(3);
  await page.getByRole("link", { name: "Saved plans", exact: true }).click();
  await page
    .locator(".saved-list")
    .filter({ has: page.getByRole("heading", { name: first, exact: true }) })
    .getByRole("button", { name: "Open list", exact: true })
    .click();
  await expect(page.getByLabel("List name", { exact: true })).toHaveValue(
    first,
  );
  await expect(
    page.getByLabel("Quantity for Everyday Basmati Rice"),
  ).toHaveValue("1");
  await page.getByRole("link", { name: "Saved plans", exact: true }).click();
  await page
    .locator(".saved-list")
    .filter({ has: page.getByRole("heading", { name: second, exact: true }) })
    .getByRole("button", { name: "Open list", exact: true })
    .click();
  await expect(
    page.getByLabel("Quantity for Everyday Basmati Rice"),
  ).toHaveValue("3");
  await page.getByRole("link", { name: "Saved plans", exact: true }).click();
  await page
    .getByRole("button", { name: `Delete list ${second}`, exact: true })
    .click();
  await expect(page.locator(".saved-list")).toHaveCount(1);
  await page.getByRole("link", { name: /My grocery list/ }).click();
  await page
    .getByLabel("List name", { exact: true })
    .fill("Recreated after delete");
  await page
    .getByRole("button", { name: "Save grocery list", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await expect
    .poll(
      async () => (await (await page.request.get("/api/lists")).json()).length,
    )
    .toBe(2);
  await page
    .getByRole("button", { name: "New grocery list", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your next good shop starts here." }),
  ).toBeVisible();
  await expect(page.getByLabel("List name", { exact: true })).toHaveValue(
    "My weekly essentials",
  );
});

test("whole-pack controls, explicit alternatives and budget validation work", async ({
  page,
}) => {
  await shopper(page);
  await page.goto("/");
  await page
    .getByRole("button", {
      name: "Add Everyday Basmati Rice Grain & Good",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: /My grocery list/ }).click();
  await page.getByLabel("Quantity for Everyday Basmati Rice").fill("2");
  await page
    .getByRole("button", {
      name: "Increase Everyday Basmati Rice",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Quantity for Everyday Basmati Rice"),
  ).toHaveValue("3");
  await page
    .getByRole("button", {
      name: "Decrease Everyday Basmati Rice",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "View alternatives", exact: true })
    .click();
  await expect(page.locator(".list-product")).toContainText("Grain & Good");
  await page
    .getByRole("button", { name: "Accept replacement", exact: true })
    .click();
  await expect(page.locator(".list-product")).toContainText("Harvest House");
  await expect(
    page.getByLabel("Quantity for Everyday Basmati Rice"),
  ).toHaveValue("2");
  await page.getByLabel("Budget in rupees (optional)").fill("-1");
  await expect(page.getByRole("alert")).toContainText("Enter a budget");
  await expect(
    page.getByRole("button", { name: "Compare my basket" }),
  ).toBeDisabled();
  await page.getByLabel("Budget in rupees (optional)").fill("1");
  await page.getByRole("button", { name: "Compare my basket" }).click();
  await expect(page.locator(".basket-card")).not.toHaveCount(0);
  await expect(page.locator(".notice.warning").first()).toContainText(
    "over your budget",
  );
  const comparison = await write(page.request, "/api/comparisons", {
    locality: "Kothrud",
    items: [{ productId: 29, quantity: 2 }],
  });
  for (const basket of comparison.singleStores)
    for (const item of basket.items) expect(item.productId).toBe(29);
  await page.getByRole('link',{name:'Edit list',exact:true}).click();
  await page.getByRole('button',{name:'Remove Everyday Basmati Rice',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your next good shop starts here.'})).toBeVisible();
});

test("comparison filters, timestamps, fees, whole-list totals and split results agree with an independent enumeration", async ({
  page,
}) => {
  await shopper(page);
  const catalog = (await (
    await page.request.get("/api/catalog?locality=Kothrud")
  ).json()) as Catalog;
  await addSeedItems(page);
  await page.getByRole("link", { name: /My grocery list/ }).click();
  await page.getByRole("button", { name: "Compare my basket" }).click();
  await expect(page.locator(".basket-card")).toHaveCount(catalog.stores.length);
  await page
    .getByRole("button", { name: "Online delivery", exact: true })
    .click();
  await expect(page.locator(".basket-card")).toHaveCount(
    catalog.stores.filter((s) => s.type === "ONLINE").length,
  );
  await page
    .getByRole("button", { name: "Nearby pickup", exact: true })
    .click();
  await expect(page.locator(".basket-card")).toHaveCount(
    catalog.stores.filter((s) => s.type === "LOCAL").length,
  );
  await page
    .locator(".basket-card")
    .filter({
      has: page.getByRole("button", {
        name: "Save this plan",
        disabled: false,
      }),
    })
    .first()
    .locator("summary")
    .click();
  await expect(
    page.locator(".allocation-list").filter({ visible: true }).first(),
  ).toContainText("Updated");
  const comparison = await write(page.request, "/api/comparisons", {
    locality: "Kothrud",
    items: [
      { productId: 2, quantity: 1 },
      { productId: 3, quantity: 1 },
    ],
  });
  let oracle = Number.POSITIVE_INFINITY;
  for (const a of catalog.stores)
    for (const b of catalog.stores) {
      const x = catalog.offers.find(
          (o) => o.productId === 2 && o.storeId === a.id && o.stock >= 1,
        ),
        y = catalog.offers.find(
          (o) => o.productId === 3 && o.storeId === b.id && o.stock >= 1,
        );
      if (x && y) {
        const used = [...new Map([a, b].map((s) => [s.id, s])).values()];
        oracle = Math.min(
          oracle,
          x.price +
            y.price +
            used.reduce((sum, s) => sum + (s.type === "LOCAL" ? 0 : s.fee), 0),
        );
      }
    }
  const actual = Math.min(
    ...[...comparison.singleStores, ...comparison.splitStores]
      .filter((b: any) => b.complete)
      .map((b: any) => b.total),
  );
  expect(actual).toBe(oracle);
  await page.getByRole("button", { name: "Split stores", exact: true }).click();
  await expect(page.locator(".basket-card")).toHaveCount(
    comparison.splitStores.length,
  );
  if (comparison.splitStores.length)
    await expect(page.locator(".basket-card").first()).toContainText(
      "TWO-STORE PLAN",
    );
});

test("admin localities, active offers, stock, pickup fees, immutable snapshots and repeat suggestions work together", async ({
  page,
  baseURL,
}) => {
  const f = await fixture(baseURL!);
  try {
    const product = await f.product();
    const store = await f.store();
    const now = Date.now();
    const inventory = {
      productId: product.id,
      storeId: store.id,
      stock: 10,
      regularPrice: 7000,
      offerPrice: 5000,
      offerText: "Audit active offer",
      offerStart: new Date(now - 3600000).toISOString(),
      offerEnd: new Date(now + 3600000).toISOString(),
    };
    await f.inventory(inventory);
    await shopper(page);
    await page.goto("/");
    await expect(
      page
        .getByLabel("Shopping locality")
        .locator("option", { hasText: store.localities }),
    ).toHaveCount(1);
    await page.getByLabel("Shopping locality").selectOption(store.localities);
    await page
      .getByRole("button", {
        name: `Add ${product.name} ${product.brand}`,
        exact: true,
      })
      .click();
    await page.getByRole("link", { name: /My grocery list/ }).click();
    await page.getByLabel(`Quantity for ${product.name}`).fill("2");
    await page.getByRole("button", { name: "Compare my basket" }).click();
    await expect(page.locator(".basket-price strong")).toHaveText("₹112.00");
    await page.getByRole("button", { name: "Save this plan" }).click();
    await expect(page.getByRole("status")).toContainText("Shopping plan saved");
    const original = (await (await page.request.get("/api/plans")).json())[0];
    const snapshot = JSON.parse(original.snapshot) as Snapshot;
    expect(snapshot.basket.total).toBe(11200);
    await f.inventory({ ...inventory, stock: 0, offerPrice: null });
    await page
      .getByRole("button", { name: "Recalculate", exact: true })
      .click();
    await expect(page.locator(".basket-card")).toContainText("missing");
    await expect(
      page.getByRole("button", { name: "Save this plan" }),
    ).toBeDisabled();
    await f.inventory({
      ...inventory,
      stock: 10,
      regularPrice: 7500,
      offerPrice: null,
    });
    await page
      .getByRole("button", { name: "Recalculate", exact: true })
      .click();
    await expect(page.locator(".basket-price strong")).toHaveText("₹162.00");
    await write(
      f.admin,
      `/api/admin/stores/${store.id}`,
      { ...store, type: "LOCAL", fee: 9999 },
      "PUT",
    );
    await page
      .getByRole("button", { name: "Recalculate", exact: true })
      .click();
    await expect(page.locator(".basket-price strong")).toHaveText("₹150.00");
    await expect(page.locator(".basket-card")).toContainText("NEARBY PICKUP");
    await page.getByRole("link", { name: "Saved plans", exact: true }).click();
    await expect(page.locator(".basket-price strong")).toHaveText("₹112.00");
    expect(
      (await (await page.request.get("/api/plans")).json())[0].snapshot,
    ).toBe(original.snapshot);
    await page.getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page.locator(".repeat-items")).toContainText(product.name);
    await expect(page.locator(".repeat-items")).toContainText(
      "Appeared in 1 saved plans",
    );
    await page.getByRole("link", { name: "Saved plans", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Delete plan My weekly essentials",
        exact: true,
      })
      .click();
    await expect(page.locator(".saved-plan")).toHaveCount(0);
    await page.getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page.locator(".repeat-items")).toHaveCount(0);
  } finally {
    await f.cleanup();
  }
});

test("feedback keeps the selected product through sign-in and blocks publishing when no stores serve the locality", async ({
  page,
}) => {
  const account = await shopper(page, false);
  await page.goto("/feedback?type=PRODUCT&id=29");
  await expect(page.getByLabel("Choose product")).toHaveValue("29");
  await page
    .locator("main")
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Feedback about")).toHaveValue("PRODUCT");
  await expect(page.getByLabel("Choose product")).toHaveValue("29");
  const comment = `Audit product feedback ${Date.now()}`;
  await page
    .getByRole("combobox", { name: "Rating", exact: true })
    .selectOption("4");
  await page.getByLabel("Your feedback").fill(comment);
  await page.getByRole("button", { name: "Publish feedback" }).click();
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  const reviews = await (
    await page.request.get("/api/reviews?targetType=PRODUCT&targetId=29")
  ).json();
  const review = reviews.find((r: any) => r.comment === comment);
  expect(review.rating).toBe(4);
  await write(page.request, `/api/reviews/${review.id}`, {}, "DELETE");
  await page.getByLabel("Feedback about").selectOption("STORE");
  await page.getByLabel("Shopping locality").selectOption("Baner");
  await expect(page.getByLabel("Choose store")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Publish feedback" }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "No stores serve this locality. Choose another locality or feedback type.",
    ),
  ).toBeVisible();
});

test("admin New actions reset unsaved product, store and inventory forms", async ({
  page,
}) => {
  await loginAdmin(page);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByLabel("Product name").fill("Unsaved draft");
  await page.getByRole("button", { name: "New products" }).click();
  await expect(page.getByLabel("Product name")).toHaveValue("");
  await page.getByRole("button", { name: "Stores", exact: true }).click();
  await page.getByLabel("Store name").fill("Unsaved store");
  await page.getByRole("button", { name: "New stores" }).click();
  await expect(page.getByLabel("Store name")).toHaveValue("");
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await page.getByLabel("Regular selling price (₹)").fill("42");
  await page.getByRole("button", { name: "New inventory" }).click();
  await expect(page.getByLabel("Regular selling price (₹)")).toHaveValue("");
});

test("catalog and logout network failures are visible and recover without losing the draft", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  await shopper(page);
  await addSeedItems(page);
  await page.getByRole("link", { name: /My grocery list/ }).click();
  await page.getByRole("button", { name: "Compare my basket" }).click();
  await expect(page.locator(".basket-card")).not.toHaveCount(0);
  await page.route("**/api/catalog?**", (r) => r.abort());
  await page.getByLabel("Shopping locality").selectOption("Baner");
  await expect(page.getByRole("alert")).toContainText("Unable to reach");
  await page.unroute("**/api/catalog?**");
  await page.getByRole("button", { name: "Recalculate", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No stores available" }),
  ).toBeVisible();
  await page.getByLabel("Shopping locality").selectOption("Kothrud");
  await expect(page.locator(".basket-card")).not.toHaveCount(0);
  await page.route("**/api/auth/logout", (r) => r.abort());
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("alert")).toContainText("Sign out failed");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "My basket 2", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/auth/logout");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "My basket 0", exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("shopper routes and admin forms fit a phone viewport and route guards work", async ({
  page,
}) => {
  await shopper(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await addSeedItems(page);
  for (const path of ["/list", "/compare", "/history", "/feedback"]) {
    await page
      .getByRole("link", {
        name:
          path === "/list"
            ? /My grocery list/
            : path === "/compare"
              ? "Compare baskets"
              : path === "/history"
                ? "Saved plans"
                : "Community feedback",
        exact: path !== "/list",
      })
      .click();
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
  }
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Administrator access required" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await loginAdmin(page);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Keep the pantry up to date." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("admin product/store edits and dated inventory offers persist through the form", async ({
  page,
  baseURL,
}) => {
  const f = await fixture(baseURL!);
  try {
    const product = await f.product(),
      store = await f.store();
    await loginAdmin(page);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Products", exact: true }).click();
    await page
      .locator(".record-list")
      .getByRole("button", { name: new RegExp(product.name) })
      .click();
    const edited = `${product.name} edited`;
    await page.getByLabel("Product name").fill(edited);
    await page.getByLabel("Brand", { exact: true }).fill("Audit maintained");
    await page.getByLabel("Pack size").fill("2 kg");
    await page.getByLabel("MRP (₹)").fill("120");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Catalog updated");
    await expect
      .poll(async () => {
        const catalog = await (await f.admin.get("/api/admin/catalog")).json();
        return catalog.products.find((p: any) => p.id === product.id).mrp;
      })
      .toBe(12000);
    await page.getByRole("button", { name: "Stores", exact: true }).click();
    await page
      .locator(".record-list")
      .getByRole("button", { name: new RegExp(store.name) })
      .click();
    await page
      .getByLabel("Address", { exact: true })
      .fill("Illustrative edited address, Pune");
    await page.getByLabel("Delivery fee (₹)").fill("29.50");
    await page.getByLabel("Delivery estimate (minutes)").fill("45");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Catalog updated");
    await page.getByRole("button", { name: "Inventory", exact: true }).click();
    await page.getByRole("button", { name: "New inventory" }).click();
    await page
      .getByRole("combobox", { name: "Product", exact: true })
      .selectOption(String(product.id));
    await page
      .getByRole("combobox", { name: "Store", exact: true })
      .selectOption(String(store.id));
    await page.getByLabel("Regular selling price (₹)").fill("100");
    await page.getByLabel("Stock (whole packs)").fill("7");
    await page.getByLabel("Offer price (₹, optional)").fill("80");
    await page.getByLabel("Offer description").fill("Audit UI offer");
    const date = async (offset: number) =>
      page.evaluate((offset) => {
        const d = new Date(Date.now() + offset);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      }, offset);
    await page.getByLabel("Offer starts").fill(await date(-3600000));
    await page.getByLabel("Offer ends").fill(await date(3600000));
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toContainText("Catalog updated");
    await expect
      .poll(async () => {
        const catalog = await (await f.admin.get("/api/admin/catalog")).json();
        return catalog.inventory.find(
          (i: any) => i.productId === product.id && i.storeId === store.id,
        )?.offerPrice;
      })
      .toBe(8000);
    const result = await write(f.admin, "/api/comparisons", {
      locality: store.localities,
      items: [{ productId: product.id, quantity: 1 }],
    });
    expect(result.bestSingle.total).toBe(10950);
    expect(result.bestSingle.items[0].quantity).toBe(1);
    await page.getByLabel("Offer price (₹, optional)").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect
      .poll(async () => {
        const catalog = await (await f.admin.get("/api/admin/catalog")).json();
        return catalog.inventory.find(
          (i: any) => i.productId === product.id && i.storeId === store.id,
        )?.offerPrice;
      })
      .toBeNull();
    await page.getByLabel("Regular selling price (₹)").fill("130");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("alert")).toContainText("not exceed MRP");
  } finally {
    await f.cleanup();
  }
});

test("every catalog illustration is available and contains an SVG image", async ({
  request,
}) => {
  const catalog = (await (
    await request.get("/api/catalog?locality=Kothrud")
  ).json()) as Catalog;
  const results = await Promise.all(
    [...new Set(catalog.products.map((p) => p.imageUrl))].map(async (image) => {
      const response = await request.get(image);
      expect(response.ok(), image).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/svg+xml");
      expect(await response.text()).toContain("<svg");
      return image;
    }),
  );
  expect(results.length).toBe(19);
});
