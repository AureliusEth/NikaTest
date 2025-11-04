// Deploy script for NikaTreasury Solana program
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NikaTreasury } from "../target/types/nika_treasury";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

module.exports = async function (provider: anchor.AnchorProvider) {
  // Configure client to use the provider
  anchor.setProvider(provider);

  const program = anchor.workspace.NikaTreasury as Program<NikaTreasury>;
  const authority = provider.wallet;

  console.log("Deploying NikaTreasury...");
  console.log("Authority:", authority.publicKey.toString());
  console.log("Program ID:", program.programId.toString());

  // Get initial merkle root from environment or use zero
  const initialMerkleRootEnv = process.env.INITIAL_MERKLE_ROOT;
  let initialMerkleRoot: Buffer;
  
  if (initialMerkleRootEnv) {
    // Parse hex string (with or without 0x prefix)
    const hex = initialMerkleRootEnv.startsWith("0x") 
      ? initialMerkleRootEnv.slice(2) 
      : initialMerkleRootEnv;
    initialMerkleRoot = Buffer.from(hex, "hex");
    if (initialMerkleRoot.length !== 32) {
      throw new Error("MERKLE_ROOT must be 32 bytes (64 hex characters)");
    }
  } else {
    // Default to zero merkle root
    initialMerkleRoot = Buffer.alloc(32, 0);
    console.log("Using zero merkle root (initialize with updateRoot later)");
  }

  // Create or load state keypair
  // For production, you might want to use a specific keypair file
  const stateKeypairPath = process.env.STATE_KEYPAIR_PATH || 
    path.join(__dirname, "..", "state-keypair.json");
  
  let stateKeypair: Keypair;
  
  if (fs.existsSync(stateKeypairPath)) {
    console.log("Loading existing state keypair from:", stateKeypairPath);
    const keypairData = JSON.parse(fs.readFileSync(stateKeypairPath, "utf-8"));
    stateKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } else {
    console.log("Generating new state keypair...");
    stateKeypair = Keypair.generate();
    // Save keypair for future use
    fs.writeFileSync(
      stateKeypairPath,
      JSON.stringify(Array.from(stateKeypair.secretKey))
    );
    console.log("State keypair saved to:", stateKeypairPath);
    console.log("⚠ Keep this file secure! It contains the private key for the state account.");
  }

  console.log("State account:", stateKeypair.publicKey.toString());

  try {
    // Initialize the program
    const merkleRootArray = Array.from(initialMerkleRoot);
    const tx = await program.methods
      .initialize(merkleRootArray.slice(0, 32) as any)
      .accounts({
        state: stateKeypair.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([stateKeypair])
      .rpc();

    console.log("Initialization transaction signature:", tx);
    console.log("✓ NikaTreasury initialized successfully");
    console.log("\nDeployment Summary:");
    console.log("  Program ID:", program.programId.toString());
    console.log("  State Account:", stateKeypair.publicKey.toString());
    console.log("  Authority:", authority.publicKey.toString());
    console.log("  Initial Merkle Root:", Buffer.from(initialMerkleRoot).toString("hex"));

    // Fetch and display state
    const state = await program.account.state.fetch(stateKeypair.publicKey);
    console.log("  Version:", state.version.toString());
  } catch (error: any) {
    // Check if already initialized
    if (error.message && (error.message.includes("already in use") || error.message.includes("AccountInUse"))) {
      console.log("⚠ State account already initialized");
      console.log("State Account:", stateKeypair.publicKey.toString());
      
      // Fetch existing state
      try {
        const state = await program.account.state.fetch(stateKeypair.publicKey);
        console.log("\nExisting State:");
        console.log("  Merkle Root:", Buffer.from(state.merkleRoot).toString("hex"));
        console.log("  Version:", state.version.toString());
        console.log("  Authority:", state.authority.toString());
      } catch (fetchError) {
        console.error("Error fetching state:", fetchError);
      }
    } else {
      throw error;
    }
  }
};
