import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { showsCourses } from "@tycoonhood/core";
import { CoinMark, Icon, PILLAR_LABEL } from "@tycoonhood/ui";
import { requireUser } from "../../../../lib/guard";
import { Page } from "../../../../components/app/page";
import { PrintButton } from "../../../../components/learning/print-button";

export const metadata: Metadata = { title: "Certificate" };
export const dynamic = "force-dynamic";

/**
 * The printable certificate. Members see only their own; anyone can check a
 * serial at /verify/[serial]. Printing hides the app around it.
 */
export default async function CertificateView({ params }: { params: Promise<{ serial: string }> }) {
  const user = await requireUser();
  const { serial } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { serial: serial.toUpperCase() },
    include: {
      course: { select: { title: true, pillar: true, instructor: { select: { name: true, headline: true } } } },
      user: { select: { name: true, profile: { select: { displayName: true, privacy: true } } } },
    },
  });
  if (!cert || cert.userId !== user.id) notFound();
  const name = cert.user.profile?.displayName ?? cert.user.name ?? "Tycoonhood member";
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <Page width="narrow">
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #certificate, #certificate * { visibility: visible !important; }
        #certificate { position: absolute; inset: 0; margin: 0; border: none; }
        @page { size: A4 landscape; margin: 12mm; }
      }`}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/certificates" className="flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink-1">
          <Icon name="arrow-left" size={13} /> Certificates
        </Link>
        <PrintButton />
      </div>

      <article
        id="certificate"
        aria-label={`Certificate ${cert.serial}`}
        className="relative overflow-hidden rounded-lg border border-gold-deep/70 bg-bg-1 px-8 py-12 text-center sm:px-14 sm:py-16"
      >
        <CoinMark size={56} />
        <p className="mt-6 text-[13px] font-medium uppercase tracking-[0.16em] text-gold">Certificate of completion</p>
        <p className="mt-8 text-[15px] text-ink-2">This certifies that</p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.02em] text-ink-1 sm:text-[38px]">{name}</h1>
        <p className="mt-6 text-[15px] text-ink-2">completed every lesson and passed the final assessment of the {PILLAR_LABEL[cert.course.pillar]} program</p>
        <h2 className="mt-2 text-[22px] font-semibold text-ink-1 sm:text-[26px]">{cert.course.title}</h2>
        <div className="mx-auto mt-10 grid max-w-lg grid-cols-2 gap-6 border-t border-line pt-6 text-left text-[13px]">
          <div>
            <p className="text-ink-3">Issued</p>
            <p className="mt-0.5 text-ink-1">{fmt.format(cert.issuedAt)}</p>
          </div>
          <div>
            <p className="text-ink-3">Serial</p>
            <p className="mt-0.5 tabular-nums text-ink-1">{cert.serial}</p>
          </div>
          {cert.course.instructor && (
            <div className="col-span-2">
              <p className="text-ink-3">Instructor</p>
              <p className="mt-0.5 text-ink-1">
                {cert.course.instructor.name}
                {cert.course.instructor.headline ? ` — ${cert.course.instructor.headline}` : ""}
              </p>
            </div>
          )}
        </div>
        <p className="mt-8 text-[12px] text-ink-3">Verify at {site}/verify/{cert.serial}</p>
      </article>

      <p className="mt-6 text-[13px] text-ink-3 print:hidden">
        The public verification page shows the program, the date and the serial.{" "}
        {showsCourses(cert.user.profile?.privacy)
          ? "It also shows your name, because you chose to show your certificates. "
          : "It shows your name only if you choose to show your certificates. "}
        <Link href="/settings#privacy" className="text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
          Change this in Settings
        </Link>
        .
      </p>
    </Page>
  );
}
