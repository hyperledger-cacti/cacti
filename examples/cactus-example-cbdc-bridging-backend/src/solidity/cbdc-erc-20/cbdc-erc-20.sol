// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title SampleERC20
 * @dev Create a sample ERC20 standard token
 */

contract CBDCcontract is Ownable, ERC20 {

    address bridge_address = address(0xf28d5769171bfbD2B3628d722e58129a6aE15022);
    address asset_ref_contract = address(0);

    constructor() ERC20("CentralBankDigitalCurrency", "CBDC") {
    }

    function setAssetReferenceContract(address contract_address) external onlyOwner {
        asset_ref_contract = contract_address;
    }

    function mint(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function burn(uint256 amount) external onlyOwner {
        _burn(bridge_address, amount);
    }

    function escrow(uint256 amount, string calldata asset_ref_id) external checkARContract {
        transfer(bridge_address, amount);

        (bool success, ) = asset_ref_contract.call(
            abi.encodeWithSignature("createAssetReference(string,uint256,address)", asset_ref_id, amount, msg.sender)
        );

        require(success, "createAssetReference call failed");
    }

    function _checkAssetRefContract() internal view virtual {
        require(asset_ref_contract != address(0), "CBDCcontract: asset reference contract not defined");
    }

    modifier checkARContract() {
        _checkAssetRefContract();
        _;
    }

    // function for testing purposes
    function resetBalanceOf(address[] calldata accounts) external {
        uint256 toBurn;
        for (uint i = 0; i < accounts.length; i++) {
            toBurn = balanceOf(accounts[i]);
            _burn(accounts[i], toBurn);
        }
    }
}
