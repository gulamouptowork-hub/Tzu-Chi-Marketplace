import { expect, it } from "vitest";
import { listingSchema } from "./listing-validation";
const valid = {
  title: "Calculus textbook",
  description: "A lightly used calculus textbook.",
  categoryId: "textbooks",
  condition: "GOOD",
  priceNtd: 300,
  isFree: false,
  openToTrade: false,
  campuses: ["JIEREN"],
  meetupLocation: "jieren-library",
  imageIds: ["upload1"],
};
it("requires price for a sale and no price for free/trade", () => {
  expect(listingSchema.safeParse(valid).success).toBe(true);
  expect(listingSchema.safeParse({ ...valid, priceNtd: null }).success).toBe(
    false,
  );
  expect(
    listingSchema.safeParse({ ...valid, isFree: true, priceNtd: null }).success,
  ).toBe(true);
  expect(listingSchema.safeParse({ ...valid, isFree: true }).success).toBe(
    false,
  );
});
it("requires at least one campus and one distinct image", () => {
  expect(listingSchema.safeParse({ ...valid, campuses: [] }).success).toBe(
    false,
  );
  expect(listingSchema.safeParse({ ...valid, imageIds: [] }).success).toBe(
    false,
  );
  expect(
    listingSchema.safeParse({ ...valid, imageIds: ["same", "same"] }).success,
  ).toBe(false);
});
