// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import { SATPNFTokenContract } from "../contracts/SATPNFTokenContract.sol";
import "forge-std/Test.sol";
import { console } from "forge-std/console.sol";

contract SATPNFTokenContractTest is Test {
    SATPNFTokenContract satpContract;

    address public owner = makeAddr("owner");
    address public bridge = makeAddr("bridge");
    address public user = makeAddr("user");

    function setUp() public {
        vm.prank(owner);
        satpContract = new SATPNFTokenContract(owner);

        vm.startPrank(owner);
        satpContract.grantBridgeRole(bridge);
        assertTrue(satpContract.hasBridgeRole(bridge));
        vm.stopPrank();
    }

    function mintToUser(uint256 tokenId) internal {
        vm.prank(bridge);
        satpContract.mint(user, tokenId);
    }

    function approveAddressToToken(address to, uint256 tokenId) internal {
        vm.prank(user);
        satpContract.approve(to, tokenId);
    }

    function testTokenNameAndSymbol() public {
        assertEq(satpContract.name(), "SATPNFToken");
        assertEq(satpContract.symbol(), "SATPNFT");
    }

    function testMintAndCheckBalance() public {
        uint256 tokenId = 1001;

        vm.prank(bridge);
        satpContract.mint(user, tokenId);

        assertEq(satpContract.balanceOf(user), 1);
        assertEq(satpContract.ownerOf(tokenId), user);
    }

    function testApprove() public {
        uint256 tokenId = 1001;
        mintToUser(tokenId);

        vm.prank(user);
        satpContract.approve(bridge, tokenId);

        vm.prank(bridge);
        address approvedAddress = satpContract.getApproved(tokenId);
        assertEq(approvedAddress, bridge, "Approval address mismatch");

        vm.prank(bridge);
        address tokenOwner = satpContract.ownerOf(tokenId);
        assertEq(tokenOwner, user, "Owner address mismatch");
    }

    function testLock() public {
        uint256 tokenId = 1001;
        mintToUser(tokenId);

        approveAddressToToken(bridge, tokenId);

        vm.prank(bridge);
        satpContract.lock(user, bridge, 1001);

        assertEq(satpContract.balanceOf(user), 0);
        assertEq(satpContract.balanceOf(bridge), 1);
    }

    function testUnlock() public {
        uint256 tokenId = 1001;
        mintToUser(tokenId);

        approveAddressToToken(bridge, tokenId);

        vm.startPrank(bridge);
        satpContract.lock(user, bridge, tokenId);
        satpContract.unlock(bridge, user, tokenId);
        vm.stopPrank();

        assertEq(satpContract.balanceOf(user), 1);
        assertEq(satpContract.balanceOf(bridge), 0);
    }

    function testBurn() public {
        uint256 tokenId = 1001;
        uint256 tokenId2 = 1002;
        mintToUser(tokenId);
        mintToUser(tokenId2);
        assertEq(satpContract.balanceOf(user), 2);
        
        approveAddressToToken(bridge, tokenId);
        vm.prank(bridge);
        satpContract.burn(tokenId);

        assertEq(satpContract.balanceOf(user), 1);
    }
}