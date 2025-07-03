// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ITraceableContract.sol";

error noPermission(address adr);

contract SATPNFTokenContract is AccessControl, ERC721 {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    constructor(address _owner) ERC721("SATPNFToken", "SATPNFT") {
        _grantRole(OWNER_ROLE, _owner);
        _grantRole(BRIDGE_ROLE, _owner);
    }

    function mint(address account, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        //require (! _exists(tokenId), "Abort minting: token with a duplicated Id");
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

    function assign(address from, address recipient, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        require(from == _msgSender(), "The msgSender is not the owner");
        _transfer(from, recipient, tokenId);
        return true;
    }

    function grantBridgeRole(address account) external onlyRole(OWNER_ROLE) returns (bool success) {
        _grantRole(BRIDGE_ROLE, account);
        return true;
    }

    //function transfer_From(address from, address recipient, uint256 tokenId) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        //require(from != address(0) && recipient != address(0), "Both addresses should be different from 0");
        //if (_msgSender() != from) {
            //require()
        //}
        //return false;
    //}

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
}
