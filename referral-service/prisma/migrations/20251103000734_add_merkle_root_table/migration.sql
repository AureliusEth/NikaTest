-- CreateTable
CREATE TABLE "MerkleRoot" (
    "id" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "root" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "leafCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerkleRoot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerkleRoot_chain_token_createdAt_idx" ON "MerkleRoot"("chain", "token", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MerkleRoot_chain_token_version_key" ON "MerkleRoot"("chain", "token", "version");
