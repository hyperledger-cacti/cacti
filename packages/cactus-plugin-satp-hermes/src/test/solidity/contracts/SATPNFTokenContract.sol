// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ITraceableContract.sol";
import { console } from "forge-std/console.sol";

error noPermission(address adr);

contract SATPNFTokenContract is AccessControl, ERC721 {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    constructor(address _owner) ERC721("SATPNFToken", "SATPNFT") {
        _grantRole(OWNER_ROLE, _owner);
        _grantRole(BRIDGE_ROLE, _owner);
    }

    function mint(address account, uint256 tokenId) external returns (bool success) {
        _mint(account, tokenId);
        return true;
    }

    function burn(uint256 tokenId) external returns (bool success) {
        _burn(tokenId);
        return true;
    }
    function grantBridgeRole(address account) external onlyRole(OWNER_ROLE) returns (bool success) {
        _grantRole(BRIDGE_ROLE, account);
        return true;
    }

    function lock(address from, address to, uint256 tokenId) external returns (bool success) {
        _transfer(from, to, tokenId);
        return true;
    }

    function assign(address to, uint256 tokenId) external returns (bool success) {
        _transfer(ownerOf(tokenId), to, tokenId);
        //_mint(to, tokenId);
        return true;
    }

    function unlock(address from, address to, uint256 tokenId) external returns (bool success) {
        _transfer(from, to, tokenId);
        return true;
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    } 


    function hasPermissionInternal(address account, uint tokenId) internal returns (bool success) {
        address tokenOwner = _ownerOf(tokenId);
    }

    function hasPermission(address account, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        address tokenOwner = _ownerOf(tokenId);
        _checkAuthorized(tokenOwner, account, tokenId);
        return true;
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl, ERC721) returns (bool) {
        return true;
    }

    function hasBridgeRole(address account) external view returns (bool success) {
        if(hasRole(BRIDGE_ROLE, account)){
            return true;
        }     
        revert noPermission(account);
    }

    function obtainBalance(address account) external view returns (uint256 balance) {
        uint256 b = balanceOf(account);
        console.log(b);
        return b;
    }
}
