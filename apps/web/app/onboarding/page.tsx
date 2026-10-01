import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@tycoonhood/ui";
import { getCurrentUser } from "../../lib/auth";
import { onboardingAction } from "./actions";
import { OnboardingForm } from "../../components/onboarding-form";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile?.onboardedAt) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-stretch px-6 py-12">
      <div className="mb-10 flex justify-center">
        <Logo />
      </div>
      <OnboardingForm action={onboardingAction} />
    </main>
  );
}
