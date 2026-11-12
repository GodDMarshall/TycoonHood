/** Types for db-target.mjs, which the node scripts import as plain JavaScript. */
export interface DatabaseTarget {
  url: string;
  from: "DATABASE_URL" | "DATABASE_URL_UNPOOLED";
}
export function databaseTarget(env?: Record<string, string | undefined>): DatabaseTarget;
export function differentDatabases(a: string, b: string): boolean;
export function isPooled(url: string): boolean;
export function where(url: string): string;
export function redacted(url: string): string;
