/**
 * The shell's header. Server-rendered; decides WHO is looking and hands the
 * matching map to the client half. Guests get the public districts and a
 * way in; members get their command system, their wallet and their rank.
 */
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { Icon, Logo, RankBadge, ThcAmount, buttonStyles } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { ACCOUNT_LINKS, GUEST_NAV, MEMBER_NAV, MEMBER_TABS } from "./nav-items";
import { AccountMenu, DesktopNav, MobileNav, SignOutButton } from "./nav-client";

const ledger = new LedgerService(prisma);
const MINER_URL = process.env.NEXT_PUBLIC_MINER_URL ?? "http://localhost:3001";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const member = user?.profile?.onboardedAt ? user : null;
  const wallet = member ? await ledger.ensureUserAccount(member.id) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg-0/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg-0/70">
      <div className="mx-auto flex h-16 max-w-[88rem] items-center gap-2 px-[var(--gutter)] sm:gap-4">
        <Link
          href={member ? "/dashboard" : "/"}
          aria-label={member ? "Tycoonhood — your command center" : "Tycoonhood home"}
          className="shrink-0 sm:mr-2 lg:mr-6"
        >
          <Logo size={26} />
        </Link>

        <div className="flex h-full flex-1 items-stretch">
          <DesktopNav items={member ? MEMBER_NAV : GUEST_NAV} />
        </div>

        {member && wallet ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/wallet"
              className="hidden h-10 items-center rounded-md border border-line px-3 transition-colors hover:border-gold-deep sm:flex"
              aria-label="Wallet balance"
            >
              <ThcAmount amount={wallet.balance} size="sm" />
            </Link>
            {member.rank && (
              <span className="hidden xl:block">
                <RankBadge slug={member.rank.slug} />
              </span>
            )}
            <div className="hidden lg:block">
              <AccountMenu
                name={member.profile?.displayName ?? member.name ?? "Member"}
                username={member.profile?.username ?? null}
                rankSlug={member.rank?.slug ?? null}
                isAdmin={member.role === "ADMIN"}
                minerUrl={MINER_URL}
                links={ACCOUNT_LINKS}
              />
            </div>
            <MobileNav
              heading="The house"
              items={MEMBER_NAV}
              tabs={MEMBER_TABS}
              secondary={[
                ...ACCOUNT_LINKS,
                ...(member.profile?.username
                  ? [{ href: `/u/${member.profile.username}`, label: "Profile", note: "", icon: "user" as const }]
                  : []),
                ...(member.role === "ADMIN" ? [{ href: "/admin", label: "The House", note: "", icon: "shield" as const }] : []),
              ]}
              footer={
                <div className="flex flex-col gap-3">
                  <a href={MINER_URL} className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}>
                    <Icon name="miner" size={16} /> Open the Miner
                  </a>
                  <SignOutButton />
                </div>
              }
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            {user && !member ? (
              <Link href="/onboarding" className={buttonStyles({ size: "sm" })}>
                Finish onboarding
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden px-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:text-ink-1 sm:inline"
                >
                  Sign in
                </Link>
                <Link href="/register" className={buttonStyles({ size: "sm", className: "px-4" })}>
                  Enter
                  <Icon name="arrow-right" size={14} className="transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </>
            )}
            <MobileNav
              heading="Tycoonhood"
              items={GUEST_NAV}
              secondary={[
                { href: "/about", label: "About", note: "", icon: "info" },
                { href: "/faq", label: "FAQ", note: "", icon: "quiz" },
              ]}
              footer={
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    Sign in
                  </Link>
                  <Link href="/register" className={buttonStyles({ size: "lg" })}>
                    Enter
                  </Link>
                </div>
              }
            />
          </div>
        )}
      </div>
    </header>
  );
}
