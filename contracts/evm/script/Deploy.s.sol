// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {NikaTreasury} from "../src/NikaTreasury.sol";

contract DeployScript is Script {
    function run() external returns (address deployedAddress) {
        // Read environment variables from .env file
        // Handle private key with or without 0x prefix
        string memory privateKeyStr = vm.envString("PRIVATE_KEY");
        uint256 deployerPrivateKey;
        
        // Check if it starts with 0x and parse accordingly
        bytes memory pkBytes = bytes(privateKeyStr);
        if (pkBytes.length >= 2 && pkBytes[0] == '0' && pkBytes[1] == 'x') {
            deployerPrivateKey = vm.parseUint(privateKeyStr);
        } else {
            // Add 0x prefix if not present
            string memory prefixedKey = string.concat("0x", privateKeyStr);
            deployerPrivateKey = vm.parseUint(prefixedKey);
        }
        
        string memory rpcUrl = vm.envString("RPC_URL");
        
        // Get deployer address from private key
        address deployer = vm.addr(deployerPrivateKey);
        
        // Optionally override with environment variable
        string memory ownerEnv = vm.envOr("OWNER_ADDRESS", string(""));
        address owner = deployer;
        
        if (bytes(ownerEnv).length > 0) {
            owner = vm.parseAddress(ownerEnv);
        }
        
        console.log("Deploying NikaTreasury to Arbitrum Sepolia...");
        console.log("RPC URL:", rpcUrl);
        console.log("Deployer:", deployer);
        console.log("Owner:", owner);
        
        // Deploy contract
        vm.startBroadcast(deployerPrivateKey);
        NikaTreasury treasury = new NikaTreasury(owner);
        vm.stopBroadcast();
        
        console.log("NikaTreasury deployed at:", address(treasury));
        console.log("Merkle Root:", vm.toString(treasury.merkleRoot()));
        console.log("Merkle Root Version:", treasury.merkleRootVersion());
        
        return address(treasury);
    }
}

