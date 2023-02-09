// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.8;

contract Migrations {
	address public owner = msg.sender;
	uint public last_completed_migration;

  	modifier restricted() {
		require(
    			msg.sender == owner,
			"This function is restricted to the contract's owner"
		); 
		_;
  	}

  	function setCompleted(uint completed) public restricted {
    		last_completed_migration = completed;
  	}
}
