import type { Metadata } from "next";
import { resetPasswordAction } from "../../actions";
import { ResetPasswordForm } from "../../../../components/reset-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ResetPasswordForm action={resetPasswordAction.bind(null, token)} />;
}
