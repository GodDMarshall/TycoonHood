import type { Metadata } from "next";
import { resetPasswordAction } from "../../actions";
import { ResetPasswordForm } from "../../../../components/reset-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ undone?: string }>;
}) {
  const { token } = await params;
  // Set when an undone email change sent this browser here (undoEmailChangeAction).
  const { undone } = await searchParams;
  return <ResetPasswordForm action={resetPasswordAction.bind(null, token)} undone={undone === "1"} />;
}
