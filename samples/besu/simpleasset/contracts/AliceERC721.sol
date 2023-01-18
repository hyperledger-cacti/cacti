// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./transferInterface.sol";

/**
 * A basic token for testing the HashedTimelockERC721.
 */
contract AliceERC721 is ERC721, transferInterface {
    using Counters for Counters.Counter;
    Counters.Counter public _tokenIds;
    address owner;

    constructor() ERC721("Alice NFT", "AliceNFT") {
        owner = msg.sender;
        _tokenIds.reset();
    }

    function mint(address to) public {
        require(msg.sender == owner);
        uint256 newItemId = _tokenIds.current();
        _safeMint(to, newItemId);
        _tokenIds.increment();
    }

    function transferInterop(transferStruct.Info memory info)
        public
        override
        returns (bool success)
    {
        this.transferFrom(info.sender, info.receiver, info.tokenId);
        return true;
    }

    function allowanceInterop(transferStruct.Info memory info)
        public
        view
        override
        returns (bool success)
    {
        return this.getApproved(info.tokenId) == address(this);
    }
}
