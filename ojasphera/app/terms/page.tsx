import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms", description: `Terms of use for ${site.domain}.`, alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of use" />
      <section className="pb-32">
        <div className="shell">
          <div className="max-w-2xl space-y-6 text-ink-2 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-ink">
            <p>These terms apply to your use of {site.domain}, operated by {site.legalName}.</p>
            <h2>The website</h2>
            <p>
              Content on this site describes Ojasphera's work and capabilities. Interactive demonstrations are simulations
              built to illustrate how our systems behave; they are not live client systems and do not process real client data.
            </p>
            <h2>Intellectual property</h2>
            <p>The site's design, code, text and graphics belong to {site.legalName} unless stated otherwise. Please don't reproduce them without permission.</p>
            <h2>Enquiries</h2>
            <p>Submitting a project brief does not create an agreement. Any engagement is governed by a separate written contract.</p>
            <h2>Changes</h2>
            <p>We may update these terms as the site changes. The current version always lives on this page.</p>
          </div>
        </div>
      </section>
    </>
  );
}
