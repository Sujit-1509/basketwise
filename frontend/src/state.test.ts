import { describe, it, expect } from "vitest";
import { makeStore, actions } from "./state";
import { money, expiryStatus } from "./types";
describe("shopping draft", () => {
  it("combines identical products and clamps whole-pack quantities", () => {
    const s = makeStore();
    s.dispatch(actions.add(2));
    s.dispatch(actions.add(2));
    expect(s.getState().draft.items).toEqual([{ productId: 2, quantity: 2 }]);
    s.dispatch(actions.quantity({ productId: 2, quantity: 0 }));
    expect(s.getState().draft.items[0].quantity).toBe(1);
    s.dispatch(actions.quantity({ productId: 2, quantity: 1200 }));
    expect(s.getState().draft.items[0].quantity).toBe(999);
    s.dispatch(actions.remove(2));
    expect(s.getState().draft.items).toEqual([]);
  });
  it("stores and clears an optional expiry date per item", () => {
    const s = makeStore();
    s.dispatch(actions.add(3));
    s.dispatch(actions.expiry({ productId: 3, expiryDate: "2026-11-05" }));
    expect(s.getState().draft.items[0].expiryDate).toBe("2026-11-05");
    s.dispatch(actions.quantity({ productId: 3, quantity: 4 }));
    expect(s.getState().draft.items[0].expiryDate).toBe("2026-11-05");
    s.dispatch(actions.expiry({ productId: 3, expiryDate: "" }));
    expect(s.getState().draft.items[0].expiryDate).toBeNull();
  });
  it("classifies expired, soon and fresh dates by calendar day", () => {
    const today = new Date(2026, 10, 2, 23, 30);
    expect(expiryStatus(null, today)).toBeNull();
    expect(expiryStatus("2026-11-01", today)?.tone).toBe("expired");
    expect(expiryStatus("2026-11-02", today)?.label).toContain("today");
    expect(expiryStatus("2026-11-05", today)?.tone).toBe("soon");
    expect(expiryStatus("2026-11-06", today)?.tone).toBe("fresh");
  });
  it("preserves paise and clears private state on sign out", () => {
    const s = makeStore();
    s.dispatch(actions.settings({ budget: 10001, name: "Private" }));
    expect(s.getState().draft.budget).toBe(10001);
    s.dispatch(actions.clear());
    expect(s.getState().draft.name).toBe("My weekly essentials");
    expect(money(10001)).toContain("100.01");
  });
});
