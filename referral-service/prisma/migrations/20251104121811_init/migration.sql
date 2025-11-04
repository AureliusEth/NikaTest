-- CreateTable
CREATE TABLE "TreasuryAccount" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "claimed" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreasuryAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "merkleVersion" INTEGER NOT NULL,
    "txHash" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreasuryAccount_chain_token_idx" ON "TreasuryAccount"("chain", "token");

-- CreateIndex
CREATE UNIQUE INDEX "TreasuryAccount_chain_token_address_key" ON "TreasuryAccount"("chain", "token", "address");

-- CreateIndex
CREATE INDEX "ClaimRecord_userId_chain_token_idx" ON "ClaimRecord"("userId", "chain", "token");

-- CreateIndex
CREATE INDEX "ClaimRecord_chain_token_claimedAt_idx" ON "ClaimRecord"("chain", "token", "claimedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimRecord_userId_chain_token_merkleVersion_key" ON "ClaimRecord"("userId", "chain", "token", "merkleVersion");
