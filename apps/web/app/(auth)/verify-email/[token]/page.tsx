import type { Metadata } from "next";
import { getCurrentUser } from "../../../../lib/auth";
import { verifyEmailAction } from "../../actions";
import { VerifyEmailForm } from "../../../../components/verify-email-form";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  return <VerifyEmailForm action={verifyEmailAction.bind(null, token)} signedIn={!!user} />;
}
