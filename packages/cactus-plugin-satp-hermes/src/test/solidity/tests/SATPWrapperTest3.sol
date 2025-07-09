// SPDX-License-Identifier: GPL-3.0
        
pragma solidity 0.8.20;


import "../../../main/solidity/contracts/SATPWrapperContract.sol";
import { SATPTokenContract } from "../contracts/SATPTokenContract.sol";
import { SATPNFTokenContract } from "../contracts/SATPNFTokenContract.sol";
import "forge-std/Test.sol";
import { console } from "forge-std/console.sol";

contract SATPWrapperTest is Test{

    SATPNFTokenContract contract1;
    address public user = makeAddr("user");
    address public bridge = makeAddr("bridge");
    address public owner = makeAddr("owner");
    address public whaleAcc = makeAddr("whaleAcc");

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

        wrapperContract = new SATPWrapperContract(whaleAcc);
        contract1 = new SATPNFTokenContract(whaleAcc);

        lockInteractions.push("lock(address,address,uint256)");
        lockInteractions.push("transferFrom(address,address,uint256)");    
        lockVariables.push([VarType.OWNER, VarType.BRIDGE, VarType.UNIQUEDESCRIPTOR]);
        lockVariables.push([VarType.OWNER, VarType.BRIDGE, VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory lock = InteractionSignature(InteractionType.LOCK,lockInteractions,lockVariables, true);
        signatures.push(lock);

        unlockInteractions.push("transfer(address,uint256)");
        unlockVariables.push([VarType.OWNER, VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory unlock = InteractionSignature(InteractionType.UNLOCK,unlockInteractions,unlockVariables, true);
        signatures.push(unlock);

        
        mintInteractions.push("mint(address,uint256)");
        mintVariables.push([VarType.BRIDGE, VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory mint = InteractionSignature(InteractionType.MINT,mintInteractions,mintVariables, true);
        signatures.push(mint);

        
        burnInteractions.push("burn(address,uint256)");
        burnVariables.push([VarType.BRIDGE, VarType.UNIQUEDESCRIPTOR]);
        InteractionSignature memory burn = InteractionSignature(InteractionType.BURN,burnInteractions,burnVariables, true);
        signatures.push(burn);

        checkPermissionInteractions.push("hasPermission(address)");
        checkPermissionVariables.push([VarType.BRIDGE]);
        InteractionSignature memory checkPermition = InteractionSignature(InteractionType.CHECKPERMITION,checkPermissionInteractions,lockVariables, true);
        signatures.push(checkPermition);
    }

    function testWrap() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(this), signatures);

        Token memory tokenReceived = wrapperContract.getToken(contract1.name());

        assertEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");

        assertEq(wrapperContract.getAllAssetsIDs()[0], contract1.name(), "Ids don't match");
    }

    function testLock() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_NONFUNGIBLE, contract1.name(), "refID", address(user), signatures);
        wrapperContract.lock(contract1.name(), 1001);
        Token memory tokenReceived = wrapperContract.getToken(contract1.name());

         //wrapperContract.mint(contract1.name(), 1001);
        //vm.prank(address(wrapperContract));
        //contract1.grantBridgeRole(address(wrapperContract));
        //vm.prank(address(wrapperContract));
        //contract1.mint(user, 1001);
        //vm.prank(address(wrapperContract));
        //contract1.approve(address(wrapperContract), 1001);
        //wrapperContract.lock(contract1.name(), 1001);
        //assertEq(contract1.balanceOf(address(wrapperContract)), 10, "Token not minted");
        //wrapperContract.unlock(contract1.name(), 1001);
    }
}
    