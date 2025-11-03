// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NikaTreasury is Ownable {
    bytes32 public merkleRoot;
    uint256 public merkleRootVersion;
    IERC20 public token; // XP token address
    
    mapping(uint256 => mapping(address => bool)) public claimed; // version => user => claimed
    
    event MerkleRootUpdated(bytes32 newRoot);
    event Claimed(address indexed user, uint256 amount, uint256 version);
    
    constructor(address initialOwner, address _token) Ownable(initialOwner) {
        token = IERC20(_token);
    }
    
    function updateMerkleRoot(bytes32 newRoot) public onlyOwner {
        merkleRoot = newRoot;
        merkleRootVersion++;
        emit MerkleRootUpdated(newRoot);
    }
    
    function verifyProof(
        bytes32[] memory proof,
        uint256 amount,
        address user
    ) public view returns (bool) {
        // Step 1: Create user's leaf from raw data
        bytes32 computedHash = keccak256(abi.encodePacked(user, ":", amount));
        
        // Step 2: Climb up the tree, hashing pair by pair
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            // Sort hashes to ensure deterministic ordering
            if (computedHash <= proofElement) {
                computedHash = keccak256(
                    abi.encodePacked(computedHash, proofElement)
                );
            } else {
                computedHash = keccak256(
                    abi.encodePacked(proofElement, computedHash)
                );
            }
        }
        
        // Step 3: Check if we reached the stored root
        return computedHash == merkleRoot;
    }
    
    /**
     * Claim XP tokens using merkle proof
     */
    function claim(
        bytes32[] memory proof,
        uint256 amount
    ) external {
        require(!claimed[merkleRootVersion][msg.sender], "Already claimed");
        require(verifyProof(proof, amount, msg.sender), "Invalid proof");
        
        // Mark as claimed
        claimed[merkleRootVersion][msg.sender] = true;
        
        // Transfer tokens
        require(token.transfer(msg.sender, amount), "Transfer failed");
        
        emit Claimed(msg.sender, amount, merkleRootVersion);
    }
}
