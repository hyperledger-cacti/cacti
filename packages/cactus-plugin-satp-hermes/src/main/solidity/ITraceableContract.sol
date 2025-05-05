// SPDX-License-Identifier: UNKNOWN 
pragma solidity >=0.7.0;

interface ITraceableContract {
  //All transactions that change the state of and asset, should emmit this event
  event Changed(string indexed id, bytes[] value);
  
  //Should return a list of asset IDs to be tracked by Bungee
  function getAllAssetsIDs() external view returns (string[] memory);
}
