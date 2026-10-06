import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
// All cards in a render share one query; only public point information is sent to the dialog.
export const activeExchangePoints = cache(() =>
  db.exchangePoint.findMany({
    where: { active: true },
    orderBy: [{ campus: "asc" }, { id: "asc" }],
    select: {
      id: true,
      campus: true,
      nameZh: true,
      nameEn: true,
      verified: true,
    },
  }),
);
