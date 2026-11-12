/**
 * /connect — the public Community page. What is inside, the guidelines in
 * full, and an honest word on outside platforms. Every number is a count of
 * real rows; a zero is simply not shown.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { discussions } from "@tycoonhood/core";
import { Icon, SectionRule, buttonStyles, type IconName } from "@tycoonhood/ui";
import { RoomHeader } from "../../../components/room-header";
import { getCurrentUser } from "../../../lib/auth";
import { COMMUNITY_GUIDELINES } from "../../../lib/community-guidelines";

export const metadata: Metadata = {
  title: "Community",
  description: "Discussions, groups, programme channels, challenges and wins — inside the Tycoonhood app, with rules that keep it useful.",
};
export const dynamic = "force-dynamic";

const INSIDE: { icon: IconName; title: string; body: string }[] = [
  { icon: "chat", title: "Discussions", body: "Posts that stay findable: a question and its answers, a write-up, a lesson learned. Categories for introductions, wins, questions and each pillar." },
  { icon: "user", title: "Groups", body: "Smaller rooms around one programme or one kind of work. Anyone can read; members of the group post." },
  { icon: "hash", title: "Programme channels", body: "Live chat for each programme, open to the people enrolled in it. Questions asked from a lesson carry that lesson." },
  { icon: "target", title: "Challenges", body: "Time-boxed commitments with real criteria. They can be failed, and the record keeps that too." },
  { icon: "trophy", title: "Wins", body: "Results shared with proof: a link, a number, a screenshot of the thing done. A claim without proof is a story." },
];

export default async function ConnectPage() {
  const [user, counts, channels, challenges] = await Promise.all([
    getCurrentUser(),
    discussions.publicCounts(),
    prisma.channel.count({ where: { archivedAt: null, courseId: { not: null } } }),
    prisma.challenge.count({ where: { lifecycle: { in: ["ACTIVE", "UPCOMING"] } } }),
  ]);
  const figures = [
    { n: counts.discussions, label: counts.discussions === 1 ? "discussion" : "discussions" },
    { n: counts.groups, label: counts.groups === 1 ? "group" : "groups" },
    { n: channels, label: channels === 1 ? "programme channel" : "programme channels" },
    { n: challenges, label: challenges === 1 ? "open challenge" : "open challenges" },
  ].filter((f) => f.n > 0);
  const signedIn = !!user;

  return (
    <main>
      <RoomHeader
        icon="chat"
        room="Community"
        title="People doing the work,"
        accent="together."
        lead="The community lives inside the app, next to the lessons. It exists to help you finish what you started, not to keep you scrolling."
      >
        <Link href={signedIn ? "/community/discussions" : "/register"} className={buttonStyles({ size: "lg" })}>
          {signedIn ? "Open the community" : "Join free"}
        </Link>
        {!signedIn && (
          <Link href="/login" className={buttonStyles({ size: "lg", variant: "outline" })}>
            Sign in
          </Link>
        )}
      </RoomHeader>

      <div className="mx-auto max-w-[72rem] px-[var(--gutter)] py-16 md:py-20">
        {figures.length > 0 && (
          <dl className="mb-14 flex flex-wrap gap-x-10 gap-y-4">
            {figures.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="text-ink-2">
                  <span className="figures text-[28px] font-semibold text-ink-1">{f.n.toLocaleString("en-US")}</span> <span className="text-[14px]">{f.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}

        <SectionRule label="What is inside" className="mb-8" />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INSIDE.map((i) => (
            <li key={i.title} className="rounded-lg border border-line bg-bg-1 p-6">
              <span className="flex size-9 items-center justify-center rounded-md border border-line-strong text-gold">
                <Icon name={i.icon} size={16} />
              </span>
              <h2 className="display mt-4 text-[19px]">{i.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{i.body}</p>
            </li>
          ))}
        </ul>

        <SectionRule label="Community guidelines" className="mb-8 mt-16" />
        <ol className="grid gap-x-10 gap-y-7 md:grid-cols-2">
          {COMMUNITY_GUIDELINES.map((g, idx) => (
            <li key={g.title} className="flex gap-4">
              <span className="figures mt-0.5 text-[14px] text-gold-deep">{String(idx + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="display text-[18px]">{g.title}</h3>
                <p className="mt-1.5 max-w-[56ch] text-[14px] leading-relaxed text-ink-2">{g.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
          Breaking these gets content hidden or removed and, for repeat or serious cases, a mute: you can still read, but not post. Staff actions are logged.
        </p>

        <SectionRule label="Discord and Telegram" className="mb-6 mt-16" />
        <p className="max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
          Everything here works inside the app. Discord and Telegram are optional integrations we may add later — for example a server where your rank shows as a
          role. They will never be required to take part, learn, or earn, and nothing in the community is held back for people on another platform.
        </p>

        <div className="mt-16 flex flex-col items-start gap-4 rounded-lg border border-line bg-bg-1 p-8">
          <h2 className="display text-[22px]">{signedIn ? "The room is open." : "Come and do the work with us."}</h2>
          <p className="max-w-[60ch] text-[14.5px] leading-relaxed text-ink-2">
            {signedIn ? "Introduce yourself, ask the question you have been sitting on, or share a win with proof." : "Creating an account is free. The community and the daily standard open as soon as you finish onboarding."}
          </p>
          <Link href={signedIn ? "/community/discussions" : "/register"} className={buttonStyles({ size: "md" })}>
            {signedIn ? "Go to discussions" : "Join free"}
          </Link>
        </div>
      </div>
    </main>
  );
}
