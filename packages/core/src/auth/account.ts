/**
 * Account flows: register, authenticate, onboard.
 * These are the ONLY code paths that touch PasswordCredential, and
 * onboarding is the only path that flips Profile.onboardedAt — which is
 * also the moment the member's first mission reward fires (idempotently).
 */
import { Prisma, prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient, User } from "@tycoonhood/db";
import { hashPassword, verifyPassword } from "./password";
import type { OnboardingInput } from "./schemas";

export class EmailTakenError extends Error {}
export class UsernameTakenError extends Error {}
export class InvalidCredentialsError extends Error {}

export class AccountService {

  constructor(private readonly db: PrismaClient = defaultPrisma) {
  }

  async register(input: { email: string; password: string; name: string }): Promise<User> {
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          credential: { create: { hash: passwordHash } },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new EmailTakenError("An account with this email already exists.");
      }
      throw e;
    }
  }

  /** Verifies email+password. Always the same error for both failure modes. */
  async authenticate(input: { email: string; password: string }): Promise<User> {
    const user = await this.db.user.findUnique({
      where: { email: input.email },
      include: { credential: true },
    });
    // Verify against a dummy hash when the user is missing so timing does
    // not reveal which emails exist.
    const hash =
      user?.credential?.hash ??
      "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const ok = await verifyPassword(hash, input.password);
    if (!ok || !user) throw new InvalidCredentialsError("Email or password is incorrect.");
    return user;
  }

  /**
   * Complete onboarding: claim username, save profile, pay the
   * complete-onboarding mission. Safe to retry — every step is idempotent
   * or an upsert.
   */
  async completeOnboarding(userId: string, input: OnboardingInput) {
    try {
      await this.db.profile.upsert({
        where: { userId },
        update: {
          username: input.username,
          displayName: input.displayName,
          goals: input.goals,
          interests: input.interests,
          experienceLevel: input.experienceLevel,
          onboardedAt: new Date(),
        },
        create: {
          userId,
          username: input.username,
          displayName: input.displayName,
          goals: input.goals,
          interests: input.interests,
          experienceLevel: input.experienceLevel,
          onboardedAt: new Date(),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new UsernameTakenError("That username is taken — try another.");
      }
      throw e;
    }

    // The payout goes through the rules engine like every other: the event is
    // "they onboarded", and whichever missions listen for that decide what it
    // is worth. Nothing is hard-coded here any more, and re-running onboarding
    // cannot double-pay — the engine's completions are idempotent (spec §17).
    const { events } = await import("../events/bus");
    const outcome = await events.emit({ type: "ONBOARDED", userId });

    // `firstCompletion` means "this call is what paid them", which is exactly
    // whether the engine completed an onboarding mission on this pass.
    const reward = { firstCompletion: outcome.missions.length > 0, missions: outcome.missions };

    return { reward };
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const existing = await this.db.profile.findUnique({ where: { username } });
    return !existing;
  }
}

export const accounts = new AccountService();
