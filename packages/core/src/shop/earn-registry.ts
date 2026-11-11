/**
 * The shop's one-way dependency on the affiliate programme.
 *
 * By default the registry resolves to the EARN programme's `affiliates`
 * service, so it is wired with no extra setup. setEarnHooks(x) replaces it
 * (tests register a spy); setEarnHooks(null) switches the hooks off. A hook that throws
 * is logged, never surfaced: an attribution failure must not fail a payment
 * that has already been taken (see earn/hooks.ts).
 *
 * Stored on globalThis so a bundler that duplicates this module (server
 * actions vs. route handlers) still sees one registry.
 */
import type { EarnHooks } from "../earn/hooks";
import { affiliates } from "../earn/affiliates";

const KEY = Symbol.for("tycoonhood.shop.earnHooks");
type Holder = { [KEY]?: EarnHooks | null | undefined };

export function setEarnHooks(hooks: EarnHooks | null | undefined) {
  (globalThis as Holder)[KEY] = hooks;
}

export function getEarnHooks(): EarnHooks | null {
  const h = globalThis as Holder;
  // undefined = never set → the default; null = explicitly switched off.
  return h[KEY] === undefined ? affiliates : h[KEY];
}

export async function callEarnHook(name: keyof EarnHooks, orderId: string) {
  const hooks = getEarnHooks();
  if (!hooks) return;
  try {
    await hooks[name](orderId);
  } catch (e) {
    console.error(`[shop] earn hook ${name}(${orderId}) failed`, e);
  }
}
