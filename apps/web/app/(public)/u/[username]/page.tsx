import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { LedgerService } from "@tycoonhood/core";
import { Badge, Card, CardContent, RankBadge, SectionRule, Stat, ThcAmount } from "@tycoonhood/ui";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}
const ledger = new LedgerService(prisma);
const dt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow mb-2">Member</p>
      <h1 className="display text-[38px]">{profile.displayName}</h1>
      <p className="figures mt-1 text-[13px] text-ink-3">@{profile.username} · on the books since {dt.format(u.createdAt)}</p>
      {profile.bio && <p className="mt-4 max-w-xl text-ink-2">{profile.bio}</p>}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {show("level") && (
          <Card><CardContent className="py-4"><Stat label="Level" value={<span className="figures text-[22px]">L{u.level} · {u.xp.toLocaleString()} XP</span>} /></CardContent></Card>
        )}
        {show("rank") && u.rank && (
          <Card><CardContent className="py-4"><Stat label="Rank" value={<RankBadge slug={u.rank.slug} />} /></CardContent></Card>
        )}
        {show("streak") && (
          <Card><CardContent className="py-4"><Stat label="Streak" value={<span className="figures text-[22px]">🔥 {u.streak?.current ?? 0}</span>} /></CardContent></Card>
        )}
        {show("thc") && (
          <Card variant="gold"><CardContent className="py-4"><Stat label="THC" value={<ThcAmount amount={(await ledger.ensureUserAccount(u.id)).balance} size="sm" />} /></CardContent></Card>
        )}
      </div>

      {show("achievements") && u.achievements.length > 0 && (
        <>
          <SectionRule label="Achievements" className="mb-4 mt-10" />
          <div className="flex flex-wrap gap-2">
            {u.achievements.map((a) => (
              <Badge key={a.id} tone="gold">🏅 {a.achievement.name}</Badge>
            ))}
          </div>
        </>
      )}

      {show("courses") && u.certificates.length > 0 && (
        <>
          <SectionRule label="Certificates" className="mb-4 mt-10" />
          <div className="flex flex-col gap-2">
            {u.certificates.map((c) => (
              <p key={c.id} className="text-[14px] text-ink-1">
                🎓 {c.course.title}{" "}
                <Link href={`/verify/${c.serial}`} className="figures text-[12px] text-gold hover:underline underline-offset-4">
                  {c.serial}
                </Link>
              </p>
            ))}
          </div>
        </>
      )}

      <p className="mt-12 text-[11px] text-ink-3">Members choose what appears here. Absence of a figure means it's private, not zero.</p>
    </main>
  );
}
