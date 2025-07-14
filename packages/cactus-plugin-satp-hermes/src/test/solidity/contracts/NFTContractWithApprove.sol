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

    function mint(address account, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        //require (!_exists(tokenId), "Abort minting: token with a duplicated Id");
        _safeMint(account, tokenId);
        return true;
    }

    function burn(uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        //require(_exists(tokenId), "Abort burning: unknown or inexistent tokenId");
        address tokenOwner = _ownerOf(tokenId);
        _checkAuthorized(tokenOwner, _msgSender(), tokenId);
        _burn(tokenId);
        return true;
    }

    function approveAsset(address recipient, uint256 tokenId) external returns (bool success) {
        require(_msgSender() == _ownerOf(tokenId), "Address not owning the token trying to assign it");
        _approve(recipient, tokenId, _ownerOf(tokenId));
        return true;
    }

    function grantBridgeRole(address account) external onlyRole(OWNER_ROLE) returns (bool success) {
        _grantRole(BRIDGE_ROLE, account);
        return true;
    }

    function lock(address from, address to, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        console.log("\nLOCKING AN NFT\n");
        console.log(_ownerOf(tokenId));
        console.log("from");
        console.log(from);
        require(_ownerOf(tokenId) == from, "Using the incorrect owner address");
        _safeTransfer(from, to, tokenId);
        return true;
    }

    function bridgeTransferFrom(address from, address to, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        //require(_ownerOf(tokenId) == from, "Using the incorrect owner address");
        _safeTransfer(from, to, tokenId);
        return true;
    }

    function transfer(address to, uint256 tokenId) external returns (bool success) {
        _transfer(_msgSender(), to, tokenId);
        return true;
    }

    function unlock(address to, uint256 tokenId) external returns (bool success) {
        require(_ownerOf(tokenId) == _msgSender(), "Using the incorrect owner address");
        _safeTransfer(_msgSender(), to, tokenId);
        return true;
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    } 

    //function transfer_From(address from, address recipient, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        //require(from != address(0) && recipient != address(0), "Both addresses should be different from 0");
        //if (_msgSender() != from) {
            //require()
        //}
        //return false;
    //}

    function checkAssignment(address spender, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        address tokenOwner = _ownerOf(tokenId);
        require(_msgSender() != tokenOwner, "Performing an assignment check on the token owner"); //This is mostly to guarantee on testing that the owner of the token does not change
        require(_isAuthorized(tokenOwner, spender, tokenId), "Spender not authorized to act on token");
        return true;
    }

    function hasPermissionInternal(address account, uint tokenId) internal returns (bool success) {
        address tokenOwner = _ownerOf(tokenId);
    }

    function hasPermission(address account, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        //require(_exists(tokenId), "Check Permission failed: Unknown or inexistent tokenId");
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
}
