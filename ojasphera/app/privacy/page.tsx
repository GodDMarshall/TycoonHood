import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy", description: `How ${site.name} handles information on ${site.domain}.`, alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy" />
      <section className="pb-32">
        <div className="shell">
          <div className="max-w-2xl space-y-6 text-ink-2 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-ink">
            <p>
              This page describes how {site.legalName} ("Ojasphera") handles information submitted through {site.domain}.
            </p>
            <h2>What we collect</h2>
            <p>
              When you start a project or send a message, we receive the details you enter: your name, company, email
              address and the information you choose to share about your project. We do not use advertising trackers or
              third-party analytics on this site, and the site loads no third-party scripts.
            </p>
            <h2>How we use it</h2>
            <p>
              We use what you submit only to understand your enquiry and reply to you. We do not sell it or share it for
              marketing. Service providers that deliver your message to us process it on our behalf.
            </p>
            <h2>Keeping and deleting it</h2>
            <p>We keep enquiries only as long as needed to respond and to follow up on a project. You can ask us to delete your information at any time.</p>
            <h2>Contact</h2>
            <p>
              For privacy questions, contact us through the <a className="text-ink underline underline-offset-4" href="/build?mode=talk">contact form</a>
              {site.contactEmail ? (
                <>
                  {" "}or at <a className="text-ink underline underline-offset-4" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
