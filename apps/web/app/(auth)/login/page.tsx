import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNextPath } from "@tycoonhood/core";
import { getCurrentUser } from "../../../lib/auth";
import { loginAction } from "../actions";
import { LoginForm } from "../../../components/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // The page a guard sent them from. The action checks it again on submit.
  const next = safeNextPath((await searchParams).next);
  if (await getCurrentUser()) redirect(next ?? "/today");
  return <LoginForm action={loginAction} next={next} />;
}
