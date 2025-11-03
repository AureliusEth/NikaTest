-- AlterTable
ALTER TABLE "CommissionLedgerEntry" ADD COLUMN     "destination" TEXT NOT NULL DEFAULT 'claimable';

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "chain" TEXT NOT NULL DEFAULT 'EVM';

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_destination_token_idx" ON "CommissionLedgerEntry"("destination", "token");

-- CreateIndex
CREATE INDEX "Trade_chain_createdAt_idx" ON "Trade"("chain", "createdAt");
