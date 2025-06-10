// SPDX-License-Identifier: GPL-3.0
        
pragma solidity 0.8.20;


import "../../../main/solidity/contracts/SATPWrapperContract.sol";
import { SATPTokenContract } from "../contracts/SATPTokenContract.sol";
import "forge-std/Test.sol";

contract SATPWrapperTest is Test{

    SATPTokenContract contract1;

    InteractionSignature[] signatures;
    
    SATPWrapperContract wrapperContract;

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

        contract1 = new SATPTokenContract(address(wrapperContract));

        lockInteractions.push("transfer(address,address,uint256)");
    
        lockVariables.push([VarType.OWNER, VarType.BRIDGE, VarType.AMOUNT]);
        InteractionSignature memory lock = InteractionSignature(InteractionType.LOCK,lockInteractions,lockVariables, true);
        signatures.push(lock);
        
        unlockInteractions.push("approve(address,uint256)");
        unlockInteractions.push("transfer(address,address,uint256)");
        
        unlockVariables.push([VarType.BRIDGE, VarType.AMOUNT]);
        unlockVariables.push([VarType.BRIDGE, VarType.OWNER, VarType.AMOUNT]);
        InteractionSignature memory unlock = InteractionSignature(InteractionType.UNLOCK,unlockInteractions,lockVariables, true);
        signatures.push(unlock);

        
        mintInteractions.push("mint(address,uint256)");
        
        mintVariables.push([VarType.BRIDGE, VarType.AMOUNT]);
        InteractionSignature memory mint = InteractionSignature(InteractionType.MINT,mintInteractions,lockVariables, true);
        signatures.push(mint);

        
        burnInteractions.push("burn(address,uint256)");
        
        burnVariables.push([VarType.BRIDGE, VarType.AMOUNT]);
        InteractionSignature memory burn = InteractionSignature(InteractionType.BURN,burnInteractions,lockVariables, true);
        signatures.push(burn);

        
        assignInteractions.push("assign(address,address,uint256)");
        
        assignVariables.push([VarType.BRIDGE, VarType.RECEIVER, VarType.AMOUNT]);
        InteractionSignature memory assign = InteractionSignature(InteractionType.ASSIGN,assignInteractions,lockVariables, true);
        signatures.push(assign);

        checkPermissionInteractions.push("hasPermission(address)");
        
        checkPermissionVariables.push([VarType.BRIDGE]);
        InteractionSignature memory checkPermition = InteractionSignature(InteractionType.CHECKPERMITION,checkPermissionInteractions,lockVariables, true);
        signatures.push(checkPermition);
    }

    function testGetAllAssetsIDs() public {
        Token memory token = wrapperContract.getToken(contract1.symbol());
        assertEq(token.contractAddress, address(0), "Token should not exist before wrapping");
    }

    function testWrap() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.OTHER, contract1.name(), "refID", address(this), signatures);

        Token memory tokenReceived = wrapperContract.getToken(contract1.name());

        assertEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");

        assertEq(wrapperContract.getAllAssetsIDs()[0], contract1.name(), "Ids don't match");
    }

    function testWrapTokenAlreadyWrapped() public {

        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.OTHER, contract1.name(), "refID", address(this), signatures);

        try wrapperContract.wrap(contract1.name(), address(contract1), TokenType.OTHER, contract1.name(), "refID", address(this), signatures) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    function testUnwrap() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.OTHER, contract1.name(), "refID", address(this), signatures);

        wrapperContract.unwrap(contract1.name());

        Token memory tokenReceived = wrapperContract.getToken(contract1.name());

        assertNotEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");
    }

    // function testUnwrapATokenNotWrapped() public {
    //     vm.expectRevert();
    //     wrapperContract.unwrap(contract1.name());
    // }

    function testUnwrapATokenWithValueLocked() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.OTHER, contract1.name(), "refID", address(this), signatures);

        wrapperContract.mint(contract1.name(), 10);

        try wrapperContract.unwrap(contract1.name()) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    // function testMint() public {
    //     wrapperContract.wrap(contract1.name(), address(contract1), TokenType.OTHER, contract1.name(), "refID", address(this), signatures);

    //     wrapperContract.mint(contract1.name(), 10);
        
    //     assertEq(contract1.balanceOf(address(wrapperContract)), 10, "Token not minted");
    // }

    function testMintATokenNotWrapped() public {
        try wrapperContract.mint(contract1.name(), 10) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }
}
    