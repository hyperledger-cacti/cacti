// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ITraceableContract.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

enum TokenType { ERC20, ERC721, ERC1155 }
 
struct Token {
    address contractAddress;
    string tokenType;
    string tokenId;
    address owner;
    uint amount; //ammount that is approved by the contract owner 
}

error TokenNotAvailable(string tokenId);

error TokenAlreadyWrapped(string tokenId);

error TokenNotLocked(string tokenId);

error TokenLocked(string tokenId);

error TokenNotUnlocked(string tokenId);

error InsuficientAmountLocked(string tokenId, uint256 amount);

contract SATPWrapperContract is Ownable, ITraceableContract{

    bytes32 public BRIDGE_ROLE;
    
    mapping (string  => Token) public tokens; //contract address to Token

    string[] ids;

    address public bridge_address;

    event Wrap(address contractAddress, string tokenType, string tokenId, address owner);
    event Unwrap(string tokenId);
    event Lock(string tokenId, uint256 amount);
    event Unlock(string tokenId, uint256 amount);
    event Mint(string tokenId, uint256 amount);
    event Burn(string tokenId, uint256 amount);
    event Assign(string tokenId, address receiver_account, uint256 amount);

    constructor(address _bridge_address, bytes32 role_given)  Ownable(_bridge_address) {
        bridge_address = address(_bridge_address);
        BRIDGE_ROLE = role_given;
    }

    function wrap(address contractAddress, string memory tokenType, string memory tokenId, address owner) external onlyOwner returns (bool wrapSuccess) {
        if(tokens[tokenId].contractAddress != address(0)) {
            revert TokenAlreadyWrapped(tokenId);
        }
    
        (bool hasRoleSuccess, ) = contractAddress.call(abi.encodeWithSignature("hasPermission(bytes32,address)", BRIDGE_ROLE, address(this)));
    
        if(!hasRoleSuccess) {
            revert OwnableUnauthorizedAccount(tokens[tokenId].contractAddress);
        }

        tokens[tokenId] = Token(contractAddress, tokenType, tokenId, owner, 0);
    
        ids.push(tokenId);
        
        emit Wrap(contractAddress, tokenType, tokenId, owner);
        return true;
    }

    function unwrap(string memory tokenId) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)) {
            revert TokenNotAvailable(tokenId);
        }
        if(tokens[tokenId].amount > 0) {
            revert TokenLocked(tokenId);
        }
        deleteFromArray(tokens[tokenId].tokenId);
        delete tokens[tokenId];

        emit Unwrap(tokenId);
        return true;
    }

    function lock(string memory tokenId, uint256 amount) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }

        (bool lockSuccess,) = tokens[tokenId].contractAddress.call(abi.encodeWithSignature("transfer(address,address,uint256)", tokens[tokenId].owner, address(this), amount));

        if(lockSuccess) {
            tokens[tokenId].amount += amount;
            emit Lock(tokenId, amount);
            return true;
        }

        revert TokenNotLocked(tokenId);
    } 

    function unlock(string memory tokenId, uint256 amount) external onlyOwner returns (bool success) { //ammount
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }

        if(tokens[tokenId].amount < amount) {
            revert InsuficientAmountLocked(tokenId, amount);
        }

        (bool successAprov,) = tokens[tokenId].contractAddress.call(abi.encodeWithSignature("approve(address,uint256)", address(this), amount));
        if(!successAprov) {
            revert TokenNotUnlocked(tokenId);
        }

        (bool unlockSuccess,) = tokens[tokenId].contractAddress.call(abi.encodeWithSignature("transfer(address,address,uint256)", address(this), tokens[tokenId].owner, tokens[tokenId].amount));
        if(unlockSuccess) {
            tokens[tokenId].amount -= amount;
            emit Unlock(tokenId, amount);
            return true;
        }

        revert TokenNotUnlocked(tokenId);
    } 

    function mint(string memory tokenId, uint256 amount) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }

        (bool mintSuccess, ) = tokens[tokenId].contractAddress.call(abi.encodeWithSignature("mint(address,uint256)", address(this), amount));
        
        require(mintSuccess, "mint asset call failed");

        tokens[tokenId].amount = amount;
        emit Mint(tokenId, amount);
        return true;
    }

    function burn(string memory tokenId, uint256 amount) external onlyOwner returns (bool success) {
        require(tokens[tokenId].amount >= amount, "burn asset asset is not locked");

        (bool burnSuccess, ) = tokens[tokenId].contractAddress.call(abi.encodeWithSignature("burn(address,uint256)",  address(this), amount));

        require(burnSuccess, "burn asset call failed");

        tokens[tokenId].amount -= amount;

        emit Burn(tokenId, amount);
        return true;
    }

    function assign(string memory tokenId, address receiver_account, uint256 amount) external onlyOwner returns (bool success) {
        require(tokens[tokenId].amount >= amount, "assign asset asset is not locked");

        (bool assignSuccess, ) = tokens[tokenId].contractAddress.call(abi.encodeWithSignature("assign(address,address,uint256)", address(this), receiver_account, amount));
        require(assignSuccess, "assign asset call failed");

        tokens[tokenId].amount -= amount;
        
        emit Assign(tokenId, receiver_account, amount);
        return true;
    }   

        
    function getAllAssetsIDs() external view returns (string[] memory) {
        return ids;
    }

    function deleteFromArray(string memory id) internal  {
        for (uint256 i = 0; i < ids.length; i++) {
            if (Strings.equal(ids[i], id)) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                break;
            }
        }
    }

    function getToken(string memory tokenId) view public returns (Token memory token) {
        return tokens[tokenId];
    }
}