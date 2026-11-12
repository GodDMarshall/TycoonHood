import type { Metadata } from "next";
import { passwordResetReply } from "@tycoonhood/core";
import { forgotPasswordAction } from "../actions";
import { ForgotPasswordForm } from "../../../components/reset-forms";
import { mailMode } from "../../../lib/mail";

export const metadata: Metadata = { title: "Reset password" };
// Whether email works is read at request time, not frozen into the build.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm action={forgotPasswordAction} mode={mailMode()} unavailable={passwordResetReply("off").error ?? ""} />;
}
