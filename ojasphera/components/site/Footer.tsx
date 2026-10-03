import Link from "next/link";
import { footerLinks, site } from "@/lib/site";
import { Mark } from "./Logo";

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-line bg-void">
      <Mark
        size={720}
        className="pointer-events-none absolute -bottom-[340px] -right-[160px] -z-10 text-white/[0.035]"
        spark="rgb(242 180 90 / 0.12)"
      />
      <div className="shell grid gap-14 py-20 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="flex items-center gap-4 text-ink">
            <Mark size={40} />
            <span className="text-[15px] font-semibold tracking-[0.18em]">
              OJASPHERA <span className="ml-3 border-l border-line-strong pl-3 font-medium text-ink-3">LABS</span>
            </span>
          </div>
          <p className="eyebrow mt-6">{site.footerPillars.join(" • ")}</p>
          <p className="mt-6 max-w-sm text-2xl font-medium leading-tight tracking-tight text-ink-2">{site.tagline}</p>
        </div>
        <nav aria-label="Footer" className="md:col-span-3">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-1">
            {footerLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-ink-2 transition-colors hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-3">
          <p className="eyebrow">Start</p>
          <Link href="/build" className="link-arrow mt-3 text-lg">
            Start a project <span className="arrow">→</span>
          </Link>
          {site.contactEmail ? (
            <a href={`mailto:${site.contactEmail}`} className="mt-3 block text-sm text-ink-2 hover:text-ink">
              {site.contactEmail}
            </a>
          ) : null}
        </div>
      </div>
      <div className="shell flex flex-col gap-3 border-t border-line py-6 text-xs text-ink-3 md:flex-row md:items-center md:justify-between">
        <p>
          © {new Date().getFullYear()} {site.legalName}
        </p>
        <p className="mono">{site.domain}</p>
      </div>
    </footer>
  );
}
