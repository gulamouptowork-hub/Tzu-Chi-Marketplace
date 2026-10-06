import { expect, it } from "vitest";
import {
  exchangeTimeBounds,
  exchangeTimeError,
  parseTaipeiDateTime,
  taipeiDateTimeInput,
} from "./exchange-time";
const now = new Date("2026-10-06T02:00:00Z");
it("parses Taipei input independently of the browser or server timezone", () => {
  expect(parseTaipeiDateTime("2026-10-07T14:00")?.toISOString()).toBe(
    "2026-10-07T06:00:00.000Z",
  );
  expect(taipeiDateTimeInput(now)).toBe("2026-10-06T10:00");
  for (const value of [
    "",
    "2026-02-30T14:00",
    "2026-10-07T24:00",
    "2026-10-07T25:30",
    "invalid",
  ]) {
    expect(parseTaipeiDateTime(value)).toBeNull();
  }
});
it("enforces both edges of the daylight window, including the reported evening failure", () => {
  for (const [time, expected] of [
    ["07:59", "EXCHANGE_TIME_HOURS"],
    ["08:00", null],
    ["18:59", null],
    ["19:00", "EXCHANGE_TIME_HOURS"],
    ["22:07", "EXCHANGE_TIME_HOURS"],
  ] as const) {
    expect(
      exchangeTimeError(parseTaipeiDateTime("2026-10-07T" + time), now),
    ).toBe(expected);
  }
});
it("rejects invalid, past and more-than-90-day dates and calculates minute bounds", () => {
  expect(exchangeTimeError(null, now)).toBe("EXCHANGE_TIME_INVALID");
  expect(exchangeTimeError(new Date("invalid"), now)).toBe(
    "EXCHANGE_TIME_INVALID",
  );
  expect(exchangeTimeError(now, now)).toBe("EXCHANGE_TIME_PAST");
  expect(exchangeTimeError(new Date(now.getTime() - 60000), now)).toBe(
    "EXCHANGE_TIME_PAST",
  );
  expect(
    exchangeTimeError(new Date(now.getTime() + 90 * 86400000), now),
  ).toBeNull();
  expect(
    exchangeTimeError(new Date(now.getTime() + 90 * 86400000 + 1), now),
  ).toBe("EXCHANGE_TIME_TOO_FAR");
  expect(exchangeTimeBounds(now)).toEqual({
    min: "2026-10-06T10:01",
    max: "2027-01-04T10:00",
  });
});
