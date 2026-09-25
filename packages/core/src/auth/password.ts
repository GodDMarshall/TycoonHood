/**
 * Password hashing — Argon2id via @node-rs/argon2 (prebuilt N-API,
 * no toolchain required on any OS). Parameters follow OWASP guidance:
 * memory 19 MiB, iterations 2, parallelism 1.
 */
import { hash, verify } from "@node-rs/argon2";

const PARAMS = {
  algorithm: 2, // Algorithm.Argon2id (const enum unusable under isolatedModules)
  memoryCost: 19 * 1024, // KiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, PARAMS);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false; // malformed hash → treat as non-match, never throw at callers
  }
}
