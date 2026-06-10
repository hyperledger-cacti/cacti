// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import { SATPWrapperContract, InteractionSignature, InteractionType, AssetParameterIdentifier, TokenType, Token, ERCTokenStandard } from "../../../main/solidity/contracts/SATPWrapperContract.sol";
import { SATPNFTokenContract } from "../contracts/SATPNFTokenContract.sol";
import { Test } from "forge-std/Test.sol";

contract SATPWrapperTest is Test{

    
    address public user = makeAddr("user");
    address public tokenContractOwner = makeAddr("tokenContractOwner");

    InteractionSignature[] signatures;
    
    SATPWrapperContract wrapperContract;
    SATPNFTokenContract contract1;

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
        contract1 = new SATPNFTokenContract(tokenContractOwner);

        lockInteractions.push("lock(address,address,uint256)");
        lockVariables.push([AssetParameterIdentifier.OWNER, AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory lock = InteractionSignature({ interactionType: InteractionType.LOCK, functionsSignature: lockInteractions, variables: lockVariables, available: true });
        signatures.push(lock);

        unlockInteractions.push("unlock(address,address,uint256)");
        unlockVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.OWNER, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory unlock = InteractionSignature({ interactionType: InteractionType.UNLOCK, functionsSignature: unlockInteractions, variables: unlockVariables, available: true });
        signatures.push(unlock);

        mintInteractions.push("mint(address,uint256)");
        mintVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory mint = InteractionSignature({ interactionType: InteractionType.MINT, functionsSignature: mintInteractions, variables: mintVariables, available: true });
        signatures.push(mint);

        burnInteractions.push("burn(uint256)");
        burnVariables.push([AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory burn = InteractionSignature({ interactionType: InteractionType.BURN, functionsSignature: burnInteractions, variables: burnVariables, available: true });
        signatures.push(burn);

        assignInteractions.push("assign(address,uint256)");
        assignVariables.push([AssetParameterIdentifier.RECEIVER, AssetParameterIdentifier.UNIQUE_DESCRIPTOR]);
        InteractionSignature memory assign = InteractionSignature({ interactionType: InteractionType.ASSIGN, functionsSignature: assignInteractions, variables: assignVariables, available: true });
        signatures.push(assign);

        vm.startPrank(tokenContractOwner);
        contract1.grantBridgeRole(address(wrapperContract));
        assertTrue(contract1.hasBridgeRole(address(wrapperContract)));
        vm.stopPrank();
    }

    function testTokenNameAndSymbol() public {
        assertEq(contract1.name(), "SATPNFToken");
        assertEq(contract1.symbol(), "SATPNFT");
    }

    function testGetAllAssetsIDs() public {
        Token memory token = wrapperContract.getToken(contract1.symbol());
        assertEq(token.contractAddress, address(0), "Token should not exist before wrapping");
    }

    function testWrap() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());
        assertEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");
        assertEq(wrapperContract.getAllAssetsIDs()[0], contract1.name(), "Ids don't match");
    }

    function testUnwrap() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        wrapperContract.unwrap(contract1.name());
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());
        assertNotEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");
    }

    function testMint() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        wrapperContract.mint(contract1.name(), 1001);
        assertEq(contract1.balanceOf(address(wrapperContract)), 1, "Token not minted");
    }

    function testBurn() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        wrapperContract.mint(contract1.name(), 1001);
        assertEq(contract1.balanceOf(address(wrapperContract)), 1, "Tokens not minted");
        vm.prank(address(wrapperContract));
        contract1.approve(address(wrapperContract), 1001);
        vm.prank(address(wrapperContract));
        wrapperContract.burn(contract1.name(), 1001);
        assertEq(contract1.balanceOf(address(wrapperContract)), 0, "Token not burned");
    }

    function testLock() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        vm.prank(address(wrapperContract));
        contract1.mint(address(user), 1001);
        vm.prank(user);
        contract1.approve(address(wrapperContract), 1001);
        wrapperContract.lock(contract1.name(), 1001);
        Token memory token = wrapperContract.getToken(contract1.name(), 1001);
        assertEq(token.amount, 1001, "Token not locked");
    }

    function testUnlock() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        vm.prank(address(wrapperContract));
        contract1.mint(address(user), 1001);
        vm.prank(user);
        contract1.approve(address(wrapperContract), 1001);
        wrapperContract.lock(contract1.name(), 1001);
        wrapperContract.unlock(contract1.name(), 1001);
        assertEq(contract1.balanceOf(address(user)), 1, "Token not returned on unlock");
    }

    function testAssign() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        wrapperContract.mint(contract1.name(), 1002);
        wrapperContract.assign(contract1.name(), address(user), 1002);
        assertEq(contract1.balanceOf(address(user)), 1, "Token not assigned");
    }

    function testUnwrapATokenNotWrapped() public {
        try wrapperContract.unwrap(contract1.name()) returns (bool s) {
           require(!s, "Expected an error");
       }
       catch Error(string memory) {
       }
       catch (bytes memory /*lowLevelData*/) {
       }
    }

    function testUnwrapATokenWithValueLocked() public {
       wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
       wrapperContract.mint(contract1.name(), 1001);
       try wrapperContract.unwrap(contract1.name()) returns (bool s) {
           require(!s, "Expected an error");
       }
       catch Error(string memory) {
       }
       catch (bytes memory /*lowLevelData*/) {
       }
    }

    function testWrapTokenAlreadyWrapped() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        try wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testWrapWithoutInteractions() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), ERCTokenStandard.ERC721);
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());
        assertEq(tokenReceived.contractAddress, address(contract1), "Token not wrapped without interactions");
    }

    function testLockAlreadyLocked() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        vm.prank(address(wrapperContract));
        contract1.mint(address(user), 1001);
        vm.prank(user);
        contract1.approve(address(wrapperContract), 1001);
        wrapperContract.lock(contract1.name(), 1001);
        try wrapperContract.lock(contract1.name(), 1001) returns (bool s) {
            require(!s, "Expected an error: token already locked");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testBurnNotLocked() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC721);
        try wrapperContract.burn(contract1.name(), 1001) returns (bool s) {
            require(!s, "Expected an error: token not locked");
        }
        catch Error(string memory) {
        }
        catch (bytes memory) {
        }
    }

    function testMintATokenNotWrapped() public {
        try wrapperContract.mint(contract1.name(), 1001) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }
}
