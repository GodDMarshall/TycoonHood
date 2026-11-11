/**
 * Turns a validation failure from @tycoonhood/core (a ZodError, which the web
 * app does not import directly) into the first human message.
 */
type Issues = { issues: { message?: string; path?: (string | number)[] }[] };

export function isZodError(e: unknown): e is Issues {
  return !!e && typeof e === "object" && "issues" in e && Array.isArray((e as { issues: unknown }).issues);
}

export function zodMessage(e: Issues): string {
  return e.issues[0]?.message ?? "Check the form and try again.";
}
