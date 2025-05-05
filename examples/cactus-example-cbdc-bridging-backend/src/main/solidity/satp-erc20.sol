// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ITraceableContract.sol";

import "./satp-contract-interface.sol";

error noPermission(address adr);

contract SATPContract is AccessControl, ERC20, ITraceableContract, SATPContractInterface {

    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    string public id;

    constructor(address _owner, string memory _id) ERC20("SATPToken", "SATP") {
        _grantRole(OWNER_ROLE, _owner);
        _grantRole(BRIDGE_ROLE, _owner);

        id = _id;
    }

    function mint(address account, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        _mint(account, amount);
        return true;
    }

    function burn(address account, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        _burn(account, amount);
        return true;
    }

    function assign(address from, address recipient, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        require(from == _msgSender(), "The msgSender is not the owner");
        _transfer(from, recipient, amount);
        return true;
    }

    function transfer(address from, address recipient, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        transferFrom(from, recipient, amount);
        return true;
    }

    function getAllAssetsIDs() external view returns (string[] memory) {
        string[] memory myArray = new string[](1);
        myArray[0] = id;
        return myArray;
    }

    function getId() view public returns (string memory) {
        return id;
    }

    function giveRole(address account) external onlyRole(OWNER_ROLE) returns (bool success) {
        _grantRole(BRIDGE_ROLE, account);
        return true;
    }

    function hasPermission(address account) external view returns (bool success) {
        if(hasRole(BRIDGE_ROLE, account)){
            return true;
        }     
        revert noPermission(account);
    }

    function checkBalance(address account) external view returns (uint256) {
        return balanceOf(account);
    }
}