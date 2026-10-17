import {
  expect,
  request,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Product, Store, Inventory } from "../src/types";
const env = Object.fromEntries(
  readFileSync(new URL("../../.env", import.meta.url), "utf8")
    .trim()
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
export async function write(
  context: APIRequestContext,
  url: string,
  data: unknown = {},
  method = "POST",
  form = false,
) {
  const csrf = await (await context.get("/api/auth/csrf")).json();
  const response = await context.fetch(url, {
    method,
    headers: { [csrf.headerName]: csrf.token },
    ...(form ? { form: data as Record<string, string> } : { data }),
  });
  expect(response.ok(), `${method} ${url}: ${response.status()}`).toBe(true);
  return response.json();
}
export async function shopper(page: Page, signIn = true) {
  const email = `feature-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
    password = "feature-fixture-123";
  await write(page.request, "/api/auth/register", {
    name: "Feature audit shopper",
    email,
    password,
  });
  if (signIn)
    await write(
      page.request,
      "/api/auth/login",
      { email, password },
      "POST",
      true,
    );
  return { email, password };
}
export async function administrator(baseURL: string) {
  const context = await request.newContext({ baseURL });
  await write(
    context,
    "/api/auth/login",
    { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
    "POST",
    true,
  );
  return context;
}
export async function loginAdmin(page: Page) {
  await write(
    page.request,
    "/api/auth/login",
    { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD },
    "POST",
    true,
  );
}
export async function fixture(baseURL: string) {
  const admin = await administrator(baseURL);
  const productIds: number[] = [],
    storeIds: number[] = [];
  return {
    admin,
    async product(overrides: Partial<Product> = {}) {
      const product = (await write(admin, "/api/admin/products", {
        name: `Audit grocery ${Date.now()}`,
        brand: "Audit sample",
        packSize: "1 kg",
        category: "Staples",
        imageUrl: "/images/rice.svg",
        mrp: 8000,
        active: true,
        ...overrides,
      })) as Product;
      productIds.push(product.id);
      return product;
    },
    async store(overrides: Partial<Store> = {}) {
      const store = (await write(admin, "/api/admin/stores", {
        name: `Audit store ${Date.now()}`,
        type: "ONLINE",
        address: "Illustrative Pune address",
        localities: `Audit area ${Date.now()}`,
        fee: 1200,
        deliveryMinutes: 25,
        active: true,
        ...overrides,
      })) as Store;
      storeIds.push(store.id);
      return store;
    },
    inventory: async (input: Inventory) =>
      write(admin, "/api/admin/inventory", input, "PUT"),
    async cleanup() {
      try {
        for (const id of productIds)
          await write(admin, `/api/admin/products/${id}`, {}, "DELETE");
        for (const id of storeIds)
          await write(admin, `/api/admin/stores/${id}`, {}, "DELETE");
      } finally {
        await admin.dispose();
      }
    },
  };
}
export async function addSeedItems(page: Page) {
  await page.goto("/");
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
}
