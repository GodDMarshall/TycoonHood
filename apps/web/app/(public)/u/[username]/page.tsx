import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { Avatar, Badge, CoinMark, Icon, RankBadge, ThcAmount } from "@tycoonhood/ui";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  // Member pages are personal: reachable, but kept out of search indexes.
  return { title: `@${username}`, robots: { index: false, follow: false } };
}
const ledger = new LedgerService(prisma);
const dt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

/**
 * A member's identity card. A professional record, not a social feed:
 * who they are here, what they have verifiably done, and nothing the
 * member chose to keep private (spec §10 / D24).
 */
export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await prisma.profile.findUnique({
    where: { username },
    include: {
      user: {
        include: {
          rank: true,
          streak: true,
          achievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" } },
          certificates: { include: { course: true }, orderBy: { issuedAt: "desc" } },
        },
      },
    },
  });
  if (!profile) notFound();
  const u = profile.user;
  const privacy = (profile.privacy ?? {}) as Record<string, boolean>;
  const show = (k: string) => privacy[k] !== false;
  const balance = show("thc") ? (await ledger.ensureUserAccount(u.id)).balance : null;

  const facts: { label: string; value: ReactNode }[] = [];
  if (show("level")) facts.push({ label: "Level", value: <span className="figures">L{u.level} · {u.xp.toLocaleString("en-US")} XP</span> });
  if (show("streak"))
    facts.push({
      label: "Streak",
      value: (
        <span className="figures">
          {u.streak?.current ?? 0} <span className="text-ink-3">{(u.streak?.current ?? 0) === 1 ? "day" : "days"}</span>
        </span>
      ),
    });
  if (balance !== null) facts.push({ label: "THC", value: <ThcAmount amount={balance} size="sm" /> });

  return (
    <main className="mx-auto max-w-4xl px-[var(--gutter)] py-16 md:py-24">
      {/* The card */}
      <section
        aria-label={`${profile.displayName}'s identity card`}
        className="frame-ticks relative overflow-hidden rounded-xl border border-line-strong bg-[linear-gradient(140deg,var(--color-bg-3),var(--color-bg-1)_55%)] shadow-[var(--shadow-3)]"
      >
        <div className="grid-plane pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <CoinMark size={260} className="pointer-events-none absolute -right-16 -top-16 opacity-[0.06]" />
        <div className="relative grid gap-8 p-7 md:grid-cols-[auto_1fr] md:p-10">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size={96} />
          <div className="min-w-0">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-gold">Tycoonhood member</p>
            <h1 className="display mt-2 text-h1">{profile.displayName}</h1>
            <p className="figures mt-2 text-[13px] text-ink-3">
              @{profile.username} · on the books since {dt.format(u.createdAt)}
            </p>
            {show("rank") && u.rank && <RankBadge slug={u.rank.slug} className="mt-4" />}
            {profile.bio && <p className="mt-5 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{profile.bio}</p>}
          </div>
        </div>
        {facts.length > 0 && (
          <dl className="relative grid border-t border-line sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="border-line px-7 py-5 max-sm:border-b sm:border-r sm:last:border-r-0 md:px-10">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-3">{f.label}</dt>
                <dd className="mt-2 text-[16px]">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {show("courses") && u.certificates.length > 0 && (
        <section aria-labelledby="certs" className="mt-12">
          <h2 id="certs" className="eyebrow mb-4">
            Certificates
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {u.certificates.map((c) => (
              <li key={c.id}>
                <Link href={`/verify/${c.serial}`} className="group flex items-center gap-4 rounded-lg border border-line bg-bg-1 p-5 transition-colors hover:border-gold-deep">
                  <Icon name="seal" size={28} className="text-gold" />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium">{c.course.title}</span>
                    <span className="figures block text-[11.5px] text-ink-3 group-hover:text-gold">Verify {c.serial}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {show("achievements") && u.achievements.length > 0 && (
        <section aria-labelledby="ach" className="mt-12">
          <h2 id="ach" className="eyebrow mb-4">
            Achievements
          </h2>
          <ul className="flex flex-wrap gap-2">
            {u.achievements.map((a) => (
              <li key={a.id}>
                <Badge tone="gold">
                  <Icon name="seal" size={12} /> {a.achievement.name}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-14 flex items-center gap-2 text-[12px] text-ink-3">
        <Icon name="eye" size={14} /> Members choose what appears here. An absent figure means private, not zero.
      </p>
    </main>
  );
}
