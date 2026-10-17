import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(new URL("../../.env", import.meta.url), "utf8")
    .trim()
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
test("administrator can maintain inventory and archive catalog records", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.ADMIN_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("link", { name: "Catalog administration", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Keep the pantry up to date." }),
  ).toBeVisible();
  await page.locator(".record-list button").nth(1).click();
  const price = await page.getByLabel("Regular selling price (₹)").inputValue();
  const previousStock = await page
    .getByLabel("Stock (whole packs)")
    .inputValue();
  await page.getByLabel("Stock (whole packs)").fill("40");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Catalog updated");
  expect(Number(price)).toBeGreaterThan(0);
  await page.getByLabel("Stock (whole packs)").fill(previousStock);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Catalog updated");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page.getByRole("button", { name: "New products" }).click();
  const name = `Test Millet ${Date.now()}`;
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Brand", { exact: true }).fill("Test sample");
  await page.getByLabel("Pack size").fill("500 g");
  await page.getByLabel("MRP (₹)").fill("100");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page
      .locator(".record-list")
      .getByRole("button", { name: new RegExp(name) }),
  ).toBeVisible();
  await page
    .locator(".record-list")
    .getByRole("button", { name: new RegExp(name) })
    .click();
  await page.getByRole("button", { name: "Archive record" }).click();
  await expect(page.getByRole("status")).toContainText("archived");
  await page.getByRole("button", { name: "Stores", exact: true }).click();
  const store = `Test Store ${Date.now()}`;
  await page.getByLabel("Store name").fill(store);
  await page.getByLabel("Address", { exact: true }).fill("Sample Road, Pune");
  await page.getByLabel("Localities (comma-separated)").fill("Test Locality");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page
    .locator(".record-list")
    .getByRole("button", { name: new RegExp(store) })
    .click();
  await page.getByRole("button", { name: "Archive record" }).click();
  await expect(page.getByRole("status")).toContainText("archived");
});
