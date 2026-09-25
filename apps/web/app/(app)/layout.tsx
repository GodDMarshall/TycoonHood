import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Button, Logo, RankBadge } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { logoutAction } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.profile?.onboardedAt) redirect("/onboarding");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-bg-1/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-7">
            <Link href="/dashboard">
              <Logo size={24} />
            </Link>
            <nav className="hidden items-center gap-5 md:flex">
              {[["/academy", "Academy"], ["/challenges", "Challenges"], ["/leaderboard", "Leaderboard"], ["/wallet", "Wallet"], ["/orders", "Orders"], ["/settings", "Settings"]].map(([href, label]) => (
                <Link key={href} href={href} className="text-[13px] text-ink-2 hover:text-ink-1">{label}</Link>
              ))}
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-[13px] font-semibold text-gold-deep hover:text-gold">The house</Link>
              )}
              <a href={process.env.NEXT_PUBLIC_MINER_URL ?? "http://localhost:3001"} className="text-[13px] font-semibold text-gold hover:text-gold-bright">Miner ⛏</a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user.rank && <RankBadge slug={user.rank.slug} />}
            <span className="text-[13px] text-ink-2">{user.profile.displayName}</span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
    </div>
  );
}
