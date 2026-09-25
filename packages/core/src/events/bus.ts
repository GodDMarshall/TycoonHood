/**
 * THE EVENT BUS (spec §14, §17)
 *
 * The single seam between "something happened" and "something is owed".
 * Callers emit; they do not decide rewards. A failure in the rules engine must
 * never roll back the thing that actually happened — a lesson stays completed
 * even if a mission payout has a bad day — so emit is fail-soft and says so.
 */
import { prisma as defaultPrisma } from "@tycoonhood/db";
import type { PrismaClient } from "@tycoonhood/db";
import type { DomainEvent } from "./types";
import { RulesEngine, type RuleOutcome } from "../rules/engine";

export interface EmitResult extends RuleOutcome {
  ok: boolean;
  error?: string;
}

export class EventBus {
  private engine: RulesEngine;
  constructor(db: PrismaClient = defaultPrisma) {
    this.engine = new RulesEngine(db);
  }

  /** Fail-soft: never throws into the caller's flow. */
  async emit(event: DomainEvent): Promise<EmitResult> {
    try {
      const outcome = await this.engine.handle(event);
      return { ok: true, ...outcome };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        missions: [],
        achievements: [],
        skipped: [],
      };
    }
  }

  /** Strict variant for tests and admin tooling — surfaces the failure. */
  async emitOrThrow(event: DomainEvent): Promise<RuleOutcome> {
    return this.engine.handle(event);
  }
}

export const events = new EventBus();
