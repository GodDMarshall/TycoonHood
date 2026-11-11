import { Icon } from "@tycoonhood/ui";

/** Persistent label for test-mode payments (the sandbox, or Razorpay test keys). Shown wherever a TEST payment appears. */
export function TestModeBanner({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-[13.5px] text-warning ${className}`}
    >
      <Icon name="alert" size={16} className="mt-[2px] shrink-0" />
      <p>
        <strong className="font-semibold">Test mode — no real money is charged.</strong>{" "}
        <span className="text-ink-2">Rupee payments here are test payments. Test orders never count as revenue.</span>
      </p>
    </div>
  );
}
