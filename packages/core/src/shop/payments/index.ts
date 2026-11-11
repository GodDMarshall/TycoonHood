import { razorpayFromEnv } from "./razorpay";
import { sandboxProvider } from "./sandbox";
import { sandboxAllowed, type ShopPaymentProvider } from "./provider";

export * from "./provider";
export {
  RazorpayProvider, razorpayFromEnv, verifyCheckoutSignature, verifyWebhookSignature,
  hmacSha256Hex, safeEqualHex, type RazorpayWebhookEvent,
} from "./razorpay";
export { SandboxProvider, sandboxProvider } from "./sandbox";

/** The provider new rupee orders go to right now: Razorpay, the sandbox, or none. */
export function activeShopProvider(env: Record<string, string | undefined> = process.env): ShopPaymentProvider | null {
  const live = razorpayFromEnv(env);
  if (live) return live;
  if (sandboxAllowed(env)) return sandboxProvider;
  return null;
}
