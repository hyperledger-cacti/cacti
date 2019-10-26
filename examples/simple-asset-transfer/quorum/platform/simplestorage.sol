pragma solidity ^0.4.15;

contract simplestorage {
  uint public storedData;

  function simplestorage(uint initVal) {
    storedData = initVal;
  }

  function set(uint x) {
    storedData = x;
  }

  function get() constant returns (uint retVal) {
    return storedData;
  }
}
