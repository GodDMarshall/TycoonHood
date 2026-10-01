/**
 * The public website's header. Guests get the site's sections and a way in;
 * a signed-in member gets one door back into the app.
 */
import Link from "next/link";
import { Icon, Logo, buttonStyles } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { GUEST_NAV } from "./nav-items";
import { DesktopNav, MobileNav } from "./nav-client";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const member = !!user?.profile?.onboardedAt;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg-0/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg-0/70">
      <div className="mx-auto flex h-16 max-w-[88rem] items-center gap-2 px-[var(--gutter)] sm:gap-4">
        <Link href="/" aria-label="Tycoonhood home" className="shrink-0 sm:mr-2 lg:mr-6">
          <Logo size={26} />
        </Link>
        <div className="flex h-full flex-1 items-stretch">
          <DesktopNav items={GUEST_NAV} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {member ? (
            <Link href="/today" className={buttonStyles({ size: "sm", className: "px-4" })}>
              Open the app <Icon name="arrow-right" size={14} />
            </Link>
          ) : user ? (
            <Link href="/onboarding" className={buttonStyles({ size: "sm" })}>
              Finish setting up
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink-1 sm:inline">
                Sign in
              </Link>
              <Link href="/register" className={buttonStyles({ size: "sm", className: "px-4" })}>
                Join free
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
              member ? (
                <Link href="/today" className={buttonStyles({ size: "lg", className: "w-full" })}>
                  Open the app
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    Sign in
                  </Link>
                  <Link href="/register" className={buttonStyles({ size: "lg" })}>
                    Join free
                  </Link>
                </div>
              )
            }
          />
        </div>
      </div>
    </header>
  );
}
