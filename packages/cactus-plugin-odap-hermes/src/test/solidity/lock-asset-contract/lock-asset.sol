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
//TODO: DETEMINE CALLDATA VS MEMORY
contract LockAsset {
  //
  mapping (string => Asset) assets;
  function createAsset( string calldata id, uint size) public{
      require(size>0);
      assets[id].size= size;
      assets[id].creator = msg.sender;
      assets[id].isLock = false;
  }
  function getAsset(string calldata id) public view returns (Asset memory)
  {
      return assets[id];
  }

  //Don't care if it is already locked
  function lockAsset(string calldata id) public{
      bool assetExsist = assets[id].size>0;
      require(assetExsist);
      assets[id].isLock = true;
  }
  //Don't care if it is already unlocked
  function unLockAsset(string calldata id) public{
      bool assetExsist = assets[id].size>0;
      require(assetExsist);
      assets[id].isLock = false;
  }
  function deleteAsset(string calldata id) public {
      bool assetExsist = assets[id].size>0;
      require(assetExsist);
      //an asset could only be deleted if it is already locked
      bool assetIsLocked = assets[id].isLock;
      require(assetIsLocked);
      delete assets[id];
  }

}
