import Link from "next/link";
import { Logo } from "@tycoonhood/ui";
import { getCurrentUser } from "../lib/auth";

const links = [
  ["/programs", "Programs"],
  ["/challenges", "Challenges"],
  ["/thc", "THC"],
  ["/marketplace", "Marketplace"],
  ["/blog", "Journal"],
] as const;

export async function SiteNav() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg-0/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="Tycoonhood home">
          <Logo size={24} />
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="text-[13px] font-medium tracking-wide text-ink-2 transition-colors hover:text-ink-1"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center rounded-md bg-gold px-4 text-[13px] font-semibold text-bg-0 hover:bg-gold-bright"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] text-ink-2 hover:text-ink-1">
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center rounded-md bg-gold px-4 text-[13px] font-semibold text-bg-0 hover:bg-gold-bright"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
