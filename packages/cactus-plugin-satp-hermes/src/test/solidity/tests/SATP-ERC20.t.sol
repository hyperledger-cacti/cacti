// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.20;

import { SATPContract } from "../contracts/satp-erc20.sol";
import "forge-std/Test.sol";
import { console } from "forge-std/console.sol";

contract SATPContractTest is Test {
    SATPContract satpContract;

    address public owner = makeAddr("owner");
    address public bridge = makeAddr("bridge");
    address public user = makeAddr("user");

    function setUp() public {
        vm.prank(owner);
        satpContract = new SATPContract(owner, "ID1");

        vm.startPrank(owner);
        satpContract.giveRole(bridge); // Owner gives BRIDGE_ROLE to bridge
        assertTrue(satpContract.hasPermission(bridge));
        vm.stopPrank();
    }

    function testTokenNameAndSymbol() public {
        assertEq(satpContract.name(), "SATPToken");
        assertEq(satpContract.symbol(), "SATP");
    }

    function testMintAndCheckBalance() public {
        uint256 amount = 1000 ether;

        vm.prank(bridge);
        satpContract.mint(user, amount);

        assertEq(satpContract.balanceOf(user), amount);
    }

    function testBurn() public {
        uint256 amount = 1000 ether;

        vm.startPrank(bridge);
        satpContract.mint(user, amount);
        satpContract.burn(user, 500 ether);
        vm.stopPrank();

        assertEq(satpContract.balanceOf(user), 500 ether);
    }

    function testAssign() public {
        uint256 amount = 1000 ether;

        vm.prank(bridge);
        satpContract.mint(bridge, amount);

        vm.prank(bridge);
        satpContract.assign(bridge, user, 300 ether);

        assertEq(satpContract.balanceOf(user), 300 ether);
    }

    function testApprove() public {
        uint256 amount = 500 ether;

        // user approves bridge to spend tokens on their behalf
        vm.prank(user);
        satpContract.approve(bridge, amount);

        uint256 allowance = satpContract.allowance(user, bridge);
        assertEq(allowance, amount, "Approval allowance mismatch");
    }

    function testTransfer() public {
        uint256 amount = 1000 ether;

        vm.prank(bridge);
        satpContract.mint(user, amount);

        vm.prank(user);
        satpContract.approve(bridge, 500 ether);

        vm.prank(bridge);
        satpContract.transfer(user, bridge, 500 ether);

        assertEq(satpContract.balanceOf(user), 500 ether);
        assertEq(satpContract.balanceOf(bridge), 500 ether);
    }

    function testGetId() public {
        assertEq(satpContract.getId(), "ID1");
    }

    function testHasPermission() public {
        vm.expectRevert();
        satpContract.hasPermission(user);

        assertTrue(satpContract.hasPermission(bridge));
    }

    function testCheckBalance() public {
        uint256 amount = 1234 ether;
        vm.prank(bridge);
        satpContract.mint(user, amount);

        assertEq(satpContract.checkBalance(user), amount);
    }
}
