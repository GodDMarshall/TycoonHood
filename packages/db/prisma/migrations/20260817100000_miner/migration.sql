-- AlterEnum
ALTER TYPE "LedgerAccountType" ADD VALUE 'MINING_POOL';

-- AlterEnum
ALTER TYPE "TxReason" ADD VALUE 'REWARD_MINING';

-- CreateTable
CREATE TABLE "MinerState" (
    "userId" TEXT NOT NULL,
    "rigLevel" INTEGER NOT NULL DEFAULT 1,
    "lastClaimAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalMined" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinerState_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "MinerState_totalMined_idx" ON "MinerState"("totalMined");

-- AddForeignKey
ALTER TABLE "MinerState" ADD CONSTRAINT "MinerState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
