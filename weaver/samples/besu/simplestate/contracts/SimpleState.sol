// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.10;


/**
 * A basic contract for managing key-value pairs.
 */
contract SimpleState {
   mapping(string => string) dataStore;
   
   function set(string memory key, string memory value) public {
      dataStore[key] = value;
   }
   
   function get(string memory key) public view returns (string memory) {
      string memory value = dataStore[key];
      return value;
   }
}
