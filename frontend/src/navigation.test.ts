import { describe, it, expect } from "vitest";
import { safeReturnPath } from "./navigation";
describe("login return path", () => {
  it("preserves the product feedback query", () =>
    expect(safeReturnPath("/feedback?type=PRODUCT&id=29")).toBe(
      "/feedback?type=PRODUCT&id=29",
    ));
  it.each([
    "https://example.test",
    "//example.test",
    "/\\example.test",
    "javascript:alert(1)",
    "/unknown",
    null,
  ])("rejects external or unrecognized destination %s", (value) =>
    expect(safeReturnPath(value)).toBe("/list"),
  );
});
