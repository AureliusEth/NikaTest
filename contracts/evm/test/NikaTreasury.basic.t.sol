// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {NikaTreasury} from "../src/NikaTreasury.sol";

/**
 * Basic NikaTreasury Tests - String-based Interface
 * 
 * Tests the current contract with string parameters:
 * - user_id: Email address (string)
 * - token: "XP", "USDC", etc
 * - amount_str: Amount with 8 decimals like "100.00000000"
 */
contract NikaTreasuryBasicTest is Test {
    NikaTreasury public treasury;
    address public owner;
    address public nonOwner;

    function setUp() public {
        owner = address(this);
        nonOwner = makeAddr("nonOwner");
        
        treasury = new NikaTreasury(owner);
    }

    // Helper to create leaf hash matching backend format
    function createLeaf(
        string memory userId,
        string memory token,
        string memory amountStr
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(userId, ":", token, ":", amountStr));
    }

    // ============ Basic Functionality Tests ============

    function test_InitialState() public view {
        assertEq(treasury.merkleRoot(), bytes32(0));
        assertEq(treasury.merkleRootVersion(), 0);
        assertEq(treasury.owner(), owner);
    }

    function test_UpdateMerkleRoot() public {
        bytes32 newRoot = bytes32(uint256(12345));
        
        treasury.updateMerkleRoot(newRoot);
        
        assertEq(treasury.merkleRoot(), newRoot);
        assertEq(treasury.merkleRootVersion(), 1);
    }

    function test_UpdateMerkleRoot_OnlyOwner() public {
        bytes32 newRoot = bytes32(uint256(12345));
        
        vm.prank(nonOwner);
        vm.expectRevert();
        treasury.updateMerkleRoot(newRoot);
    }

    function test_UpdateMerkleRoot_EmitsEvent() public {
        bytes32 newRoot = bytes32(uint256(12345));
        
        vm.expectEmit(true, false, false, false);
        emit NikaTreasury.MerkleRootUpdated(newRoot);
        
        treasury.updateMerkleRoot(newRoot);
    }

    // ============ Single User Verification ============

    function test_VerifyProof_SingleUser_EmptyProof() public {
        // Arrange: Single user tree, root = leaf
        string memory userId = "user@example.com";
        string memory token = "XP";
        string memory amount = "100.00000000";
        
        bytes32 leaf = createLeaf(userId, token, amount);
        treasury.updateMerkleRoot(leaf);
        
        // Act: Verify with empty proof (single leaf = root)
        bytes32[] memory emptyProof = new bytes32[](0);
        bool isValid = treasury.verifyProof(emptyProof, userId, token, amount);
        
        // Assert
        assertTrue(isValid);
    }

    function test_VerifyProof_SingleUser_WrongAmount() public {
        // Arrange
        string memory userId = "user@example.com";
        string memory token = "XP";
        string memory correctAmount = "100.00000000";
        string memory wrongAmount = "999.00000000";
        
        bytes32 leaf = createLeaf(userId, token, correctAmount);
        treasury.updateMerkleRoot(leaf);
        
        // Act: Try with wrong amount
        bytes32[] memory emptyProof = new bytes32[](0);
        bool isValid = treasury.verifyProof(emptyProof, userId, token, wrongAmount);
        
        // Assert: Should fail
        assertFalse(isValid);
    }

    function test_VerifyProof_SingleUser_WrongToken() public {
        // Arrange
        string memory userId = "user@example.com";
        string memory correctToken = "XP";
        string memory wrongToken = "USDC";
        string memory amount = "100.00000000";
        
        bytes32 leaf = createLeaf(userId, correctToken, amount);
        treasury.updateMerkleRoot(leaf);
        
        // Act: Try with wrong token
        bytes32[] memory emptyProof = new bytes32[](0);
        bool isValid = treasury.verifyProof(emptyProof, userId, wrongToken, amount);
        
        // Assert: Should fail
        assertFalse(isValid);
    }

    function test_VerifyProof_SingleUser_WrongUserId() public {
        // Arrange
        string memory correctUserId = "user@example.com";
        string memory wrongUserId = "attacker@example.com";
        string memory token = "XP";
        string memory amount = "100.00000000";
        
        bytes32 leaf = createLeaf(correctUserId, token, amount);
        treasury.updateMerkleRoot(leaf);
        
        // Act: Try with wrong userId
        bytes32[] memory emptyProof = new bytes32[](0);
        bool isValid = treasury.verifyProof(emptyProof, wrongUserId, token, amount);
        
        // Assert: Should fail
        assertFalse(isValid);
    }

    // ============ Two User Tree Tests ============

    function test_VerifyProof_TwoUsers() public {
        // Arrange: Create 2-user tree manually
        string memory user1Id = "user1@example.com";
        string memory user2Id = "user2@example.com";
        string memory token = "XP";
        string memory amount1 = "100.00000000";
        string memory amount2 = "200.00000000";
        
        bytes32 leaf1 = createLeaf(user1Id, token, amount1);
        bytes32 leaf2 = createLeaf(user2Id, token, amount2);
        
        // Build root: hash(sorted(leaf1, leaf2))
        bytes32 root;
        if (leaf1 <= leaf2) {
            root = keccak256(abi.encodePacked(leaf1, leaf2));
        } else {
            root = keccak256(abi.encodePacked(leaf2, leaf1));
        }
        
        treasury.updateMerkleRoot(root);
        
        // Act: Verify user1 with proof = [leaf2]
        bytes32[] memory proof1 = new bytes32[](1);
        proof1[0] = leaf2;
        bool isValid1 = treasury.verifyProof(proof1, user1Id, token, amount1);
        
        // Act: Verify user2 with proof = [leaf1]
        bytes32[] memory proof2 = new bytes32[](1);
        proof2[0] = leaf1;
        bool isValid2 = treasury.verifyProof(proof2, user2Id, token, amount2);
        
        // Assert: Both should be valid
        assertTrue(isValid1);
        assertTrue(isValid2);
    }

    function test_VerifyProof_TwoUsers_WrongProof() public {
        // Arrange
        string memory user1Id = "user1@example.com";
        string memory user2Id = "user2@example.com";
        string memory token = "XP";
        string memory amount1 = "100.00000000";
        string memory amount2 = "200.00000000";
        
        bytes32 leaf1 = createLeaf(user1Id, token, amount1);
        bytes32 leaf2 = createLeaf(user2Id, token, amount2);
        
        bytes32 root;
        if (leaf1 <= leaf2) {
            root = keccak256(abi.encodePacked(leaf1, leaf2));
        } else {
            root = keccak256(abi.encodePacked(leaf2, leaf1));
        }
        
        treasury.updateMerkleRoot(root);
        
        // Act: Try to verify user1 with wrong proof
        bytes32[] memory wrongProof = new bytes32[](1);
        wrongProof[0] = bytes32(uint256(12345)); // Random hash
        bool isValid = treasury.verifyProof(wrongProof, user1Id, token, amount1);
        
        // Assert: Should fail
        assertFalse(isValid);
    }

    // ============ Different Tokens Tests ============

    function test_VerifyProof_DifferentTokens() public {
        // Arrange: User has claims in different tokens
        string memory userId = "user@example.com";
        string memory xpAmount = "100.00000000";
        string memory usdcAmount = "50.12345678";
        
        // Test XP
        bytes32 xpLeaf = createLeaf(userId, "XP", xpAmount);
        treasury.updateMerkleRoot(xpLeaf);
        
        bytes32[] memory emptyProof = new bytes32[](0);
        assertTrue(treasury.verifyProof(emptyProof, userId, "XP", xpAmount));
        
        // Test USDC
        bytes32 usdcLeaf = createLeaf(userId, "USDC", usdcAmount);
        treasury.updateMerkleRoot(usdcLeaf);
        
        assertTrue(treasury.verifyProof(emptyProof, userId, "USDC", usdcAmount));
    }

    // ============ Amount Formatting Tests ============

    function test_VerifyProof_RequiresExact8Decimals() public {
        // Arrange: Correct tree with 8 decimals
        string memory userId = "user@example.com";
        string memory token = "XP";
        string memory correctAmount = "100.00000000"; // 8 decimals
        
        bytes32 leaf = createLeaf(userId, token, correctAmount);
        treasury.updateMerkleRoot(leaf);
        
        bytes32[] memory emptyProof = new bytes32[](0);
        
        // Act & Assert: Correct format works
        assertTrue(treasury.verifyProof(emptyProof, userId, token, correctAmount));
        
        // Wrong decimal places should fail
        assertFalse(treasury.verifyProof(emptyProof, userId, token, "100")); // No decimals
        assertFalse(treasury.verifyProof(emptyProof, userId, token, "100.0")); // 1 decimal
        assertFalse(treasury.verifyProof(emptyProof, userId, token, "100.000000")); // 6 decimals
        assertFalse(treasury.verifyProof(emptyProof, userId, token, "100.000000000")); // 9 decimals
    }

    function test_VerifyProof_FractionalAmounts() public {
        // Arrange
        string memory userId = "user@example.com";
        string memory token = "XP";
        string memory fractionalAmount = "123.45678912"; // Rounded to 8 decimals
        
        bytes32 leaf = createLeaf(userId, token, fractionalAmount);
        treasury.updateMerkleRoot(leaf);
        
        // Act
        bytes32[] memory emptyProof = new bytes32[](0);
        bool isValid = treasury.verifyProof(emptyProof, userId, token, fractionalAmount);
        
        // Assert
        assertTrue(isValid);
    }

    // ============ Email Address Tests ============

    function test_VerifyProof_ComplexEmailAddresses() public {
        // Test various email formats
        string[] memory userIds = new string[](3);
        userIds[0] = "user+tag@example.com";
        userIds[1] = "user.name@example.co.uk";
        userIds[2] = "UPPERCASE@EXAMPLE.COM";
        
        string memory token = "XP";
        string memory amount = "100.00000000";
        
        for (uint i = 0; i < userIds.length; i++) {
            bytes32 leaf = createLeaf(userIds[i], token, amount);
            treasury.updateMerkleRoot(leaf);
            
            bytes32[] memory emptyProof = new bytes32[](0);
            bool isValid = treasury.verifyProof(emptyProof, userIds[i], token, amount);
            
            assertTrue(isValid, string(abi.encodePacked("Failed for: ", userIds[i])));
        }
    }

    // ============ Root Update Tests ============

    function test_VerifyProof_FailsAfterRootUpdate() public {
        // Arrange: First tree
        string memory userId = "user@example.com";
        string memory token = "XP";
        string memory oldAmount = "100.00000000";
        string memory newAmount = "150.00000000";
        
        bytes32 oldLeaf = createLeaf(userId, token, oldAmount);
        treasury.updateMerkleRoot(oldLeaf);
        
        bytes32[] memory emptyProof = new bytes32[](0);
        
        // Act: Verify with old amount works
        assertTrue(treasury.verifyProof(emptyProof, userId, token, oldAmount));
        
        // Update root
        bytes32 newLeaf = createLeaf(userId, token, newAmount);
        treasury.updateMerkleRoot(newLeaf);
        
        // Assert: Old amount fails, new amount works
        assertFalse(treasury.verifyProof(emptyProof, userId, token, oldAmount));
        assertTrue(treasury.verifyProof(emptyProof, userId, token, newAmount));
    }

    function test_VersionIncrementsOnUpdate() public {
        assertEq(treasury.merkleRootVersion(), 0);
        
        treasury.updateMerkleRoot(bytes32(uint256(1)));
        assertEq(treasury.merkleRootVersion(), 1);
        
        treasury.updateMerkleRoot(bytes32(uint256(2)));
        assertEq(treasury.merkleRootVersion(), 2);
        
        treasury.updateMerkleRoot(bytes32(uint256(3)));
        assertEq(treasury.merkleRootVersion(), 3);
    }

    // ============ Security Tests ============

    function test_Security_LongProofArray() public {
        string memory userId = "user@example.com";
        string memory token = "XP";
        string memory amount = "100.00000000";
        
        bytes32 leaf = createLeaf(userId, token, amount);
        treasury.updateMerkleRoot(leaf);
        
        // Create very long proof (100 elements)
        bytes32[] memory longProof = new bytes32[](100);
        for (uint i = 0; i < 100; i++) {
            longProof[i] = bytes32(0);
        }
        
        // Should not revert, just return false
        bool isValid = treasury.verifyProof(longProof, userId, token, amount);
        assertFalse(isValid);
    }

    function test_Security_VeryLongUserId() public {
        // Test with 200 character userId
        string memory longUserId = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.com";
        string memory token = "XP";
        string memory amount = "100.00000000";
        
        bytes32 leaf = createLeaf(longUserId, token, amount);
        treasury.updateMerkleRoot(leaf);
        
        bytes32[] memory emptyProof = new bytes32[](0);
        bool isValid = treasury.verifyProof(emptyProof, longUserId, token, amount);
        
        assertTrue(isValid);
    }

    // ============ Keccak256 Hash Verification ============

    function test_HashAlgorithm_IsKeccak256NotSHA256() public {
        // Verify we're using keccak256 (EVM native) not SHA256
        string memory data = "test";
        
        // keccak256("test") = 0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658
        bytes32 keccakHash = keccak256(abi.encodePacked(data));
        assertEq(keccakHash, hex"9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658");
        
        // SHA256 would be different:
        // sha256("test") = 0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
        assertNotEq(keccakHash, hex"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08");
    }
}

