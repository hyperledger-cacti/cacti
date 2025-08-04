// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ITraceableContract.sol";
import { console } from "forge-std/console.sol";

error noPermission(address adr);

/**
 * @title SATPTokenContract
 * The SATPTokenContract is an example of a custom ERC721 token contract.
 * It uses safe versions of critical ERC721 functions, which require the address performing calls to tokens to have some form of pre approval.
 */
contract SATPNFTokenContract is AccessControl, ERC721 {

    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    constructor(address _owner) ERC721("SATPNFToken", "SATPNFT") {
        _grantRole(OWNER_ROLE, _owner);
        _grantRole(BRIDGE_ROLE, _owner);
    }

    /**
     * @notice Mints a new token given a new uniqueDescriptor. This function expects the tokenId to not have been minted before.
     * @param account The address to mint the token to.
     * @param uniqueDescriptor The uniqueDescriptor of the token to mint.
     * @return success A boolean indicating the success of the minting operation.
     */
    function mint(address account, uint256 uniqueDescriptor) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        _safeMint(account, uniqueDescriptor);
        return true;
    }

    /**
     * @notice Burns a token given its uniqueDescriptor.
     * @param uniqueDescriptor The unique identifier of the token to burn.
     * @return success A boolean indicating the success of the burn operation.
     */
    function burn(uint256 uniqueDescriptor) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        address caller = msg.sender;
        address approvedCaller = getApproved(uniqueDescriptor);
        require(caller == approvedCaller || caller == ownerOf(uniqueDescriptor), "Caller is not approved to operate on this token");
        _burn(uniqueDescriptor);        
        return true;
    }

    /**
     * @notice Grants the bridge role to a specified account over this contract.
     * @param account The address to grant the bridge role to.
     * @return success A boolean indicating the success of the operation.
     */
    function grantBridgeRole(address account) external onlyRole(OWNER_ROLE) returns (bool success) {
        _grantRole(BRIDGE_ROLE, account);
        return true;
    }

    /**
     * @notice Transfers a token from an address to another address. In this case, it is used when locking a token.
     * @param from The origin address of the token.
     * @param to The address to transfer the token to.
     * @param uniqueDescriptor The unique identifier of the token to lock/transfer.
     * @return success A boolean indicating if the operation was successful.
     */
    function lock(address from, address to, uint256 uniqueDescriptor) external returns (bool success) {
        safeTransferFrom(from, to, uniqueDescriptor);
        return true;
    }

    /**
     * @notice Assigns a token to a new owner. This is used when transferring ownership of a token.
     * @param to The address to assign the token to.
     * @param uniqueDescriptor The unique identifier of the token to assign.
     * @return success A boolean indicating if the operation was successful.
     */
    function assign(address to, uint256 uniqueDescriptor) external returns (bool success) {
        safeTransferFrom(ownerOf(uniqueDescriptor), to, uniqueDescriptor);
        return true;
    }

    /**
     * @notice Transfers a token from one address to another. This is used when releasing a locked token.
     * @param from The address from which the token is being transferred.
     * @param to The address to which the token is being transferred.
     * @param uniqueDescriptor The unique identifier of the token to unlock.
     * @return success A boolean indicating if the operation was successful.
     */
    function unlock(address from, address to, uint256 uniqueDescriptor) external returns (bool success) {
        safeTransferFrom(from, to, uniqueDescriptor);
        return true;
    }

    /**
     * @notice REQUIRED by OpenZeppelin: Supports the use of safe functions for ERC721 tokens.
     * @return success A boolean indicating if the account has the bridge role.
     */
    function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
) external pure returns (bytes4) {
    return this.onERC721Received.selector;
}
    /**
     * @notice Checks if the given account has permission to perform an action on a token.
     * @param account The account to check for permission.
     * @param uniqueDescriptor The unique identifier of the token.
     * @return success A boolean indicating if the account has permission.
     */
    function hasPermission(address account, uint256 uniqueDescriptor) external view onlyRole(BRIDGE_ROLE) returns (bool success) {
        address tokenOwner = _ownerOf(uniqueDescriptor);
        _checkAuthorized(tokenOwner, account, uniqueDescriptor);
        return true;
    }

    /**
     * @notice For test usage, allows the bridge to check if a certain address is the one currently approved to deal with an asset.
     * @param account The account to check for approval.
     * @param uniqueDescriptor The unique identifier of the token.
     * @return success A boolean indicating if the account is approved.
     */
    function isApproved(address account, uint256 uniqueDescriptor) external view onlyRole(BRIDGE_ROLE) returns (bool success) {
        address approvedCaller = getApproved(uniqueDescriptor);
        return (account == approvedCaller || account == ownerOf(uniqueDescriptor));
    }

    /**
     * @notice REQUIRED by OpenZeppelin: Returns true if this contract implements a certain interface represented by an interfaceId.
     * @return success A boolean indicating if the interface is supported.
     */
    function supportsInterface(bytes4) public pure override(AccessControl, ERC721) returns (bool success) {
        return false;
    }

    /**
     * @notice Checks if the given account has the given role.
     * @param account The account to check.
     * @return success A boolean that indicates if the account has the role.
     */
    function hasBridgeRole(address account) external view returns (bool success) {
        if(hasRole(BRIDGE_ROLE, account)){
            return true;
        }     
        revert noPermission(account);
    }

    /**
     * @notice Obtains the balance of the given account.
     * @param account The account to check the balance of.
     * @return balance The balance of the account.
     */
    function obtainBalance(address account) external view returns (uint256 balance) {
        uint256 b = balanceOf(account);
        return b;
    }
}