import Link from "next/link";
import { CoinMark } from "@tycoonhood/ui";

const columns: [string, [string, string][]][] = [
  ["Build", [["/programs", "Programs"], ["/challenges", "Challenges"], ["/marketplace", "Marketplace"]]],
  ["Economy", [["/thc", "THC"], ["/status", "Open books"], ["/roadmap", "Roadmap"]]],
  ["House", [["/about", "About"], ["/blog", "Journal"], ["/faq", "FAQ"]]],
  ["Legal", [["/terms", "Terms"], ["/privacy", "Privacy"], ["/thc", "THC disclosure"]]],
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-5">
        <div className="flex flex-col gap-3">
          <CoinMark size={26} />
          <p className="max-w-[24ch] text-[13px] leading-relaxed text-ink-3">
            Build yourself. Build skills. Build businesses. Build wealth. Build freedom.
          </p>
        </div>
        {columns.map(([title, items]) => (
          <div key={title}>
            <p className="eyebrow mb-4">{title}</p>
            <ul className="flex flex-col gap-2.5">
              {items.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-[13px] text-ink-2 hover:text-ink-1">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-[12px] text-ink-3 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Tycoonhood. All rights reserved.</span>
          <span>
            THC are internal utility credits — not currency, not an investment, not redeemable for money.
          </span>
        </div>
      </div>
    </footer>
  );
}
