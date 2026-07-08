// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.20;


import { SATPWrapperContract, InteractionSignature, InteractionType, AssetParameterIdentifier, TokenType, Token, ERCTokenStandard } from "../../../main/solidity/contracts/SATPWrapperContract.sol";
import { SATPTokenContract } from "../contracts/SATPTokenContract.sol";
import { Test } from "forge-std/Test.sol";

contract SATPWrapperTest is Test{

    SATPTokenContract contract1;

    InteractionSignature[] signatures;

    SATPWrapperContract wrapperContract;

    address public user = makeAddr("user");
    address public user2 = makeAddr("user2");

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
    string[] checkPermissionInteractions;
    AssetParameterIdentifier[][] checkPermissionVariables;

    function setUp() public {
        wrapperContract = new SATPWrapperContract(address(this));
        contract1 = new SATPTokenContract(address(wrapperContract));

        // Standard ERC20 transferFrom: moves tokens from OWNER to BRIDGE
        lockInteractions.push("transferFrom(address,address,uint256)");
        lockVariables.push([AssetParameterIdentifier.OWNER, AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory lock = InteractionSignature({ interactionType: InteractionType.LOCK, functionsSignature: lockInteractions, variables: lockVariables, available: true });
        signatures.push(lock);

        // Standard ERC20 transfer: bridge sends tokens back to OWNER
        unlockInteractions.push("transfer(address,uint256)");
        unlockVariables.push([AssetParameterIdentifier.OWNER, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory unlock = InteractionSignature({ interactionType: InteractionType.UNLOCK, functionsSignature: unlockInteractions, variables: unlockVariables, available: true });
        signatures.push(unlock);

        mintInteractions.push("mint(address,uint256)");
        mintVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory mint = InteractionSignature({ interactionType: InteractionType.MINT, functionsSignature: mintInteractions, variables: mintVariables, available: true });
        signatures.push(mint);

        burnInteractions.push("burn(address,uint256)");
        burnVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory burn = InteractionSignature({ interactionType: InteractionType.BURN, functionsSignature: burnInteractions, variables: burnVariables, available: true });
        signatures.push(burn);

        // Standard ERC20 transfer: bridge sends locked tokens to RECEIVER
        assignInteractions.push("transfer(address,uint256)");
        assignVariables.push([AssetParameterIdentifier.RECEIVER, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory assign = InteractionSignature({ interactionType: InteractionType.ASSIGN, functionsSignature: assignInteractions, variables: assignVariables, available: true });
        signatures.push(assign);

        checkPermissionInteractions.push("hasBridgeRole(address)");
        checkPermissionVariables.push([AssetParameterIdentifier.BRIDGE]);
        InteractionSignature memory checkPermition = InteractionSignature({ interactionType: InteractionType.CHECKPERMITION, functionsSignature: checkPermissionInteractions, variables: checkPermissionVariables, available: true });
        signatures.push(checkPermition);
    }

    function wrapToken() internal {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC20);
    }

    function mintToUser(uint256 amount) internal {
        vm.prank(address(wrapperContract));
        contract1.mint(address(user), amount);
    }

    function testGetAllAssetsIDs() public {
        Token memory token = wrapperContract.getToken(contract1.symbol());
        assertEq(token.contractAddress, address(0), "Token should not exist before wrapping");
    }

    function testWrap() public {
        wrapToken();
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());
        assertEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");
        assertEq(wrapperContract.getAllAssetsIDs()[0], contract1.name(), "Ids don't match");
    }

    function testWrapWithoutInteractions() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), ERCTokenStandard.ERC20);
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());
        assertEq(tokenReceived.contractAddress, address(contract1), "Token not wrapped without interactions");
    }

    function testWrapTokenAlreadyWrapped() public {
        wrapToken();
        try wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC20) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testUnwrap() public {
        wrapToken();
        wrapperContract.unwrap(contract1.name());
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());
        assertNotEq(tokenReceived.contractAddress, address(contract1), "Token still present after unwrap");
    }

    function testMint() public {
        wrapToken();
        wrapperContract.mint(contract1.name(), 10);
        assertEq(contract1.balanceOf(address(wrapperContract)), 10, "Token not minted");
    }

    function testBurn() public {
        wrapToken();
        wrapperContract.mint(contract1.name(), 100);
        assertEq(contract1.balanceOf(address(wrapperContract)), 100, "Tokens not minted");

        wrapperContract.burn(contract1.name(), 100);
        assertEq(contract1.balanceOf(address(wrapperContract)), 0, "Tokens not burned");
        Token memory token = wrapperContract.getToken(contract1.name());
        assertEq(token.amount, 0, "Amount not decremented after burn");
    }

    function testLock() public {
        wrapToken();
        mintToUser(100);

        vm.prank(user);
        contract1.approve(address(wrapperContract), 100);

        wrapperContract.lock(contract1.name(), 100);

        assertEq(contract1.balanceOf(address(wrapperContract)), 100, "Tokens not transferred to bridge on lock");
        Token memory token = wrapperContract.getToken(contract1.name());
        assertEq(token.amount, 100, "Amount not tracked after lock");
    }

    function testUnlock() public {
        wrapToken();
        mintToUser(100);

        vm.prank(user);
        contract1.approve(address(wrapperContract), 100);

        wrapperContract.lock(contract1.name(), 100);
        assertEq(contract1.balanceOf(address(wrapperContract)), 100, "Tokens not locked");

        wrapperContract.unlock(contract1.name(), 100);
        assertEq(contract1.balanceOf(address(user)), 100, "Tokens not returned to owner on unlock");
        assertEq(contract1.balanceOf(address(wrapperContract)), 0, "Bridge should hold no tokens after unlock");
        Token memory token = wrapperContract.getToken(contract1.name());
        assertEq(token.amount, 0, "Amount not decremented after unlock");
    }

    function testAssign() public {
        wrapToken();
        wrapperContract.mint(contract1.name(), 100);

        wrapperContract.assign(contract1.name(), address(user2), 100);
        assertEq(contract1.balanceOf(address(user2)), 100, "Tokens not assigned to receiver");
        Token memory token = wrapperContract.getToken(contract1.name());
        assertEq(token.amount, 0, "Amount not decremented after assign");
    }

    function testMintATokenNotWrapped() public {
        try wrapperContract.mint(contract1.name(), 10) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testUnwrapATokenNotWrapped() public {
        try wrapperContract.unwrap(contract1.name()) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testUnwrapATokenWithValueLocked() public {
        wrapToken();
        wrapperContract.mint(contract1.name(), 10);
        try wrapperContract.unwrap(contract1.name()) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testLockTokenNotAvailable() public {
        try wrapperContract.lock(contract1.name(), 100) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testLockInvalidAmount() public {
        wrapToken();
        try wrapperContract.lock(contract1.name(), 0) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testUnlockInsufficientBalance() public {
        wrapToken();
        wrapperContract.mint(contract1.name(), 50);
        try wrapperContract.unlock(contract1.name(), 100) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }
}
