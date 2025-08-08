// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "../../../main/solidity/contracts/SATPWrapperContract.sol";
import { SATPNFTokenContract } from "../contracts/SATPNFTokenContract.sol";
import "forge-std/Test.sol";
import { console } from "forge-std/console.sol";
import { InteractionSignature, InteractionType, VarType, TokenType, Token } from "../../../main/solidity/contracts/SATPWrapperContract.sol";

contract SATPWrapperTest is Test{

    
    address public user = makeAddr("user");

    InteractionSignature[] signatures;
    
    SATPWrapperContract wrapperContract;
    SATPNFTokenContract contract1;
    string[] lockInteractions;
    VarType[][] lockVariables;
    string[] unlockInteractions;
    VarType[][] unlockVariables;
    string[] mintInteractions;
    VarType[][] mintVariables;
    string[] burnInteractions;
    VarType[][] burnVariables;
    string[] assignInteractions;
    VarType[][] assignVariables;
    string[] checkPermissionInteractions;
    VarType[][] checkPermissionVariables;

    function setUp() public {
        // Remix does not offer a set of methods that can change the msg.sender so every contract owner is the same
        wrapperContract = new SATPWrapperContract(address(this));
        contract1 = new SATPNFTokenContract(address(wrapperContract));

        lockInteractions.push("lock(address,address,uint256)");
        lockVariables.push([VarType.OWNER, VarType.BRIDGE, VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory lock = InteractionSignature(InteractionType.LOCK,lockInteractions,lockVariables, true);
        signatures.push(lock);

        unlockInteractions.push("unlock(address,address,uint256)");
        unlockVariables.push([VarType.BRIDGE, VarType.OWNER, VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory unlock = InteractionSignature(InteractionType.UNLOCK,unlockInteractions,unlockVariables, true);
        signatures.push(unlock);

        mintInteractions.push("mint(address,uint256)");
        mintVariables.push([VarType.BRIDGE, VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory mint = InteractionSignature(InteractionType.MINT,mintInteractions,mintVariables, true);
        signatures.push(mint);

        burnInteractions.push("burn(uint256)");
        burnVariables.push([VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory burn = InteractionSignature(InteractionType.BURN,burnInteractions,burnVariables, true);
        signatures.push(burn);

        assignInteractions.push("assign(address,uint256)");
        assignVariables.push([VarType.RECEIVER, VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory assign = InteractionSignature(InteractionType.ASSIGN,assignInteractions,assignVariables, true);
        signatures.push(assign);
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
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());
        assertEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");
        assertEq(wrapperContract.getAllAssetsIDs()[0], contract1.name(), "Ids don't match");
    }

    function testUnwrap() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
        wrapperContract.unwrap(contract1.name());
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());
        assertNotEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");
    }

    function testMint() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
        wrapperContract.mint(contract1.name(), 1001);
        assertEq(contract1.balanceOf(address(wrapperContract)), 1, "Token not minted");
    }

    function testBurn() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
        wrapperContract.mint(contract1.name(), 1002);
        assertEq(contract1.balanceOf(address(wrapperContract)), 1, "Token not minted");
        wrapperContract.burn(contract1.name(), 1002);
        assertEq(contract1.balanceOf(address(wrapperContract)), 0, "Token not burned");
    }

    function testLock() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
        vm.prank(address(wrapperContract));
        contract1.mint(address(user), 1001);
        wrapperContract.lock(contract1.name(), 1001);
        Token memory token = wrapperContract.getToken(contract1.name());
        assertEq(token.amount, 1001, "Token not locked");
    }

    function testUnlock() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
        vm.prank(address(wrapperContract));
        contract1.mint(address(user), 1001);
        wrapperContract.lock(contract1.name(), 1001);
        wrapperContract.unlock(contract1.name(), 1001);
        assertEq(contract1.balanceOf(address(user)), 1, "Token not returned on unlock");
    } 

    function testAssign() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
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
       wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
       wrapperContract.mint(contract1.name(), 1001);
       try wrapperContract.unwrap(contract1.name()) returns (bool s) {
           require(!s, "Expected an error");
       }
       catch Error(string memory) {
       }
       catch (bytes memory /*lowLevelData*/) {
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
    