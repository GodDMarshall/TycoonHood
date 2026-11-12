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
  payoutBlocker,
} from "./affiliates";
/** The keyed IP hash sessions and affiliate clicks share; it lives in platform/ip-key. */
export { ipKey } from "../platform/ip-key";
export type { PayoutMethodInput, StoredPayoutMethod, RegisterInput, ClickInput, PayoutCheck } from "./affiliates";
