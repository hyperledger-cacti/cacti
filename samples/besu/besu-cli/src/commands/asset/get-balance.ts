import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")

const command: GluegunCommand = {
	name: 'get-balance',
	description: 'Get account balance of tokens',

	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset get-balance -network=network1 --account=1`,
				'besu-cli asset get-balance --network=<network1|network2> --account=<1|2>',
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
				],
				command,
				['asset', 'get-balance']
			)
			return
		}
		print.info('Get account balance of tokens')
		const networkConfig = getNetworkConfig(options.network)
		const provider = new Web3.providers.HttpProvider('http://'+networkConfig.networkHost+':'+networkConfig.networkPort)
		const web3N = new Web3(provider)
		const accounts = await web3N.eth.getAccounts()

		const tokenContract = await getContractInstance(provider, networkConfig.tokenContract).catch(function () {
			console.log("Failed getting tokenContract!");
		})
	
		if(!options.account){
			print.error('Account index not provided')
			return
		}
		const accountAddress = accounts[options.account]

		console.log('Parameters')
		console.log('networkConfig', networkConfig)
		console.log('Account', accountAddress)
		var balance = await tokenContract.balanceOf(accountAddress)
		console.log(`Account balance of accounts[${options.account}] in Network ${options.network}: ${balance.toString()}`)
	}
}

module.exports = command
