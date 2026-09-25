/**
 * Validation schemas shared by server actions and (later) API routes.
 * Copy in error messages follows the design system's writing rules:
 * plain, specific, tells you how to fix it.
 */
import { z } from "zod";

export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "tycoonhood", "system", "support", "help",
  "mint", "treasury", "rewards", "escrow", "revenue", "thc", "api",
  "root", "moderator", "mod", "staff", "official",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: letters, numbers, underscores.")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That name is reserved.");

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(200, "Keep it under 200 characters."),
  name: z.string().trim().min(1, "Tell us what to call you.").max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export const GOAL_OPTIONS = [
  "Build a business",
  "Get in the best shape of my life",
  "Master my finances",
  "Grow my income",
  "Build unshakeable discipline",
  "Find my people",
] as const;

export const INTEREST_OPTIONS = [
  "Training & nutrition",
  "Combat sports",
  "Entrepreneurship",
  "Marketing & sales",
  "Investing",
  "Personal finance",
  "Mindfulness",
  "Productivity",
] as const;

export const EXPERIENCE_OPTIONS = ["Just starting", "Building momentum", "Established, scaling"] as const;

export const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, "Pick a display name.").max(60),
  goals: z.array(z.enum(GOAL_OPTIONS)).min(1, "Choose at least one goal.").max(6),
  interests: z.array(z.enum(INTEREST_OPTIONS)).max(8).default([]),
  experienceLevel: z.enum(EXPERIENCE_OPTIONS),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
