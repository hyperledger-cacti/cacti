// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ITraceableContract.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

enum TokenType { ERC20, ERC721, ERC1155, OTHER }
enum InteractionType { MINT, BURN, ASSIGN, CHECKPERMITION, LOCK, UNLOCK }
enum VarType {CONTRACTADDRESS, TOKENTYPE, TOKENID, OWNER, AMOUNT, BRIDGE, RECEIVER}
 
struct Token {
    address contractAddress;
    TokenType tokenType;
    string tokenId;
    address owner;
    uint amount; //ammount that is approved by the contract owner 
}


struct InteractionSignature {
    InteractionType interactionType;
    string[] functionsSignature;
    VarType[][] variables;
    bool available;
}

error TokenNotAvailable(string tokenId);

error TokenAlreadyWrapped(string tokenId);

error TokenNotLocked(string tokenId);

error TokenLocked(string tokenId);

error TokenNotUnlocked(string tokenId);

error InsuficientAmountLocked(string tokenId, uint256 amount);

contract SATPWrapperContract is Ownable, ITraceableContract{

    mapping (string  => Token) public tokens; //contract address to Token

    mapping (string => mapping(InteractionType => InteractionSignature)) public tokensInteractions;

    string[] ids;

    address public bridge_address;

    event Wrap(string indexed tokenId, address contractAddress, TokenType tokenType, address owner);
    event Unwrap(string indexed tokenId);
    event Lock(string indexed tokenId, uint256 amount);
    event Unlock(string indexed tokenId, uint256 amount);
    event Mint(string indexed tokenId, uint256 amount);
    event Burn(string indexed tokenId, uint256 amount);
    event Assign(string indexed tokenId, address receiver_account, uint256 amount);

    constructor(address _bridge_address)  Ownable(_bridge_address) {
        bridge_address = address(_bridge_address);
    }

    function wrap(address contractAddress, TokenType tokenType, string memory tokenId, address owner, InteractionSignature[] memory interactions ) external onlyOwner returns (bool wrapSuccess) {
        if(tokens[tokenId].contractAddress != address(0)) {
            revert TokenAlreadyWrapped(tokenId);
        }

        createNonStandardTokenOntology(tokenId, interactions);

        if(tokensInteractions[tokenId][InteractionType.CHECKPERMITION].available) {
            require(interact(tokenId, InteractionType.CHECKPERMITION), "Contract does not have permission to interact with the token");
        }

        tokens[tokenId] = Token(contractAddress, tokenType, tokenId, owner, 0);
    
        ids.push(tokenId);
        
        emit Wrap(tokenId, contractAddress, tokenType, owner);
        return true;
    }

    function wrap(address contractAddress, TokenType tokenType, string memory tokenId, address owner) external onlyOwner returns (bool wrapSuccess) {
        return this.wrap(contractAddress, tokenType, tokenId, owner, new InteractionSignature[](0));
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

        bool lockSuccess = interact(tokenId, InteractionType.LOCK, amount);

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

        bool unlockSuccess = interact(tokenId, InteractionType.UNLOCK, amount);

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
        
        require(interact(tokenId, InteractionType.MINT, amount) , "mint asset call failed");

        tokens[tokenId].amount = amount;
        emit Mint(tokenId, amount);
        return true;
    }

    function burn(string memory tokenId, uint256 amount) external onlyOwner returns (bool success) {
        require(tokens[tokenId].amount >= amount, "burn asset asset is not locked");

        require(interact(tokenId, InteractionType.BURN, amount), "burn asset call failed");

        tokens[tokenId].amount -= amount;

        emit Burn(tokenId, amount);
        return true;
    }

    function assign(string memory tokenId, address receiver_account, uint256 amount) external onlyOwner returns (bool success) {
        require(tokens[tokenId].amount >= amount, "assign asset asset is not locked");

        require(interact(tokenId, InteractionType.ASSIGN, amount, receiver_account), "assign asset call failed");

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

    function createNonStandardTokenOntology(string memory tokenId, InteractionSignature[] memory interactions) internal {
        for(uint i = 0; i < interactions.length; i++) {
            tokensInteractions[tokenId][interactions[i].interactionType] = interactions[i];
        }
    }

    function interact(string memory tokenId, InteractionType interactionType)  internal returns (bool success) {
        return interact(tokenId, interactionType, 0, address(0));
    }

    function interact(string memory tokenId, InteractionType interactionType, uint256 amount) internal returns (bool success) {
        return interact(tokenId, interactionType, amount, address(0));
    }

    function interact(string memory tokenId, InteractionType interactionType, uint256 amount, address receiver) internal returns (bool) {
        if (!tokensInteractions[tokenId][interactionType].available) {
            return false;
        }

        for (uint i = 0; i < tokensInteractions[tokenId][interactionType].functionsSignature.length; i++) {
            bytes4 functionSelector = bytes4(keccak256(abi.encodePacked(tokensInteractions[tokenId][interactionType].functionsSignature[i])));

            bytes memory encodedParams = encodeDynamicParams(functionSelector, encodeParams(tokensInteractions[tokenId][interactionType].variables[i], tokenId, receiver, amount));

            (bool callSuccess, ) = tokens[tokenId].contractAddress.call(encodedParams);
            if (!callSuccess) {
                return false;
            }
        }
        
        return true;
        }

    function encodeDynamicParams(bytes4 functionSelector, bytes[] memory dynamicParams) internal pure returns (bytes memory encodedParams) {
        encodedParams = abi.encodePacked(functionSelector);
        for (uint256 i = 0; i < dynamicParams.length; i++) {
            encodedParams = abi.encodePacked(encodedParams, dynamicParams[i]);
        }
        return encodedParams;
    }

    function encodeParams(VarType[] memory variables, string memory tokenId, address receiver, uint256 amount)  internal view returns (bytes[] memory){
        bytes[] memory dynamicParams = new bytes[](variables.length);
        for (uint i = 0; i < variables.length; i++) {
            if (variables[i] == VarType.BRIDGE) {
                dynamicParams[i] = abi.encode(address(this));
            } else if (variables[i] == VarType.TOKENID) {
                dynamicParams[i] = abi.encode(tokenId);
            } else if (variables[i] == VarType.AMOUNT) {
                dynamicParams[i] = abi.encode(amount);
            } else if (variables[i] == VarType.OWNER) {
                dynamicParams[i] = abi.encode(tokens[tokenId].owner);
            } else if (variables[i] == VarType.CONTRACTADDRESS) {
                dynamicParams[i] = abi.encode(tokens[tokenId].contractAddress);
            } else if (variables[i] == VarType.RECEIVER) {
                dynamicParams[i] = abi.encode(receiver);
            } else {
                revert("Variable not supported");
            }
        }
        return dynamicParams;
    }
}