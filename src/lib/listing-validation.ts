import { z } from "zod";
export const listingSchema = z
  .object({
    title: z.string().trim().min(2).max(100),
    description: z.string().trim().min(10).max(5000),
    categoryId: z.string().min(1),
    condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]),
    priceNtd: z.number().int().min(0).max(1000000).nullable(),
    isFree: z.boolean(),
    openToTrade: z.boolean(),
    campuses: z
      .array(z.enum(["JIEREN", "JIANGUO", "CENTRAL"]))
      .min(1)
      .max(3),
    meetupLocation: z.string().min(1).max(200),
    imageIds: z.array(z.string().min(1)).min(1).max(6),
  })
  .superRefine((value, ctx) => {
    if (value.isFree && value.openToTrade)
      ctx.addIssue({
        code: "custom",
        path: ["priceNtd"],
        message: "Choose one pricing mode",
      });
    if (
      !value.isFree &&
      !value.openToTrade &&
      (value.priceNtd === null || value.priceNtd < 1)
    )
      ctx.addIssue({
        code: "custom",
        path: ["priceNtd"],
        message: "A positive price is required",
      });
    if ((value.isFree || value.openToTrade) && value.priceNtd !== null)
      ctx.addIssue({
        code: "custom",
        path: ["priceNtd"],
        message: "Price must be empty for free or trade",
      });
    if (new Set(value.imageIds).size !== value.imageIds.length)
      ctx.addIssue({
        code: "custom",
        path: ["imageIds"],
        message: "Duplicate image",
      });
  });
