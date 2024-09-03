// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.15;

import "./../contracts/satp-erc20.sol";
import "remix_tests.sol";
import "remix_accounts.sol";

import "remix_accounts.sol";

contract SATPContractTest {

    SATPContract satpContract;

    function beforeEach () public {
        satpContract = new SATPContract(address(this), "ID1");
    }

    function testTokenNameAndSymbol () public {
        Assert.equal(satpContract.name(), "SATPToken", "token name did not match");
        Assert.equal(satpContract.symbol(), "SATP", "token symbol did not match");
    }

    function mintTokens () public {
        satpContract.mint(address(this), 99);
        uint256 balance = satpContract.balanceOf(address(this));
        Assert.equal(balance, 99, "tokens minted did not match");
    }

    function mintToOtherAccoutTokens () public {
        satpContract.mint(TestsAccounts.getAccount(1), 99);
        uint256 balance = satpContract.balanceOf(TestsAccounts.getAccount(1));
        Assert.equal(balance, 99, "tokens minted did not match");
    }

    function burnTokens () public {
        uint256 initBalance = satpContract.balanceOf(address(this));
        satpContract.mint(address(this), 99);
        satpContract.burn(address(this), 99);
        uint256 balance = satpContract.balanceOf(address(this));
        Assert.equal(balance, initBalance, "tokens burned did not match");
     }

    function assignTokens () public {
        uint256 initBalance = satpContract.balanceOf(address(this));

        satpContract.mint(address(this), 99);

        satpContract.assign(address(this), TestsAccounts.getAccount(1), 99);

        Assert.equal(satpContract.balanceOf(TestsAccounts.getAccount(1)), 99, "tokens not assigned");
        Assert.equal(satpContract.balanceOf(address(this)), initBalance, "balance of account did not change"); 
    }

    function transferTokens () public {
        uint256 initBalance = satpContract.balanceOf(address(this));
        satpContract.mint(address(this), 99);
        satpContract.approve(address(this), 99);
        satpContract.transfer(address(this), TestsAccounts.getAccount(1), 99);
        Assert.equal(satpContract.balanceOf(TestsAccounts.getAccount(1)), 99, "tokens not transferred");
        Assert.equal(satpContract.balanceOf(address(this)), initBalance, "balance of account did not change");
    }    
}