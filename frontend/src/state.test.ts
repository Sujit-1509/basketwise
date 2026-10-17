import { describe, it, expect } from "vitest";
import { makeStore, actions } from "./state";
import { money } from "./types";
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
  it("preserves paise and clears private state on sign out", () => {
    const s = makeStore();
    s.dispatch(actions.settings({ budget: 10001, name: "Private" }));
    expect(s.getState().draft.budget).toBe(10001);
    s.dispatch(actions.clear());
    expect(s.getState().draft.name).toBe("My weekly essentials");
    expect(money(10001)).toContain("100.01");
  });
});
