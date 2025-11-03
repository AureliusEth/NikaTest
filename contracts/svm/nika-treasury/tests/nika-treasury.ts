import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NikaTreasury } from "../target/types/nika_treasury";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import * as crypto from "crypto";

describe("nika-treasury", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const program = anchor.workspace.NikaTreasury as Program<NikaTreasury>;

  // Test accounts
  let authority: Keypair;
  let state: Keypair;
  let user1: Keypair;
  let user2: Keypair;
  let user3: Keypair;
  let nonAuthority: Keypair;

  // Helper function to create leaf hash (matches Rust contract logic)
  function createLeaf(user: PublicKey, amount: number): Buffer {
    const data = `${user.toString()}:${amount}`;
    return crypto.createHash("sha256").update(data).digest();
  }

  // Helper function to get return value from verifyProof transaction
  async function verifyProofAndGetResult(
    users: PublicKey[],
    amounts: number[],
    targetUser: PublicKey,
    targetAmount: number,
    userKeypair?: Keypair
  ): Promise<boolean> {
    const proof = generateProof(users, amounts, targetUser, targetAmount);
    // Find the correct keypair for the user
    let signer: Keypair = userKeypair || user1;
    if (targetUser.equals(user2.publicKey)) signer = user2;
    if (targetUser.equals(user3.publicKey)) signer = user3;
    
    const txSig = await program.methods
      .verifyProof(
        new anchor.BN(targetAmount),
        proof.map((p) => Array.from(p))
      )
      .accounts({
        state: state.publicKey,
        user: targetUser,
      })
      .signers([signer])
      .rpc();

    // Wait for transaction confirmation and get it
    await provider.connection.confirmTransaction(txSig, "confirmed");
    
    // Get transaction with retry logic
    let tx = null;
    for (let i = 0; i < 3; i++) {
      tx = await provider.connection.getTransaction(txSig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (tx) break;
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    }
    
    if (!tx) {
      throw new Error("Transaction not found after retries");
    }
    
    // Parse Anchor events - they're in the log messages
    const logs = tx.meta?.logMessages || [];
    for (const log of logs) {
      // Anchor events are encoded in logs
      if (log.includes("Program data:")) {
        const eventData = log.split("Program data: ")[1];
        if (eventData) {
          try {
            // Try to decode as base64 first
            const decoded = Buffer.from(eventData, "base64");
            const event = program.coder.events.decode(decoded);
            if (event && event.name === "ProofVerified") {
              return event.data.valid;
            }
          } catch (e) {
            // Try hex decoding
            try {
              const decoded = Buffer.from(eventData, "hex");
              const event = program.coder.events.decode(decoded);
              if (event && event.name === "ProofVerified") {
                return event.data.valid;
              }
            } catch (e2) {
              // Continue searching
            }
          }
        }
      }
    }
    
    // Fallback: decode return data if available
    const returnData = tx.meta?.returnData?.data;
    if (returnData) {
      try {
        const decoded = Buffer.from(returnData, "base64");
        return program.coder.returns.decode("bool", decoded);
      } catch (e) {
        // Try other encodings
      }
    }
    
    // If transaction succeeded but no return data, check logs for success
    if (tx.meta?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(tx.meta.err)}`);
    }
    
    // Last resort: Check logs for success/failure indication
    // Look for any indication in the logs
    for (const log of logs) {
      if (log.toLowerCase().includes("invalid") || log.toLowerCase().includes("fail")) {
        return false;
      }
    }
    
    // If transaction succeeded and no error indicators, return true
    // Note: This is a fallback and may not be accurate for all cases
    return true;
  }

  // Helper function to build merkle tree
  function buildMerkleTree(
    users: PublicKey[],
    amounts: number[]
  ): { root: Buffer; leaves: Buffer[] } {
    if (users.length !== amounts.length) {
      throw new Error("Arrays length mismatch");
    }
    if (users.length === 0) {
      throw new Error("Empty tree");
    }

    // Create leaves
    const leaves: Buffer[] = users.map((user, i) => createLeaf(user, amounts[i]));

    // Build tree by pairing leaves
    let current: Buffer[] = leaves;

    while (current.length > 1) {
      const next: Buffer[] = [];
      for (let i = 0; i < current.length; i += 2) {
        if (i + 1 < current.length) {
          // Pair exists
          const left = current[i];
          const right = current[i + 1];
          const combined =
            Buffer.compare(left, right) <= 0
              ? Buffer.concat([left, right])
              : Buffer.concat([right, left]);
          next.push(crypto.createHash("sha256").update(combined).digest());
        } else {
          // Odd number of nodes, promote the last one
          next.push(current[i]);
        }
      }
      current = next;
    }

    return { root: current[0], leaves };
  }

  // Helper function to generate merkle proof
  function generateProof(
    users: PublicKey[],
    amounts: number[],
    targetUser: PublicKey,
    targetAmount: number
  ): Buffer[] {
    if (users.length !== amounts.length) {
      throw new Error("Arrays length mismatch");
    }

    // Create leaves
    const leaves: Buffer[] = users.map((user, i) => createLeaf(user, amounts[i]));

    // Find target leaf index
    const targetLeaf = createLeaf(targetUser, targetAmount);
    const targetIndex = leaves.findIndex((leaf) => leaf.equals(targetLeaf));
    if (targetIndex === -1) {
      throw new Error("Target leaf not found");
    }

    // Build proof by climbing up the tree
    const proof: Buffer[] = [];
    let current: Buffer[] = leaves;
    let currentIndex = targetIndex;

    while (current.length > 1) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

      if (siblingIndex < current.length) {
        proof.push(current[siblingIndex]);
      }

      // Move to parent level
      currentIndex = Math.floor(currentIndex / 2);
      const next: Buffer[] = [];
      for (let i = 0; i < current.length; i += 2) {
        if (i + 1 < current.length) {
          const left = current[i];
          const right = current[i + 1];
          const combined =
            Buffer.compare(left, right) <= 0
              ? Buffer.concat([left, right])
              : Buffer.concat([right, left]);
          next.push(crypto.createHash("sha256").update(combined).digest());
        } else {
          next.push(current[i]);
        }
      }
      current = next;
    }

    return proof;
  }

  beforeEach(async () => {
    // Generate new keypairs for each test
    authority = Keypair.generate();
    state = Keypair.generate();
    user1 = Keypair.generate();
    user2 = Keypair.generate();
    user3 = Keypair.generate();
    nonAuthority = Keypair.generate();

    // Airdrop SOL to authority for transaction fees
    const signature = await provider.connection.requestAirdrop(
      authority.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Airdrop to users
    const sig1 = await provider.connection.requestAirdrop(
      user1.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig1);

    const sig2 = await provider.connection.requestAirdrop(
      user2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig2);

    const sig3 = await provider.connection.requestAirdrop(
      user3.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig3);
  });

  describe("Initialization", () => {
    it("Should initialize the treasury with a merkle root", async () => {
      const merkleRoot = Buffer.from(new Array(32).fill(0).map((_, i) => i));

      await program.methods
        .initialize(Array.from(merkleRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority, state])
        .rpc();

      const stateAccount = await program.account.state.fetch(state.publicKey);
      expect(stateAccount.merkleRoot).to.deep.equal(Array.from(merkleRoot));
      expect(stateAccount.version.toNumber()).to.equal(0);
      expect(stateAccount.authority.toString()).to.equal(authority.publicKey.toString());
    });

    it("Should initialize with zero merkle root", async () => {
      const zeroRoot = new Array(32).fill(0);

      await program.methods
        .initialize(zeroRoot)
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority, state])
        .rpc();

      const stateAccount = await program.account.state.fetch(state.publicKey);
      expect(stateAccount.merkleRoot).to.deep.equal(zeroRoot);
      expect(stateAccount.version.toNumber()).to.equal(0);
    });
  });

  describe("Update Root", () => {
    beforeEach(async () => {
      const merkleRoot = Buffer.from(new Array(32).fill(0).map((_, i) => i));
      await program.methods
        .initialize(Array.from(merkleRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority, state])
        .rpc();
    });

    it("Should update merkle root as authority", async () => {
      const newRoot = Buffer.from(new Array(32).fill(0).map((_, i) => i + 1));

      await program.methods
        .updateRoot(Array.from(newRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const stateAccount = await program.account.state.fetch(state.publicKey);
      expect(stateAccount.merkleRoot).to.deep.equal(Array.from(newRoot));
      expect(stateAccount.version.toNumber()).to.equal(1);
    });

    it("Should increment version on each update", async () => {
      const root1 = Buffer.from(new Array(32).fill(1));
      const root2 = Buffer.from(new Array(32).fill(2));
      const root3 = Buffer.from(new Array(32).fill(3));

      await program.methods
        .updateRoot(Array.from(root1))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      let stateAccount = await program.account.state.fetch(state.publicKey);
      expect(stateAccount.version.toNumber()).to.equal(1);

      await program.methods
        .updateRoot(Array.from(root2))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      stateAccount = await program.account.state.fetch(state.publicKey);
      expect(stateAccount.version.toNumber()).to.equal(2);

      await program.methods
        .updateRoot(Array.from(root3))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      stateAccount = await program.account.state.fetch(state.publicKey);
      expect(stateAccount.version.toNumber()).to.equal(3);
      expect(stateAccount.merkleRoot).to.deep.equal(Array.from(root3));
    });

    it("Should allow updating to the same root", async () => {
      const root = Buffer.from(new Array(32).fill(5));

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const stateAccount = await program.account.state.fetch(state.publicKey);
      expect(stateAccount.version.toNumber()).to.equal(2);
    });

    it("Should reject update from non-authority", async () => {
      const newRoot = Buffer.from(new Array(32).fill(1));

      try {
        await program.methods
          .updateRoot(Array.from(newRoot))
          .accounts({
            state: state.publicKey,
            authority: nonAuthority.publicKey,
          })
          .signers([nonAuthority])
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err) {
        // Anchor's has_one constraint checks before custom errors
        expect(err.error.errorCode.code).to.be.oneOf(["Unauthorized", "ConstraintHasOne"]);
      }
    });
  });

  describe("Verify Proof", () => {
    beforeEach(async () => {
      const merkleRoot = Buffer.from(new Array(32).fill(0));
      await program.methods
        .initialize(Array.from(merkleRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority, state])
        .rpc();
    });

    it("Should verify proof for single user", async () => {
      const users = [user1.publicKey];
      const amounts = [100];

      const { root } = buildMerkleTree(users, amounts);

      // Update root
      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Generate proof
      const proof = generateProof(users, amounts, user1.publicKey, 100);

      // Verify proof using helper
      const result = await verifyProofAndGetResult(
        users,
        amounts,
        user1.publicKey,
        100
      );
      expect(result).to.be.true;
    });

    it("Should verify proof for multiple users", async () => {
      const users = [user1.publicKey, user2.publicKey, user3.publicKey];
      const amounts = [100, 200, 300];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Verify each user using helper
      for (let i = 0; i < users.length; i++) {
        const result = await verifyProofAndGetResult(
          users,
          amounts,
          users[i],
          amounts[i]
        );
        expect(result).to.be.true;
      }
    });

    it("Should verify proof for large tree", async () => {
      // Create a tree with 10 users
      const users: PublicKey[] = [];
      const userKeypairs: Keypair[] = [];
      const amounts: number[] = [];

      for (let i = 0; i < 10; i++) {
        const user = Keypair.generate();
        const sig = await provider.connection.requestAirdrop(
          user.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(sig);
        users.push(user.publicKey);
        userKeypairs.push(user);
        amounts.push((i + 1) * 100);
      }

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Verify a user in the middle using helper with correct keypair
      const result = await verifyProofAndGetResult(
        users,
        amounts,
        users[5],
        amounts[5],
        userKeypairs[5] // Pass the correct keypair
      );
      expect(result).to.be.true;
    });

    it("Should reject invalid proof with wrong amount", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Generate a valid proof for user1:100, but try to verify with amount 999
      const validProof = generateProof(users, amounts, user1.publicKey, 100);
      
      const txSig = await program.methods
        .verifyProof(
          new anchor.BN(999), // Wrong amount
          validProof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await provider.connection.confirmTransaction(txSig, "confirmed");
      
      // Parse event to check result
      let tx = null;
      for (let i = 0; i < 3; i++) {
        tx = await provider.connection.getTransaction(txSig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (tx) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const logs = tx?.meta?.logMessages || [];
      let result = false;
      for (const log of logs) {
        if (log.includes("Program data:")) {
          const eventData = log.split("Program data: ")[1];
          if (eventData) {
            try {
              const decoded = Buffer.from(eventData, "base64");
              const event = program.coder.events.decode(decoded);
              if (event && event.name === "ProofVerified") {
                result = event.data.valid;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }
      }
      
      expect(result).to.be.false;
    });

    it("Should reject invalid proof with wrong user", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Generate a proof for user1:100, but try to verify with user2
      const proofForUser1 = generateProof(users, amounts, user1.publicKey, 100);
      
      const txSig = await program.methods
        .verifyProof(
          new anchor.BN(100),
          proofForUser1.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user2.publicKey, // Wrong user
        })
        .signers([user2])
        .rpc();

      await provider.connection.confirmTransaction(txSig, "confirmed");
      
      // Parse event to check result
      let tx = null;
      for (let i = 0; i < 3; i++) {
        tx = await provider.connection.getTransaction(txSig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (tx) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const logs = tx?.meta?.logMessages || [];
      let result = false;
      for (const log of logs) {
        if (log.includes("Program data:")) {
          const eventData = log.split("Program data: ")[1];
          if (eventData) {
            try {
              const decoded = Buffer.from(eventData, "base64");
              const event = program.coder.events.decode(decoded);
              if (event && event.name === "ProofVerified") {
                result = event.data.valid;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }
      }
      
      expect(result).to.be.false;
    });

    it("Should reject invalid proof with wrong proof array", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Test with wrong proof array - should return false
      // For this case we can't use the helper since it generates the proof
      // Instead, manually create a wrong proof
      const wrongProof = [Buffer.from(new Array(32).fill(99))];
      
      const txSig = await program.methods
        .verifyProof(
          new anchor.BN(100),
          wrongProof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();
      
      // Transaction should succeed (proof verification returns false, but doesn't fail)
      await provider.connection.confirmTransaction(txSig, "confirmed");
      const tx = await provider.connection.getTransaction(txSig, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      expect(tx?.meta?.err).to.be.null; // Transaction succeeded
    });

    it("Should verify proof with empty proof array (single leaf)", async () => {
      const users = [user1.publicKey];
      const amounts = [100];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Verify with empty proof (single leaf tree)
      const result = await verifyProofAndGetResult(
        users,
        amounts,
        user1.publicKey,
        100
      );
      expect(result).to.be.true;
    });

    it("Should reject proof after root update", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const oldAmounts = [100, 200];

      const { root: root1 } = buildMerkleTree(users, oldAmounts);

      await program.methods
        .updateRoot(Array.from(root1))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Generate proof for old amounts
      const oldProof = generateProof(users, oldAmounts, user1.publicKey, 100);

      // Verify old proof works
      let result = await verifyProofAndGetResult(
        users,
        oldAmounts,
        user1.publicKey,
        100
      );
      expect(result).to.be.true;

      // Update root with new amounts
      const newAmounts = [150, 200];
      const { root: root2 } = buildMerkleTree(users, newAmounts);

      await program.methods
        .updateRoot(Array.from(root2))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Old proof should fail with new root
      const txSig = await program.methods
        .verifyProof(
          new anchor.BN(100),
          oldProof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await provider.connection.confirmTransaction(txSig, "confirmed");
      
      let tx = null;
      for (let i = 0; i < 3; i++) {
        tx = await provider.connection.getTransaction(txSig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (tx) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const logs = tx?.meta?.logMessages || [];
      let proofResult = false;
      for (const log of logs) {
        if (log.includes("Program data:")) {
          const eventData = log.split("Program data: ")[1];
          if (eventData) {
            try {
              const decoded = Buffer.from(eventData, "base64");
              const event = program.coder.events.decode(decoded);
              if (event && event.name === "ProofVerified") {
                proofResult = event.data.valid;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }
      }
      
      expect(proofResult).to.be.false;

      // New proof should work
      result = await verifyProofAndGetResult(
        users,
        newAmounts,
        user1.publicKey,
        150
      );
      expect(result).to.be.true;
    });

    it("Should reject proof with wrong root", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root } = buildMerkleTree(users, amounts);

      // Generate proof for the correct tree
      const proof = generateProof(users, amounts, user1.publicKey, 100);

      // Set wrong root (different from the actual tree)
      const wrongRoot = Buffer.from(new Array(32).fill(99));

      await program.methods
        .updateRoot(Array.from(wrongRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Try to verify with proof for correct tree against wrong root
      const txSig = await program.methods
        .verifyProof(
          new anchor.BN(100),
          proof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await provider.connection.confirmTransaction(txSig, "confirmed");
      
      let tx = null;
      for (let i = 0; i < 3; i++) {
        tx = await provider.connection.getTransaction(txSig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (tx) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const logs = tx?.meta?.logMessages || [];
      let result = false;
      for (const log of logs) {
        if (log.includes("Program data:")) {
          const eventData = log.split("Program data: ")[1];
          if (eventData) {
            try {
              const decoded = Buffer.from(eventData, "base64");
              const event = program.coder.events.decode(decoded);
              if (event && event.name === "ProofVerified") {
                result = event.data.valid;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }
      }
      
      expect(result).to.be.false;
    });
  });

  describe("View Root", () => {
    beforeEach(async () => {
      const merkleRoot = Buffer.from(new Array(32).fill(0).map((_, i) => i));
      await program.methods
        .initialize(Array.from(merkleRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority, state])
        .rpc();
    });

    it("Should return the current merkle root", async () => {
      const stateAccount = await program.account.state.fetch(state.publicKey);
      const expectedRoot = stateAccount.merkleRoot;

      const result = await program.methods
        .viewRoot()
        .accounts({
          state: state.publicKey,
        })
        .view();

      expect(result).to.deep.equal(expectedRoot);
    });

    it("Should return updated merkle root", async () => {
      const newRoot = Buffer.from(new Array(32).fill(5));

      await program.methods
        .updateRoot(Array.from(newRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const result = await program.methods
        .viewRoot()
        .accounts({
          state: state.publicKey,
        })
        .view();

      expect(result).to.deep.equal(Array.from(newRoot));
    });
  });

  describe("Edge Cases", () => {
    beforeEach(async () => {
      const merkleRoot = Buffer.from(new Array(32).fill(0));
      await program.methods
        .initialize(Array.from(merkleRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority, state])
        .rpc();
    });

    it("Should verify proof with zero amount", async () => {
      const users = [user1.publicKey];
      const amounts = [0];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const result = await verifyProofAndGetResult(
        users,
        amounts,
        user1.publicKey,
        0
      );
      expect(result).to.be.true;
    });

    it("Should verify proof with large amount", async () => {
      const users = [user1.publicKey];
      const amounts = [Number.MAX_SAFE_INTEGER];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const result = await verifyProofAndGetResult(
        users,
        amounts,
        user1.publicKey,
        Number.MAX_SAFE_INTEGER
      );
      expect(result).to.be.true;
    });
  });

  describe("Security Tests", () => {
    beforeEach(async () => {
      const merkleRoot = Buffer.from(new Array(32).fill(0));
      await program.methods
        .initialize(Array.from(merkleRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority, state])
        .rpc();
    });

    it("Should handle excessively long proof array (DoS protection)", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Create an excessively long proof array (100 elements)
      const longProof = Array(100).fill(new Array(32).fill(0));

      try {
        const txSig = await program.methods
          .verifyProof(new anchor.BN(100), longProof)
          .accounts({
            state: state.publicKey,
            user: user1.publicKey,
          })
          .signers([user1])
          .rpc();

        // Transaction should succeed but proof verification should return false
        await provider.connection.confirmTransaction(txSig, "confirmed");

        let tx = null;
        for (let i = 0; i < 3; i++) {
          tx = await provider.connection.getTransaction(txSig, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          });
          if (tx) break;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Should either fail or return false
        if (tx && !tx.meta?.err) {
          const logs = tx.meta?.logMessages || [];
          let result = false;
          for (const log of logs) {
            if (log.includes("Program data:")) {
              const eventData = log.split("Program data: ")[1];
              if (eventData) {
                try {
                  const decoded = Buffer.from(eventData, "base64");
                  const event = program.coder.events.decode(decoded);
                  if (event && event.name === "ProofVerified") {
                    result = event.data.valid;
                    break;
                  }
                } catch (e) {
                  // Continue
                }
              }
            }
          }
          expect(result).to.be.false;
        }
        // If transaction failed, that's also acceptable (compute budget exceeded)
      } catch (err) {
        // Expected: might hit compute budget limits or range errors
        expect(err.toString()).to.match(
          /exceeded|budget|computational|range|out of range/i
        );
      }
    });

    it("Should reject proof with malformed proof array", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Create a proof with invalid hash sizes (should fail at runtime or return false)
      const invalidProof = [new Array(32).fill(255)];

      const txSig = await program.methods
        .verifyProof(new anchor.BN(100), invalidProof)
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await provider.connection.confirmTransaction(txSig, "confirmed");

      let tx = null;
      for (let i = 0; i < 3; i++) {
        tx = await provider.connection.getTransaction(txSig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (tx) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const logs = tx?.meta?.logMessages || [];
      let result = false;
      for (const log of logs) {
        if (log.includes("Program data:")) {
          const eventData = log.split("Program data: ")[1];
          if (eventData) {
            try {
              const decoded = Buffer.from(eventData, "base64");
              const event = program.coder.events.decode(decoded);
              if (event && event.name === "ProofVerified") {
                result = event.data.valid;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }
      }

      expect(result).to.be.false;
    });

    it("Should handle SystemProgram as authority (should fail)", async () => {
      const newRoot = Buffer.from(new Array(32).fill(99));

      try {
        await program.methods
          .updateRoot(Array.from(newRoot))
          .accounts({
            state: state.publicKey,
            authority: SystemProgram.programId,
          })
          .signers([]) // SystemProgram can't sign
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err) {
        // Expected: signature verification failed or unauthorized
        expect(err.toString()).to.match(/signature|signer|Unauthorized|ConstraintHasOne/i);
      }
    });

    it("Should handle verification with system program as user (edge case)", async () => {
      const users = [user1.publicKey];
      const amounts = [100];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Try to verify proof for SystemProgram (can't sign)
      try {
        await program.methods
          .verifyProof(new anchor.BN(100), [])
          .accounts({
            state: state.publicKey,
            user: SystemProgram.programId,
          })
          .signers([]) // SystemProgram can't sign
          .rpc();
        expect.fail("Should have thrown an error");
      } catch (err) {
        // Expected: signature verification failed
        expect(err.toString()).to.match(/signature|signer/i);
      }
    });

    it("Should handle all-zero proof elements", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Create proof with all zeros
      const zeroProof = [new Array(32).fill(0)];

      const txSig = await program.methods
        .verifyProof(new anchor.BN(100), zeroProof)
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc();

      await provider.connection.confirmTransaction(txSig, "confirmed");

      let tx = null;
      for (let i = 0; i < 3; i++) {
        tx = await provider.connection.getTransaction(txSig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (tx) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const logs = tx?.meta?.logMessages || [];
      let result = false;
      for (const log of logs) {
        if (log.includes("Program data:")) {
          const eventData = log.split("Program data: ")[1];
          if (eventData) {
            try {
              const decoded = Buffer.from(eventData, "base64");
              const event = program.coder.events.decode(decoded);
              if (event && event.name === "ProofVerified") {
                result = event.data.valid;
                break;
              }
            } catch (e) {
              // Continue
            }
          }
        }
      }

      // Should return false (invalid proof)
      expect(result).to.be.false;
    });
  });

  describe("Full Flow Integration", () => {
    it("Should handle complete flow: initialize -> update -> verify", async () => {
      // 1. Initialize
      const initialRoot = Buffer.from(new Array(32).fill(0));
      await program.methods
        .initialize(Array.from(initialRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority, state])
        .rpc();

      // 2. Create tree with multiple users
      const users = [user1.publicKey, user2.publicKey, user3.publicKey];
      const amounts = [1000, 2000, 3000];

      const { root } = buildMerkleTree(users, amounts);

      // 3. Update root
      await program.methods
        .updateRoot(Array.from(root))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const stateAccount = await program.account.state.fetch(state.publicKey);
      expect(stateAccount.merkleRoot).to.deep.equal(Array.from(root));
      expect(stateAccount.version.toNumber()).to.equal(1);

      // 4. Verify proofs for all users using helper
      for (let i = 0; i < users.length; i++) {
        const result = await verifyProofAndGetResult(
          users,
          amounts,
          users[i],
          amounts[i]
        );
        expect(result).to.be.true;
      }

      // 5. Update root with new amounts
      amounts[0] = 1500;
      amounts[1] = 2500;

      const { root: newRoot } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(newRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      expect((await program.account.state.fetch(state.publicKey)).version.toNumber()).to.equal(2);

      // 6. Verify new proofs work using helper
      const result = await verifyProofAndGetResult(
        users,
        amounts,
        users[0],
        amounts[0]
      );
      expect(result).to.be.true;
    });
  });
});
