import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@tycoonhood/db";
import { Card, CardContent, CoinMark, PillarBadge, SectionRule } from "@tycoonhood/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify certificate" };
const dt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function VerifyCertificate({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { serial: serial.toUpperCase() },
    include: { course: true, user: { include: { profile: true } } },
  });
  if (!cert) notFound();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
      <CoinMark size={72} />
      <p className="eyebrow mt-6">Verified on the books</p>
      <Card variant="gold" className="mt-4 w-full">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <PillarBadge pillar={cert.course.pillar} />
          <h1 className="display text-[28px]">{cert.course.title}</h1>
          <p className="text-[15px] text-ink-1">
            Completed by{" "}
            {cert.user.profile ? (
              <Link href={`/u/${cert.user.profile.username}`} className="font-semibold text-gold underline decoration-gold-shadow underline-offset-4 hover:decoration-gold">
                {cert.user.profile.displayName}
              </Link>
            ) : (
              "a Tycoonhood member"
            )}
          </p>
          <SectionRule className="my-2 w-40" />
          <p className="figures text-[13px] text-ink-2">{cert.serial}</p>
          <p className="figures text-[12px] text-ink-3">Issued {dt.format(cert.issuedAt)}</p>
        </CardContent>
      </Card>
      <p className="mt-6 max-w-sm text-[12px] text-ink-3">
        Every certificate is a ledgered record. If a serial doesn't resolve here, it wasn't issued by the house.
      </p>
    </main>
  );
}
