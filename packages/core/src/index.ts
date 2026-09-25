export * from "./ledger/ledger";
export * from "./gamification/xp";
export * from "./rewards/rewards";
export { hashPassword, verifyPassword } from "./auth/password";
export { SessionService, sessions, SESSION_TTL_MS } from "./auth/session";
export {
  AccountService,
  accounts,
  EmailTakenError,
  UsernameTakenError,
  InvalidCredentialsError,
} from "./auth/account";
export {
  registerSchema,
  loginSchema,
  onboardingSchema,
  usernameSchema,
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  EXPERIENCE_OPTIONS,
  RESERVED_USERNAMES,
  type RegisterInput,
  type LoginInput,
  type OnboardingInput,
} from "./auth/schemas";
export { LmsService, lms, NotEnrolledError } from "./lms/lms";
export { StreakService, streaks } from "./gamification/streaks";
export { AchievementService, achievements } from "./gamification/achievements";
export { ChallengeService, challenges, ChallengeError } from "./gamification/challenges";
export { MissionCooldownError } from "./rewards/rewards";
export { MiningService, mining, MinerError, RigMaxedError, EpochExhaustedError } from "./mining/mining";
export { CommerceService, commerce, CommerceError, OutOfStockError, ProductUnavailableError } from "./commerce/commerce";
export { DiscordService, discord, InvalidLinkCodeError, activeDiscordTransport } from "./integrations/discord";
export type { DiscordTransport, RoleSyncResult } from "./integrations/discord";
export { DiscordAlreadyLinkedError } from "./integrations/discord";
export { NullChainAdapter, activeChainAdapter } from "./chain/adapter";
export type { ChainAdapter, ChainAnchor } from "./chain/adapter";
export type { Submission } from "./gamification/challenges";
export { PasswordResetService, passwordReset, InvalidResetTokenError, newPasswordSchema } from "./auth/password-reset";
export { DiscordInteractionHandler, discordInteractions, verifyDiscordSignature } from "./integrations/discord-interactions";
export type { DiscordInteraction, DiscordResponse } from "./integrations/discord-interactions";

// --- Phase 1: the spine (spec §14, §17, §19) ---
export { localDayKey, localDayKeyOffset, isSameLocalDay, dayKeyToDate } from "./time/day";
export { DOMAIN_EVENTS, isDomainEventType } from "./events/types";
export type { DomainEvent, DomainEventType } from "./events/types";
export { EventBus, events } from "./events/bus";
export type { EmitResult } from "./events/bus";
export { RulesEngine, rulesEngine } from "./rules/engine";
export type { RuleOutcome } from "./rules/engine";
export { parseCriteria, tryParseCriteria, describeCriteria, windowStart, InvalidCriteriaError } from "./rules/criteria";
export type { Criteria } from "./rules/criteria";
export { countEvidence, requiredFor } from "./rules/counters";

// --- Launch foundation: merch, growth, attention ---
export {
  CatalogService, catalog, CatalogError,
  validateProduct, reviewProduct, PRODUCT_KINDS,
} from "./catalog/catalog";
export type { ProductInput, VariantInput, ProductKind } from "./catalog/catalog";
export {
  priceInTime, judgePrice, thcFor, thcPerDollar, MERCH_ANCHOR,
  suggestPrice, dailyYield, yieldTable, ratePerHour, capacity, MERCH_TARGET_DAYS,
} from "./economy/mining-time";
export type { PlayStyle, PriceInTime, DailyYield } from "./economy/mining-time";
export {
  ReferralService, referrals, ReferralError,
  SelfReferralError, AlreadyReferredError, UnknownCodeError,
} from "./growth/referrals";
export {
  WatchService, watch, WatchError,
  TooSoonError, DailyCapReachedError, AlreadyPaidError, NoProgressError,
} from "./growth/watch";
export {
  VariantRequiredError, ShippingAddressRequiredError,
} from "./commerce/commerce";
export type { CheckoutInput, ShippingInput } from "./commerce/commerce";
