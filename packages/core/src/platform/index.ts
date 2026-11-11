export { AuditService, audit } from "./audit";
export type { AuditEntry } from "./audit";
export { notify } from "./notify";

// --- PLATFORM agent (Nov 2026): verification, settings, profile, admin ---
export { AccountSuspendedError } from "../auth/account";
export {
  EmailVerificationService, emailVerification,
  InvalidVerificationTokenError, AlreadyVerifiedError, VerificationRateLimitError,
  VERIFY_TTL_MS, VERIFY_RESEND_LIMIT, VERIFY_RESEND_WINDOW_MS,
} from "./email-verification";
export type { IssuedVerification } from "./email-verification";
export {
  SettingsService, settings, getSetting, setSetting, resolveSetting, InvalidSettingError,
  SETTING_DEFAULTS, SETTING_SCHEMAS, HOME_SECTIONS, HOME_SECTION_LABEL,
} from "./settings";
export type { SettingKey, SettingValue, HomeSection } from "./settings";
export {
  ProfileService, profiles, profileUpdateSchema, profileCompletion, profileCompletionFor, isValidTimeZone,
} from "./profile";
export type { ProfileUpdateInput, ProfileCompletion, CompletionItem, CompletionSubject } from "./profile";
export { AccountSettingsService, accountSettings, WrongPasswordError, DELETION_TOPIC, emailSchema } from "./account-settings";
export { MemberAdminService, memberAdmin, MemberAdminError } from "./members";
export type { Actor } from "./members";
export {
  CmsService, cms, contactSchema, testimonialSchema, announcementSchema, CONTACT_TOPICS,
} from "./cms";
export type { ContactInput, TestimonialInput, AnnouncementInput } from "./cms";
export { platformAnalytics } from "./analytics";
export type { PlatformAnalytics, DayCount, MoneyLine } from "./analytics";
