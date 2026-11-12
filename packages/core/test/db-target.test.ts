/**
 * WHICH DATABASE A DEPLOY STEP USES (review finding 19, follow-up).
 *
 * The deploy lock and the migrations use DATABASE_URL_UNPOOLED when it is
 * set, and the seeds use DATABASE_URL. packages/db/scripts/db-target.mjs picks
 * the one address that the lock, the migrations and the seeds all use, and it
 * refuses when the two variables plainly name different databases.
 *
 * Only the addresses are compared. These are the pairs it must refuse, and
 * the pairs it must accept: a pooler on a host or port of its own is still
 * the same database.
 */
import { describe, it, expect } from "vitest";
import { databaseTarget, differentDatabases, where } from "../../db/scripts/db-target.mjs";

const NEON = "postgresql://u:p@ep-quiet-lake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require";
const NEON_POOLED = "postgresql://u:p@ep-quiet-lake-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require";
const NEON_OTHER = "postgresql://u:p@ep-bold-sun-654321.us-east-2.aws.neon.tech/neondb?sslmode=require";

describe("two addresses of one database", () => {
  it.each([
    ["the same address", NEON, NEON],
    ["Neon's pooled and direct addresses of one endpoint", NEON_POOLED, NEON],
    [
      "Vercel Postgres's pooled and direct addresses",
      "postgres://u:p@ep-x-pooler.us-east-1.postgres.vercel-storage.com/verceldb",
      "postgres://u:p@ep-x.us-east-1.postgres.vercel-storage.com/verceldb",
    ],
    [
      "Supabase's shared pooler and the direct address",
      "postgresql://postgres.abcdefghij:p@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
      "postgresql://postgres:p@db.abcdefghij.supabase.co:5432/postgres",
    ],
    ["a pooler on its own port of the same host", "postgresql://u:p@db.example.com:6432/app", "postgresql://u:p@db.example.com:5432/app"],
    [
      "RDS Proxy and its cluster",
      "postgresql://u:p@app.proxy-abc.us-east-1.rds.amazonaws.com/app",
      "postgresql://u:p@app.cluster-abc.us-east-1.rds.amazonaws.com/app",
    ],
    ["other credentials, options and capitals", "postgresql://a:x@localhost:5432/app?sslmode=disable", "postgresql://b:y@LOCALHOST/app"],
  ])("%s are not refused", (_, a, b) => {
    expect(differentDatabases(a, b)).toBe(false);
    expect(differentDatabases(b, a)).toBe(false);
  });

  it.each([
    ["two database names on one server", "postgresql://u:p@localhost:5432/tycoonhood_dev", "postgresql://u:p@localhost:5432/tycoonhood"],
    ["a local database and a Neon one", "postgresql://u:p@localhost:5432/tycoonhood", NEON],
    ["a local database of the same name and a Neon one", "postgresql://u:p@localhost:5432/neondb", NEON],
    ["two Neon endpoints", NEON_POOLED, NEON_OTHER],
    ["Neon's pooled address and a direct address elsewhere", NEON_POOLED, "postgresql://u:p@db.example.com/neondb"],
  ])("%s are different databases", (_, a, b) => {
    expect(differentDatabases(a, b)).toBe(true);
    expect(differentDatabases(b, a)).toBe(true);
  });
});

describe("the address a deploy step uses", () => {
  it("is DATABASE_URL_UNPOOLED when it is set, else DATABASE_URL, and names the variable", () => {
    expect(databaseTarget({ DATABASE_URL: NEON_POOLED, DATABASE_URL_UNPOOLED: NEON })).toEqual({ url: NEON, from: "DATABASE_URL_UNPOOLED" });
    expect(databaseTarget({ DATABASE_URL: NEON })).toEqual({ url: NEON, from: "DATABASE_URL" });
    expect(databaseTarget({ DATABASE_URL: NEON, DATABASE_URL_UNPOOLED: "" })).toEqual({ url: NEON, from: "DATABASE_URL" });
    expect(databaseTarget({ DATABASE_URL_UNPOOLED: NEON })).toEqual({ url: NEON, from: "DATABASE_URL_UNPOOLED" });
  });

  it("is refused when the two name different databases, naming both without their passwords", () => {
    const mixed = { DATABASE_URL: "postgresql://u:local-secret@localhost:5432/tycoonhood", DATABASE_URL_UNPOOLED: NEON };
    expect(() => databaseTarget(mixed)).toThrow(
      "DATABASE_URL and DATABASE_URL_UNPOOLED name different databases (localhost:5432/tycoonhood and ep-quiet-lake-123456.us-east-2.aws.neon.tech/neondb)."
    );
    expect(() => databaseTarget(mixed)).not.toThrow(/local-secret/);
  });

  it("is refused when neither is set", () => {
    expect(() => databaseTarget({})).toThrow("DATABASE_URL is not set.");
  });

  it("is shown as host and database, never with the password", () => {
    expect(where("postgresql://u:secret@ep-x-pooler.eu-central-1.aws.neon.tech:5432/neondb?sslmode=require")).toBe(
      "ep-x-pooler.eu-central-1.aws.neon.tech:5432/neondb"
    );
  });
});
