import type { Metadata } from "next";
import { forgotPasswordAction } from "../actions";
import { ForgotPasswordForm } from "../../../components/reset-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm action={forgotPasswordAction} />;
}
