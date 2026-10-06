import { expect, it } from "vitest";
import { nextExchangeStatus } from "./exchange-policy";
it("completion requires both students to confirm", () => {
  expect(nextExchangeStatus(true, false)).toBe("ACCEPTED");
  expect(nextExchangeStatus(false, true)).toBe("ACCEPTED");
  expect(nextExchangeStatus(false, false)).toBe("ACCEPTED");
  expect(nextExchangeStatus(true, true)).toBe("COMPLETED");
});
