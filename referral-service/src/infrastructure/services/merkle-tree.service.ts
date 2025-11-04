import { Injectable } from '@nestjs/common';
import { keccak256 } from 'ethers';
import MerkleTree from 'merkletreejs';
import {
  MerkleTreeService as IMerkleTreeService,
  ClaimableBalance,
  MerkleProof,
  MerkleRootData,
} from '../../domain/services/merkle-tree.service';
import { PrismaService } from '../prisma/services/prisma.service';

/**
 * Merkle Tree Service Implementation (Infrastructure Layer)
 * 
 * Implements merkle tree generation for the claimable balances tracking contract.
 * 
 * How it works:
 * 1. Aggregate all claimable balances by user
 * 2. Create leaf nodes: keccak256(beneficiaryId + token + amount)
 * 3. Build merkle tree from leaves
 * 4. Store root hash (this is what goes on-chain)
 * 5. Users can generate proofs to claim their funds
 * 
 * NOTE: Uses keccak256 for hashing to match EVM and SVM contracts.
 */
@Injectable()
export class MerkleTreeService implements IMerkleTreeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a leaf hash for a claimable balance entry using keccak256
   */
  private createLeaf(balance: ClaimableBalance): Buffer {
    const data = `${balance.beneficiaryId}:${balance.token}:${balance.totalAmount.toFixed(8)}`;
    // keccak256 returns a hex string with '0x' prefix, convert to buffer
    const hash = keccak256(Buffer.from(data));
    return Buffer.from(hash.slice(2), 'hex');
  }

  /**
   * keccak256 hash function for merkle tree (matches EVM/SVM contracts)
   */
  private hashFn(data: Buffer): Buffer {
    const hash = keccak256(data);
    return Buffer.from(hash.slice(2), 'hex');
  }

  generateTree(
    balances: ClaimableBalance[],
    chain: 'EVM' | 'SVM'
  ): {
    root: string;
    leaves: Map<string, string>;
  } {
    if (balances.length === 0) {
      // Empty tree - return zero hash
      return {
        root: '0x' + '0'.repeat(64),
        leaves: new Map(),
      };
    }

    // Sort balances by beneficiaryId for deterministic tree construction
    const sortedBalances = [...balances].sort((a, b) => 
      a.beneficiaryId.localeCompare(b.beneficiaryId)
    );

    // Create leaf nodes
    const leaves = sortedBalances.map(balance => this.createLeaf(balance));
    
    // Build merkle tree
    const tree = new MerkleTree(leaves, this.hashFn, { sortPairs: true });
    const root = tree.getRoot();

    // Create leaf map for quick lookup
    const leafMap = new Map<string, string>();
    sortedBalances.forEach((balance, index) => {
      leafMap.set(balance.beneficiaryId, '0x' + leaves[index].toString('hex'));
    });

    return {
      root: '0x' + root.toString('hex'),
      leaves: leafMap,
    };
  }

  generateProof(
    beneficiaryId: string,
    balances: ClaimableBalance[]
  ): MerkleProof | null {
    // Find the user's balance
    const userBalance = balances.find(b => b.beneficiaryId === beneficiaryId);
    if (!userBalance) {
      return null;
    }

    // Sort balances for deterministic tree
    const sortedBalances = [...balances].sort((a, b) => 
      a.beneficiaryId.localeCompare(b.beneficiaryId)
    );

    // Create leaves
    const leaves = sortedBalances.map(balance => this.createLeaf(balance));
    const tree = new MerkleTree(leaves, this.hashFn, { sortPairs: true });

    // Find user's leaf index
    const userIndex = sortedBalances.findIndex(b => b.beneficiaryId === beneficiaryId);
    if (userIndex === -1) {
      return null;
    }

    const userLeaf = leaves[userIndex];
    const proof = tree.getProof(userLeaf);

    return {
      beneficiaryId: userBalance.beneficiaryId,
      token: userBalance.token,
      amount: userBalance.totalAmount,
      proof: proof.map(p => '0x' + p.data.toString('hex')),
      leaf: '0x' + userLeaf.toString('hex'),
    };
  }

  verifyProof(proof: MerkleProof, root: string): boolean {
    // Recreate the leaf
    const leaf = Buffer.from(proof.leaf.slice(2), 'hex');
    
    // Convert proof strings to buffers
    const proofBuffers = proof.proof.map(p => Buffer.from(p.slice(2), 'hex'));
    
    // Verify against root
    const rootBuffer = Buffer.from(root.slice(2), 'hex');
    
    return MerkleTree.verify(proofBuffers, leaf, rootBuffer, this.hashFn, { sortPairs: true });
  }

  async storeMerkleRoot(rootData: MerkleRootData): Promise<void> {
    await this.prisma.merkleRoot.create({
      data: {
        chain: rootData.chain,
        token: rootData.token,
        root: rootData.root,
        version: rootData.version,
        leafCount: rootData.leafCount,
        createdAt: rootData.createdAt,
      },
    });
  }

  async getLatestRoot(chain: 'EVM' | 'SVM', token: string): Promise<MerkleRootData | null> {
    const root = await this.prisma.merkleRoot.findFirst({
      where: { chain, token },
      orderBy: { version: 'desc' },
    });

    if (!root) {
      return null;
    }

    return {
      chain: root.chain as 'EVM' | 'SVM',
      token: root.token,
      root: root.root,
      version: root.version,
      leafCount: root.leafCount,
      createdAt: root.createdAt,
    };
  }

  /**
   * Generates and stores a new merkle root from current claimable balances.
   * This should be called periodically or after significant balance changes.
   */
  async generateAndStoreRoot(chain: 'EVM' | 'SVM', token: string): Promise<MerkleRootData> {
    // Get all claimable balances for this chain/token
    const balances = await this.getClaimableBalances(chain, token);
    
    // Generate merkle tree
    const { root } = this.generateTree(balances, chain);
    
    // Get next version number
    const latestRoot = await this.getLatestRoot(chain, token);
    const version = (latestRoot?.version ?? 0) + 1;
    
    // Store root
    const rootData: MerkleRootData = {
      chain,
      token,
      root,
      version,
      leafCount: balances.length,
      createdAt: new Date(),
    };
    
    await this.storeMerkleRoot(rootData);
    
    return rootData;
  }

  /**
   * Gets all UNCLAIMED balances from the ledger
   * 
   * CRITICAL: This must exclude already-claimed entries to prevent double-spending!
   * We calculate: Unclaimed = Total Earned - Total Claimed
   */
  private async getClaimableBalances(chain: 'EVM' | 'SVM', token: string): Promise<ClaimableBalance[]> {
    // Get total earned per user from ledger (filtered by chain via join with Trade table)
    const earnedResults = await this.prisma.$queryRaw<Array<{ beneficiaryId: string; totalEarned: string }>>`
      SELECT 
        l."beneficiaryId",
        SUM(l.amount)::text as "totalEarned"
      FROM "CommissionLedgerEntry" l
      INNER JOIN "Trade" t ON l."sourceTradeId" = t.id
      WHERE l.destination = 'claimable'
        AND l.token = ${token}
        AND t.chain = ${chain}
      GROUP BY l."beneficiaryId"
      HAVING SUM(l.amount) > 0
    `;

    // Get total claimed per user from claim records
    const claimedResults = await this.prisma.$queryRaw<Array<{ userId: string; totalClaimed: string }>>`
      SELECT 
        "userId",
        SUM(amount)::text as "totalClaimed"
      FROM "ClaimRecord"
      WHERE chain = ${chain}
        AND token = ${token}
      GROUP BY "userId"
    `;

    // Build map of claimed amounts
    const claimedByUser = new Map<string, number>();
    for (const row of claimedResults) {
      claimedByUser.set(row.userId, parseFloat(row.totalClaimed));
    }

    // Calculate unclaimed balances (earned - claimed)
    const results: ClaimableBalance[] = [];
    for (const row of earnedResults) {
      const earned = parseFloat(row.totalEarned);
      const claimed = claimedByUser.get(row.beneficiaryId) || 0;
      const unclaimed = earned - claimed;

      if (unclaimed > 0) {
        results.push({
          beneficiaryId: row.beneficiaryId,
          token,
          totalAmount: unclaimed,
        });
      }
    }

    return results;
  }
}

