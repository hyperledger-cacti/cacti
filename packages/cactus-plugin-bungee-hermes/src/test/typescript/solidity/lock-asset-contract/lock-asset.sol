
pragma solidity >=0.7.0;
struct Asset{
    address creator;
    bool isLock;
    uint size;
}
//TODO: DETEMINE CALLDATA VS MEMORY
contract LockAsset {
  mapping (string => Asset) assets;
  mapping (string => bool) assetExists;
  string[] ids;
  
  event Transaction(string indexed id, address creator, bool isLock, uint size);

  function createAsset(string calldata id, uint size) public{
      require(size>0);
      assets[id].size= size;
      assets[id].creator = msg.sender;
      assets[id].isLock = false;
      if (!assetExists[id]){
        ids.push(id);
      }
      assetExists[id] = true;
      emit Transaction(id, assets[id].creator, assets[id].isLock, assets[id].size);
  }

  function getAsset(string calldata id) public view returns (Asset memory) {
      return assets[id];
  }

  //Don't care if it is already locked
  function lockAsset(string calldata id) public {
      bool exists = assetExists[id];
      require(exists);

      assets[id].isLock = true;
      emit Transaction(id, assets[id].creator, assets[id].isLock, assets[id].size);

  }

  //Don't care if it is already unlocked
  function unLockAsset(string calldata id) public {
      bool exists = assetExists[id];
      require(exists);

      assets[id].isLock = false;
      emit Transaction(id, assets[id].creator, assets[id].isLock, assets[id].size);

  }

  function deleteAsset(string calldata id) public {
      bool exists = assetExists[id];
      require(exists);

      //an asset could only be deleted if it is already locked
      bool assetIsLocked = assets[id].isLock;
      require(assetIsLocked);

      delete assets[id];
      assetExists[id] = false;
      emit Transaction(id, assets[id].creator, assets[id].isLock, assets[id].size);

  }

  function isPresent(string calldata id) public view returns (bool) {
      return assetExists[id];
  }

  function isAssetLocked(string calldata id) public view returns (bool) {
      bool exists = assetExists[id];
      require(exists);

      //an asset could only be deleted if it is already locked
      return assets[id].isLock;
  }

  function getAllAssetsIDs() public view returns (string[] memory){
    return ids;
  }
}