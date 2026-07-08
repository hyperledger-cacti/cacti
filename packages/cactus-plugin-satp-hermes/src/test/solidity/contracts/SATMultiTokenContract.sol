// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SATMultiTokenContract
 * A minimal multi-token contract (ERC6909-like) used for testing the SATPWrapperContract
 * with the uniqueDescriptor overloads (lock/unlock/mint/burn/assign with a token type ID).
 *
 * `tokenTypeId` corresponds to the uniqueDescriptor parameter in the wrapper functions.
 * `amount` corresponds to assetAttribute.
 */
contract SATMultiTokenContract is AccessControl {

    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    string private constant _NAME = "SATMultiToken";
    string private constant _SYMBOL = "SATMT";

    // tokenTypeId => account => balance
    mapping(uint256 => mapping(address => uint256)) public balances;

    constructor(address _owner) {
        _grantRole(OWNER_ROLE, _owner);
        _grantRole(BRIDGE_ROLE, _owner);
    }

    function name() external pure returns (string memory) { return _NAME; }
    function symbol() external pure returns (string memory) { return _SYMBOL; }

    function grantBridgeRole(address account) external onlyRole(OWNER_ROLE) returns (bool) {
        _grantRole(BRIDGE_ROLE, account);
        return true;
    }

    function hasBridgeRole(address account) external view returns (bool) {
        if (hasRole(BRIDGE_ROLE, account)) return true;
        revert("No bridge role");
    }

    function hasPermission(address account) external view returns (bool) {
        return hasRole(BRIDGE_ROLE, account);
    }

    function mint(address to, uint256 amount, uint256 tokenTypeId) external onlyRole(BRIDGE_ROLE) returns (bool) {
        balances[tokenTypeId][to] += amount;
        return true;
    }

    function burn(address from, uint256 amount, uint256 tokenTypeId) external onlyRole(BRIDGE_ROLE) returns (bool) {
        require(balances[tokenTypeId][from] >= amount, "Insufficient balance");
        balances[tokenTypeId][from] -= amount;
        return true;
    }

    function lock(address from, address to, uint256 amount, uint256 tokenTypeId) external onlyRole(BRIDGE_ROLE) returns (bool) {
        require(balances[tokenTypeId][from] >= amount, "Insufficient balance");
        balances[tokenTypeId][from] -= amount;
        balances[tokenTypeId][to] += amount;
        return true;
    }

    function unlock(address from, address to, uint256 amount, uint256 tokenTypeId) external onlyRole(BRIDGE_ROLE) returns (bool) {
        require(balances[tokenTypeId][from] >= amount, "Insufficient balance");
        balances[tokenTypeId][from] -= amount;
        balances[tokenTypeId][to] += amount;
        return true;
    }

    function assign(address to, uint256 amount, uint256 tokenTypeId) external onlyRole(BRIDGE_ROLE) returns (bool) {
        require(balances[tokenTypeId][msg.sender] >= amount, "Insufficient bridge balance");
        balances[tokenTypeId][msg.sender] -= amount;
        balances[tokenTypeId][to] += amount;
        return true;
    }

    function supportsInterface(bytes4) public pure override returns (bool) {
        return false;
    }
}
