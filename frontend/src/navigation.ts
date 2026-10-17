const allowed = new Set([
  "/",
  "/list",
  "/compare",
  "/history",
  "/admin",
  "/feedback",
]);
export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return "/list";
  try {
    const url = new URL(value, "http://basketwise.local");
    return url.origin === "http://basketwise.local" && allowed.has(url.pathname)
      ? url.pathname + url.search
      : "/list";
  } catch {
    return "/list";
  }
}
