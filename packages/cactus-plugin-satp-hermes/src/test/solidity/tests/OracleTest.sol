/**
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import {OracleTestContract} from "../contracts/OracleTestContract.sol";

contract OracleTest is Test {
    event UpdatedData(bytes32 id, string data, uint256 nonce);

    OracleTestContract oracle;
    address owner;

    function setUp() public {
        owner = address(this);
        oracle = new OracleTestContract();
    }

    function testWriteAndReadData() public {
        string memory newData = "Hello, world!";
        oracle.setData(newData);

        bytes memory encodedData = abi.encodePacked(newData);
        bytes32 hash_newData = keccak256(encodedData);

        string memory result = oracle.getData(hash_newData);
        assertEq(result, newData);
    }

    function testEmitUpdatedDataEvent() public {
        string memory newData = "Hello, world 1!";
        vm.expectEmit(true, true, true, true);
        uint256 nonceBefore = oracle.getNonce();
        emit UpdatedData(keccak256(abi.encodePacked(newData)), newData, nonceBefore + 1);
        oracle.setData(newData);
    }

    function testRevertIfDataNotFound() public {
        bytes memory encodedData = abi.encodePacked("Invalid Id");
        bytes32 hash_invalid_data = keccak256(encodedData);

        vm.expectRevert(bytes("Data not found"));
        oracle.getData(hash_invalid_data);
    }
}