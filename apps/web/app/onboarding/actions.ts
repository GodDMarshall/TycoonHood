"use server";
import { redirect } from "next/navigation";
import { accounts, onboardingSchema, UsernameTakenError } from "@tycoonhood/core";
import { getCurrentUser } from "../../lib/auth";
import type { AuthFormState } from "../(auth)/actions";

export async function onboardingAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    goals: formData.getAll("goals"),
    interests: formData.getAll("interests"),
    experienceLevel: formData.get("experienceLevel"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await accounts.completeOnboarding(user.id, parsed.data);
  } catch (e) {
    if (e instanceof UsernameTakenError) return { fieldErrors: { username: [e.message] } };
    throw e;
  }
  redirect("/dashboard");
}
