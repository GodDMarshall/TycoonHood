/**
 * ABOUT — the founder page.
 *
 * DRAFT FOR HARSHA'S REVIEW. Every line below was written for Harsha to
 * approve, edit or replace before launch. It deliberately states intent,
 * beliefs and what the platform does — it invents no qualifications, awards,
 * achievements, employers, figures or personal history. Add any of those only
 * from Harsha's own words.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon, buttonStyles } from "@tycoonhood/ui";

export const metadata: Metadata = {
  title: "About Harsha, Founder & Creator",
  description: "Harsha, Founder & Creator of Tycoonhood — why Tycoonhood exists, the vision, the mission and the values behind a mission-driven ecosystem for learning, earning and building.",
  alternates: { canonical: "/about" },
};

const VALUES: [string, string][] = [
  ["Discipline first", "Results follow habits. We build the habit — the daily standard, the next lesson — before anything else."],
  ["Honesty about money", "No guaranteed income, no hype, no fake numbers. If something is not true yet, we do not say it."],
  ["Real skills", "Programmes teach things you can use, in order, and check that you learned them."],
  ["Proof over claims", "Progress is recorded, certificates are verifiable, and stories are published only with the member's permission."],
  ["Respect for members", "Your data, your attention and your money are treated with care. Moderation keeps the community worth being in."],
];

export default function AboutPage() {
  return (
    <main>
      {/* ─── Introduction ─── */}
      <section aria-labelledby="about-title" className="border-b border-line">
        <div className="mx-auto grid max-w-[80rem] items-center gap-12 px-[var(--gutter)] py-16 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:py-24 lg:gap-20">
          <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-xl border border-line-strong bg-bg-1 shadow-[var(--shadow-3)]">
            <Image
              src="/founder/harsha.jpg"
              alt="Harsha, Founder & Creator of Tycoonhood"
              width={1254}
              height={1254}
              priority
              sizes="(min-width: 768px) 460px, 90vw"
              className="aspect-square h-auto w-full object-cover"
            />
          </div>
          <div className="min-w-0 animate-rise">
            <p className="eyebrow mb-4">About</p>
            <h1 id="about-title" className="display text-[clamp(2.2rem,1.4rem+3vw,3.8rem)] leading-[1.05]">
              HARSHA
            </h1>
            <p className="mt-2 text-[17px] font-medium text-gold">Founder &amp; Creator of Tycoonhood</p>
            <div className="mt-8 flex max-w-[60ch] flex-col gap-4 text-[16.5px] leading-relaxed text-ink-2">
              <p>
                I&rsquo;m Harsha, and I built Tycoonhood. I believe most people are capable of far more than they are currently living — not because they lack
                talent, but because they lack structure, honest guidance and people around them who take growth seriously.
              </p>
              <p>
                Tycoonhood is my answer to that: one place to master yourself, build real skills, create wealth the honest way, and work towards owning your time
                and your choices.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-3xl flex-col gap-16 px-[var(--gutter)] py-16 md:py-24">
        {/* ─── Why ─── */}
        <section aria-labelledby="why-title">
          <p className="eyebrow mb-3">Why Tycoonhood was created</p>
          <h2 id="why-title" className="display text-h2">
            Too much noise. <span className="accent">Not enough structure.</span>
          </h2>
          <div className="mt-5 flex flex-col gap-4 text-[16px] leading-relaxed text-ink-2">
            <p>
              The internet is full of advice about getting fit, making money and building a business. Much of it is loud, contradictory, or selling a shortcut.
              What is rare is a patient, structured path — one that tells you the next step, checks that you took it, and does not pretend the work is optional.
            </p>
            <p>
              Tycoonhood was created to be that path. Programmes open lesson by lesson. A daily standard turns intentions into habits. A record shows what you have
              actually done. And when you are ready, there are honest ways to earn and a community to build alongside.
            </p>
          </div>
        </section>

        {/* ─── Vision & mission ─── */}
        <section aria-labelledby="vision-title" className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg-1 p-6">
            <p className="eyebrow mb-2">Vision</p>
            <h2 id="vision-title" className="text-[19px] font-semibold">A generation that builds itself</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              People who are disciplined in body and mind, skilled in their work, sensible with money, and free to choose how they spend their lives.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-bg-1 p-6">
            <p className="eyebrow mb-2">Mission</p>
            <h2 className="text-[19px] font-semibold">Make serious growth accessible</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              Give every member a clear path to learn, a fair way to earn, and a community that keeps them honest — with no hype and no false promises.
            </p>
          </div>
        </section>

        {/* ─── Values ─── */}
        <section aria-labelledby="values-title">
          <p className="eyebrow mb-3">Values</p>
          <h2 id="values-title" className="display text-h2">
            What we hold to.
          </h2>
          <dl className="mt-6 flex flex-col">
            {VALUES.map(([title, body]) => (
              <div key={title} className="border-b border-line py-5 last:border-0">
                <dt className="text-[17px] font-semibold">{title}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{body}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ─── The ecosystem ─── */}
        <section aria-labelledby="ecosystem-title">
          <p className="eyebrow mb-3">A mission-driven ecosystem</p>
          <h2 id="ecosystem-title" className="display text-h2">
            Learn. Earn. Shop. Connect.
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-2">
            Tycoonhood is a mission-driven ecosystem rather than a single course. Members learn through structured{" "}
            <Link href="/learning" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">programmes</Link>, can apply to
            an honest{" "}
            <Link href="/earn" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">affiliate programme</Link>, shop in the{" "}
            <Link href="/marketplace" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">marketplace</Link>, and work
            alongside each other in the{" "}
            <Link href="/connect" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">community</Link>. Each part exists
            to support the same goal: your growth.
          </p>
        </section>

        {/* ─── Long-term ─── */}
        <section aria-labelledby="long-title">
          <p className="eyebrow mb-3">The long-term vision</p>
          <h2 id="long-title" className="display text-h2">
            Built to last decades, <span className="accent">not a season.</span>
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-2">
            Over time, Tycoonhood will grow its programmes, its instructors and its community — carefully, and only as fast as the quality can keep up. The aim is a
            place you can return to at every stage of life: when you are starting out, when you are building, and when you are ready to help the next person up.
          </p>
        </section>

        {/* ─── Personal message ─── */}
        <section aria-labelledby="message-title" className="rounded-xl border border-gold-deep/50 bg-bg-1 p-6 sm:p-8">
          <p className="eyebrow mb-3">A message to the community</p>
          <h2 id="message-title" className="sr-only">
            A message from Harsha
          </h2>
          <div className="flex flex-col gap-4 text-[16.5px] leading-relaxed text-ink-1">
            <p>
              If you are here, you already want more from yourself. That matters. I can&rsquo;t promise you shortcuts — nobody honest can. What I can promise is a
              place built with care, rules that are the same for everyone, and a community that respects the work.
            </p>
            <p>Start small. Show up tomorrow. Let the record speak. I&rsquo;m glad you&rsquo;re here.</p>
          </div>
          <p className="mt-6 text-[15px] font-semibold text-gold">— Harsha</p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link href="/register" className={buttonStyles({ size: "lg" })}>
            Join free <Icon name="arrow-right" size={16} />
          </Link>
          <Link href="/contact" className={buttonStyles({ variant: "secondary", size: "lg" })}>
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
