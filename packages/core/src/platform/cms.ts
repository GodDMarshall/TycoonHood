/**
 * SITE CONTENT — the contact inbox, member stories, and staff announcements.
 *
 * Member stories (Testimonial) are genuine only: a story cannot be
 * published without the date the member gave consent. Nothing here invents
 * a quote, a name or a number.
 */
import { z } from "zod";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient, UserRole } from "@tycoonhood/db";
import { assertCan } from "../auth/permissions";
import { safeNextPath } from "../auth/next-path";
import { AuditService } from "./audit";
import type { Actor } from "./members";

// ─── Contact ───────────────────────────────────────────────────────

export const CONTACT_TOPICS = ["General", "Share my story", "Learning & certificates", "Orders & shop", "Affiliate programme", "Account", "Press & partnerships"] as const;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80, "Keep it under 80 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
  topic: z.enum(CONTACT_TOPICS, { errorMap: () => ({ message: "Choose a topic." }) }),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(4000, "Keep it under 4,000 characters."),
});
export type ContactInput = z.input<typeof contactSchema>;

// ─── Testimonials ──────────────────────────────────────────────────

export const testimonialSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  role: z
    .string()
    .trim()
    .max(120)
    .transform((s) => (s.length ? s : null)),
  quote: z.string().trim().min(10, "The story is too short.").max(2000),
  /** The date the member agreed to publication. Required to publish. */
  consentAt: z
    .union([z.date(), z.string().min(1, "Record the date the member gave consent.")])
    .pipe(z.coerce.date({ errorMap: () => ({ message: "Record the date the member gave consent." }) })),
  published: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});
export type TestimonialInput = z.input<typeof testimonialSchema>;

// ─── Announcements ─────────────────────────────────────────────────

export const announcementSchema = z.object({
  title: z.string().trim().min(3, "Give it a title.").max(120),
  body: z.string().trim().max(1000).optional(),
  href: z
    .string()
    .trim()
    .max(300)
    .refine((s) => !s || safeNextPath(s) !== null, "Links must be a path on this site, like /learning.")
    .optional(),
  /** null = every member. */
  role: z.enum(["MEMBER", "STUDENT", "CREATOR", "INSTRUCTOR", "MODERATOR", "ADMIN"]).nullable(),
});
export type AnnouncementInput = z.input<typeof announcementSchema>;

export class CmsService {
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  /** Public contact form. Validation throws ZodError; rate limiting is the caller's. */
  async submitContact(input: ContactInput) {
    const data = contactSchema.parse(input);
    return this.db.contactMessage.create({ data });
  }

  async setContactHandled(actor: Actor, id: string, handled: boolean) {
    assertCan(actor, "admin.content");
    return this.db.$transaction(async (tx) => {
      const m = await tx.contactMessage.update({ where: { id }, data: { handled } });
      await this.audit.log(
        { actorId: actor.id, action: handled ? "contact.handled" : "contact.reopen", targetType: "ContactMessage", targetId: id },
        tx
      );
      return m;
    });
  }

  async saveTestimonial(actor: Actor, input: TestimonialInput, id?: string) {
    assertCan(actor, "admin.content");
    const data = testimonialSchema.parse(input);
    return this.db.$transaction(async (tx) => {
      const t = id
        ? await tx.testimonial.update({ where: { id }, data })
        : await tx.testimonial.create({ data });
      await this.audit.log(
        {
          actorId: actor.id,
          action: id ? "testimonial.update" : "testimonial.create",
          targetType: "Testimonial",
          targetId: t.id,
          meta: { published: t.published, consentAt: t.consentAt.toISOString() },
        },
        tx
      );
      return t;
    });
  }

  async deleteTestimonial(actor: Actor, id: string) {
    assertCan(actor, "admin.content");
    await this.db.$transaction(async (tx) => {
      await tx.testimonial.delete({ where: { id } });
      await this.audit.log({ actorId: actor.id, action: "testimonial.delete", targetType: "Testimonial", targetId: id }, tx);
    });
  }

  /** Published stories, in the admin's order. */
  publishedTestimonials(take = 24) {
    return this.db.testimonial.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take,
    });
  }

  /**
   * Put a SYSTEM notification in every (non-suspended) member's inbox, or
   * every member of one role. Returns how many were sent.
   */
  async announce(actor: Actor, input: AnnouncementInput) {
    assertCan(actor, "admin.content");
    const a = announcementSchema.parse(input);
    const recipients = await this.db.user.findMany({
      where: { suspendedAt: null, ...(a.role ? { role: a.role as UserRole } : {}) },
      select: { id: true },
    });
    const data = a.href ? { href: a.href } : undefined;
    for (let i = 0; i < recipients.length; i += 1000) {
      await this.db.notification.createMany({
        data: recipients.slice(i, i + 1000).map((r) => ({
          userId: r.id,
          type: "SYSTEM" as const,
          title: a.title,
          body: a.body || null,
          data,
        })),
      });
    }
    await this.audit.log({
      actorId: actor.id,
      action: "notification.announce",
      targetType: "Role",
      targetId: a.role ?? "ALL",
      meta: { title: a.title, recipients: recipients.length },
    });
    return recipients.length;
  }
}

export const cms = new CmsService();
