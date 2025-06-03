// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ITraceableContract.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import { console } from "forge-std/console.sol";

/**
 * @dev Enum for the supported token types.
 */
enum TokenType { UNSPECIFIED, ERC20, ERC721, ERC1155, OTHER, NONSTANDARD_FUNGIBLE, NONSTANDARD_NONFUNGIBLE } //TODO: FIX THIS ENUM TO BE THE SAME OF THE BRIDGE
/**
 * @dev Enum for the supported interaction types.
 */
enum InteractionType { MINT, BURN, ASSIGN, CHECKPERMITION, LOCK, UNLOCK, APPROVE }
/**
 * @dev Enum representing the supported variable types used for contract-to-contract calls.
 */
enum VarType {CONTRACTADDRESS, TOKENTYPE, TOKENID, OWNER, AMOUNT, BRIDGE, RECEIVER, UNIQUEDESCRIPTOR}
 

/**
 * @dev Struct representing a token.
 *
 * @param contractAddress The address of the token contract.
 * @param tokenType The type of the token.
 * @param tokenId The unique identifier of the token.
 * @param owner The owner of the token.
 * @param amount The amount of the token currently held by the bridge.
 */
struct Token {
    string contractName;
    address contractAddress;
    TokenType tokenType;
    string tokenId;
    string referenceId;
    address owner;
    uint tokenAttribute; //amount that is approved by the contract owner OR unique token ID
    //uint locked_amount; //amount that is approved by the contract owner
}

/**
 * @dev Struct that represents the signature of an interaction for contract-to-contract calls.
 *
 * @param interactionType The type of the interaction.
 * @param functionsSignature The signature of the functions to be called. EG: ["mint(uint256)", "burn(uint256)"]
 * @param variables The variables to be passed to the functions, e.g., [[VarType.AMOUNT], [VarType.OWNER]]. These enum variables are placeholders that will be replaced by actual values from the Token struct.
 * @param available A flag indicating whether the interaction is available.
 */
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

error TokenTypeNotSupported(string tokenId);


/**
 * @title SATPWrapper
 * 
 * This contract serves as a wrapper for the Secure Asset Transfer Protocol (SATP) using the Hermes plugin.
 * It provides functionalities to interact with the SATP protocol within the Cactus framework.
 * This contract provides a semantic layer to facilitate interactions with other contracts.
 *
 * @notice Ensure that the contract is deployed and configured correctly before interacting with it.
 */
contract SATPWrapperContract is Ownable, ITraceableContract{

    /**
     * Maping of token IDs to Token structs.
     */
    mapping (string  => Token) public tokens; 
    mapping (uint256 => bool) internal nft_ids;

    /**
     * Mapping of token IDs to InteractionSignature structs.
     */
    mapping (string => mapping(InteractionType => InteractionSignature)) public tokensInteractions;

    string[] ids;

    /** 
     * The address of the bridge contract.
     * TODO: Change this to the Token Struct
     */
    address public bridge_address;

    event Wrap(string indexed tokenId, string contractName, address contractAddress, TokenType tokenType, address owner);
    event Unwrap(string indexed tokenId);
    event Lock(string indexed tokenId, uint256 tokenAttribute);
    event Unlock(string indexed tokenId, uint256 tokenAttribute);
    event Mint(string indexed tokenId, uint256 tokenAttribute);
    event Burn(string indexed tokenId, uint256 tokenAttribute);
    event Assign(string indexed tokenId, address receiver_account, uint256 tokenAttribute);


    /**
     * Constructor for the SATPWrapperContract.
     * @param _bridge_address The address of the bridge contract. This needs to be changed, maybe the owner should not be a bridge but other account.
     */
    constructor(address _bridge_address)  Ownable(_bridge_address) {
        bridge_address = address(_bridge_address);
    }


    /**
     * Wraps a token with the given parameters.
     * Given interactions will call a method that creates the ontology of the token so the other methods (eg. lock, unlock, mint, burn, assign) can interact with the token.
     * This interactions should be given by the bridge and be througly tested and checked before being used, as they can be used to call any function in the token contract.
     * @param contractAddress The address of the token contract.
     * @param tokenType The type of the token.
     * @param tokenId The unique identifier of the token.
     * @param owner The owner of the token.
     * @param interactions The interactions to be used for the token.
     */
    function wrap(string memory contractName, address contractAddress, TokenType tokenType, string memory tokenId, string memory referenceId, address owner, InteractionSignature[] memory interactions ) external onlyOwner returns (bool wrapSuccess) {
        if(tokens[tokenId].contractAddress != address(0)) {
            revert TokenAlreadyWrapped(tokenId);
        }

        //TODO if the tokens are standard (eg. ERC20, ERC721...) use the standard interactions
        createNonStandardTokenOntology(tokenId, interactions);

        if(tokensInteractions[tokenId][InteractionType.CHECKPERMITION].available) {
            require(interact(tokenId, InteractionType.CHECKPERMITION), "Contract does not have permission to interact with the token");
        }

        tokens[tokenId] = Token(contractName, contractAddress, tokenType, tokenId, referenceId, owner, 0);
    
        ids.push(tokenId);
        
        emit Wrap(tokenId, contractName, contractAddress, tokenType, owner);
        return true;
    }

    /**
     * Overloaded wrap method that does not receive interactions. This can be used for non-standard tokens.
     * TODO: Implement that functionality for standard tokens. 
     */
    function wrap(string memory contractName,  address contractAddress, TokenType tokenType, string memory tokenId, string memory referenceId, address owner) external onlyOwner returns (bool wrapSuccess) {
        return this.wrap(contractName, contractAddress, tokenType, tokenId, referenceId, owner, new InteractionSignature[](0));
    }

    /**
     * Unwraps a token with the given token ID. This method deletes the token from the mapping and the array of token IDs. (Should they be deleted from the array?)
     * @param tokenId The unique identifier of the token.
     */
    function unwrap(string memory tokenId) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)) {
            revert TokenNotAvailable(tokenId);
        }

        TokenType tt = tokens[tokenId].tokenType;

        if(tt == TokenType.NONSTANDARD_FUNGIBLE || tt == TokenType.ERC20) {
            if(tokens[tokenId].tokenAttribute > 0) {
                revert TokenLocked(tokenId);
            }
        }
        else if(tt == TokenType.NONSTANDARD_NONFUNGIBLE || tt == TokenType.ERC721) {
            if(tokens[tokenId].tokenAttribute != 0) {
                revert TokenLocked(tokenId);
            }
        }
        else {
            revert TokenTypeNotSupported(tokenId);
        }
        
        deleteFromArray(tokens[tokenId].tokenId);
        delete tokens[tokenId];

        emit Unwrap(tokenId);
        return true;
    }

    /**
     * Locks a given amount of tokens with the given token ID. This method calls the lock function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The amount of tokens to be locked.
     */
    function lock(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }

        bool lockSuccess = interact(tokenId, InteractionType.LOCK, assetAttribute);
        if(lockSuccess) {
            console.log("lock executed successfully on token contract");
            TokenType tt = tokens[tokenId].tokenType;
            if (tt == TokenType.ERC20 || tt == TokenType.NONSTANDARD_FUNGIBLE) {
                tokens[tokenId].tokenAttribute += assetAttribute;
                emit Lock(tokenId, assetAttribute);
                return true;
            }
            else if (tt == TokenType.ERC721 || tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
                tokens[tokenId].tokenAttribute = assetAttribute;
                emit Lock(tokenId, assetAttribute);
                return true;
            }
        }
        revert TokenNotLocked(tokenId);
    } 

    /**
     * Unlocks a given amount of tokens with the given token ID. This method calls the unlock function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The amount of tokens to be unlocked.
     */
    function unlock(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.ERC20 || tt == TokenType.NONSTANDARD_FUNGIBLE) {
            if(tokens[tokenId].tokenAttribute < assetAttribute) {
                revert InsuficientAmountLocked(tokenId, assetAttribute);
            }
            require(interact(tokenId, InteractionType.UNLOCK, assetAttribute), "Unlocking amount as failed");
            tokens[tokenId].tokenAttribute -= assetAttribute;
            emit Unlock(tokenId, assetAttribute);
            return true;
        }
        else if (tt == TokenType.ERC721 || tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            require(tokens[tokenId].tokenAttribute != 0, "Trying to Unlock an asset that is not locked");
            require(tokens[tokenId].tokenAttribute == assetAttribute, "Unlocking NFT cannot be done due to wrong uniqueID");
            require(interact(tokenId, InteractionType.UNLOCK, assetAttribute), "Unlocking NFT failed");
            emit Unlock(tokenId, assetAttribute);
            return true;
        }
        revert TokenNotUnlocked(tokenId);
    } 

    /**
     * Mints a given amount of tokens with the given token ID. This method calls the mint function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The amount of tokens to be minted.
     */
    function mint(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(interact(tokenId, InteractionType.MINT, assetAttribute) , "mint asset call failed");

        tokens[tokenId].tokenAttribute = assetAttribute;
        emit Mint(tokenId, assetAttribute);
        return true;
    }

    /**
     * Burns a given amount of tokens with the given token ID. This method calls the burn function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The amount of tokens to be burned.
     */
    function burn(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.ERC20 || tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(tokens[tokenId].tokenAttribute >= assetAttribute, "Burning more assets than locked quantity");
            require(interact(tokenId, InteractionType.BURN, assetAttribute), "burn asset call failed");
            tokens[tokenId].tokenAttribute -= assetAttribute;
            emit Burn(tokenId, assetAttribute);
            return true;
        }
        else if (tt == TokenType.ERC721 || tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            require(tokens[tokenId].tokenAttribute != 0, "Burning unminted asset");
            require(tokens[tokenId].tokenAttribute == assetAttribute, "Burning NFT failed due to UniqueID missmatch");
            require(interact(tokenId, InteractionType.BURN, assetAttribute), "burn asset call failed");
            tokens[tokenId].tokenAttribute = 0;
            emit Burn(tokenId, assetAttribute);
            return true;
        }       
    }
    

    /**
     * Assigns a given amount of tokens with the given token ID to a receiver account. This method calls the assign function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param receiver_account The address of the receiver account.
     * @param assetAttribute The amount of tokens to be assigned.
     */
    function assign(string memory tokenId, address receiver_account, uint256 assetAttribute) external onlyOwner returns (bool success) {
        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.ERC20 || tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(tokens[tokenId].tokenAttribute >= assetAttribute, "Assigning more assets than those locked");
            require(interact(tokenId, InteractionType.ASSIGN, assetAttribute, receiver_account), "assign asset call failed");

            tokens[tokenId].tokenAttribute -= assetAttribute;
            
            emit Assign(tokenId, receiver_account, assetAttribute);
            return true;
        }
        else if (tt == TokenType.ERC721 || tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            require(tokens[tokenId].tokenAttribute == assetAttribute, "Assign nft - asset is not locked");
            require(interact(tokenId, InteractionType.ASSIGN, assetAttribute, receiver_account), "assign nft call failed");
            tokens[tokenId].tokenAttribute = 0;
            
            emit Assign(tokenId, receiver_account, assetAttribute);
            return true;
        }
    }

    /**
     * Gets all the token IDs.
     * @return An array of token IDs.
     */
    function getAllAssetsIDs() external view returns (string[] memory) {
        return ids;
    }

    /**
     * Deletes a token from the array of token IDs.
     * @param id The unique identifier of the token.
     */
    function deleteFromArray(string memory id) internal  {
        for (uint256 i = 0; i < ids.length; i++) {
            if (Strings.equal(ids[i], id)) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                break;
            }
        }
    }

    /**
     * Gets a token with the given token ID.
     * @param tokenId The unique identifier of the token.
     * @return token the token with the given token ID.
     */
    function getToken(string memory tokenId) view public returns (Token memory token) {
        return tokens[tokenId];
    }

    //function balanceOf() {}

    /**
     * Creates the ontology of a non-standard token with the given token ID and interactions.
     * @param tokenId The unique identifier of the token.
     * @param interactions The interactions to be used for the token.
     */
    function createNonStandardTokenOntology(string memory tokenId, InteractionSignature[] memory interactions) internal returns (bool success){
        for(uint i = 0; i < interactions.length; i++) {
            tokensInteractions[tokenId][interactions[i].interactionType] = interactions[i];
        }
        return true;
    }

    /**
     * Interacts with the token contract using the given token ID and interaction type.
     * @param tokenId The unique identifier of the token.
     * @param interactionType The type of the interaction.
     */
    function interact(string memory tokenId, InteractionType interactionType)  internal returns (bool success) {
        return interact(tokenId, interactionType, 0, address(0));
    }

    /**
     * Interacts with the token contract using the given token ID, interaction type, and amount.
     * @param tokenId The unique identifier of the token.
     * @param interactionType The type of the interaction.
     * @param assetAttribute The amount of tokens to be interacted with.
     */
    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute) internal returns (bool success) {
        return interact(tokenId, interactionType, assetAttribute, address(0));
    }

    /**
     * Interacts with the token contract using the given token ID, interaction type, amount, and receiver account.
     * This function allows modular interactions by dynamically calling contract functions based on the stored interactions. 
     * To mitigate the risk of attacks, this method only allows the usage of known variables and only variables that are assigned to the specific token.
     * @param tokenId The unique identifier of the token.
     * @param interactionType The type of the interaction.
     * @param assetAttribute The amount of tokens to be interacted with.
     * @param receiver The address of the receiver account.
     */
    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute, address receiver) internal returns (bool) {
        if (!tokensInteractions[tokenId][interactionType].available) {
            return false;
        }
        for (uint i = 0; i < tokensInteractions[tokenId][interactionType].functionsSignature.length; i++) {
            bytes4 functionSelector = bytes4(keccak256(abi.encodePacked(tokensInteractions[tokenId][interactionType].functionsSignature[i])));
            bytes memory encodedParams = encodeDynamicParams(functionSelector, encodeParams(tokensInteractions[tokenId][interactionType].variables[i], tokenId, receiver, assetAttribute));

            (bool callSuccess, ) = tokens[tokenId].contractAddress.call(encodedParams);
            if (!callSuccess) {
                return false;
            }
        } 
        return true;
    }

    /**
     * Encodes the dynamic parameters for the contract-to-contract calls. This function adds the function selector to the encoded parameters.
     * @param functionSelector The function selector.
     * @param dynamicParams The dynamic parameters.
     */
    function encodeDynamicParams(bytes4 functionSelector, bytes[] memory dynamicParams) internal pure returns (bytes memory encodedParams) {
        encodedParams = abi.encodePacked(functionSelector);
        for (uint256 i = 0; i < dynamicParams.length; i++) {
            encodedParams = abi.encodePacked(encodedParams, dynamicParams[i]);
        }
        return encodedParams;
    }

    /**
     * Encodes the parameters for the contract-to-contract calls.
     * This functions replaces the enum variables with the actual values from the Token struct.
     * @param variables The variables to be encoded.
     * @param tokenId The unique identifier of the token.
     * @param receiver The address of the receiver account.
     * @param assetAttribute The amount of tokens to be encoded.
     */
    function encodeParams(VarType[] memory variables, string memory tokenId, address receiver, uint256 assetAttribute)  internal view returns (bytes[] memory){
        bytes[] memory dynamicParams = new bytes[](variables.length);
        for (uint i = 0; i < variables.length; i++) {
            if (variables[i] == VarType.BRIDGE) {
                dynamicParams[i] = abi.encode(address(this));
            } else if (variables[i] == VarType.TOKENID) {
                dynamicParams[i] = abi.encode(tokenId);
            } else if (variables[i] == VarType.AMOUNT) {
                dynamicParams[i] = abi.encode(assetAttribute);
            } else if (variables[i] == VarType.OWNER) {
                dynamicParams[i] = abi.encode(tokens[tokenId].owner);
            } else if (variables[i] == VarType.CONTRACTADDRESS) {
                dynamicParams[i] = abi.encode(tokens[tokenId].contractAddress);
            } else if (variables[i] == VarType.RECEIVER) {
                dynamicParams[i] = abi.encode(receiver);
            } else if (variables[i] == VarType.UNIQUEDESCRIPTOR) {
                dynamicParams[i] = abi.encode(assetAttribute);
            } else {
                revert("Variable not supported");
            }
        }
        return dynamicParams;
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    } 
}

