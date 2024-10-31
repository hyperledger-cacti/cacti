// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ITraceableContract.sol";

import "./satp-contract-interface.sol";

error noPermission(address adr);

/**
 * @title SATPContract
 * The SATPContract is a example costum ERC20 token contract that implements the SATPContractInterface.
 */
contract SATPContract is AccessControl, ERC20, ITraceableContract, SATPContractInterface {

    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    string public id;

    constructor(address _owner, string memory _id) ERC20("SATPToken", "SATP") {
        _grantRole(OWNER_ROLE, _owner);
        _grantRole(BRIDGE_ROLE, _owner);

        id = _id;
    }

    /**
     * @notice Mint creates new tokens with the given amount and assigns them to the owner.
     * @param account The account that will receive the minted tokens.
     * @param amount The amount of tokens to mint.
     * @return success A boolean that indicates if the operation was successful.
     */
    function mint(address account, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        _mint(account, amount);
        return true;
    }

    /**
     * @notice Burn destroys the given amount of tokens from the owner.
     * @param account The account that will have the tokens burned.
     * @param amount The amount of tokens to burn.
     * @return success A boolean that indicates if the operation was successful.
     */
    function burn(address account, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        _burn(account, amount);
        return true;
    }

    /**
     * @notice Assign assigns the given amount of tokens from the owner to the target, without approval.
     * @param from The account that will transfer the tokens.
     * @param recipient The account that will receive the tokens.
     * @param amount The amount of tokens to transfer.
     * @return success A boolean that indicates if the operation was successful.
     */
    function assign(address from, address recipient, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        require(from == _msgSender(), "The msgSender is not the owner");
        _transfer(from, recipient, amount);
        return true;
    }

    /**
     * @notice Transfer transfers the given amount of tokens from the sender to the target, with approval needed.
     * @param from The account that will transfer the tokens.
     * @param recipient The account that will receive the tokens.
     * @param amount The amount of tokens to transfer.
     * @return success A boolean that indicates if the operation was successful.
     */
    function transfer(address from, address recipient, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        transferFrom(from, recipient, amount);
        return true;
    }

    /**
     * @notice Checks if the given account has the given role.
     * @return success A boolean that indicates if the account has the role.
     */
    function getAllAssetsIDs() external view returns (string[] memory) {
        string[] memory myArray = new string[](1);
        myArray[0] = id;
        return myArray;
    }

    function getId() view public returns (string memory) {
        return id;
    }

    /**
     * @notice Checks if the given account has the given role.
     * @param account The account to check.
     * @return success A boolean that indicates if the account has the role.
     */
    function giveRole(address account) external onlyRole(OWNER_ROLE) returns (bool success) {
        _grantRole(BRIDGE_ROLE, account);
        return true;
    }
    
    /**
     * @notice Checks if the given account has the given role.
     * @param account The account to check.
     * @return success A boolean that indicates if the account has the role.
     */
    function hasPermission(address account) external view returns (bool success) {
        if(hasRole(BRIDGE_ROLE, account)){
            return true;
        }     
        revert noPermission(account);
    }

    /**
     * @notice Checks the balance of the given account.
     * @param account The account to check.
     * @return balance The balance of the account.
     */
    function checkBalance(address account) external view returns (uint256) {
        return balanceOf(account);
    }
}