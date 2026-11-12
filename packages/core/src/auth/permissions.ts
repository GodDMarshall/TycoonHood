/**
 * ROLES AND PERMISSIONS — the only place a role is turned into a capability.
 *
 * Roles come from the database row resolved from the session, never from the
 * client. Pages and server actions ask `can(user, "…")`; they never compare
 * role strings themselves, so adding a role means editing this table only.
 *
 * Guest = no session. Member = signed up. Student = enrolled in a programme
 * (set automatically on first enrolment). Creator = approved affiliate.
 * Instructor = authors courses. Moderator = community staff who cannot touch
 * the economy. Admin = everything.
 */
import type { UserRole } from "@tycoonhood/db";

export const ROLES = ["MEMBER", "STUDENT", "CREATOR", "INSTRUCTOR", "MODERATOR", "ADMIN"] as const satisfies readonly UserRole[];

export const ROLE_LABEL: Record<UserRole, string> = {
  MEMBER: "Member",
  STUDENT: "Student",
  CREATOR: "Creator / Affiliate",
  INSTRUCTOR: "Instructor",
  MODERATOR: "Moderator",
  ADMIN: "Administrator",
};

export type Permission =
  | "admin.access" // open /admin at all
  | "admin.users" // view members, change roles, suspend
  | "admin.economy" // grants, ledger, missions, rewards, XP
  | "admin.commerce" // products, orders, coupons, refunds
  | "admin.earn" // affiliates, commissions, payouts
  | "admin.content" // blog, homepage CMS, settings, testimonials
  | "admin.analytics"
  | "admin.audit"
  | "courses.author" // create and edit courses, modules, lessons, quizzes
  | "courses.publish"
  | "community.moderate" // pin, hide, remove, mute, resolve reports
  | "community.announce";

const STAFF_BASE: Permission[] = ["admin.access"];

const TABLE: Record<UserRole, readonly Permission[]> = {
  MEMBER: [],
  STUDENT: [],
  CREATOR: [],
  INSTRUCTOR: [...STAFF_BASE, "courses.author"],
  MODERATOR: [...STAFF_BASE, "community.moderate", "community.announce"],
  ADMIN: [
    "admin.access",
    "admin.users",
    "admin.economy",
    "admin.commerce",
    "admin.earn",
    "admin.content",
    "admin.analytics",
    "admin.audit",
    "courses.author",
    "courses.publish",
    "community.moderate",
    "community.announce",
  ],
};

export type HasRole = { role: UserRole } | null | undefined;

export function can(user: HasRole, permission: Permission): boolean {
  if (!user) return false;
  return TABLE[user.role]?.includes(permission) ?? false;
}

/** Community staff: moderators and admins. */
export function isStaff(user: HasRole): boolean {
  return can(user, "community.moderate");
}

export function isAdmin(user: HasRole): boolean {
  return user?.role === "ADMIN";
}

/** Roles a member is promoted to automatically never demote a staff role. */
export function promoteTo(current: UserRole, target: "STUDENT" | "CREATOR"): UserRole {
  const rank: Record<UserRole, number> = { MEMBER: 0, STUDENT: 1, CREATOR: 2, INSTRUCTOR: 3, MODERATOR: 3, ADMIN: 4 };
  return rank[target] > rank[current] ? target : current;
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertCan(user: HasRole, permission: Permission): void {
  if (!can(user, permission)) throw new ForbiddenError();
}
