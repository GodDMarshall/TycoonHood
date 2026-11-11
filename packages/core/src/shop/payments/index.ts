import type { HasRole } from "../../auth/permissions";
import { razorpayFromEnv } from "./razorpay";
import { sandboxProvider } from "./sandbox";
import { razorpayOpenTo, sandboxAllowed, type ShopPaymentProvider } from "./provider";

export * from "./provider";
export {
  RazorpayProvider, razorpayFromEnv, razorpayKeyMode, verifyCheckoutSignature, verifyWebhookSignature,
  hmacSha256Hex, safeEqualHex, type RazorpayWebhookEvent,
} from "./razorpay";
export { SandboxProvider, sandboxProvider } from "./sandbox";

/**
 * The provider a new rupee order from this buyer goes to right now: Razorpay,
 * the sandbox, or none. With Razorpay test keys in production, only a buyer
 * who holds admin.commerce gets Razorpay; nobody else gets a rail.
 */
export function activeShopProvider(env: Record<string, string | undefined> = process.env, buyer?: HasRole): ShopPaymentProvider | null {
  const razorpay = razorpayFromEnv(env);
  if (razorpay) return razorpayOpenTo(buyer, env) ? razorpay : null;
  if (sandboxAllowed(env)) return sandboxProvider;
  return null;
}
