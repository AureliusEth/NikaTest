#!/usr/bin/env node
/**
 * Deployment script for NikaTreasury on Arbitrum Sepolia
 * 
 * Usage:
 *   node deploy.js [--verify] [--etherscan-api-key <key>]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found!');
    console.error('Please create .env file with PRIVATE_KEY and RPC_URL');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

function main() {
  console.log('🚀 Deploying NikaTreasury to Arbitrum Sepolia...\n');

  // Load environment variables
  const env = loadEnv();

  // Validate required variables
  if (!env.PRIVATE_KEY || !env.RPC_URL) {
    console.error('Error: PRIVATE_KEY and RPC_URL must be set in .env file');
    process.exit(1);
  }

  console.log(`📡 RPC URL: ${env.RPC_URL}`);
  console.log(`👤 Deployer: ${env.PRIVATE_KEY.slice(0, 10)}...\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const verify = args.includes('--verify');
  const etherscanIndex = args.indexOf('--etherscan-api-key');
  const etherscanApiKey = etherscanIndex !== -1 && args[etherscanIndex + 1] 
    ? args[etherscanIndex + 1] 
    : env.ETHERSCAN_API_KEY;

  // Build forge command
  let command = `forge script script/Deploy.s.sol:DeployScript --rpc-url "${env.RPC_URL}" --broadcast -vvvv`;

  if (verify) {
    if (!etherscanApiKey) {
      console.error('Error: --verify requires ETHERSCAN_API_KEY to be set');
      console.error('Set it in .env file or pass --etherscan-api-key <key>');
      process.exit(1);
    }
    command += ` --verify --etherscan-api-key "${etherscanApiKey}"`;
  }

  console.log('📝 Running deployment command...\n');
  console.log(command.replace(env.PRIVATE_KEY, '[REDACTED]').replace(env.RPC_URL, '[RPC_URL]'));
  console.log('');

  try {
    // Set environment variables
    process.env.PRIVATE_KEY = env.PRIVATE_KEY;
    process.env.RPC_URL = env.RPC_URL;
    if (env.OWNER_ADDRESS) {
      process.env.OWNER_ADDRESS = env.OWNER_ADDRESS;
    }

    // Execute forge script
    execSync(command, {
      stdio: 'inherit',
      cwd: __dirname,
      env: { ...process.env }
    });

    console.log('\n✅ Deployment complete!');
    
    if (verify) {
      console.log('\n📋 Contract verification submitted to Etherscan');
      console.log('   Check status on: https://sepolia-explorer.arbitrum.io/');
    } else {
      console.log('\n💡 To verify the contract, run:');
      console.log('   node deploy.js --verify --etherscan-api-key <YOUR_API_KEY>');
      console.log('\n   Or add ETHERSCAN_API_KEY to your .env file and run:');
      console.log('   node deploy.js --verify');
    }
  } catch (error) {
    console.error('\n❌ Deployment failed!');
    console.error(error.message);
    process.exit(1);
  }
}

main();





