import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@tycoonhood/db";
import { formatLongDate, memberZone } from "@tycoonhood/core";
import { Icon, PillarBadge, buttonStyles } from "@tycoonhood/ui";
import { requireUser } from "../../../lib/guard";
import { Page, PageHeader, Panel } from "../../../components/app/page";

export const metadata: Metadata = { title: "Certificates" };
export const dynamic = "force-dynamic";

/** The member's certificates. Each one is issued after every lesson and the final assessment. */
export default async function CertificatesPage() {
  const user = await requireUser();
  const certs = await prisma.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: "desc" },
    include: { course: { select: { title: true, pillar: true, slug: true } } },
  });
  const zone = memberZone(user.profile?.timezone);

  return (
    <Page>
      <PageHeader
        title="Certificates"
        description="A certificate is issued when you complete every lesson in a program and pass its final assessment. Each has a public serial anyone can verify."
      />
      {certs.length === 0 ? (
        <Panel className="p-8 text-center">
          <Icon name="seal" size={28} className="mx-auto text-ink-3" />
          <p className="mt-3 text-[15px] text-ink-2">No certificates yet. Finish a program and pass its final assessment to earn your first.</p>
          <Link href="/courses" className={buttonStyles({ className: "mt-5" })}>
            Go to your courses
          </Link>
        </Panel>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {certs.map((c) => (
            <li key={c.id}>
              <Panel as="div" className="flex h-full flex-col p-5">
                <div className="flex items-center gap-2">
                  <PillarBadge pillar={c.course.pillar} />
                  <span className="ml-auto text-[12.5px] text-ink-3">{formatLongDate(c.issuedAt, zone)}</span>
                </div>
                <h2 className="mt-3 text-[18px] font-semibold leading-snug">{c.course.title}</h2>
                <p className="mt-1 text-[13px] tabular-nums text-ink-3">{c.serial}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Link href={`/certificates/${c.serial}`} className={buttonStyles({ size: "sm" })}>
                    <Icon name="seal" size={14} /> View and print
                  </Link>
                  <Link href={`/verify/${c.serial}`} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                    Public verification <Icon name="arrow-up-right" size={13} />
                  </Link>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
