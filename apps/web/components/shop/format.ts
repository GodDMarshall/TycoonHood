/** Formatting for shop pages. Plain module (not "use client") so server and client both import it. */
export const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);

export const orderRef = (id: string) => id.slice(-6).toUpperCase();

export const shortDate = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
export const dateTime = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const KIND_LABEL: Record<string, string> = {
  DIGITAL: "Digital",
  PHYSICAL: "Gear",
  COURSE: "Program access",
  MEMBERSHIP: "Membership",
};

/** Fiat amount in whatever currency it was recorded in (legacy orders may be USD). */
export const money = (cents: number, currency: string) =>
  currency === "INR"
    ? inr(cents)
    : new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(cents / 100);
