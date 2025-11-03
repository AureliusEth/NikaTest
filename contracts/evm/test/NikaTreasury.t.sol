// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {NikaTreasury} from "../src/NikaTreasury.sol";

contract NikaTreasuryTest is Test {
    NikaTreasury public treasury;
    address public owner;
    address public nonOwner;
    address public user1;
    address public user2;
    address public user3;

    function setUp() public {
        owner = address(this);
        nonOwner = makeAddr("nonOwner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        user3 = makeAddr("user3");
        
        treasury = new NikaTreasury(owner);
    }

    // Helper function to create a leaf hash (matches contract logic)
    function createLeaf(address user, uint256 amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, ":", amount));
    }

    // Helper function to build merkle tree and get root
    function buildMerkleTree(
        address[] memory users,
        uint256[] memory amounts
    ) internal pure returns (bytes32 root, bytes32[] memory leaves) {
        require(users.length == amounts.length, "Arrays length mismatch");
        require(users.length > 0, "Empty tree");
        
        // Create leaves
        leaves = new bytes32[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            leaves[i] = createLeaf(users[i], amounts[i]);
        }
        
        // Build tree by pairing leaves
        bytes32[] memory current = leaves;
        
        while (current.length > 1) {
            bytes32[] memory next = new bytes32[]((current.length + 1) / 2);
            for (uint256 i = 0; i < current.length; i += 2) {
                if (i + 1 < current.length) {
                    // Pair exists
                    bytes32 left = current[i];
                    bytes32 right = current[i + 1];
                    if (left <= right) {
                        next[i / 2] = keccak256(abi.encodePacked(left, right));
                    } else {
                        next[i / 2] = keccak256(abi.encodePacked(right, left));
                    }
                } else {
                    // Odd number of nodes, promote the last one
                    next[i / 2] = current[i];
                }
            }
            current = next;
        }
        
        root = current[0];
    }

    // Helper function to generate merkle proof
    function generateProof(
        address[] memory users,
        uint256[] memory amounts,
        address targetUser,
        uint256 targetAmount
    ) internal pure returns (bytes32[] memory proof) {
        require(users.length == amounts.length, "Arrays length mismatch");
        
        // Create leaves
        bytes32[] memory leaves = new bytes32[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            leaves[i] = createLeaf(users[i], amounts[i]);
        }
        
        // Find target leaf index
        bytes32 targetLeaf = createLeaf(targetUser, targetAmount);
        uint256 targetIndex = type(uint256).max;
        for (uint256 i = 0; i < leaves.length; i++) {
            if (leaves[i] == targetLeaf) {
                targetIndex = i;
                break;
            }
        }
        require(targetIndex != type(uint256).max, "Target leaf not found");
        
        // Build proof by climbing up the tree
        bytes32[] memory proofList = new bytes32[](32); // Max depth
        uint256 proofLength = 0;
        bytes32[] memory current = leaves;
        uint256 currentIndex = targetIndex;
        
        while (current.length > 1) {
            uint256 siblingIndex;
            if (currentIndex % 2 == 0) {
                siblingIndex = currentIndex + 1;
            } else {
                siblingIndex = currentIndex - 1;
            }
            
            if (siblingIndex < current.length) {
                proofList[proofLength] = current[siblingIndex];
                proofLength++;
            }
            
            // Move to parent level
            currentIndex = currentIndex / 2;
            bytes32[] memory next = new bytes32[]((current.length + 1) / 2);
            for (uint256 i = 0; i < current.length; i += 2) {
                if (i + 1 < current.length) {
                    bytes32 left = current[i];
                    bytes32 right = current[i + 1];
                    if (left <= right) {
                        next[i / 2] = keccak256(abi.encodePacked(left, right));
                    } else {
                        next[i / 2] = keccak256(abi.encodePacked(right, left));
                    }
                } else {
                    next[i / 2] = current[i];
                }
            }
            current = next;
        }
        
        // Trim proof array
        proof = new bytes32[](proofLength);
        for (uint256 i = 0; i < proofLength; i++) {
            proof[i] = proofList[i];
        }
    }

    // ============ Initialization Tests ============

    function test_InitialState() public view {
        assertEq(treasury.merkleRoot(), bytes32(0));
        assertEq(treasury.merkleRootVersion(), 0);
        assertEq(treasury.owner(), owner);
    }

    // ============ Update Merkle Root Tests ============

    function test_UpdateMerkleRoot_AsOwner() public {
        bytes32 newRoot = bytes32(uint256(12345));
        
        treasury.updateMerkleRoot(newRoot);
        
        assertEq(treasury.merkleRoot(), newRoot);
        assertEq(treasury.merkleRootVersion(), 1);
    }

    function test_UpdateMerkleRoot_EmitsEvent() public {
        bytes32 newRoot = bytes32(uint256(12345));
        
        vm.expectEmit(true, false, false, false);
        emit NikaTreasury.MerkleRootUpdated(newRoot);
        
        treasury.updateMerkleRoot(newRoot);
    }

    function test_UpdateMerkleRoot_MultipleUpdates() public {
        bytes32 root1 = bytes32(uint256(111));
        bytes32 root2 = bytes32(uint256(222));
        bytes32 root3 = bytes32(uint256(333));
        
        treasury.updateMerkleRoot(root1);
        assertEq(treasury.merkleRootVersion(), 1);
        
        treasury.updateMerkleRoot(root2);
        assertEq(treasury.merkleRootVersion(), 2);
        
        treasury.updateMerkleRoot(root3);
        assertEq(treasury.merkleRootVersion(), 3);
        assertEq(treasury.merkleRoot(), root3);
    }

    function test_UpdateMerkleRoot_RevertIfNotOwner() public {
        bytes32 newRoot = bytes32(uint256(12345));
        
        vm.prank(nonOwner);
        vm.expectRevert();
        treasury.updateMerkleRoot(newRoot);
    }

    function test_UpdateMerkleRoot_SameRootTwice() public {
        bytes32 root = bytes32(uint256(12345));
        
        treasury.updateMerkleRoot(root);
        assertEq(treasury.merkleRootVersion(), 1);
        
        treasury.updateMerkleRoot(root);
        assertEq(treasury.merkleRootVersion(), 2);
        assertEq(treasury.merkleRoot(), root);
    }

    // ============ Merkle Proof Verification Tests ============

    function test_VerifyProof_SingleUser() public {
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = user1;
        amounts[0] = 100;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        bytes32[] memory proof = generateProof(users, amounts, user1, 100);
        
        bool isValid = treasury.verifyProof(proof, 100, user1);
        assertTrue(isValid);
    }

    function test_VerifyProof_MultipleUsers() public {
        address[] memory users = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        users[0] = user1;
        amounts[0] = 100;
        users[1] = user2;
        amounts[1] = 200;
        users[2] = user3;
        amounts[2] = 300;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Verify each user
        bytes32[] memory proof1 = generateProof(users, amounts, user1, 100);
        assertTrue(treasury.verifyProof(proof1, 100, user1));
        
        bytes32[] memory proof2 = generateProof(users, amounts, user2, 200);
        assertTrue(treasury.verifyProof(proof2, 200, user2));
        
        bytes32[] memory proof3 = generateProof(users, amounts, user3, 300);
        assertTrue(treasury.verifyProof(proof3, 300, user3));
    }

    function test_VerifyProof_LargeTree() public {
        // Create a tree with 10 users
        address[] memory users = new address[](10);
        uint256[] memory amounts = new uint256[](10);
        
        for (uint256 i = 0; i < 10; i++) {
            users[i] = makeAddr(string(abi.encodePacked("user", i)));
            amounts[i] = (i + 1) * 100;
        }
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Verify a user in the middle
        bytes32[] memory proof = generateProof(users, amounts, users[5], amounts[5]);
        assertTrue(treasury.verifyProof(proof, amounts[5], users[5]));
    }

    function test_VerifyProof_RevertIfInvalidProof() public {
        address[] memory users = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        users[0] = user1;
        amounts[0] = 100;
        users[1] = user2;
        amounts[1] = 200;
        users[2] = user3;
        amounts[2] = 300;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Wrong amount
        bytes32[] memory proof = generateProof(users, amounts, user1, 100);
        assertFalse(treasury.verifyProof(proof, 999, user1));
        
        // Wrong user
        assertFalse(treasury.verifyProof(proof, 100, user2));
        
        // Wrong proof
        bytes32[] memory wrongProof = new bytes32[](1);
        wrongProof[0] = bytes32(uint256(12345));
        assertFalse(treasury.verifyProof(wrongProof, 100, user1));
    }

    function test_VerifyProof_EmptyProof() public {
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = user1;
        amounts[0] = 100;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Empty proof should work for single leaf tree
        bytes32[] memory emptyProof = new bytes32[](0);
        assertTrue(treasury.verifyProof(emptyProof, 100, user1));
    }

    function test_VerifyProof_AfterRootUpdate() public {
        // First tree
        address[] memory users1 = new address[](2);
        uint256[] memory amounts1 = new uint256[](2);
        users1[0] = user1;
        amounts1[0] = 100;
        users1[1] = user2;
        amounts1[1] = 200;
        
        (bytes32 root1,) = buildMerkleTree(users1, amounts1);
        treasury.updateMerkleRoot(root1);
        
        bytes32[] memory proof1 = generateProof(users1, amounts1, user1, 100);
        assertTrue(treasury.verifyProof(proof1, 100, user1));
        
        // Update root
        address[] memory users2 = new address[](2);
        uint256[] memory amounts2 = new uint256[](2);
        users2[0] = user1;
        amounts2[0] = 150; // Changed amount
        users2[1] = user2;
        amounts2[1] = 200;
        
        (bytes32 root2,) = buildMerkleTree(users2, amounts2);
        treasury.updateMerkleRoot(root2);
        
        // Old proof should fail
        assertFalse(treasury.verifyProof(proof1, 100, user1));
        
        // New proof should work
        bytes32[] memory proof2 = generateProof(users2, amounts2, user1, 150);
        assertTrue(treasury.verifyProof(proof2, 150, user1));
    }

    function test_VerifyProof_WrongRoot() public {
        address[] memory users = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        users[0] = user1;
        amounts[0] = 100;
        users[1] = user2;
        amounts[1] = 200;
        
        buildMerkleTree(users, amounts); // Build tree but don't use root
        
        treasury.updateMerkleRoot(bytes32(uint256(999))); // Wrong root
        
        bytes32[] memory proof = generateProof(users, amounts, user1, 100);
        assertFalse(treasury.verifyProof(proof, 100, user1));
    }

    // ============ Integration Tests ============

    function test_FullFlow() public {
        // 1. Create tree with multiple users
        address[] memory users = new address[](4);
        uint256[] memory amounts = new uint256[](4);
        users[0] = user1;
        amounts[0] = 1000;
        users[1] = user2;
        amounts[1] = 2000;
        users[2] = user3;
        amounts[2] = 3000;
        users[3] = makeAddr("user4");
        amounts[3] = 4000;
        
        // 2. Build tree and update root
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        assertEq(treasury.merkleRoot(), root);
        assertEq(treasury.merkleRootVersion(), 1);
        
        // 3. Verify proofs for all users
        for (uint256 i = 0; i < users.length; i++) {
            bytes32[] memory proof = generateProof(users, amounts, users[i], amounts[i]);
            assertTrue(treasury.verifyProof(proof, amounts[i], users[i]));
        }
        
        // 4. Update root with new amounts
        amounts[0] = 1500;
        amounts[1] = 2500;
        (bytes32 newRoot,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(newRoot);
        
        assertEq(treasury.merkleRootVersion(), 2);
        
        // 5. Verify new proofs work
        bytes32[] memory newProof = generateProof(users, amounts, users[0], amounts[0]);
        assertTrue(treasury.verifyProof(newProof, amounts[0], users[0]));
    }

    // ============ Edge Cases ============

    function test_VerifyProof_ZeroAmount() public {
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = user1;
        amounts[0] = 0;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        bytes32[] memory proof = generateProof(users, amounts, user1, 0);
        assertTrue(treasury.verifyProof(proof, 0, user1));
    }

    function test_VerifyProof_LargeAmount() public {
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = user1;
        amounts[0] = type(uint256).max;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        bytes32[] memory proof = generateProof(users, amounts, user1, type(uint256).max);
        assertTrue(treasury.verifyProof(proof, type(uint256).max, user1));
    }

    // ============ Security Tests ============

    function test_Security_ExcessivelyLongProofArray() public {
        address[] memory users = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        users[0] = user1;
        users[1] = user2;
        amounts[0] = 100;
        amounts[1] = 200;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Create an excessively long proof array (100 elements) - DoS protection test
        bytes32[] memory longProof = new bytes32[](100);
        for (uint256 i = 0; i < 100; i++) {
            longProof[i] = bytes32(0);
        }
        
        // Should not revert, but should return false
        // This tests that the contract handles large inputs gracefully
        bool result = treasury.verifyProof(longProof, 100, user1);
        assertFalse(result);
    }

    function test_Security_MalformedProofArray() public {
        address[] memory users = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        users[0] = user1;
        users[1] = user2;
        amounts[0] = 100;
        amounts[1] = 200;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Create a proof with all 0xFF bytes
        bytes32[] memory malformedProof = new bytes32[](1);
        malformedProof[0] = bytes32(type(uint256).max);
        
        bool result = treasury.verifyProof(malformedProof, 100, user1);
        assertFalse(result);
    }

    function test_Security_AddressZeroAsUser() public {
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = address(0);
        amounts[0] = 100;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Verify proof for address(0) should work if it's in the tree
        bytes32[] memory proof = generateProof(users, amounts, address(0), 100);
        assertTrue(treasury.verifyProof(proof, 100, address(0)));
        
        // But verifying for a different user should fail
        assertFalse(treasury.verifyProof(proof, 100, user1));
    }

    function test_Security_ContractAddressAsUser() public {
        // Use the treasury contract itself as a user (edge case)
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = address(treasury);
        amounts[0] = 100;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        bytes32[] memory proof = generateProof(users, amounts, address(treasury), 100);
        assertTrue(treasury.verifyProof(proof, 100, address(treasury)));
    }

    function test_Security_AllZeroProofElements() public {
        address[] memory users = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        users[0] = user1;
        users[1] = user2;
        amounts[0] = 100;
        amounts[1] = 200;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Create proof with all zero elements
        bytes32[] memory zeroProof = new bytes32[](1);
        zeroProof[0] = bytes32(0);
        
        bool result = treasury.verifyProof(zeroProof, 100, user1);
        assertFalse(result);
    }

    function test_Security_EmptyProofWithNonSingletonTree() public {
        // Empty proof should only work for single-leaf trees
        address[] memory users = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        users[0] = user1;
        users[1] = user2;
        amounts[0] = 100;
        amounts[1] = 200;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        bytes32[] memory emptyProof = new bytes32[](0);
        bool result = treasury.verifyProof(emptyProof, 100, user1);
        assertFalse(result);
    }

    function test_Security_MaxUint256AsAmount() public {
        address[] memory users = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        users[0] = user1;
        amounts[0] = type(uint256).max;
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        bytes32[] memory proof = generateProof(users, amounts, user1, type(uint256).max);
        assertTrue(treasury.verifyProof(proof, type(uint256).max, user1));
        
        // Verify with different amount should fail
        assertFalse(treasury.verifyProof(proof, type(uint256).max - 1, user1));
    }

    function test_Security_ProofDepthLimit() public {
        // Test with a very deep tree (1024 users = 10 levels)
        uint256 numUsers = 1024;
        address[] memory users = new address[](numUsers);
        uint256[] memory amounts = new uint256[](numUsers);
        
        for (uint256 i = 0; i < numUsers; i++) {
            users[i] = address(uint160(i + 1000));
            amounts[i] = i * 100;
        }
        
        (bytes32 root,) = buildMerkleTree(users, amounts);
        treasury.updateMerkleRoot(root);
        
        // Verify a user in the middle
        bytes32[] memory proof = generateProof(users, amounts, users[512], amounts[512]);
        assertTrue(treasury.verifyProof(proof, amounts[512], users[512]));
        
        // Proof should have around 10 elements (log2(1024))
        assertEq(proof.length, 10);
    }
}

