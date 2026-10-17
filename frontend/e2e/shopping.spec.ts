import { test, expect } from "@playwright/test";
test("shopper completes registration, list, comparison, snapshot and feedback flow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good groceries. Better choices." }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Add Everyday Basmati Rice Grain & Good",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Add Fine White Sugar Pantry Co.",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: /My grocery list/ }).click();
  await page
    .getByRole("button", { name: "Save grocery list", exact: true })
    .click();
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page.getByLabel("Your name").fill("Browser Shopper");
  await page
    .getByLabel("Email address")
    .fill(`browser-${Date.now()}@example.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-fixture-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your grocery list." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save grocery list", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  await page.getByRole("button", { name: "Compare my basket" }).click();
  await expect(
    page.getByRole("heading", { name: "Find the right basket." }),
  ).toBeVisible();
  await expect(page.locator(".basket-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Save this plan" }).first().click();
  await expect(page.getByRole("status")).toContainText("Shopping plan saved");
  await page.getByRole("link", { name: "Saved plans", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your saved plans." }),
  ).toBeVisible();
  await expect(page.locator(".saved-plan")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".saved-plan")).toHaveCount(1);
  await page.getByRole("button", { name: "Recalculate now" }).click();
  await expect(page.locator(".basket-card")).toHaveCount(6);
  const feedback = `The comparison makes store fees clear. Run ${Date.now()}`;
  await page
    .getByRole("link", { name: "Community feedback", exact: true })
    .click();
  await page.getByLabel("Your feedback").fill(feedback);
  await page.getByRole("button", { name: "Publish feedback" }).click();
  await expect(page.getByText(feedback, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "Good to see you." }),
  ).toBeVisible();
});
test("mobile catalog and list fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good groceries. Better choices." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", {
      name: "Add Everyday Basmati Rice Grain & Good",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: /My grocery list/ }).click();
  await expect(
    page.getByRole("heading", { name: "Your grocery list." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
