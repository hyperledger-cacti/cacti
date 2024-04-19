// SPDX-License-Identifier: GPL-3.0
        
pragma solidity >=0.4.22 <0.9.0;

// This import is automatically injected by Remix
import "remix_tests.sol"; 

// This import is required to use custom transaction context
// Although it may fail compilation in 'Solidity Compiler' plugin
// But it will work fine in 'Solidity Unit Testing' plugin
import "remix_accounts.sol";
import "../contracts/satp-wrapper.sol";
import "./../contracts/satp-erc20.sol";

contract SATPWrapTest {

    SATPContract contract1;
    SATPContract contract2;
    
    SATPWrapperContract wrapperContract;
    
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    function beforeEach() public {
        // Remix does not offer a set of methods that can change the msg.sender so every contract owner is the same

        wrapperContract = new SATPWrapperContract(address(this), BRIDGE_ROLE);

        contract1 = new SATPContract(address(wrapperContract), "ID1");
        contract2 = new SATPContract(address(this), "ID2");      
    }

    function checkWrap() public {
        wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this));

        Token memory tokenReceived = wrapperContract.getToken(contract1.getId());

        Assert.equal(tokenReceived.assetContract, address(contract1), "Tokens don't match");

        Assert.equal(wrapperContract.getAllAssetsIDs()[0], contract1.getId(), "Ids don't match");
    }

    function checkWrapTokenAlreadyWrapped() public {

        wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this));

        try wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this)) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    function checkUnwrap() public {
        wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this));

        wrapperContract.unwrap(contract1.getId());

        Token memory tokenReceived = wrapperContract.getToken(contract1.getId());

        Assert.notEqual(tokenReceived.assetContract, address(contract1), "Tokens don't match");
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
        wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this));
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
        wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this));

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

    function checkBurn() public {
        wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this));

        wrapperContract.mint(contract1.getId(), 10);

        Assert.equal(contract1.balanceOf(address(wrapperContract)), 10, "Token not minted");

        wrapperContract.burn(contract1.getId(), 10);        

        Assert.equal(contract1.balanceOf(address(wrapperContract)), 0, "Token not burned");
    }

    function checkBurnMoreThanLocked() public {
         wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this));

        wrapperContract.mint(contract1.getId(), 10);

        Assert.equal(contract1.balanceOf(address(wrapperContract)), 10, "Token not minted");
            
        try wrapperContract.burn(contract1.getId(), 11) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }

        Assert.equal(contract1.balanceOf(address(wrapperContract)), 10, "Token burned");
    }

    function checkBurnATokenNotWrapped() public {
         try wrapperContract.burn(contract1.getId(), 10) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    function checkAssign() public {
        wrapperContract.wrap(address(contract1), "ERC20", contract1.getId(), address(this));

        wrapperContract.mint(contract1.getId(), 10);

        wrapperContract.assign(contract1.getId(), address(TestsAccounts.getAccount(1)), 10);        
        
        Assert.equal(contract1.balanceOf(TestsAccounts.getAccount(1)), 10, "Token not assign");
        Assert.equal(contract1.balanceOf(address(wrapperContract)), 0, "Token not assign");
    }

    function checkAssignATokenNotWrapped() public {
         try wrapperContract.assign(contract1.getId(), address(TestsAccounts.getAccount(1)), 10) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    function checkLock() public {
        contract2.mint(address(this), 10);

        contract2.giveRole(address(wrapperContract));

        contract2.approve(address(wrapperContract), 5);

        wrapperContract.wrap(address(contract2), "ERC20", contract2.getId(), address(this));

        wrapperContract.lock(contract2.getId(), 5);

        Token memory tokenReceived = wrapperContract.getToken(contract2.getId());

        Assert.equal(contract2.balanceOf(address(this)), 5, "Amount was not transfered to the wrapper contract address");
        Assert.equal(tokenReceived.amount, 5, "Token not unlocked");
    }

    function checkLockATokenNotWrapped() public {
         try wrapperContract.lock(contract2.getId(), 5) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }

    function checkUnlock() public {
        contract2.mint(address(this), 10);

        contract2.giveRole(address(wrapperContract));

        contract2.approve(address(wrapperContract), 5);

        wrapperContract.wrap(address(contract2), "ERC20", contract2.getId(), address(this));

        wrapperContract.lock(contract2.getId(), 5);

        wrapperContract.unlock(contract2.getId(), 5);

        Token memory tokenReceived = wrapperContract.getToken(contract2.getId());

        Assert.equal(contract2.balanceOf(address(this)), 10, "Amount was not transfered to the owner contract address");
        Assert.equal(contract2.balanceOf(address(wrapperContract)), 0, "Amount was not transfered to the owner contract address");
        Assert.equal(tokenReceived.amount, 0, "Token not unlocked");
    }

    function checkUnlockATokenNotWrapped() public {
         try wrapperContract.unlock(contract2.getId(), 5) returns (bool s) {
            require(!s, "Expected an error");
        }
        catch Error(string memory) {
        }
        catch (bytes memory /*lowLevelData*/) {
        }
    }
}
    