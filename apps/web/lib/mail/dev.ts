/** DEV MAILER — honest dev boundary (D11). Only when DEV_MODE: logs the
 *  full message, link included, server-side and never claims real
 *  delivery. The pages say "Dev mode: nothing was emailed"; no link is
 *  ever shown in the browser (DR-2). */
import { isDevMode } from "@tycoonhood/config";
import type { Mailer } from "./mailer";

export const devMailer: Mailer = {
  name: "dev",
  get available() {
    return isDevMode();
  },
  async send(mail) {
    console.log(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return { delivered: false, detail: "Dev mailer — logged, not sent." };
  },
};
