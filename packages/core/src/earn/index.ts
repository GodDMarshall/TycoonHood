// EARN workstream barrel — affiliate programme, commissions, payouts.
export type { EarnHooks } from "./hooks";
export {
  AffiliateService,
  affiliates,
  EarnError,
  EmailNotVerifiedError,
  AlreadyAffiliateError,
  AffiliateNotFoundError,
  InvalidStateError,
  HoldPeriodError,
  PayoutError,
  AFFILIATE_CODE_PATTERN,
  commissionAmount,
  visitorHash,
  ipKey,
} from "./affiliates";
export type { PayoutMethodInput, StoredPayoutMethod, RegisterInput, ClickInput } from "./affiliates";
