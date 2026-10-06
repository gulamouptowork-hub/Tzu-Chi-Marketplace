import { z } from "zod";
export const adminTabs = [
  "overview",
  "users",
  "listings",
  "exchanges",
  "reports",
  "activity",
] as const;
export const adminQuerySchema = z.object({
  tab: z.enum(adminTabs).default("overview"),
  q: z.string().trim().max(100).default(""),
  status: z
    .enum([
      "",
      "active",
      "onboarding",
      "suspended",
      "deleted",
      "hidden",
      "AVAILABLE",
      "RESERVED",
      "SOLD",
      "PROPOSED",
      "ACCEPTED",
      "COMPLETED",
      "CANCELLED",
      "OPEN",
      "RESOLVED",
    ])
    .default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  period: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .default(30),
});
export type AdminQuery = z.infer<typeof adminQuerySchema>;
export const ADMIN_PAGE_SIZE = 20;
