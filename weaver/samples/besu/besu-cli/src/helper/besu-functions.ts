const fs = require('fs')
const contract = require("@truffle/contract");
const path = require('path')


// Function to obtain an instance of a smart contract when provided
// as input the path to its JSON file output by 'truffle compile'.
// (Assuming that the current folder is a sibling folder to build,
// the path to json would be ../build/contracts/ContractName.json)
async function getContractInstance(provider, pathToJson){
	const jsonFile = path.resolve(pathToJson)
	var jsonFileContents = fs.readFileSync(jsonFile)
	var contractName = contract(JSON.parse(jsonFileContents))
	contractName.setProvider(provider)
	var instance = await contractName.deployed().catch(function () {
		console.log("Failed getting the contractName!");
	})

	return instance
}

// Function to obtain the account balances of sender and recipient for 
// the specified token type and print them them to the console
async function getBalances(tokenContract, sender, recipient){
	var senderBalance = await tokenContract.balanceOf(sender)
	console.log(`Account balance of the sender: ${senderBalance.toString()}`)
	var recipientBalance = await tokenContract.balanceOf(recipient)
	console.log(`Account balance of the recipient: ${recipientBalance.toString()}`)
}


export {
	getContractInstance,
	getBalances
}
