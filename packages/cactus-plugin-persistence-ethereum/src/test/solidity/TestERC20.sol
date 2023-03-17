// SPDX-License-Identifier: Apache-2.0

// *****************************************************************************
// IMPORTANT: If you update this code then make sure to recompile
// it and update the .json file as well so that they
// remain in sync for consistent test executions.
// With that said, there shouldn't be any reason to recompile this, like ever...
// *****************************************************************************

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestErc20Token is ERC20 {
    constructor(uint256 initialSupply) ERC20("TestERC20", "T20") {
        _mint(msg.sender, initialSupply);
    }
}
