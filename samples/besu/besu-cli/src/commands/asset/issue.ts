import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")

const command: GluegunCommand = {
	name: 'issue',
	description: 'Issuance of tokens',
	run: async toolbox => {
		const {
 			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset issue --network=network1 --account=1 --amount=10`,
				'besu-cli asset issue --network=<network1|network2> --account=<account-index> --amount=<issue-ammount>',
				[
					{
						name: '--network',
						description:
							'network for command. <network1|network2>'
					},
					{
						name: '--account',
						description:
							'The index of the account from the list obtained through web3.eth.getAccounts(). For example, we can set Alice as accounts[1] and hence value of this parameter for Alice can be 1.'
					},
					{
						name: '--amount',
						description:
							'The amount to be added to the account specified on the network'
					}
				],
				command,
				['asset', 'issue']
			)
			return
		}
		print.info('Issuance of tokens')
		if(!options.network){
			print.error('Network ID not provided.')
			return
		}
		const networkConfig = getNetworkConfig(options.network)
		console.log('networkConfig', networkConfig)
	
		const provider = new Web3.providers.HttpProvider('http://'+networkConfig.networkHost+':'+networkConfig.networkPort)
		const web3N = new Web3(provider)
		const tokenContract = await getContractInstance(provider, networkConfig.tokenContract).catch(function () {
			console.log("Failed getting tokenContract!");
		})
		const accounts = await web3N.eth.getAccounts()

		var accountIndex
		const contractOwner = accounts[0]
		if(options.account){
			accountIndex = options.account
		}
		else{
			accountIndex = networkConfig.senderAccountIndex
		}
		if(!options.amount){
			print.error('Amount not provided')
			return
		}
	
		// Transfer from the contract owner to the account specified
		await tokenContract.transfer(accounts[accountIndex], options.amount, {from: contractOwner}).catch(function () {
			console.log("tokenContract transfer threw an error; Probably the token supply is used up!");
		})

		var balance = await tokenContract.balanceOf(accounts[options.account])
		console.log(`Account balance of accounts[${options.account}] in Network ${options.network}: ${balance.toString()}`)
	}
}

module.exports = command
