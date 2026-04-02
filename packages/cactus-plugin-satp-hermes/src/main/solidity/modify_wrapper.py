import re

file_path = r"c:\Users\LOQ\New folder\cacti\packages\cactus-plugin-satp-hermes\src\main\solidity\contracts\SATPWrapperContract.sol"
with open(file_path, "r") as f:
    content = f.read()

# 1. Update ERCTokenStandard enum
content = content.replace("enum ERCTokenStandard { UNSPECIFIED, ERC20, ERC721, ERC1155 }", "enum ERCTokenStandard { UNSPECIFIED, ERC20, ERC721, ERC1155, ERC6909 }")

# 2. Add overloaded lock function
lock_old = """    function lock(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
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
    }"""
lock_new = """    function lock(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        return lock(tokenId, assetAttribute, 0);
    }
    
    function lock(string memory tokenId, uint256 assetAttribute, uint256 uniqueDescriptor) public onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(interact(tokenId, InteractionType.LOCK, assetAttribute, uniqueDescriptor), "Token Lock Failed");
            tokens[tokenId].amount += assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            uint256 descriptor = uniqueDescriptor == 0 ? assetAttribute : uniqueDescriptor;
            require(NFT_IDs[tokenId][descriptor] == false, "Token Already Locked");
            require(interact(tokenId, InteractionType.LOCK, assetAttribute, descriptor), "Token Lock Failed");
            tokens[tokenId].amount += 1;
            NFT_IDs[tokenId][descriptor] = true;
        }
        else {
            revert TokenNotSupported(tokenId);
        }
        emit Lock(tokenId, assetAttribute);
        return true;
    }"""
content = content.replace(lock_old, lock_new)

# 3. Add overloaded unlock function
unlock_old = """    function unlock(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
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
    }"""
unlock_new = """    function unlock(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        return unlock(tokenId, assetAttribute, 0);
    }
    
    function unlock(string memory tokenId, uint256 assetAttribute, uint256 uniqueDescriptor) public onlyOwner returns (bool success) {
        if (tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            if(tokens[tokenId].amount < assetAttribute) {
                revert InsuficientAmountLocked(tokenId, assetAttribute);
            }
            require(interact(tokenId, InteractionType.UNLOCK, assetAttribute, uniqueDescriptor), "Unlock fungible asset call failed");
            tokens[tokenId].amount -= assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            uint256 descriptor = uniqueDescriptor == 0 ? assetAttribute : uniqueDescriptor;
            require(NFT_IDs[tokenId][descriptor] == true, "Token Not Locked");
            require(tokens[tokenId].amount > 0, "Trying to Unlock an asset that is not accounted for");
            require(interact(tokenId, InteractionType.UNLOCK, assetAttribute, descriptor), "Unlock non fungible asset call failed");
            tokens[tokenId].amount -= 1;
            NFT_IDs[tokenId][descriptor] = false;
        } 
        else {
            revert TokenNotSupported(tokenId);
        }

        emit Unlock(tokenId, assetAttribute);
        return true;
    }"""
content = content.replace(unlock_old, unlock_new)


# 4. Add overloaded mint function
mint_old = """    function mint(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
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
    }"""
mint_new = """    function mint(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        return mint(tokenId, assetAttribute, 0);
    }
    
    function mint(string memory tokenId, uint256 assetAttribute, uint256 uniqueDescriptor) public onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(interact(tokenId, InteractionType.MINT, assetAttribute, uniqueDescriptor) , "mint asset call failed");
            tokens[tokenId].amount = assetAttribute; // Should this be +=? In original it was =
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            uint256 descriptor = uniqueDescriptor == 0 ? assetAttribute : uniqueDescriptor;
            require(NFT_IDs[tokenId][descriptor] == false, "Unique Descriptor already exists");
            require(interact(tokenId, InteractionType.MINT, assetAttribute, descriptor) , "mint asset call failed");
            tokens[tokenId].amount += 1;
            NFT_IDs[tokenId][descriptor] = true;
        }
        else {
            revert TokenNotSupported(tokenId);
        }

        emit Mint(tokenId, assetAttribute);
        return true;
    }"""
content = content.replace(mint_old, mint_new)

# 5. Add overloaded burn function
burn_old = """    function burn(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
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
    }"""
burn_new = """    function burn(string memory tokenId, uint256 assetAttribute) external onlyOwner returns (bool success) {
        return burn(tokenId, assetAttribute, 0);
    }
    
    function burn(string memory tokenId, uint256 assetAttribute, uint256 uniqueDescriptor) public onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(tokens[tokenId].amount >= assetAttribute, "burn asset asset is not locked");
            require(interact(tokenId, InteractionType.BURN, assetAttribute, uniqueDescriptor), "burn asset call failed");
            tokens[tokenId].amount -= assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            uint256 descriptor = uniqueDescriptor == 0 ? assetAttribute : uniqueDescriptor;
            require(tokens[tokenId].amount > 0, "Trying to burn an unaccounted Asset");
            require(NFT_IDs[tokenId][descriptor] == true, "Unique Descriptor does not exist");
            require(interact(tokenId, InteractionType.BURN, assetAttribute, descriptor), "burn asset call failed");
            tokens[tokenId].amount -= 1;
            NFT_IDs[tokenId][descriptor] = false;
        }   
        else {
            revert TokenNotSupported(tokenId);
        }

        emit Burn(tokenId, assetAttribute);
        return true;
    }"""
content = content.replace(burn_old, burn_new)

# 6. Add overloaded assign function
assign_old = """    function assign(string memory tokenId, address receiver_account, uint256 assetAttribute) external onlyOwner returns (bool success) {
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
    }"""
assign_new = """    function assign(string memory tokenId, address receiver_account, uint256 assetAttribute) external onlyOwner returns (bool success) {
        return assign(tokenId, receiver_account, assetAttribute, 0);
    }
    
    function assign(string memory tokenId, address receiver_account, uint256 assetAttribute, uint256 uniqueDescriptor) public onlyOwner returns (bool success) {
        if(tokens[tokenId].contractAddress == address(0)){
            revert TokenNotAvailable(tokenId);
        }
        require(assetAttribute > 0, "Invalid asset attribute");

        TokenType tt = tokens[tokenId].tokenType;
        if (tt == TokenType.NONSTANDARD_FUNGIBLE) {
            require(tokens[tokenId].amount >= assetAttribute, "assign asset asset is not locked");
            require(interact(tokenId, InteractionType.ASSIGN, assetAttribute, uniqueDescriptor, receiver_account), "assign asset call failed");
            tokens[tokenId].amount -= assetAttribute;
        }
        else if (tt == TokenType.NONSTANDARD_NONFUNGIBLE) {
            uint256 descriptor = uniqueDescriptor == 0 ? assetAttribute : uniqueDescriptor;
            require(tokens[tokenId].amount > 0, "Assign nft - asset is not locked");
            require(NFT_IDs[tokenId][descriptor] == true, "Unique Descriptor does not exist");
            require(interact(tokenId, InteractionType.ASSIGN, assetAttribute, descriptor, receiver_account), "assign nft call failed");
            tokens[tokenId].amount -= 1;
            NFT_IDs[tokenId][descriptor] = false;
        }
        else {
            revert TokenNotSupported(tokenId);
        }
        emit Assign(tokenId, receiver_account, assetAttribute);
        return true;
    }"""
content = content.replace(assign_old, assign_new)

# 7. Update interact functions
interact1_old = """    function interact(string memory tokenId, InteractionType interactionType)  internal returns (bool success) {
        return interact(tokenId, interactionType, 0, address(0));
    }"""
interact1_new = """    function interact(string memory tokenId, InteractionType interactionType)  internal returns (bool success) {
        return interact(tokenId, interactionType, 0, 0, address(0));
    }"""
content = content.replace(interact1_old, interact1_new)

interact2_old = """    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute) internal returns (bool success) {
        return interact(tokenId, interactionType, assetAttribute, address(0));
    }"""
interact2_new = """    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute) internal returns (bool success) {
        return interact(tokenId, interactionType, assetAttribute, 0, address(0));
    }
    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute, uint256 uniqueDescriptor) internal returns (bool success) {
        return interact(tokenId, interactionType, assetAttribute, uniqueDescriptor, address(0));
    }"""
content = content.replace(interact2_old, interact2_new)

interact3_old = """    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute, address receiver) internal returns (bool) {
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
    }"""
interact3_new = """    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute, address receiver) internal returns (bool) {
        return interact(tokenId, interactionType, assetAttribute, 0, receiver);
    }
    
    function interact(string memory tokenId, InteractionType interactionType, uint256 assetAttribute, uint256 uniqueDescriptor, address receiver) internal returns (bool) {
        if (!tokensInteractions[tokenId][interactionType].available) {
            return false;
        }

        for (uint i = 0; i < tokensInteractions[tokenId][interactionType].functionsSignature.length; i++) {
            bytes4 functionSelector = bytes4(keccak256(abi.encodePacked(tokensInteractions[tokenId][interactionType].functionsSignature[i])));

            bytes memory encodedParams = encodeDynamicParams(functionSelector, AssetParameterIdentifierEncoder(tokensInteractions[tokenId][interactionType].variables[i], tokenId, receiver, assetAttribute, uniqueDescriptor));

            (bool callSuccess, ) = tokens[tokenId].contractAddress.call(encodedParams);
            if (!callSuccess) {
                return false;
            }
        } 
        return true;
    }"""
content = content.replace(interact3_old, interact3_new)

# 8. Update AssetParameterIdentifierEncoder
encoder_old = """    function AssetParameterIdentifierEncoder(AssetParameterIdentifier[] memory variables, string memory tokenId, address receiver, uint256 assetAttribute)  internal view returns (bytes[] memory){
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
    }"""
encoder_new = """    function AssetParameterIdentifierEncoder(AssetParameterIdentifier[] memory variables, string memory tokenId, address receiver, uint256 assetAttribute, uint256 uniqueDescriptor)  internal view returns (bytes[] memory){
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
                if (uniqueDescriptor != 0) {
                    dynamicParams[i] = abi.encode(uniqueDescriptor);
                } else {
                    dynamicParams[i] = abi.encode(assetAttribute);
                }
            } else {
                revert("Variable not supported");
            }
        }
        return dynamicParams;
    }"""
content = content.replace(encoder_old, encoder_new)

with open(file_path, "w") as f:
    f.write(content)

print("Modification complete")
