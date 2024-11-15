// *****************************************************************************
// IMPORTANT: If you update this code then make sure to recompile
// it and update the .json file as well so that they
// remain in sync for consistent test executions.
// With that said, there shouldn't be any reason to recompile this, like ever...
// *****************************************************************************

pragma solidity >=0.7.0;
struct Asset{
  address creator;
  bool isLock;
  uint size;
}

contract LockAsset {
  mapping (string => Asset) assets;
  mapping (string => bool) assetExists;

  constructor() {
  }

  function createAsset( string calldata id, uint size) public {
    require(size>0);
    assets[id].size= size;
    assets[id].creator = msg.sender;
    assets[id].isLock = false;
    assetExists[id] = true;
  }

  function getAsset(string calldata id) public view returns (Asset memory) {
    return assets[id];
  }

  function lockAsset(string calldata id) public {
    bool exists = assetExists[id];
    require(exists);

    assets[id].isLock = true;
  }

  function unLockAsset(string calldata id) public {
    bool exists = assetExists[id];
    require(exists);

    assets[id].isLock = false;
  }

  function deleteAsset(string calldata id) public {
    bool exists = assetExists[id];
    require(exists);

    //an asset can only be deleted if it is locked
    bool assetIsLocked = assets[id].isLock;
    require(assetIsLocked);

    delete assets[id];
    assetExists[id] = false;
  }

  function isPresent(string calldata id) public view returns (bool) {
    return assetExists[id];
  }

  function isAssetLocked(string calldata id) public view returns (bool) {
    bool exists = assetExists[id];
    require(exists);

    return assets[id].isLock;
  }
}
