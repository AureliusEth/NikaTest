// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract NikaTreasury is Ownable {
    bytes32 public merkleRoot;
    uint256 public merkleRootVersion;
    event MerkleRootUpdated(bytes32 newRoot);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    function updateMerkleRoot(bytes32 newRoot) public onlyOwner {
        merkleRoot = newRoot;
        merkleRootVersion++;
        emit MerkleRootUpdated(newRoot);
    }
    function verifyProof(
        bytes32[] memory proof,
        string memory user_id,
        string memory token,
        string memory amount_str
    ) public view returns (bool) {
        // Step 1: Create user's leaf from raw data
        // Backend format: `${balance.beneficiaryId}:${balance.token}:${balance.totalAmount.toFixed(8)}`
        // Note: Backend uses SHA256, but EVM uses keccak256 (same as SHA3-256)
        bytes32 computedHash = keccak256(abi.encodePacked(user_id, ":", token, ":", amount_str));
        
        // Step 2: Climb up the tree, hashing pair by pair
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            // Sort hashes to ensure deterministic ordering
            // (smaller hash goes first)
            if (computedHash <= proofElement) {
                // hash(current, sibling)
                computedHash = keccak256(
                    abi.encodePacked(computedHash, proofElement)
                );
            } else {
                // hash(sibling, current)
                computedHash = keccak256(
                    abi.encodePacked(proofElement, computedHash)
                );
            }
        }
        
        // Step 3: Check if we reached the stored root
        return computedHash == merkleRoot;
    }
}
