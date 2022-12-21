require('dotenv').config();
const fs = require("fs")
const readline = require('readline')
const promisify = require('util').promisify
const sleep = promisify(require('timers').setTimeout)
const Web3 = require ("web3")

const networkHost = process.env.BESU_NETWORK_HOST ? process.env.BESU_NETWORK_HOST  : "localhost"
const networkPort = process.env.BESU_NETWORK_PORT ? process.env.BESU_NETWORK_PORT : "8545"

const web3 = new Web3(new Web3.providers.HttpProvider('http://'+networkHost+':'+networkPort))

async function getNetworkDetails() {

	// Get the accounts linked
	accounts = await web3.eth.getAccounts()

	// Get the network ID
	networkId = await web3.eth.net.getId()

	return {
		accounts,
		networkId
	}
}


async function main() {

	truffleConfigTemplateString = fs.readFileSync('truffle-config.js').toString().split('\n')
	truffleConfigFileString = ''

	let networkDetails = await getNetworkDetails()
	let accounts = networkDetails.accounts,
		networkId = networkDetails.networkId

	for (const line of truffleConfigTemplateString) {
        // Each line in the file will be successively available here as `line`.
		str = line;
	
		if(str.trim().startsWith("host:")) {
			str = "\t\t\thost: \""+networkHost+"\","
		}

		if(str.trim().startsWith("port:")) {
			str = "\t\t\tport: "+networkPort+", // 7545 - default for Ganache"
		}

		if(str.trim().startsWith("network_id:")) {
			str = "\t\t\tnetwork_id: \""+networkId+"\", // 4447 - default for Ganache"
		}

		if(str.trim().startsWith("from:")) {
			str = "\t\t\tfrom: \""+accounts[0]+"\","
		}

		if(!str.startsWith("}")) {
			str = str + "\n"
		}

		truffleConfigFileString += str
	}

	// Writing the updated content to truffle-config
	fs.writeFileSync(
		   'truffle-config.js',
		    truffleConfigFileString
		  )

}

main()
