// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

contract DemoHelpers {

   
    function getHash(string memory _key) public pure returns (bytes32 result) {
       return keccak256(abi.encode(_key));
    }

    function getTimestamp() public view returns (uint256 result) {
        return block.timestamp;
    }

    function getTxId(address sender, address receiver, uint256 inputAmount, bytes32 hashLock, uint256 expiration, address tokenAddress) public pure returns (bytes32 result) {
        return keccak256(
            abi.encode(sender, receiver, inputAmount, hashLock, expiration, tokenAddress)
        );
    }
}