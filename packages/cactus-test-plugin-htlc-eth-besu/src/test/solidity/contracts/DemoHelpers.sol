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

    function getTxIdNoHash(address sender, address receiver, uint256 inputAmount, bytes32 hashLock, uint256 expiration) public pure returns (bytes memory result) {
        return abi.encode(sender, receiver, inputAmount, hashLock, expiration);
    }

    function getTxId(address sender, address receiver, uint256 inputAmount, bytes32 hashLock, uint256 expiration) public pure returns (bytes32 result) {
        return keccak256(
            abi.encode(sender, receiver, inputAmount, hashLock, expiration)
        );
    }

}
