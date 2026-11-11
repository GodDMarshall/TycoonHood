/**
 * PROFILE — editing a member's public identity, and the profile-completion
 * score the dashboard shows. The score is a plain count of real fields; it
 * pays nothing and ranks nothing.
 */
import { z } from "zod";
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { usernameSchema } from "../auth/schemas";
import { UsernameTakenError } from "../auth/account";

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((s) => (s.length ? s : null));

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "Pick a display name.").max(60, "Keep it under 60 characters."),
  username: usernameSchema,
  bio: optionalText(500, "Keep your bio under 500 characters."),
  avatarUrl: z
    .string()
    .trim()
    .max(500, "That link is too long.")
    .refine((s) => {
      if (!s) return true;
      try {
        return new URL(s).protocol === "https:";
      } catch {
        return false;
      }
    }, "Use a full https:// link to an image.")
    .transform((s) => (s.length ? s : null)),
  timezone: z
    .string()
    .trim()
    .max(64)
    .refine((s) => !s || isValidTimeZone(s), "Choose a time zone from the list.")
    .transform((s) => (s.length ? s : null)),
});
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;

export class ProfileService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Validate and save. Throws ZodError on bad input, UsernameTakenError on a clash. */
  async update(userId: string, input: ProfileUpdateInput) {
    const data = profileUpdateSchema.parse(input);
    try {
      return await this.db.profile.update({ where: { userId }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new UsernameTakenError("That username is taken — try another.");
      }
      throw e;
    }
  }
}

export const profiles = new ProfileService();

// ─── Profile completion ────────────────────────────────────────────

export interface CompletionSubject {
  emailVerified: Date | null;
  profile: {
    displayName: string | null;
    username: string | null;
    bio: string | null;
    avatarUrl: string | null;
    timezone: string | null;
    goals?: string[] | null;
  } | null;
}

export interface CompletionItem {
  key: "email" | "displayName" | "username" | "bio" | "avatar" | "timezone" | "goals";
  label: string;
  done: boolean;
  href: string;
}

export interface ProfileCompletion {
  /** 0–100, rounded. */
  score: number;
  done: number;
  total: number;
  items: CompletionItem[];
  missing: CompletionItem[];
}

const filled = (s: string | null | undefined) => !!s && s.trim().length > 0;

/** Pure: which parts of a profile are filled in. */
export function profileCompletion(subject: CompletionSubject): ProfileCompletion {
  const p = subject.profile;
  const items: CompletionItem[] = [
    { key: "email", label: "Verify your email", done: !!subject.emailVerified, href: "/settings#email" },
    { key: "displayName", label: "Add a display name", done: filled(p?.displayName), href: "/settings#profile" },
    { key: "username", label: "Choose a username", done: filled(p?.username), href: "/settings#profile" },
    { key: "bio", label: "Write a short bio", done: filled(p?.bio), href: "/settings#profile" },
    { key: "avatar", label: "Add a profile photo", done: filled(p?.avatarUrl), href: "/settings#profile" },
    { key: "timezone", label: "Set your time zone", done: filled(p?.timezone), href: "/settings#profile" },
    { key: "goals", label: "Tell us your goals", done: (p?.goals?.length ?? 0) > 0, href: "/onboarding" },
  ];
  const done = items.filter((i) => i.done).length;
  return {
    score: Math.round((done / items.length) * 100),
    done,
    total: items.length,
    items,
    missing: items.filter((i) => !i.done),
  };
}

export async function profileCompletionFor(userId: string, db: PrismaClient = defaultPrisma) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { emailVerified: true, profile: true },
  });
  return profileCompletion(user);
}
