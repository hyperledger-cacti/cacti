// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./transferInterface.sol";

/**
 * A basic token for testing the HashedTimelockERC20.
 */
contract AliceERC20 is ERC20, transferInterface {
    constructor(uint256 initialSupply) ERC20("Alice Token", "AliceToken") {
        _mint(msg.sender, initialSupply);
    }

    function transferInterop(transferStruct.Info memory info)
        public
        override
        returns (bool success)
    {
        this.transferFrom(info.sender, info.receiver, info.amount);
        return true;
    }

    function allowanceInterop(transferStruct.Info memory info)
        public
        view
        override
        returns (bool success)
    {
        return this.allowance(info.sender, address(this)) >= info.amount;
    }
}
