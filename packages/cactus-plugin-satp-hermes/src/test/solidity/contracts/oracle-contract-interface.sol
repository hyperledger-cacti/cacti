// SPDX-License-Identifier: UNKNOWN 

pragma solidity >=0.7.0;

/*
 *  Smart Contract Interface to define the methods needed by a contract to be handled by the oracle.
 */

interface OracleTestContractInterface {

  // Function to write data
  function setData(string calldata data) external;

  // Function to read data
  function getData(bytes32 id) external view returns (string memory);
}
