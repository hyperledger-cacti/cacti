// SPDX-License-Identifier: GPL-3.0
        
pragma solidity 0.8.20;


import "../../../main/solidity/contracts/SATPWrapperContract.sol";
import { SATPTokenContract } from "../contracts/SATPTokenContract.sol";
import "forge-std/Test.sol";

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
        // Remix does not offer a set of methods that can change the msg.sender so every contract owner is the same

        wrapperContract = new SATPWrapperContract(address(this));

        contract1 = new SATPTokenContract(address(wrapperContract));

        lockInteractions.push("bridgeTransferFrom(address,address,uint256)");

        lockVariables.push([AssetParameterIdentifier.OWNER, AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory lock = InteractionSignature(InteractionType.LOCK,lockInteractions,lockVariables, true);
        signatures.push(lock);
        
        unlockInteractions.push("lock(address,address,uint256)");

        unlockVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.OWNER, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory unlock = InteractionSignature(InteractionType.UNLOCK,unlockInteractions,unlockVariables, true);
        signatures.push(unlock);

        
        mintInteractions.push("mint(address,uint256)");

        mintVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory mint = InteractionSignature(InteractionType.MINT,mintInteractions,mintVariables, true);
        signatures.push(mint);

        
        burnInteractions.push("burn(address,uint256)");
        
        burnVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory burn = InteractionSignature(InteractionType.BURN,burnInteractions,burnVariables, true);
        signatures.push(burn);

        
        assignInteractions.push("assign(address,address,uint256)");

        assignVariables.push([AssetParameterIdentifier.BRIDGE, AssetParameterIdentifier.RECEIVER, AssetParameterIdentifier.AMOUNT]);
        InteractionSignature memory assign = InteractionSignature(InteractionType.ASSIGN,assignInteractions,assignVariables, true);
        signatures.push(assign);

        checkPermissionInteractions.push("hasPermission(address)");

        checkPermissionVariables.push([AssetParameterIdentifier.BRIDGE]);
        InteractionSignature memory checkPermition = InteractionSignature(InteractionType.CHECKPERMITION,checkPermissionInteractions,checkPermissionVariables, true);
        signatures.push(checkPermition);
    }

    function testGetAllAssetsIDs() public {
        Token memory token = wrapperContract.getToken(contract1.symbol());
        assertEq(token.contractAddress, address(0), "Token should not exist before wrapping");
    }

    function testWrap() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC20);

        Token memory tokenReceived = wrapperContract.getToken(contract1.name());

        assertEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");

        assertEq(wrapperContract.getAllAssetsIDs()[0], contract1.name(), "Ids don't match");
    }

    function testWrapTokenAlreadyWrapped() public {

        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC20);

        try wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC20) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    function testUnwrap() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC20);

        wrapperContract.unwrap(contract1.name());

        Token memory tokenReceived = wrapperContract.getToken(contract1.name());

        assertNotEq(tokenReceived.contractAddress, address(contract1), "Tokens don't match");
    }

    function testMint() public {
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC20);
        wrapperContract.mint(contract1.name(), 10);
        
        assertEq(contract1.balanceOf(address(wrapperContract)), 10, "Token not minted");
    }

    function testMintATokenNotWrapped() public {
        try wrapperContract.mint(contract1.name(), 10) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
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
        wrapperContract.wrap(contract1.name(), address(contract1), TokenType.NONSTANDARD_FUNGIBLE, contract1.name(), "refID", address(user), signatures, ERCTokenStandard.ERC20);

        wrapperContract.mint(contract1.name(), 10);

        try wrapperContract.unwrap(contract1.name()) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }
}
    