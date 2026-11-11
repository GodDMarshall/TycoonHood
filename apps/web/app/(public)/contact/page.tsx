import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_TOPICS, getSetting } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import { ContactForm } from "../../../components/contact-form";
import { contactAction } from "./actions";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions, feedback, a story to share, or something that went wrong — write to the people who run Tycoonhood.",
  alternates: { canonical: "/contact" },
};
export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const [{ supportEmail }, user, { topic }] = await Promise.all([getSetting("contact"), getCurrentUser(), searchParams]);
  const defaultTopic = topic === "story" ? "Share my story" : CONTACT_TOPICS.find((t) => t === topic);

  return (
    <main className="mx-auto grid max-w-[72rem] gap-12 px-[var(--gutter)] py-16 md:py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div>
        <p className="eyebrow mb-3">Contact</p>
        <h1 className="display text-h1">
          Talk to <span className="accent">a person.</span>
        </h1>
        <p className="mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-ink-2">
          Questions about learning, an order, the affiliate programme or your account — or a story you&rsquo;d like to share. Every message is read by the team.
        </p>
        {supportEmail && (
          <p className="mt-6 text-[15px] text-ink-2">
            Prefer email?{" "}
            <a href={`mailto:${supportEmail}`} className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
              {supportEmail}
            </a>
          </p>
        )}
        <p className="mt-6 text-[14px] text-ink-3">
          Many answers are already in the{" "}
          <Link href="/faq" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">FAQ</Link>.
        </p>
      </div>
      <div className="rounded-xl border border-line bg-bg-1 p-5 sm:p-8">
        <ContactForm
          action={contactAction}
          topics={CONTACT_TOPICS}
          defaultTopic={defaultTopic}
          defaults={user ? { name: user.profile?.displayName ?? user.name ?? undefined, email: user.email } : undefined}
        />
      </div>
    </main>
  );
}
