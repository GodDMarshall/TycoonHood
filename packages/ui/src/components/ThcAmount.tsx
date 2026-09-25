import { cn } from "../cn";
import { CoinMark } from "./Logo";

/**
 * A THC amount set as a ledger figure: mono, tabular, signed.
 * Credits are gold; debits are bone; a hairline underlines book style.
 */
export function ThcAmount({
  amount,
  signed = false,
  size = "md",
  ruled = false,
  className,
}: {
  amount: bigint | number;
  signed?: boolean;
  size?: "sm" | "md" | "lg";
  ruled?: boolean;
  className?: string;
}) {
  const n = typeof amount === "bigint" ? amount : BigInt(Math.trunc(amount));
  const negative = n < 0n;
  const abs = negative ? -n : n;
  const sign = negative ? "−" : signed ? "+" : "";
  const sizes = { sm: "text-[13px]", md: "text-[15px]", lg: "text-[22px]" } as const;
  const coin = { sm: 12, md: 14, lg: 18 } as const;
  return (
    <span
      className={cn(
        "figures inline-flex items-baseline gap-1.5",
        sizes[size],
        negative ? "text-ink-2" : signed ? "text-gold" : "text-ink-1",
        ruled && "border-b border-line pb-0.5",
        className
      )}
    >
      <span>
        {sign}
        {abs.toLocaleString("en-US")}
      </span>
      <span className="inline-flex translate-y-[1px] items-center gap-1 text-ink-3">
        <CoinMark size={coin[size]} />
        <span className="text-[0.72em] tracking-[0.08em]">THC</span>
      </span>
    </span>
  );
}
