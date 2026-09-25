import { referrals } from "@tycoonhood/core";
import { Badge, Card, CardContent, SectionRule, ThcAmount } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { MinerLogin } from "../../components/miner-login";
import { MinerHeader } from "../../components/miner-header";
import { InviteCode } from "../../components/invite-code";

export const dynamic = "force-dynamic";
const MAIN_SITE = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "http://localhost:3000";

export default async function SquadPage() {
  const user = await getCurrentUser();
  if (!user) return <MinerLogin mainSiteUrl={MAIN_SITE} />;
  if (!user.profile?.onboardedAt) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-24 pt-8">
        <MinerHeader name={user.name ?? "Miner"} />
        <p className="text-[13px] text-ink-2">
          Finish setting up your profile on the main site before inviting anyone.
        </p>
        <a href={`${MAIN_SITE}/onboarding`} className="mt-3 text-[13px] text-gold-bright underline">
          Finish onboarding
        </a>
      </main>
    );
  }

  const s = await referrals.summary(user.id);
  const link = `${MAIN_SITE}/register?ref=${s.code}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-24 pt-8">
      <MinerHeader name={user.profile.displayName} />

      <p className="eyebrow mb-1">Your squad</p>
      <h1 className="display text-[26px] leading-tight">Bring someone who will actually show up.</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
        Signing somebody up pays nothing. You both get paid when they finish
        their first lesson — so the only way to earn here is to bring someone
        real and help them start.
      </p>

      <InviteCode code={s.code} link={link} />

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Card><CardContent className="py-3">
          <p className="figures text-[18px]">{s.qualified}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-3">Qualified</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="figures text-[18px]">{s.pending}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-3">Started</p>
        </CardContent></Card>
        <Card><CardContent className="py-3">
          <p className="figures text-[18px]">{Number(s.earned).toLocaleString("en-US")}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-3">THC earned</p>
        </CardContent></Card>
      </div>

      <Card variant="gold" className="mt-3">
        <CardContent className="py-4">
          <p className="text-[13px] text-ink-1">
            <ThcAmount amount={s.perInvite} size="sm" /> to you, and{" "}
            <ThcAmount amount={s.welcomeBonus} size="sm" /> to them, the moment they
            finish their first lesson.
          </p>
        </CardContent>
      </Card>

      <SectionRule label="Who you brought" className="mb-4 mt-8" />
      {s.invites.length === 0 ? (
        <div className="rounded-md border border-dashed border-line px-4 py-8 text-center">
          <p className="text-[13px] text-ink-2">Nobody yet.</p>
          <p className="mt-1 text-[12px] text-ink-3">Send the link above to one person who would use this.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {s.invites.map((i, idx) => (
            <div key={idx} className="flex items-center justify-between border-b border-line py-2.5 last:border-0">
              <span className="text-[13px] text-ink-1">{i.name}</span>
              <Badge tone={i.status === "QUALIFIED" ? undefined : "neutral"}>
                {i.status === "QUALIFIED" ? "Paid" : "Not started"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-[11px] leading-relaxed text-ink-3">
        One referrer per member, for life. You cannot invite yourself, and a
        second code never overwrites the first.
      </p>
    </main>
  );
}
