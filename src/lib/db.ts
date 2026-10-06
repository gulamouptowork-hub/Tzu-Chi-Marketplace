import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ transactionOptions: { maxWait: 5000, timeout: 15000 } });
globalForPrisma.prisma = db;
