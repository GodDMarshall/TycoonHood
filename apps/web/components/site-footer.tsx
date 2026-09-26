import Link from "next/link";
import { CoinMark } from "@tycoonhood/ui";

const columns: [string, [string, string][]][] = [
  ["The HQ", [["/programs", "Academy"], ["/challenges", "Arena"], ["/marketplace", "Vault"], ["/thc", "Treasury"]]],
  ["Open books", [["/status", "Live figures"], ["/thc", "How THC works"], ["/roadmap", "Roadmap"]]],
  ["The house", [["/about", "About"], ["/blog", "Journal"], ["/faq", "FAQ"]]],
  ["Legal", [["/terms", "Terms"], ["/privacy", "Privacy"], ["/thc#disclosure", "THC disclosure"]]],
];

export function SiteFooter() {
  return (
    <footer className="relative mt-20 border-t border-line bg-bg-1/60">
      <div className="mx-auto grid max-w-[88rem] gap-12 px-[var(--gutter)] py-16 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div className="flex flex-col gap-5">
          <CoinMark size={34} />
          <p className="display max-w-[16ch] text-[26px] leading-[1.05]">
            Build yourself. <span className="accent">The rest compounds.</span>
          </p>
        </div>
        {columns.map(([title, items]) => (
          <nav key={title} aria-label={title}>
            <p className="eyebrow mb-5 text-ink-3">{title}</p>
            <ul className="flex flex-col gap-3">
              {items.map(([href, label]) => (
                <li key={href + label}>
                  <Link href={href} className="text-[14px] text-ink-2 transition-colors hover:text-gold-bright">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-2 px-[var(--gutter)] py-6 text-[12px] leading-relaxed text-ink-3 md:flex-row md:items-center md:justify-between">
          <span className="figures">© {new Date().getFullYear()} Tycoonhood</span>
          <span className="max-w-[70ch]">
            THC are internal utility credits — not currency, not an investment, not redeemable for money.
          </span>
        </div>
      </div>
    </footer>
  );
}
