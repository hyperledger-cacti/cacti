// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import { SATPWrapperContract, InteractionSignature, InteractionType, AssetParameterIdentifier, TokenType, Token, ERCTokenStandard } from "../../../main/solidity/contracts/SATPWrapperContract.sol";
import { SATMultiTokenContract } from "../contracts/SATMultiTokenContract.sol";
import { Test } from "forge-std/Test.sol";

/**
 * Tests for the SATPWrapperContract with multi-token (ERC6909-like) standards using
 * the 3-param overloads (lock/unlock/mint/burn/assign with explicit uniqueDescriptor).
 *
 * `assetAttribute` = amount of tokens
 * `uniqueDescriptor` = token type ID within the multi-token contract
 */
contract SATPWrapperTestMultiToken is Test {

    SATMultiTokenContract tokenContract;
    SATPWrapperContract wrapperContract;

    address public user = makeAddr("user");
    address public user2 = makeAddr("user2");

    InteractionSignature[] signatures;

    string[] lockInteractions;
    AssetParameterIdentifier[][] lockVariables;
    string[] unlockInteractions;
    AssetParameterIdentifier[][] unlockVariables;
    string[] mintInteractions;
    AssetParameterIdentifier[][] mintVariables;
    string[] burnInteractions;
    AssetParameterIdentifier[][] burnVariables;
    string[] assignInteractions;
    AssetParameterIdentifier[][] assignVariables;

    uint256 constant TOKEN_TYPE_A = 42;
    uint256 constant TOKEN_TYPE_B = 99;

    function setUp() public {
        wrapperContract = new SATPWrapperContract(address(this));
        tokenContract = new SATMultiTokenContract(address(this));
        tokenContract.grantBridgeRole(address(wrapperContract));

        // lock(address from, address to, uint256 amount, uint256 tokenTypeId)
        lockInteractions.push("lock(address,address,uint256,uint256)");
        lockVariables.push([AssetParameterIdentifier.OWNER, AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory lock = InteractionSignature({ interactionType: InteractionType.LOCK, functionsSignature: lockInteractions, variables: lockVariables, available: true });
        signatures.push(lock);

        // unlock(address from, address to, uint256 amount, uint256 tokenTypeId)
        unlockInteractions.push("unlock(address,address,uint256,uint256)");
        unlockVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.OWNER, AssetParameterIdentifier.AMOUNT, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory unlock = InteractionSignature({ interactionType: InteractionType.UNLOCK, functionsSignature: unlockInteractions, variables: unlockVariables, available: true });
        signatures.push(unlock);

        // mint(address to, uint256 amount, uint256 tokenTypeId)
        mintInteractions.push("mint(address,uint256,uint256)");
        mintVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory mint = InteractionSignature({ interactionType: InteractionType.MINT, functionsSignature: mintInteractions, variables: mintVariables, available: true });
        signatures.push(mint);

        // burn(address from, uint256 amount, uint256 tokenTypeId)
        burnInteractions.push("burn(address,uint256,uint256)");
        burnVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory burn = InteractionSignature({ interactionType: InteractionType.BURN, functionsSignature: burnInteractions, variables: burnVariables, available: true });
        signatures.push(burn);

        // assign(address to, uint256 amount, uint256 tokenTypeId)
        assignInteractions.push("assign(address,uint256,uint256)");
        assignVariables.push([AssetParameterIdentifier.RECEIVER, AssetParameterIdentifier.AMOUNT, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory assign = InteractionSignature({ interactionType: InteractionType.ASSIGN, functionsSignature: assignInteractions, variables: assignVariables, available: true });
        signatures.push(assign);
    }

    function wrapToken() internal {
        wrapperContract.wrap(tokenContract.name(), address(tokenContract), TokenType.NONSTANDARD_FUNGIBLE, tokenContract.name(), "refID", address(user), signatures, ERCTokenStandard.ERC6909);
    }

    function giveUserTokens(uint256 tokenTypeId, uint256 amount) internal {
        vm.prank(address(wrapperContract));
        tokenContract.mint(address(user), amount, tokenTypeId);
    }

    function testWrap() public {
        wrapToken();
        Token memory token = wrapperContract.getToken(tokenContract.name());
        assertEq(token.contractAddress, address(tokenContract), "Token not wrapped correctly");
    }

    function testMintWithDescriptor() public {
        wrapToken();
        wrapperContract.mint(tokenContract.name(), 100, TOKEN_TYPE_A);
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 100, "Tokens of type A not minted to bridge");
    }

    function testMintDifferentDescriptors() public {
        wrapToken();
        wrapperContract.mint(tokenContract.name(), 100, TOKEN_TYPE_A);
        wrapperContract.mint(tokenContract.name(), 200, TOKEN_TYPE_B);
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 100, "Type A balance wrong");
        assertEq(tokenContract.balances(TOKEN_TYPE_B, address(wrapperContract)), 200, "Type B balance wrong");
    }

    function testLockWithDescriptor() public {
        wrapToken();
        giveUserTokens(TOKEN_TYPE_A, 100);
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(user)), 100, "User should have tokens");

        wrapperContract.lock(tokenContract.name(), 100, TOKEN_TYPE_A);

        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 100, "Tokens not locked into bridge");
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(user)), 0, "User should have no tokens after lock");
        Token memory token = wrapperContract.getToken(tokenContract.name());
        assertEq(token.amount, 100, "Wrapper amount not updated");
    }

    function testUnlockWithDescriptor() public {
        wrapToken();
        giveUserTokens(TOKEN_TYPE_A, 100);

        wrapperContract.lock(tokenContract.name(), 100, TOKEN_TYPE_A);
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 100, "Tokens not locked");

        wrapperContract.unlock(tokenContract.name(), 100, TOKEN_TYPE_A);

        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(user)), 100, "Tokens not returned to owner");
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 0, "Bridge should be empty after unlock");
        Token memory token = wrapperContract.getToken(tokenContract.name());
        assertEq(token.amount, 0, "Wrapper amount not decremented");
    }

    function testBurnWithDescriptor() public {
        wrapToken();
        wrapperContract.mint(tokenContract.name(), 100, TOKEN_TYPE_A);
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 100, "Tokens not minted");

        wrapperContract.burn(tokenContract.name(), 100, TOKEN_TYPE_A);

        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 0, "Tokens not burned");
        Token memory token = wrapperContract.getToken(tokenContract.name());
        assertEq(token.amount, 0, "Wrapper amount not decremented after burn");
    }

    function testAssignWithDescriptor() public {
        wrapToken();
        wrapperContract.mint(tokenContract.name(), 100, TOKEN_TYPE_A);

        wrapperContract.assign(tokenContract.name(), address(user2), 100, TOKEN_TYPE_A);

        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(user2)), 100, "Tokens not assigned to receiver");
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 0, "Bridge should be empty after assign");
        Token memory token = wrapperContract.getToken(tokenContract.name());
        assertEq(token.amount, 0, "Wrapper amount not decremented after assign");
    }

    function testPartialUnlock() public {
        wrapToken();
        giveUserTokens(TOKEN_TYPE_A, 200);

        wrapperContract.lock(tokenContract.name(), 200, TOKEN_TYPE_A);
        wrapperContract.unlock(tokenContract.name(), 50, TOKEN_TYPE_A);

        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(user)), 50, "Partial unlock amount wrong");
        assertEq(tokenContract.balances(TOKEN_TYPE_A, address(wrapperContract)), 150, "Remaining locked amount wrong");
        Token memory token = wrapperContract.getToken(tokenContract.name());
        assertEq(token.amount, 150, "Wrapper amount after partial unlock wrong");
    }

    function testMintTokenNotWrapped() public {
        try wrapperContract.mint(tokenContract.name(), 100, TOKEN_TYPE_A) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testLockTokenNotWrapped() public {
        try wrapperContract.lock(tokenContract.name(), 100, TOKEN_TYPE_A) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testUnlockInsufficientLocked() public {
        wrapToken();
        wrapperContract.mint(tokenContract.name(), 50, TOKEN_TYPE_A);
        try wrapperContract.unlock(tokenContract.name(), 100, TOKEN_TYPE_A) returns (bool s) {
            require(!s, "Expected an error: insufficient locked amount");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }
}
