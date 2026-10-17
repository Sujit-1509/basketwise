import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Profiler } from "react";
import { ProductCard } from "./pages/Catalogue";
import type { Product, Offer } from "./types";
const product: Product = {
  id: 1,
  name: "Rice",
  brand: "Sample",
  packSize: "1 kg",
  category: "Staples",
  imageUrl: "/images/rice.svg",
  mrp: 12000,
  active: true,
};
const offer: Offer = {
  id: 1,
  productId: 1,
  storeId: 1,
  price: 10000,
  stock: 3,
  stale: true,
  updatedAt: "2026-01-01T00:00:00Z",
  offerText: null,
};
it("shows prices and freshness and adds the exact product", () => {
  const add = vi.fn();
  render(
    <MemoryRouter>
      <ProductCard product={product} offer={offer} count={0} onAdd={add} />
    </MemoryRouter>,
  );
  expect(screen.getByText("Price update over 24h old")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add Rice Sample" }));
  expect(add).toHaveBeenCalledWith(1);
});
it("prevents adding unavailable products", () => {
  render(
    <MemoryRouter>
      <ProductCard product={product} count={0} onAdd={() => {}} />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("button", { name: "Add Rice Sample" }),
  ).toBeDisabled();
});
it("measures memoized updates with stable product properties", () => {
  const timings: number[] = [];
  const add = () => {};
  const card = (
    <MemoryRouter>
      <Profiler
        id="card"
        onRender={(_id, _phase, duration) => timings.push(duration)}
      >
        <ProductCard product={product} offer={offer} count={0} onAdd={add} />
      </Profiler>
    </MemoryRouter>
  );
  const { rerender } = render(card);
  rerender(
    <MemoryRouter>
      <Profiler
        id="card"
        onRender={(_id, _phase, duration) => timings.push(duration)}
      >
        <ProductCard product={product} offer={offer} count={0} onAdd={add} />
      </Profiler>
    </MemoryRouter>,
  );
  expect(timings).toHaveLength(2);
  expect(timings.every((t) => t >= 0)).toBe(true);
  console.info(
    "ProductCard actual render durations (ms):",
    timings.map((t) => t.toFixed(3)).join(", "),
  );
});
