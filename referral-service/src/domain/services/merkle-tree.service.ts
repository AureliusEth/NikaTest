/**
 * Claimable Balance represents what a user can claim from the smart contract
 */
export interface ClaimableBalance {
  beneficiaryId: string;
  token: string;
  totalAmount: number;
}

/**
 * Merkle Proof allows a user to verify their claimable amount on-chain
 */
export interface MerkleProof {
  beneficiaryId: string;
  token: string;
  amount: number;
  proof: string[]; // Array of hashes for merkle proof
  leaf: string; // The leaf hash for this user
}

/**
 * Merkle Root represents the root hash that gets stored on-chain
 */
export interface MerkleRootData {
  chain: 'EVM' | 'SVM';
  token: string;
  root: string;
  version: number;
  leafCount: number;
  createdAt: Date;
}

/**
 * Merkle Tree Service Interface (Domain Layer)
 * 
 * Handles merkle tree generation for the claimable balances smart contract.
 * This allows users to prove their claimable amount on-chain without storing
 * every user's balance directly in the contract.
 * 
 * The smart contract only needs to store the merkle root, and users can
 * submit a proof to claim their funds.
 */
export interface MerkleTreeService {
  /**
   * Generates a merkle tree from claimable balances.
   * Returns the root hash and leaf data.
   * 
   * @param balances - Array of user balances
   * @param chain - EVM or SVM
   * @returns Merkle root data with tree structure
   */
  generateTree(
    balances: ClaimableBalance[],
    chain: 'EVM' | 'SVM'
  ): {
    root: string;
    leaves: Map<string, string>; // beneficiaryId -> leaf hash
  };

  /**
   * Generates a merkle proof for a specific user.
   * The user can submit this proof to the smart contract to claim funds.
   * 
   * @param beneficiaryId - User ID
   * @param balances - All user balances (to rebuild tree)
   * @returns Merkle proof or null if user not found
   */
  generateProof(
    beneficiaryId: string,
    balances: ClaimableBalance[]
  ): MerkleProof | null;

  /**
   * Verifies a merkle proof against a root.
   * Used for testing and validation.
   * 
   * @param proof - The merkle proof
   * @param root - The merkle root to verify against
   * @returns True if proof is valid
   */
  verifyProof(proof: MerkleProof, root: string): boolean;

  /**
   * Stores a merkle root in the database.
   * This represents a snapshot of claimable balances at a point in time.
   * 
   * @param rootData - Merkle root data to store
   */
  storeMerkleRoot(rootData: MerkleRootData): Promise<void>;

  /**
   * Gets the latest merkle root for a chain/token pair.
   * 
   * @param chain - EVM or SVM
   * @param token - Token type
   * @returns Latest merkle root or null
   */
  getLatestRoot(chain: 'EVM' | 'SVM', token: string): Promise<MerkleRootData | null>;
}

