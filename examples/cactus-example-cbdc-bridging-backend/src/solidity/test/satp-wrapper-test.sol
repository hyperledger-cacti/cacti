// SPDX-License-Identifier: GPL-3.0
        
pragma solidity >=0.4.22 <0.9.0;

// This import is automatically injected by Remix
import "remix_tests.sol"; 

// This import is required to use custom transaction context
// Although it may fail compilation in 'Solidity Compiler' plugin
// But it will work fine in 'Solidity Unit Testing' plugin
import "remix_accounts.sol";
import "../main/satp-wrapper.sol";
import "../main/satp-erc20.sol";

contract SATPWrapTest {

    SATPContract contract1;
    SATPContract contract2;

    InteractionSignature[] signatures;
    
    SATPWrapperContract wrapperContract;

    string[] lockInteractions;
    Types[][] lockVariables;
    string[] unlockInteractions;
    Types[][] unlockVariables;
    string[] minInteractions;
    Types[][] mintVariables;
    string[] burnInteractions;
    Types[][] burnVariables;
    string[] assignInteractions;
    Types[][] assignVariables;
    string[] checkPermissionInteractions;
    Types[][] checkPermissionVariables;

    function beforeEach() public {
        // Remix does not offer a set of methods that can change the msg.sender so every contract owner is the same

        wrapperContract = new SATPWrapperContract(address(this));

        contract1 = new SATPContract(address(wrapperContract), "ID1");
        contract2 = new SATPContract(address(this), "ID2");      

        lockInteractions.push("transfer(address,address,uint256)");
    
        lockVariables.push([Types.OWNER, Types.BRIDGE, Types.AMOUNT]);
        InteractionSignature memory lock = InteractionSignature(InteractionType.LOCK,lockInteractions,lockVariables, true);
        signatures.push(lock);
        
        unlockInteractions.push("approve(address,uint256)");
        unlockInteractions.push("transfer(address,address,uint256)");
        
        unlockVariables.push([Types.BRIDGE, Types.AMOUNT]);
        unlockVariables.push([Types.BRIDGE, Types.OWNER, Types.AMOUNT]);
        InteractionSignature memory unlock = InteractionSignature(InteractionType.UNLOCK,lockInteractions,lockVariables, true);
        signatures.push(unlock);

        
        minInteractions.push("mint(address,uint256)");
        
        mintVariables.push([Types.BRIDGE, Types.AMOUNT]);
        InteractionSignature memory mint = InteractionSignature(InteractionType.MINT,lockInteractions,lockVariables, true);
        signatures.push(mint);

        
        burnInteractions.push("burn(address,uint256)");
        
        burnVariables.push([Types.BRIDGE, Types.AMOUNT]);
        InteractionSignature memory burn = InteractionSignature(InteractionType.BURN,lockInteractions,lockVariables, true);
        signatures.push(burn);

        
        assignInteractions.push("assign(address,address,uint256)");
        
        assignVariables.push([Types.BRIDGE, Types.RECEIVER, Types.AMOUNT]);
        InteractionSignature memory assign = InteractionSignature(InteractionType.ASSIGN,lockInteractions,lockVariables, true);
        signatures.push(assign);

        checkPermissionInteractions.push("hasPermission(address)");
        
        checkPermissionVariables.push([Types.BRIDGE]);
        InteractionSignature memory checkPermition = InteractionSignature(InteractionType.CHECKPERMITION,lockInteractions,lockVariables, true);
        signatures.push(checkPermition);
    }

    function checkWrap() public {
        wrapperContract.wrap(address(contract1), TokenType.OTHER, contract1.getId(), address(this), signatures);

        Token memory tokenReceived = wrapperContract.getToken(contract1.getId());

        Assert.equal(tokenReceived.contractAddress, address(contract1), "Tokens don't match");

        Assert.equal(wrapperContract.getAllAssetsIDs()[0], contract1.getId(), "Ids don't match");
    }

    function checkWrapTokenAlreadyWrapped() public {

        wrapperContract.wrap(address(contract1), TokenType.OTHER, contract1.getId(), address(this), signatures);

        try wrapperContract.wrap(address(contract1), TokenType.OTHER, contract1.getId(), address(this), signatures) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    function checkUnwrap() public {
        wrapperContract.wrap(address(contract1), TokenType.OTHER, contract1.getId(), address(this), signatures);

        wrapperContract.unwrap(contract1.getId());

        Token memory tokenReceived = wrapperContract.getToken(contract1.getId());

        Assert.notEqual(tokenReceived.contractAddress, address(contract1), "Tokens don't match");
    }

    function checkUnwrapATokenNotWrapped() public {
         try wrapperContract.unwrap(contract1.getId()) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    function checkUnwrapATokenWithValueLocked() public {
        wrapperContract.wrap(address(contract1), TokenType.OTHER, contract1.getId(), address(this), signatures);

        wrapperContract.mint(contract1.getId(), 10);

        try wrapperContract.unwrap(contract1.getId()) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }
    function checkMint() public {
       wrapperContract.wrap(address(contract1), TokenType.OTHER, contract1.getId(), address(this), signatures);


        wrapperContract.mint(contract1.getId(), 10);
        
        Assert.equal(contract1.balanceOf(address(wrapperContract)), 10, "Token not minted");
    }

    function checkMintATokenNotWrapped() public {
        try wrapperContract.mint(contract1.getId(), 10) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }
}
    