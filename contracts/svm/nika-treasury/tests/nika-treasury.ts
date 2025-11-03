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
        expect(err.error.errorCode.code).to.equal("Unauthorized");
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

      // Verify proof
      const result = await program.methods
        .verifyProof(
          new anchor.BN(100),
          proof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .signers([user1])
        .view();

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

      // Verify each user
      for (let i = 0; i < users.length; i++) {
        const proof = generateProof(users, amounts, users[i], amounts[i]);

        const result = await program.methods
          .verifyProof(
            new anchor.BN(amounts[i]),
            proof.map((p) => Array.from(p))
          )
          .accounts({
            state: state.publicKey,
            user: users[i],
          })
          .signers([i === 0 ? user1 : i === 1 ? user2 : user3])
          .view();

        expect(result).to.be.true;
      }
    });

    it("Should verify proof for large tree", async () => {
      // Create a tree with 10 users
      const users: PublicKey[] = [];
      const amounts: number[] = [];

      for (let i = 0; i < 10; i++) {
        const user = Keypair.generate();
        const sig = await provider.connection.requestAirdrop(
          user.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(sig);
        users.push(user.publicKey);
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

      // Verify a user in the middle
      const proof = generateProof(users, amounts, users[5], amounts[5]);

      const result = await program.methods
        .verifyProof(
          new anchor.BN(amounts[5]),
          proof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: users[5],
        })
        .view();

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

      const proof = generateProof(users, amounts, user1.publicKey, 100);

      const result = await program.methods
        .verifyProof(
          new anchor.BN(999), // Wrong amount
          proof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

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

      const proof = generateProof(users, amounts, user1.publicKey, 100);

      // Try to verify with user2 but proof for user1
      const result = await program.methods
        .verifyProof(
          new anchor.BN(100),
          proof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user2.publicKey, // Wrong user
        })
        .view();

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

      const wrongProof = [Buffer.from(new Array(32).fill(99))];

      const result = await program.methods
        .verifyProof(
          new anchor.BN(100),
          wrongProof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

      expect(result).to.be.false;
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

      const emptyProof: Buffer[] = [];

      const result = await program.methods
        .verifyProof(new anchor.BN(100), emptyProof.map((p) => Array.from(p)))
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

      expect(result).to.be.true;
    });

    it("Should reject proof after root update", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root: root1 } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root1))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const proof1 = generateProof(users, amounts, user1.publicKey, 100);

      // Verify old proof works
      let result = await program.methods
        .verifyProof(
          new anchor.BN(100),
          proof1.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

      expect(result).to.be.true;

      // Update root with new amounts
      amounts[0] = 150;
      const { root: root2 } = buildMerkleTree(users, amounts);

      await program.methods
        .updateRoot(Array.from(root2))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      // Old proof should fail
      result = await program.methods
        .verifyProof(
          new anchor.BN(100),
          proof1.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

      expect(result).to.be.false;

      // New proof should work
      const proof2 = generateProof(users, amounts, user1.publicKey, 150);

      result = await program.methods
        .verifyProof(
          new anchor.BN(150),
          proof2.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

      expect(result).to.be.true;
    });

    it("Should reject proof with wrong root", async () => {
      const users = [user1.publicKey, user2.publicKey];
      const amounts = [100, 200];

      const { root } = buildMerkleTree(users, amounts);

      // Set wrong root
      const wrongRoot = Buffer.from(new Array(32).fill(99));

      await program.methods
        .updateRoot(Array.from(wrongRoot))
        .accounts({
          state: state.publicKey,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const proof = generateProof(users, amounts, user1.publicKey, 100);

      const result = await program.methods
        .verifyProof(
          new anchor.BN(100),
          proof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

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

      const proof = generateProof(users, amounts, user1.publicKey, 0);

      const result = await program.methods
        .verifyProof(new anchor.BN(0), proof.map((p) => Array.from(p)))
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

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

      const proof = generateProof(users, amounts, user1.publicKey, amounts[0]);

      const result = await program.methods
        .verifyProof(
          new anchor.BN(amounts[0]),
          proof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: user1.publicKey,
        })
        .view();

      expect(result).to.be.true;
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

      // 4. Verify proofs for all users
      for (let i = 0; i < users.length; i++) {
        const proof = generateProof(users, amounts, users[i], amounts[i]);

        const result = await program.methods
          .verifyProof(
            new anchor.BN(amounts[i]),
            proof.map((p) => Array.from(p))
          )
          .accounts({
            state: state.publicKey,
            user: users[i],
          })
          .view();

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

      // 6. Verify new proofs work
      const newProof = generateProof(users, amounts, users[0], amounts[0]);

      const result = await program.methods
        .verifyProof(
          new anchor.BN(amounts[0]),
          newProof.map((p) => Array.from(p))
        )
        .accounts({
          state: state.publicKey,
          user: users[0],
        })
        .view();

      expect(result).to.be.true;
    });
  });
});
