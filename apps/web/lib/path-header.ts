/**
 * Request header that middleware.ts fills with the path a visitor asked for
 * (pathname plus query), so lib/guard.ts can send a signed-out visitor to
 * /login?next=… and back again afterwards. No imports: middleware runs on the
 * edge runtime.
 */
export const PATH_HEADER = "x-th-path";
