// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.8;

/**
 * A basic token for testing the HashedTimelockERC20.
 */
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./transferInterface.sol";

contract AliceERC1155 is ERC1155, transferInterface {
    uint256 public constant AliceToken = 0;
    uint256 public constant AliceNFT = 1;
    address owner;

    constructor() ERC1155("") {
        _mint(msg.sender, AliceToken, 10**18, "");
        _mint(msg.sender, AliceNFT, 1, "");
        owner = msg.sender;
    }

    function transferInterop(transferStruct.Info memory info)
        public
        override
        returns (bool success)
    {
        this.safeTransferFrom(
            info.sender,
            info.receiver,
            info.tokenId,
            info.amount,
            info.data
        );
        return true;
    }

    function allowanceInterop(transferStruct.Info memory info)
        public
        view
        override
        returns (bool success)
    {
        return this.isApprovedForAll(info.sender, address(this));
    }

    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data) public {
        require(msg.sender == owner);
        _mint(to, tokenId, amount, data);
    }
}
