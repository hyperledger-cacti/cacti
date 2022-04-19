// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
* Hashed Timelock Contract on Fungible Assets in an Ethereum network (Support only for ERC20 tokens right now)
**/

contract InteroperationBaseClassERC20 {

	mapping (bytes32 => LockContract) public lockContracts;

	struct LockContract {
		address sender;
		address receiver;
		address assetContract;
		uint256 amount;
		bytes32 hashLock;
		uint256 expirationTime;
		uint8 status;
	}

	uint8 constant UNUSED = 0;
	uint8 constant LOCKED = 1;

	event Lock(
		address indexed sender,
		address indexed receiver,
		address assetContract,
		uint256 amount,
		bytes32 hashLock,
		uint256 expirationTime,
		bytes32 lockContractId
	);

	event Claim(
		address indexed sender,
		address indexed receiver,
		bytes32 indexed lockContractId,
		bytes32 hashLock,
		string preimage
    	);

	event Unlock(
		address indexed sender,
		address indexed receiver,
		bytes32 indexed lockContractId
	);


	// The sender locks a fungible asset with a hash lock and an expiry time
	function lockFungibleAsset(
		address receiver,
		address assetContract,
		uint256 amount,
		bytes32 hashLock,
		uint256 expirationTime
	)
		external
		returns (bytes32 lockContractId)
	{
		address sender = msg.sender;
		
		// Checking the validity of the input parameters
		require(amount > 0, "Amount should be greater than zero");
		require(ERC20(assetContract).allowance(sender, address(this)) >= amount, "Allowance of assets from the sender for the lock contract must be greater than the amount to be locked");
		require(expirationTime > block.timestamp, "Expiration time should be in the future");

		// The identity of the lock contract is a hash of all the relevant parameters that will uniquely identify the contract
		lockContractId = sha256(
			abi.encodePacked(
				sender,
				receiver,
				assetContract,
				amount,
				hashLock,
				expirationTime
			)
		);

		require(lockContracts[lockContractId].status == UNUSED, "An active lock contract already exists with the same parameters");

		// Locking amount by transfering them to the lockContract
		bool transferStatus = ERC20(assetContract).transferFrom(sender, address(this), amount);
		require(transferStatus == true, "ERC20 transferFrom failed from the sender to the lockContract");

		lockContracts[lockContractId] = LockContract(
			sender,
			receiver,
			assetContract,
			amount,
			hashLock,
			expirationTime,
			LOCKED
		);

		emit Lock(
			sender,
			receiver,
			assetContract,
			amount,
			hashLock,
			expirationTime,
			lockContractId
		);
	}


	// The receiver claims the ownership of an asset locked for them once they obtain the preimage of the hashlock
	function claimFungibleAsset(bytes32 lockContractId, string memory preimage)
		external
		returns (bool)
	{
		LockContract storage c = lockContracts[lockContractId];
		
		// Check the validity of the claim
		require(c.status == LOCKED, "lockContract is not active");
		require(block.timestamp < c.expirationTime, "lockContract has expired");
		require(c.hashLock == sha256(abi.encodePacked(preimage)),"Invalid preimage, its hash does not equal the hashLock");

		bool transferStatus = ERC20(c.assetContract).transfer(c.receiver, c.amount);
		require(transferStatus == true, "ERC20 transfer failed from the lockContract to the receiver");

		emit Claim(
			c.sender,
			c.receiver,
			lockContractId,
			c.hashLock,
			preimage
		);

		return true;
	}


	// Unlocking and reclaiming a locked asset for the sender after the expiration time. Can be called by anyone, not just the sender.
	function unlockFungibleAsset(bytes32 lockContractId)
		external
		returns (bool)
	{
		LockContract storage c = lockContracts[lockContractId];

		// Validation checks
		require(c.status == LOCKED, "There is no active lockContract with the specified ID");
		require(c.sender != address(0), "Sender address is invalid");
		require(block.timestamp >= c.expirationTime, "Lock contract has expired");

		bool transferStatus = ERC20(c.assetContract).transfer(c.sender, c.amount);
		require(transferStatus == true, "ERC20 transfer failed from the lockContract back to the sender");
		
		emit Unlock(
			c.sender,
			c.receiver,
			lockContractId
		);

		return true;
	}


	// Function to check if there is an active contract with the input lockContractId.
	function isFungibleAssetLocked(bytes32 lockContractId)
		external
		returns (bool)
	{
		LockContract storage c = lockContracts[lockContractId];
		
		bool lockContractStatus;
		if ( c.status == LOCKED ){
			lockContractStatus = true;
		} else {
			lockContractStatus = false;
		}

		return lockContractStatus;
	}
}
