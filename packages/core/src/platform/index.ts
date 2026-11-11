export { AuditService, audit, auditChanges, auditValue } from "./audit";
export type { AuditEntry } from "./audit";
export { notify, notificationLink } from "./notify";

// --- PLATFORM agent (Nov 2026): verification, settings, profile, admin ---
export { AccountSuspendedError } from "../auth/account";
export {
  EmailVerificationService, emailVerification,
  InvalidVerificationTokenError, AlreadyVerifiedError, VerificationRateLimitError,
  EmailChangeEndedError, EmailChangeTakenError, NoEmailChangeError,
  VERIFY_TTL_MS, VERIFY_RESEND_LIMIT, VERIFY_RESEND_WINDOW_MS,
} from "./email-verification";
export type { IssuedVerification, IssuedEmailChange, Confirmation } from "./email-verification";
export {
  maskEmail, emailChangeLinkMail, emailChangeRequestedMail, emailChangedMail, passwordChangedMail,
} from "./account-mail";
export type { MailCopy } from "./account-mail";
export {
  SettingsService, settings, getSetting, setSetting, resolveSetting, InvalidSettingError,
  SETTING_DEFAULTS, SETTING_SCHEMAS, HOME_SECTIONS, HOME_SECTION_LABEL,
} from "./settings";
export type { SettingKey, SettingValue, HomeSection } from "./settings";
export {
  ProfileService, profiles, profileUpdateSchema, profileCompletion, profileCompletionFor, isValidTimeZone,
  PRIVACY_FORM_KEYS, privacyShows, showsCourses, privacyFromForm,
} from "./profile";
export type { ProfileUpdateInput, ProfileCompletion, CompletionItem, CompletionSubject, PrivacyFormKey } from "./profile";
export { AccountSettingsService, accountSettings, WrongPasswordError, DELETION_TOPIC, emailSchema } from "./account-settings";
export { MemberAdminService, memberAdmin, MemberAdminError } from "./members";
export type { Actor } from "./members";
export {
  CmsService, cms, contactSchema, testimonialSchema, announcementSchema, CONTACT_TOPICS,
} from "./cms";
export type { ContactInput, TestimonialInput, AnnouncementInput } from "./cms";
export { platformAnalytics } from "./analytics";
export type { PlatformAnalytics, DayCount, MoneyLine } from "./analytics";
export { clientIpFrom, trustedProxyHops, MAX_TRUSTED_PROXY_HOPS } from "./client-ip";
export { cronAuth } from "./cron";
export type { ForwardingHeaders } from "./client-ip";
export {
  mailWentOut, verifyLinkState, verificationResendReply, emailChangeReply, passwordResetReply,
} from "./mail-outcome";
export type { MailMode, MailOutcome, VerifyLinkState } from "./mail-outcome";
