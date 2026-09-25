import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Singleton Prisma client — engine-free (new-generation generator + pg
 * driver adapter). The generated client lives in src/generated and is
 * committed: deterministic builds, no postinstall downloads, anywhere.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function build() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env (see README)");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.PRISMA_LOG ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

export const prisma = globalForPrisma.prisma ?? build();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "./generated/client";
