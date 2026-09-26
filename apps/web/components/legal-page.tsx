import type { ReactNode } from "react";
import Link from "next/link";
import { SectionRule } from "@tycoonhood/ui";

/**
 * Shared frame for the legal pages.
 *
 * The review banner is not decoration. These documents describe what the
 * platform actually does — they were written against the code, not copied
 * from a template — but describing behaviour accurately is not the same as
 * being legally sufficient in any particular country. Saying so plainly is
 * more honest than a confident-looking page nobody checked.
 */
export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  children,
  reviewed = false,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
  reviewed?: boolean;
}) {
  return (
    <main className="mx-auto max-w-3xl px-[var(--gutter)] py-16 md:py-24">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h1 className="display text-h1">{title}</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">{intro}</p>
      <p className="figures mt-4 text-[12px] text-ink-3">Last updated {updated}</p>

      {!reviewed && (
        <div className="mt-8 rounded-md border border-gold-deep/40 bg-gold/5 px-4 py-3">
          <p className="text-[13px] leading-relaxed text-ink-2">
            <span className="text-gold-bright">Not yet reviewed by a lawyer.</span>{" "}
            This document was written against the actual behaviour of the platform, so it is
            accurate about what we do. It has not been checked by a qualified professional
            in any jurisdiction. If something here matters to you, say so and we will get
            it reviewed before you rely on it.
          </p>
        </div>
      )}

      <SectionRule className="my-10" />
      <div className="legal flex flex-col gap-8">{children}</div>

      <SectionRule className="my-10" />
      <p className="text-[13px] text-ink-3">
        Questions about this page:{" "}
        <Link href="/faq" className="text-gold underline-offset-4 hover:underline">the FAQ</Link>{" "}
        answers most of them, and anything it does not, ask in the community.
      </p>
    </main>
  );
}

export function Clause({ n, heading, children }: { n: string; heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="display text-[19px] leading-snug">
        <span className="figures mr-2 text-[14px] text-gold-deep">{n}</span>
        {heading}
      </h2>
      <div className="mt-2 flex flex-col gap-2.5 text-[14px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}
