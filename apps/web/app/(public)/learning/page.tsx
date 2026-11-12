import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { Icon, PillarBadge, buttonStyles, type IconName } from "@tycoonhood/ui";
import { getCurrentUser } from "../../../lib/auth";

export const metadata: Metadata = {
  title: "How learning works",
  description:
    "Programmes of modules and lessons, opened in order. A knowledge check closes each module, a final assessment closes each programme, and passing it earns a certificate anyone can verify.",
  alternates: { canonical: "/learning" },
};
export const dynamic = "force-dynamic";

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "academy",
    title: "Programmes",
    body: "Four programmes, one per pillar. Each is a complete sequence, free to enroll in, taken at your own pace.",
  },
  {
    icon: "book",
    title: "Modules",
    body: "Every module states what you will be able to do when you finish it, and exactly what completes it.",
  },
  {
    icon: "lock",
    title: "Lessons, in order",
    body: "Readings, assignments and videos open one after another, so you always know the one next step. Finished lessons stay open for review.",
  },
  {
    icon: "quiz",
    title: "Knowledge checks",
    body: "A module ends in a short check. Pass it to move on. Every answer is explained and retries are unlimited.",
  },
  {
    icon: "target",
    title: "Final assessment",
    body: "One assessment across the whole programme. It is the last lesson, and it is what the certificate stands on.",
  },
  {
    icon: "seal",
    title: "Certificate",
    body: "Complete every lesson and pass the final assessment to receive a certificate with a public serial anyone can verify.",
  },
  {
    icon: "bolt",
    title: "XP",
    body: "Each lesson pays XP the first time you complete it, and finishing a programme pays a completion bonus. XP raises your level and rank.",
  },
];

/** The public "Learning" page: how the academy works, with real counts from the database. */
export default async function LearningPage() {
  const [user, courses] = await Promise.all([
    getCurrentUser(),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        pillar: true,
        xpOnCompletion: true,
        modules: { select: { lessons: { select: { type: true, isFinal: true, xpReward: true } } } },
      },
    }),
  ]);
  const member = !!user?.profile?.onboardedAt;
  const rows = courses.map((c) => {
    const lessons = c.modules.flatMap((m) => m.lessons);
    return {
      ...c,
      moduleCount: c.modules.length,
      lessonCount: lessons.length,
      checks: lessons.filter((l) => l.type === "QUIZ" && !l.isFinal).length,
      hasFinal: lessons.some((l) => l.isFinal),
      xp: lessons.reduce((n, l) => n + l.xpReward, 0) + c.xpOnCompletion,
    };
  });
  const totalLessons = rows.reduce((n, r) => n + r.lessonCount, 0);

  return (
    <main>
      <header className="border-b border-line">
        <div className="mx-auto max-w-[88rem] px-[var(--gutter)] pb-14 pt-16 md:pb-20 md:pt-24">
          <p className="eyebrow">Learning</p>
          <h1 className="display mt-4 max-w-[18ch] text-display">How learning works here.</h1>
          <p className="mt-6 max-w-[62ch] text-lead text-ink-2">
            {rows.length} programme{rows.length === 1 ? "" : "s"} and {totalLessons} lessons, each one opened in order. You always know the next step, and
            every certificate stands on a passed final assessment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={member ? "/courses" : "/register"} className={buttonStyles({ size: "lg" })}>
              {member ? "Go to your courses" : "Join free"} <Icon name="arrow-right" size={16} />
            </Link>
            <Link href="/programs" className={buttonStyles({ variant: "secondary", size: "lg" })}>
              Browse the programmes
            </Link>
          </div>
        </div>
      </header>

      <section aria-labelledby="steps" className="mx-auto max-w-[88rem] px-[var(--gutter)] py-16">
        <h2 id="steps" className="eyebrow mb-8">
          The path
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-line bg-bg-1 p-6">
              <div className="flex items-center gap-3">
                <span className="figures text-[13px] text-gold">{String(i + 1).padStart(2, "0")}</span>
                <Icon name={s.icon} size={18} className="text-ink-2" />
              </div>
              <h3 className="mt-3 text-[18px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="programmes" className="border-t border-line">
        <div className="mx-auto max-w-[88rem] px-[var(--gutter)] py-16">
          <h2 id="programmes" className="eyebrow mb-8">
            The programmes
          </h2>
          {rows.length === 0 ? (
            <p className="text-[15px] text-ink-3">No programmes are published yet.</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {rows.map((c) => (
                <li key={c.id}>
                  <Link href={`/programs/${c.slug}`} className="flex h-full flex-col rounded-lg border border-line bg-bg-1 p-6 transition-colors hover:border-gold-deep">
                    <PillarBadge pillar={c.pillar} />
                    <span className="display mt-3 text-[22px]">{c.title}</span>
                    {c.subtitle && <span className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{c.subtitle}</span>}
                    <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-4 text-[13px] sm:grid-cols-4">
                      {[
                        ["Modules", c.moduleCount],
                        ["Lessons", c.lessonCount],
                        ["Checks", c.checks],
                        ["XP", `+${c.xp.toLocaleString("en-US")}`],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-ink-3">{k}</dt>
                          <dd className="figures mt-0.5 text-ink-1">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <span className="mt-4 text-[13px] text-ink-3">{c.hasFinal ? "Ends in a final assessment and certificate." : "Final assessment in preparation."}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-8 max-w-[70ch] text-[13px] leading-relaxed text-ink-3">
            Programmes are educational. Financial Planning and Investment Advisory is not personalised financial, investment, tax or legal advice; Mindfulness
            and Wellness is not medical or psychological treatment.
          </p>
        </div>
      </section>
    </main>
  );
}
