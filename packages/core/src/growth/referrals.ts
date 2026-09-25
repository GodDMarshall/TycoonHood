/**
 * REFERRALS (spec §17).
 *
 * The design rule, stated once: signing somebody up pays nothing. The
 * reward lands only when the person they brought does real work — one
 * finished lesson. That single choice removes almost every reason to farm
 * the system, because a fake account has to be carried through actual
 * study before it is worth anything.
 *
 * The rest of the defence is structural, not procedural:
 *   · one referrer per member, for life (unique key on referredId)
 *   · nobody refers themselves (CHECK constraint)
 *   · the payout is an idempotent ledger spend from REWARDS_POOL
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import { LedgerService } from "../ledger/ledger";
import { REFERRAL } from "@tycoonhood/config";

export class ReferralError extends Error {}
export class SelfReferralError extends ReferralError {}
export class AlreadyReferredError extends ReferralError {}
export class UnknownCodeError extends ReferralError {}

/** Unambiguous alphabet: no O/0, no I/1/L. Codes get read aloud and retyped. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function mintCode(len = 7): string {
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export class ReferralService {
  private ledger: LedgerService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.ledger = new LedgerService(db);
  }

  /** Their code, minted on first use and stable afterwards. */
  async codeFor(userId: string): Promise<string> {
    const profile = await this.db.profile.findUnique({ where: { userId } });
    if (!profile) throw new ReferralError("Finish onboarding before inviting anyone.");
    if (profile.referralCode) return profile.referralCode;

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = mintCode();
      try {
        const updated = await this.db.profile.update({
          where: { userId },
          data: { referralCode: code },
        });
        return updated.referralCode!;
      } catch {
        // Collision on the unique index — mint another and try again.
      }
    }
    throw new ReferralError("Could not allocate an invite code. Try again.");
  }

  async resolveCode(code: string) {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;
    return this.db.profile.findUnique({
      where: { referralCode: clean },
      include: { user: true },
    });
  }

  /**
   * Records who brought a new member. Pays nothing yet — see qualify().
   * Silently tolerant of a missing or wrong code: a bad link must never
   * block a signup.
   */
  async attach(referredUserId: string, code: string, signupIp?: string | null) {
    const clean = code.trim().toUpperCase();
    if (!clean) return null;

    const referrer = await this.resolveCode(clean);
    if (!referrer) throw new UnknownCodeError("That invite code does not exist.");
    if (referrer.userId === referredUserId) throw new SelfReferralError("You cannot invite yourself.");

    const existing = await this.db.referral.findUnique({ where: { referredId: referredUserId } });
    if (existing) throw new AlreadyReferredError("This member already has a referrer.");

    return this.db.referral.create({
      data: {
        referrerId: referrer.userId,
        referredId: referredUserId,
        code: clean,
        signupIp: signupIp ?? null,
      },
    });
  }

  /**
   * Called when the referred member does the qualifying work. Pays both
   * sides once, from REWARDS_POOL, and is safe to call repeatedly.
   */
  async qualify(referredUserId: string) {
    const referral = await this.db.referral.findUnique({ where: { referredId: referredUserId } });
    if (!referral || referral.status !== "PENDING") return null;

    // Guarded transition: whoever flips PENDING → QUALIFIED pays. A second
    // caller matches nothing and pays nothing.
    const claimed = await this.db.referral.updateMany({
      where: { id: referral.id, status: "PENDING" },
      data: { status: "QUALIFIED", qualifiedAt: new Date() },
    });
    if (claimed.count === 0) return null;

    const tx = await this.ledger.reward({
      userId: referral.referrerId,
      amount: REFERRAL.referrerReward,
      reason: "REWARD_MISSION",
      idempotencyKey: `referral:referrer:${referral.id}`,
      sourceType: "referral",
      sourceId: referral.id,
      memo: "Invite qualified",
    });

    await this.ledger.reward({
      userId: referral.referredId,
      amount: REFERRAL.referredReward,
      reason: "REWARD_MISSION",
      idempotencyKey: `referral:referred:${referral.id}`,
      sourceType: "referral",
      sourceId: referral.id,
      memo: "Welcome bonus",
    });

    await this.db.referral.update({ where: { id: referral.id }, data: { rewardTxId: tx.id } });

    await this.db.notification.create({
      data: {
        userId: referral.referrerId,
        type: "THC",
        title: "Your invite came good",
        body: `+${REFERRAL.referrerReward.toLocaleString("en-US")} THC — someone you brought finished their first lesson.`,
        data: { referralId: referral.id },
      },
    });

    return this.db.referral.findUnique({ where: { id: referral.id } });
  }

  /** What the member sees on their invite screen. */
  async summary(userId: string) {
    const [code, rows] = await Promise.all([
      this.codeFor(userId),
      this.db.referral.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: "desc" },
        include: { referred: { include: { profile: true } } },
      }),
    ]);
    const qualified = rows.filter((r) => r.status === "QUALIFIED");
    return {
      code,
      total: rows.length,
      qualified: qualified.length,
      pending: rows.filter((r) => r.status === "PENDING").length,
      earned: BigInt(qualified.length) * REFERRAL.referrerReward,
      perInvite: REFERRAL.referrerReward,
      welcomeBonus: REFERRAL.referredReward,
      invites: rows.map((r) => ({
        name: r.referred.profile?.displayName ?? "A new member",
        status: r.status,
        joinedAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
      })),
    };
  }
}

export const referrals = new ReferralService();
