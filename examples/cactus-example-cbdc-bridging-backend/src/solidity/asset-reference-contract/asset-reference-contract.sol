// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.15;

import "./MyOwnable.sol";

struct AssetReference {
    string id;
    bool isLocked;
    uint amount;
    address recipient;
}

contract AssetReferenceContract is MyOwnable {
  address cbdc_contract;
  mapping (string => AssetReference) assets;
  mapping (string => bool) assetExists;
  
  // only used for UI purposes. The list is not updated in each operation
  // so it should not be used for other ends than this
  // The main use for this is to demonstrate in the UI the asset references list
  AssetReference[] assetRefsList;

  constructor(address account) {
    cbdc_contract = account;
  }

  function createAssetReference(string calldata id, uint amount, address recipient) public onlyOwner {
    assets[id].id= id;
    assets[id].amount = amount;
    assets[id].isLocked = false;
    assets[id].recipient = recipient;

    assetExists[id] = true;

    // used for UI purposes only
    assetRefsList.push(AssetReference(
      id,
      false,
      amount,
      recipient
    ));
  }

  function lockAssetReference(string calldata id) public onlyOwner {
    require(isPresent(id), "The asset reference does not exist");
    require(!isAssetLocked(id), "The asset reference is already locked");

    assets[id].isLocked = true;
  }

  function unLockAssetReference(string calldata id) public onlyOwner {
    require(isPresent(id), "The asset reference does not exist");

    assets[id].isLocked = false;
  }

  function deleteAssetReference(string calldata id) public onlyOwner {
    require(isPresent(id), "The asset reference does not exist");
    require(isAssetLocked(id), "The asset reference is locked");

    burn(assets[id].amount);

    delete assets[id];
    assetExists[id] = false;

    // used for UI purposes only
    for (uint i = 0; i < assetRefsList.length; i++) {
      if (keccak256(abi.encodePacked(assetRefsList[i].id)) == keccak256(abi.encodePacked(id))) {
        removeItemFromList(i);
      }
    }
  }

  function isPresent(string calldata id) public view returns (bool) {
    return assetExists[id];
  }

  function isAssetLocked(string calldata id) public view returns (bool) {
    return assets[id].isLocked;
  }

  function getAssetReference(string calldata id) public view returns (AssetReference memory) {
    return assets[id];
  }

  function mint(address account, uint256 amount) public onlyOwner {
    (bool success, ) = cbdc_contract.call(
      abi.encodeWithSignature("mint(address,uint256)", account, amount)
    );

    require(success, "mint call failed");
  }

  function burn(uint256 amount) public onlyOwner {
    (bool success, ) = cbdc_contract.call(
      abi.encodeWithSignature("burn(uint256)", amount)
    );

    require(success, "burn call failed");
  }

  function checkValidBridgeBack(string calldata id, uint256 amount, address user) public view returns (bool) {
    require(isPresent(id), "The asset reference does not exist");
    
    return (assets[id].amount >= amount) && (assets[id].recipient == user);
  }

  // used for UI purposes only
  function removeItemFromList(uint _index) public {
    require(_index < assetRefsList.length, "index out of bound");

    for (uint i = _index; i < assetRefsList.length-1; i++) {
        assetRefsList[i] = assetRefsList[i + 1];
    }
    assetRefsList.pop();
  }

  // used for UI purposes only
  function getAllAssetReferences() public view returns (AssetReference[] memory) {
    return assetRefsList;
  }

  // used for testing purposes only
  function resetAssetRefsList() public {
    for (uint i = 0; i < assetRefsList.length; i++) {
      removeItemFromList(i);
    }
  }
}
