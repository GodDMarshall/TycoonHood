/**
 * SITE SETTINGS — admin-editable configuration and homepage content, stored
 * as JSON rows in SiteSetting and always read through typed defaults.
 *
 * A missing row, or a stored value that no longer matches the schema, falls
 * back to the code default field by field — the site never renders blank
 * because someone saved half a form. Every write is audited.
 */
import { z } from "zod";
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { Prisma, PrismaClient } from "@tycoonhood/db";
import { AuditService } from "./audit";

export const HOME_SECTIONS = [
  "valueProposition",
  "pillars",
  "programmes",
  "howItWorks",
  "earn",
  "marketplace",
  "community",
  "founder",
  "testimonials",
  "finalCta",
] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

export const HOME_SECTION_LABEL: Record<HomeSection, string> = {
  valueProposition: "Value proposition",
  pillars: "Learn · Earn · Shop",
  programmes: "Featured programmes",
  howItWorks: "How it works",
  earn: "Earning opportunities",
  marketplace: "Marketplace highlights",
  community: "Community & achievements",
  founder: "Founder introduction",
  testimonials: "Member stories (only shows when published stories exist)",
  finalCta: "Final registration call to action",
};

const line = (max: number) => z.string().trim().min(1).max(max);

const homeSchema = z.object({
  /** The hero, one line per entry. The last line is set in the accent face. */
  heroLines: z.array(line(60)).min(1).max(4),
  heroLead: line(400),
  heroEyebrow: line(80),
  sections: z.object(Object.fromEntries(HOME_SECTIONS.map((s) => [s, z.boolean()])) as Record<HomeSection, z.ZodBoolean>),
});

const contactSchema = z.object({
  /** Shown on /contact when set. Leave empty to show only the form. */
  supportEmail: z.union([z.string().trim().email().max(200), z.literal("")]),
});

const platformSchema = z.object({
  signupsOpen: z.boolean(),
  /** A plain-text banner across the site and app. Empty = none. */
  maintenanceBanner: z.string().trim().max(240),
});

export const SETTING_SCHEMAS = {
  home: homeSchema,
  contact: contactSchema,
  platform: platformSchema,
} as const;

export type SettingKey = keyof typeof SETTING_SCHEMAS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_SCHEMAS)[K]>;

export const SETTING_DEFAULTS: { [K in SettingKey]: SettingValue<K> } = {
  home: {
    // OQ-E revisited (Nov 2026): the four-line positioning replaces
    // "Build yourself. / The rest compounds." as the hero. Editable in
    // Admin → Site & CMS.
    heroLines: ["Master yourself.", "Build your skills.", "Create your wealth.", "Own your freedom."],
    heroLead:
      "Tycoonhood is a mission-driven ecosystem for learning, earning and building. Structured programmes that open lesson by lesson, an honest affiliate programme, a shop, and a community that shows its work.",
    heroEyebrow: "Learn · Earn · Shop · Connect",
    sections: Object.fromEntries(HOME_SECTIONS.map((s) => [s, true])) as Record<HomeSection, boolean>,
  },
  contact: { supportEmail: "" },
  platform: { signupsOpen: true, maintenanceBanner: "" },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Merge a stored value over the defaults, keeping only fields that validate. */
export function resolveSetting<K extends SettingKey>(key: K, stored: unknown): SettingValue<K> {
  const fallback = SETTING_DEFAULTS[key];
  const whole = SETTING_SCHEMAS[key].safeParse(stored);
  if (whole.success) return whole.data as SettingValue<K>;
  if (!isObject(stored)) return structuredClone(fallback);

  const out: Record<string, unknown> = structuredClone(fallback) as Record<string, unknown>;
  const shape = (SETTING_SCHEMAS[key] as z.AnyZodObject).shape as Record<string, z.ZodTypeAny>;
  for (const [field, schema] of Object.entries(shape)) {
    if (!(field in stored)) continue;
    const value = stored[field];
    // Nested objects (home.sections) merge key by key as well.
    if (schema instanceof z.ZodObject && isObject(value) && isObject(out[field])) {
      const nested = out[field] as Record<string, unknown>;
      for (const [k, s] of Object.entries(schema.shape as Record<string, z.ZodTypeAny>)) {
        const r = s.safeParse(value[k]);
        if (r.success) nested[k] = r.data;
      }
      continue;
    }
    const r = schema.safeParse(value);
    if (r.success) out[field] = r.data;
  }
  return out as SettingValue<K>;
}

export class InvalidSettingError extends Error {}

export class SettingsService {
  private audit: AuditService;
  constructor(private readonly db: PrismaClient = defaultPrisma) {
    this.audit = new AuditService(db);
  }

  async get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    const row = await this.db.siteSetting.findUnique({ where: { key } });
    return resolveSetting(key, row?.value);
  }

  /**
   * Validate and store a whole setting. `actorId` is recorded in the audit
   * trail in the same transaction as the write.
   */
  async set<K extends SettingKey>(key: K, value: SettingValue<K>, actorId: string | null): Promise<SettingValue<K>> {
    const parsed = SETTING_SCHEMAS[key].safeParse(value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new InvalidSettingError(`${issue?.path.join(".") || key}: ${issue?.message ?? "invalid value"}`);
    }
    const json = parsed.data as Prisma.InputJsonValue;
    await this.db.$transaction(async (tx) => {
      await tx.siteSetting.upsert({ where: { key }, update: { value: json }, create: { key, value: json } });
      await this.audit.log({ actorId, action: "settings.update", targetType: "SiteSetting", targetId: key, meta: json }, tx);
    });
    return parsed.data as SettingValue<K>;
  }
}

export const settings = new SettingsService();
export const getSetting = <K extends SettingKey>(key: K) => settings.get(key);
export const setSetting = <K extends SettingKey>(key: K, value: SettingValue<K>, actorId: string | null) =>
  settings.set(key, value, actorId);
