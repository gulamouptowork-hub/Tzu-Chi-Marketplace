import { expect, it } from "vitest";
import { adminQuerySchema, ADMIN_PAGE_SIZE } from "./admin-query";
it("uses bounded pagination and a real-data overview by default", () => {
  expect(adminQuerySchema.parse({})).toEqual({
    tab: "overview",
    q: "",
    status: "",
    page: 1,
    period: 30,
  });
  expect(ADMIN_PAGE_SIZE).toBe(20);
  expect(
    adminQuerySchema.parse({
      tab: "users",
      q: "  student  ",
      page: "2",
      period: "7",
    }),
  ).toMatchObject({ q: "student", page: 2, period: 7 });
});
it("rejects unbounded or unsupported admin queries", () => {
  for (const query of [
    { page: 0 },
    { page: 10001 },
    { period: 365 },
    { q: "a".repeat(101) },
    { tab: "credentials" },
    { status: "ADMIN" },
  ]) {
    expect(adminQuerySchema.safeParse(query).success).toBe(false);
  }
});
