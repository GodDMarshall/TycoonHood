/**
 * SESSIONS (spec §8) — owned, database-backed, device-aware.
 *
 * Design:
 *  · The cookie carries a random 256-bit token; the DATABASE stores only
 *    its SHA-256. A leaked database cannot impersonate anyone.
 *  · Sliding expiry: 30-day sessions, silently extended when under 15 days
 *    remain, so active members never hit a wall.
 *  · Every session records user agent + a privacy-hashed IP, which is what
 *    makes "manage my devices" (Phase 10 UI) real data instead of theater.
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_RENEW_BELOW_MS = 15 * 24 * 60 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface DeviceInfo {
  userAgent?: string | null;
  ip?: string | null;
}

export class SessionService {
  constructor(private readonly db: PrismaClient = defaultPrisma) {}

  /** Create a session; returns the RAW token for the cookie (never stored). */
  async create(userId: string, device: DeviceInfo = {}) {
    const raw = randomBytes(32).toString("base64url");
    const session = await this.db.session.create({
      data: {
        sessionToken: sha256(raw),
        userId,
        expires: new Date(Date.now() + SESSION_TTL_MS),
        userAgent: device.userAgent?.slice(0, 400) ?? null,
        ipHash: device.ip ? sha256(device.ip).slice(0, 32) : null,
      },
    });
    return { raw, session };
  }

  /**
   * Resolve a raw cookie token to its user. Expired sessions are deleted on
   * sight; healthy ones slide forward when close to expiry.
   */
  async resolve(rawToken: string) {
    const session = await this.db.session.findUnique({
      where: { sessionToken: sha256(rawToken) },
      include: {
        user: { include: { profile: true, rank: true } },
      },
    });
    if (!session) return null;

    if (session.expires.getTime() <= Date.now()) {
      await this.db.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }

    if (session.expires.getTime() - Date.now() < SESSION_RENEW_BELOW_MS) {
      await this.db.session.update({
        where: { id: session.id },
        data: { expires: new Date(Date.now() + SESSION_TTL_MS) },
      });
    }

    return session;
  }

  async destroy(rawToken: string) {
    await this.db.session
      .delete({ where: { sessionToken: sha256(rawToken) } })
      .catch(() => {}); // already gone is fine
  }

  /** All active sessions for a user — the "your devices" list. */
  async listForUser(userId: string) {
    return this.db.session.findMany({
      where: { userId, expires: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, expires: true, userAgent: true },
    });
  }

  /** Sign out everywhere (except, optionally, the current session). */
  async destroyAllForUser(userId: string, exceptSessionId?: string) {
    await this.db.session.deleteMany({
      where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    });
  }
}

export const sessions = new SessionService();
