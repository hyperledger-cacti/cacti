// SPDX-License-Identifier: GP-3.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ITraceableContract.sol";

error noPermission(address adr);

abstract contract SATPContract is AccessControl, ERC721, ITraceableContract {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    string public id;

    constructor(address _owner, string memory _id) ERC721("SATPNFToken", "SATPNFT") {
        _grantRole(OWNER_ROLE, _owner);
        _grantRole(BRIDGE_ROLE, _owner);

        id = _id;
    }

    function mint(address account, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        uint256 tokenId = amount;
        _safeMint(account, tokenId);
        return true;
    }

    function burn(address account, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        uint256 tokenId = amount;
        address tokenOwner = _ownerOf(tokenId);
        _checkAuthorized(tokenOwner, account, tokenId);
        _burn(tokenId);
    }

    function assign(address from, address recipient, uint256 amount) external onlyRole(BRIDGE_ROLE) returns (bool success) {
        uint256 tokenId = amount;
        require(from == _msgSender(), "The msgSender is not the owner");
        _transfer(from, recipient, tokenId);
        return true;
    }

    //function transfer(from, recipient, amount) {}

    //function hasPermission(account) {}

    function supportsInterface(interfaceId) {
        return false
    }
}
