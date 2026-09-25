/**
 * Re-export only. The mining-time maths moved to @tycoonhood/config so that
 * @tycoonhood/db seeds can price merch without importing core (which imports
 * db — that way round is a cycle).
 */
export {
  priceInTime,
  judgePrice,
  thcFor,
  thcPerDollar,
  MERCH_ANCHOR,
  suggestPrice,
  dailyYield,
  yieldTable,
  ratePerHour,
  capacity,
  MERCH_TARGET_DAYS,
} from "@tycoonhood/config";
export type { PlayStyle, PriceInTime, DailyYield } from "@tycoonhood/config";
