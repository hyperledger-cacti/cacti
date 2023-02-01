const promisify = require('util').promisify
const sleep = promisify(require('timers').setTimeout)
const fs = require('fs')
const path = require('path')
const contract = require("@truffle/contract");
const Web3 = require("web3")
const crypto = require('crypto')

const networkHost1 = "localhost"
const networkPort1 = "8545"
const networkHost2 = "localhost"
const networkPort2 = "9544"

let interopContract1
let interopContract2
let AliceERC721
let BobERC20


// Function to obtain an instance of a smart contract when provided 
// as input the path to its JSON file output by 'truffle compile'.
// (Assuming that the current folder is a sibling folder to build, 
// the path to json would be ../build/contracts/ContractName.json)
async function getContractInstance(provider, pathToJson) {
	const jsonFile = path.resolve(__dirname, pathToJson)
	var jsonFileContents = fs.readFileSync(jsonFile)
	var contractName = contract(JSON.parse(jsonFileContents))
	contractName.setProvider(provider)
	var instance = await contractName.deployed().catch(function () {
		console.log("Failed getting the contractName!");
	})
	return instance
}


// Initialization of the parameters
async function init(provider1, provider2, contractOwner1, contractOwner2, Alice1, Bob2, tokenSupply, senderInitialBalance) {
	interopContract1 = await getContractInstance(provider1, '../build/contracts/AssetExchangeContract.json').catch(function () {
		console.log("Failed getting interopContract1!");
	})
	interopContract2 = await getContractInstance(provider2, '../build/contracts/AssetExchangeContract.json').catch(function () {
		console.log("Failed getting interopContract2!");
	})

	AliceERC721 = await getContractInstance(provider1, '../build/contracts/AliceERC721.json').catch(function () {
		console.log("Failed getting AliceERC721 token contract!");
	})
	BobERC20 = await getContractInstance(provider2, '../build/contracts/BobERC20.json').catch(function () {
		console.log("Failed getting BobERC20 token contract!");
	})

	// Issue AliceERC721 tokens to Alice in Network 1 and BobERC20 tokens 
	// to Bob in Network 2. A minimal number of tokens equal to the 
	// number of token being exchanged is issued to Alice and Bob to 
	// ensure that the exchange in this test application does not fail 
	// due to insufficient funds.
	await AliceERC721.transferFrom(contractOwner1, Alice1, 1, { from: contractOwner1 }).catch(function (e) {
		console.log("AliceERC721 transfer threw an error; Probably the token supply is used up!");
	})
	await BobERC20.transfer(Bob2, senderInitialBalance, { from: contractOwner2 }).catch(function () {
		console.log("BobERC20 transfer threw an error; Probably the token supply is used up!");
	})
}


// Claim function of a fungible asset/token of type tokenContractId 
// and amount tokenAmount locked using contractId for a receiver. 
// preimage is the secret to unlock the asset corresponding to the commitment 
// used when locking it
async function claimToken(interopContract, lockContractId, recipient, preimage) {
	console.log("\n Claiming %s using preimage: %o", lockContractId, preimage)
	// console.log(JSON.parse(JSON.stringify(preimage)).data.toString('utf8'))
	var claimStatus = await interopContract.claimAsset(lockContractId, preimage, {
		from: recipient
	}).catch(function (err) {
		console.log(err)
		console.log("claimAsset threw an error");
		claimStatus = false
	})

	return claimStatus
}


// Unlock function of a locked fungible asset/token 
async function unlockToken(interopContract, lockContractId, sender) {
	var unlockStatus = await interopContract.unlockAsset(lockContractId, {
		from: sender
	}).catch(function () {
		console.log("unlockAsset threw an error");
		unlockStatus = false
	})

	return unlockStatus
}


// Function to create a new smart contract for locking asset
// 'sender' locks 'tokenAmount' number of tokens of type 'tokenContract'
// for 'recipient' using the contract constructs of 'interopContract'
// with hashLock and timeLock providing the conditions for claiming/unlocking
async function lockToken(sender, recipient, tokenContract, tokenAmount, interopContract, hashLock, timeLock, tokenId = 0, data = "") {
	// initiator of the swap has to first designate the swap contract as a spender of his/her money
	// with allowance matching the swap amount
	await tokenContract.approve(tokenContract.address, tokenAmount, { from: sender }).catch(function () {
		console.log("Token approval failed!!!");
		return false
	})
	var lockStatus = interopContract.lockAsset(
		recipient,
		tokenContract.address,
		tokenAmount,
		hashLock,
		timeLock,
		tokenId,
		Web3.utils.utf8ToHex(data),
		{
			from: sender
		}
	).catch(function () {
		console.log("lockAsset threw an error");
		lockStatus = false
	})

	return lockStatus
}


// A function to obtain and print the account balances of a pair 
// of accounts in the two participating networks.
// Designed for printing the account balances of the sender and 
// recipient at various stages of the exchange.
async function getBalances(Alice1, Bob1, Alice2, Bob2) {
	var AliceAliceERC721Balance = await AliceERC721.balanceOf(Alice1)
	console.log("Alice balance of AliceERC721 in Network 1", AliceAliceERC721Balance.toString())

	var BobAliceERC721Balance = await AliceERC721.balanceOf(Bob1)
	console.log("Bob balance of AliceERC721 in Network 1", await BobAliceERC721Balance.toString())

	var AliceBobERC20Balance = await BobERC20.balanceOf(Alice2)
	console.log("Alice balance of BobERC20 in Network 2", AliceBobERC20Balance.toString())

	var BobBobERC20Balance = await BobERC20.balanceOf(Bob2)
	console.log("Bob balance of BobERC20 in Network 2", await BobBobERC20Balance.toString())
}


// Main entry point to the app
async function main() {
	// Network 1
	const provider1 = new Web3.providers.HttpProvider('http://' + networkHost1 + ':' + networkPort1)
	const web3N1 = new Web3(provider1)
	const accounts1 = await web3N1.eth.getAccounts()

	const Alice1 = accounts1[1] // owner of AliceERC721 and wants swap for BobERC20
	const Bob1 = accounts1[2] // owner of BobERC20 and wants to swap for AliceERC721
	console.log("Alice address in Network 1", Alice1)
	console.log("Bob address in Network 1", Bob1)

	const contractOwner1 = accounts1[0] // owner of all the minted tokens when the contract was created, given how truffleconfig.js is composed

	// Network 2
	const provider2 = new Web3.providers.HttpProvider('http://' + networkHost2 + ':' + networkPort2)
	const web3N2 = new Web3(provider2)
	const accounts2 = await web3N2.eth.getAccounts()

	const Alice2 = accounts2[1] // owner of AliceERC721 and wants swap for BobERC20
	const Bob2 = accounts2[2] // owner of BobERC20 and wants to swap for AliceERC721
	console.log("Alice address in Network 2", Alice2)
	console.log("Bob address in Network 2", Bob2)

	const contractOwner2 = accounts2[0] // owner of all the minted tokens when the contract was created, given how truffleconfig.js is composed

	// Initialization
	const tokenSupply = 1000
	const tokenAmount = 10 // Number of tokens to be exchanged
	const tokenId = 1;
	const senderInitialBalance = tokenAmount

	await init(provider1, provider2, contractOwner1, contractOwner2, Alice1, Bob2, tokenSupply, senderInitialBalance)

	console.log("\n Balances after init():")
	await getBalances(Alice1, Bob1, Alice2, Bob2)

	preimage = crypto.randomBytes(32) // to sample a preimage for the hash
	hash = crypto.createHash('sha256').update(preimage).digest()
	console.log("Hash: ", hash)

	let timeOut = 15
	let timeLockSeconds = Math.floor(Date.now() / 1000) + 2 * timeOut

	// Creating a HTLC contract for Alice locking her AliceERC721 tokens for Bob
	let lockTx1 = await lockToken(Alice1, Bob1, AliceERC721, 1, interopContract1, hash, timeLockSeconds, tokenId)
	if (!lockTx1) {
		console.log("\n !!! Locking of Alice's tokens failed in Netowrk 1. Aborting here !!!")
		return
	}
	let lockContractId1 = lockTx1.logs[0].args.lockContractId

	console.log("\n Balances after Alice locks her tokens in Network 1:")
	await getBalances(Alice1, Bob1, Alice2, Bob2)

	// After he observes this lockContract created in Network 1, 
	// Bob creates a similar contract in Network 2 using the same 
	// hash to transfer the agreed upon amount of BobERC20 to Alice.
	// Bob sets the timeLock such that he will have enough time to 
	// claim Alice's tokens in Network 1 after she claims Bob's 
	// tokens in Network 2.
	timeLockSeconds = Math.floor(Date.now() / 1000) + timeOut
	let lockTx2 = await lockToken(Bob2, Alice2, BobERC20, tokenAmount, interopContract2, hash, timeLockSeconds, tokenId)
	if (!lockTx2) {
		console.log("\n !!! Locking of Bob's tokens failed in Netowrk 2. Aborting here !!!")
		return
	}
	let lockContractId2 = lockTx2.logs[0].args.lockContractId

	console.log("\n Balances after creating Bob locks his tokens in Network 2:")
	await getBalances(Alice1, Bob1, Alice2, Bob2)

	// Alice withdrawing Bob's BobERC20 token from lockContractId2
	let claimSuccess2 = await claimToken(interopContract2, lockContractId2, Alice2, preimage)

	console.log("\n Balances after Alice's attempt to claim in Network 2:")
	await getBalances(Alice1, Bob1, Alice2, Bob2)

	// If Alice's claim is not successfull, then Alice and Bob unlock their locked tokens
	if (!claimSuccess2) {
		sleep(2 * timeOut * 1000)
		console.log("\n !!! Claim by Alice not successfull !!! \n Unlocking and refunding tokens to Alice and Bob")

		let unlockSuccess2 = await unlockToken(interopContract2, lockContractId2, Bob2)
		let unlockSuccess1 = await unlockToken(interopContract1, lockContractId1, Alice1)

		if (!unlockSuccess2)
			console.log("\n !!! Unlocking Bob's tokens not successfull !!!")
		if (!unlockSuccess1)
			console.log("\n !!! Unlocking Alice's tokens not successfull !!!")
	}
	else {
		// If Alice's withdrawal is successful, Bob goes ahead and claims Alice's
		// AliceERC721 tokens locked in the lockContractId1
		let claimSuccess1 = await claimToken(interopContract1, lockContractId1, Bob1, preimage)  // we assume Bob's claim to be successful if Alice's claim is successful

		if (!claimSuccess1) {
			console.log("\n !!! Claim by Bob not successfull !!! \n We had assumed Bob's claim will be successful if Alice's claim is successful")
		}
	}

	console.log("\n Balances after Bob's attempt to claim in Network 1:")
	await getBalances(Alice1, Bob1, Alice2, Bob2)
}

main()
