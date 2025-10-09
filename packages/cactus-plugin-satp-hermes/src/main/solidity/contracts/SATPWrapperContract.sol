// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ITraceableContract.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @dev Enum for the supported token types.
 */
enum TokenType { UNSPECIFIED, NONSTANDARD_FUNGIBLE, NONSTANDARD_NONFUNGIBLE }
/**
 * @dev Enum for the supported interaction types.
 */
enum InteractionType { MINT, BURN, ASSIGN, CHECKPERMITION, LOCK, UNLOCK, APPROVE }
/**
 * @dev Enum representing the supported variable types used for contract-to-contract calls.
 */
enum AssetParameterIdentifier {CONTRACTADDRESS, TOKENTYPE, TOKENID, OWNER, AMOUNT, BRIDGE, RECEIVER, UNIQUE_DESCRIPTOR}

/**
 * @dev Enum representing the supported ERC token standards.
 */
enum ERCTokenStandard { UNSPECIFIED, ERC20, ERC721, ERC1155 }
 

/**
 * @dev Struct representing a token.
 *
 * @param contractAddress The address of the token contract.
 * @param tokenType The type of the token.
 * @param tokenId The unique identifier of the token.
 * @param owner The owner of the token.
 * @param amount The amount of the token currently held by the bridge. Its logic differs between fungible and non fungible tokens.
 */
struct Token {
    string contractName;
    address contractAddress;
    TokenType tokenType;
    string tokenId;
    string referenceId;
    address owner;
    uint amount; //amount that is approved by the contract owner. On Fungible tokens, it is the relevant attribute of the token.
    // For non fungible tokens, it holds the amount of different tokens that are held by the wrapper. Yet, the relevant
    // attribute of non fungible tokens is the unique descriptor itself, stored in NFT_IDs.
    //uint locked_amount; //amount that is approved by the contract owner
    ERCTokenStandard ercTokenStandard;
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
    AssetParameterIdentifier[][] variables;
    bool available;
}

error TokenNotAvailable(string tokenId);

error TokenAlreadyWrapped(string tokenId);

error TokenNotLocked(string tokenId);

error TokenLocked(string tokenId);

error TokenNotUnlocked(string tokenId);

error InsuficientAmountLocked(string tokenId, uint256 amount);

error TokenNotSupported(string tokenId);

error TokenAlreadyLocked(string tokenId, uint256 unique_descriptor);


/**
 * @title SATPWrapper
 * 
 * This contract serves as a wrapper for the Secure Asset Transfer Protocol (SATP) using the Hermes plugin.
 * It provides functionalities to interact with the SATP protocol within the Cactus framework.
 * This contract provides a semantic layer to facilitate interactions with other contracts.
 *
 * @notice Ensure that the contract is deployed and configured correctly before interacting with it.
 */
contract SATPWrapperContract is Ownable, ITraceableContract, IERC721Receiver{

    /**
     * Maping of token IDs to Token structs.
     */
    mapping (string  => Token) public tokens; 

    /**
     * Mapping of token IDs to InteractionSignature structs.
     */
    mapping (string => mapping(InteractionType => InteractionSignature)) public tokensInteractions;

    /**
     * Mapping of the NFT unique descriptors that are in the possetion of the wrapper contract, for each registered tokenId and respective contract.
     */
    mapping (string => mapping(uint256 => bool)) public NFT_IDs;

    string[] ids;

    /** 
     * The address of the bridge contract.
     * TODO: Change this to the Token Struct
     */
    address public bridge_address;

    event Wrap(string indexed tokenId, string contractName, address contractAddress, TokenType tokenType, address owner);
    event Unwrap(string indexed tokenId);
    event Lock(string indexed tokenId, uint256 amount);
    event Unlock(string indexed tokenId, uint256 amount);
    event Mint(string indexed tokenId, uint256 amount);
    event Burn(string indexed tokenId, uint256 amount);
    event Assign(string indexed tokenId, address receiver_account, uint256 amount);
    event Approve(string indexed tokenId, address spender, uint256 amount);


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
    function wrap(string memory contractName, address contractAddress, TokenType tokenType, string memory tokenId, string memory referenceId, address owner, InteractionSignature[] memory interactions, ERCTokenStandard ercTokenStandard) external onlyOwner returns (bool wrapSuccess) {
        if(tokens[tokenId].contractAddress != address(0)) {
            revert TokenAlreadyWrapped(tokenId);
        }

        //TODO if the tokens are standard (eg. ERC20, ERC721...) use the standard interactions
        createNonStandardTokenOntology(tokenId, interactions);

        if(tokensInteractions[tokenId][InteractionType.CHECKPERMITION].available) {
            require(interact(tokenId, InteractionType.CHECKPERMITION), "Contract does not have permission to interact with the token");
        }

        tokens[tokenId] = Token(contractName, contractAddress, tokenType, tokenId, referenceId, owner, 0, ercTokenStandard);
    
        ids.push(tokenId);
        
        emit Wrap(tokenId, contractName, contractAddress, tokenType, owner);
        return true;
    }

    /**
     * Overloaded wrap method that does not receive interactions. This can be used for non-standard tokens.
     * TODO: Implement that functionality for standard tokens. 
     */
    function wrap(string memory contractName,  address contractAddress, TokenType tokenType, string memory tokenId, string memory referenceId, address owner, ERCTokenStandard ercTokenStandard) external onlyOwner returns (bool wrapSuccess) {
        return this.wrap(contractName, contractAddress, tokenType, tokenId, referenceId, owner, new InteractionSignature[](0), ercTokenStandard);
    }

    /**
     * Unwraps a token with the given token ID. This method deletes the token from the mapping and the array of token IDs. (Should they be deleted from the array?)
     * @param tokenId The unique identifier of the token.
     */
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

    /**
     * Locks tokens with the given token ID. This method calls the lock function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The attribute related to the asset to be locked. An amount for fungible tokens, or a unique descriptor for non-fungible tokens.
     */
    function lock(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(interact(tokenId, InteractionType.LOCK, assetAttribute), "Token Lock Failed");
            tokens[tokenId].amount += assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            require(NFT_IDs[tokenId][assetAttribute] == false, "Token Already Locked");
            require(interact(tokenId, InteractionType.LOCK, assetAttribute), "Token Lock Failed");
            tokens[tokenId].amount += 1;
            NFT_IDs[tokenId][assetAttribute] = true;
        }
        else {
            revert TokenNotSupported(tokenId);
        }
        emit Lock(tokenId, assetAttribute);
        return true;
    } 

    /**
     * Unlocks tokens with the given token ID. This method calls the unlock function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The amount of tokens to be unlocked, for fungible tokens, or the uniqueDescriptor of the token to unlock, for non fungible tokens.
     */
    function unlock(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        if (tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            if(tokens[tokenId].amount < assetAttribute) {
                revert InsuficientAmountLocked(tokenId, assetAttribute);
            }
            require(interact(tokenId, InteractionType.UNLOCK, assetAttribute), "Unlock fungible asset call failed");
            tokens[tokenId].amount -= assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            require(NFT_IDs[tokenId][assetAttribute] == true, "Token Not Locked");
            require(tokens[tokenId].amount > 0, "Trying to Unlock an asset that is not accounted for");
            require(interact(tokenId, InteractionType.UNLOCK, assetAttribute), "Unlock non fungible asset call failed");
            tokens[tokenId].amount -= 1;
            NFT_IDs[tokenId][assetAttribute] = false;
        } 
        else {
            revert TokenNotSupported(tokenId);
        }

        emit Unlock(tokenId, assetAttribute);
        return true;
    } 

    /**
     * Mints tokens with the given token ID. This method calls the mint function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The amount of tokens to be minted, for fungible tokens, or the uniqueDescriptor of the token to mint, for non fungible tokens.
     */
    function mint(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(interact(tokenId, InteractionType.MINT, assetAttribute) , "mint asset call failed");
            tokens[tokenId].amount = assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            require(NFT_IDs[tokenId][assetAttribute] == false, "Unique Descriptor already exists");
            require(interact(tokenId, InteractionType.MINT, assetAttribute) , "mint asset call failed");
            tokens[tokenId].amount += 1;
            NFT_IDs[tokenId][assetAttribute] = true;
        }
        else {
            revert TokenNotSupported(tokenId);
        }

        emit Mint(tokenId, assetAttribute);
        return true;
    }

    /**
     * Burns tokens with the given token ID. This method calls the burn function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The amount of tokens to be burned, for fungible tokens, or the uniqueDescriptor of the token to burn, for non fungible tokens.
     */
    function burn(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(tokens[tokenId].amount >= assetAttribute, "burn asset asset is not locked");
            require(interact(tokenId, InteractionType.BURN, assetAttribute), "burn asset call failed");
            tokens[tokenId].amount -= assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            require(tokens[tokenId].amount > 0, "Trying to burn an unaccounted Asset");
            require(NFT_IDs[tokenId][assetAttribute] == true, "Unique Descriptor does not exist");
            require(interact(tokenId, InteractionType.BURN, assetAttribute), "burn asset call failed");
            tokens[tokenId].amount -= 1;
            NFT_IDs[tokenId][assetAttribute] = false;
        }   
        else {
            revert TokenNotSupported(tokenId);
        }

        emit Burn(tokenId, assetAttribute);
        return true;
    }

    /**
     * Assigns tokens with the given token ID to a receiver account. This method calls the assign function of the token contract.
     * @param tokenId The unique identifier of the token.
     * @param receiver_account The address of the receiver account.
     * @param assetAttribute The amount of tokens to be assigned, for fungible tokens, or the uniqueDescriptor of the token to be assigned, for non-fungible tokens.
     */
    function assign(string memory tokenId, address receiver_account, uint256 assetAttribute) external onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(tokens[tokenId].amount >= assetAttribute, "assign asset asset is not locked");
            require(interact(tokenId, InteractionType.ASSIGN, assetAttribute, receiver_account), "assign asset call failed");
            tokens[tokenId].amount -= assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            require(tokens[tokenId].amount > 0, "Assign nft - asset is not locked");
            require(NFT_IDs[tokenId][assetAttribute] == true, "Unique Descriptor does not exist");
            require(interact(tokenId, InteractionType.ASSIGN, assetAttribute, receiver_account), "assign nft call failed");
            tokens[tokenId].amount -= 1;
            NFT_IDs[tokenId][assetAttribute] = false;
        }
        else {
            revert TokenNotSupported(tokenId);
        }
        emit Assign(tokenId, receiver_account, assetAttribute);
        return true;
    }

    /**
     * @notice REQUIRED by OpenZeppelin: Supports the use of safe functions for ERC721 tokens.
     * @return success A boolean indicating if the account has the bridge role.
     */
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
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
     * Overload of the getToken function, used when getting fungible tokens, providing a neutral unique descriptor 
     * that is required when getting a non fungible token. 
     * @param tokenId The unique identifier of the token.
     * @return token the token with the given token ID.
     */
    function getToken(string memory tokenId) view public returns (Token memory token) {
        return getToken(tokenId, 0);
    }

    /**
     * Gets a token with the given token ID. Since a tokenId can be associated to multiple non fungible tokens, 
     * it is required to also provide the asset attribute of the wanted non fungible token. If the provided tokenId
     * is not for a non fungible token, the assetAttribute parameter will be ignored.
     * @param tokenId The unique identifier of the token.
     * @param assetAttribute The asset attribute of the token.
     * @return token the token with the given token ID and asset attribute.
     */
    function getToken(string memory tokenId, uint256 assetAttribute) view public returns (Token memory token) {
        TokenType tt = tokens[tokenId].tokenType;
        /*When dealing with fungible tokens, the attribute that is relevant is the amount that is held by an actor
        at a specific point in time. The amount is returned with the token, when the token is fungible.*/
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            return tokens[tokenId];
        }
        /*When dealing with non fungible tokens, the relevant attribute is the unique descriptor. Since the same contract
        can be associated with multiple non fungible tokens, it is necessary to provide the unique descriptor of the wanted
        asset. The wrapper contract then verifies if it holds the asset with that unique descriptor. If it holds it, the
        contract returns the unique descriptor with the token. If not, it returns 0 as the unique descriptor, which is to
        be interpreted as the absence of that same token.*/
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            /*The reason the token is rebuilt upon the return is due to internal logic of the protocol. Everytime a token is passed between
            steps of the protocol, the token is expected to have an amount attribute. The leafs that receive the tokens from the contract
            rebuild the asset according to its type (Fungible or NonFungible) and interpret the value of the amount field accordingly. */
            if(NFT_IDs[tokenId][assetAttribute]) {
                return Token(tokens[tokenId].contractName, tokens[tokenId].contractAddress, tokens[tokenId].tokenType, tokenId, tokens[tokenId].referenceId, tokens[tokenId].owner, assetAttribute, tokens[tokenId].ercTokenStandard);
            }
            else {
                return Token(tokens[tokenId].contractName, tokens[tokenId].contractAddress, tokens[tokenId].tokenType, tokenId, tokens[tokenId].referenceId, tokens[tokenId].owner, 0, tokens[tokenId].ercTokenStandard);
            }            
        }
    }

    /**
     * Creates the ontology of a non-standard token with the given token ID and interactions.
     * @param tokenId The unique identifier of the token.
     * @param interactions The interactions to be used for the token.
     */
    function createNonStandardTokenOntology(string memory tokenId, InteractionSignature[] memory interactions) internal {
        for(uint i = 0; i < interactions.length; i++) {
            tokensInteractions[tokenId][interactions[i].interactionType] = interactions[i];
        }
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
     * Interacts with the token contract using the given token ID, interaction type, and the token specific attribute.
     * @param tokenId The unique identifier of the token.
     * @param interactionType The type of the interaction.
     * @param assetAttribute The asset attribute of tokens to be interacted with.
     */
    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute) internal returns (bool success) {
        return interact(tokenId, interactionType, assetAttribute, address(0));
    }

    /**
     * Interacts with the token contract using the given token ID, interaction type, asset attribute, and receiver account.
     * This function allows modular interactions by dynamically calling contract functions based on the stored interactions. 
     * To mitigate the risk of attacks, this method only allows the usage of known variables and only variables that are assigned to the specific token.
     * @param tokenId The unique identifier of the token.
     * @param interactionType The type of the interaction.
     * @param assetAttribute The asset attribute of tokens to be interacted with.
     * @param receiver The address of the receiver account.
     */
    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute, address receiver) internal returns (bool) {
        if (!tokensInteractions[tokenId][interactionType].available) {
            return false;
        }

        for (uint i = 0; i < tokensInteractions[tokenId][interactionType].functionsSignature.length; i++) {
            bytes4 functionSelector = bytes4(keccak256(abi.encodePacked(tokensInteractions[tokenId][interactionType].functionsSignature[i])));

            bytes memory encodedParams = encodeDynamicParams(functionSelector, AssetParameterIdentifierEncoder(tokensInteractions[tokenId][interactionType].variables[i], tokenId, receiver, assetAttribute));

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
     * @param assetAttribute The asset attribute of tokens to be encoded.
     */
    function AssetParameterIdentifierEncoder(AssetParameterIdentifier[] memory variables, string memory tokenId, address receiver, uint256 assetAttribute)  internal view returns (bytes[] memory){
        bytes[] memory dynamicParams = new bytes[](variables.length);
        for (uint i = 0; i < variables.length; i++) {
            if (variables[i] == AssetParameterIdentifier.BRIDGE) {
                dynamicParams[i] = abi.encode(address(this));
            } else if (variables[i] == AssetParameterIdentifier.TOKENID) {
                dynamicParams[i] = abi.encode(tokenId);
            } else if (variables[i] == AssetParameterIdentifier.AMOUNT) {
                dynamicParams[i] = abi.encode(assetAttribute);
            } else if (variables[i] == AssetParameterIdentifier.OWNER) {
                dynamicParams[i] = abi.encode(tokens[tokenId].owner);
            } else if (variables[i] == AssetParameterIdentifier.CONTRACTADDRESS) {
                dynamicParams[i] = abi.encode(tokens[tokenId].contractAddress);
            } else if (variables[i] == AssetParameterIdentifier.RECEIVER) {
                dynamicParams[i] = abi.encode(receiver);
            } else if (variables[i] == AssetParameterIdentifier.UNIQUE_DESCRIPTOR) {
                dynamicParams[i] = abi.encode(assetAttribute);
            } else {
                revert("Variable not supported");
            }
        }
        return dynamicParams;
    }
}