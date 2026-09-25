/** DEV PROVIDER — honest dev-mode boundary (Blueprint D11). Only exists
 *  when DEV_MODE=true; settles instantly with zero real charging, and the
 *  UI labels it loudly. Never enabled in production builds. */
import { commerce } from "@tycoonhood/core";
import { isDevMode } from "@tycoonhood/config";
import type { PaymentProvider } from "./provider";

export const devProvider: PaymentProvider = {
  name: "dev",
  get available() {
    // isDevMode() is already false in production and unless DEV_MODE==="true".
    return isDevMode();
  },
  async createCheckout(order) {
    await commerce.settleFiatOrder(order.id, `dev_${order.id}`);
    return { kind: "settled" };
  },
};
