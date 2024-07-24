// SPDX-License-Identifier: UNKNOWN 

pragma solidity >=0.7.0;

/*
 *  Smart Contract Interface to define the methods needed by SATP Wrapper Contract.
 */

interface SATPContractInterface {
  // mint creates new tokens with the given amount and assigns them to the owner.
  function mint(address account, uint256 amount) external returns (bool); 
  // burn destroys the given amount of tokens from the owner.
  function burn(address account, uint256 amount) external returns (bool);
  // assign assigns the given amount of tokens from the owner to the target, without approval.
  function assign(address from, address recipient, uint256 amount) external returns (bool);
  // transfer transfers the given amount of tokens from the sender to the target, with approval needed.
  function transfer(address from, address recipient, uint256 amount) external returns (bool);
  // checks if the given account has the given role.
  function hasPermission(address account) external view returns (bool);
}
