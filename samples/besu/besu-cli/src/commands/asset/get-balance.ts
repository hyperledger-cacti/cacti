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
				`besu-cli asset get-balance --network=network1 --account=1`,
				'besu-cli asset get-balance --network=<network1|network2> --account=<1|2> --account_address=<account-address> --network_port=<port> --network_host=<host>',
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
						name: '--account_address',
						description:
							'The address of the account. We can set this parameter if we want to use account address instead of account index '
					},
					{
						name: '--network_host',
						description:
							'The network host. Default value is taken from config.json'
					},
					{
						name: '--network_port',
						description:
							'The network port. Default value is taken from config.json'
					}
				],
				command,
				['asset', 'get-balance']
			)
			return
		}
		print.info('Get account balance of tokens')
		const networkConfig = getNetworkConfig(options.network)

        var networkPort = networkConfig.networkPort
        if(options.network_port){
            networkPort = options.network_port
            console.log('Use network port : ', networkPort)
    	}
    	var networkHost = networkConfig.networkHost
    	if(options.network_host){
    	    networkHost = options.network_host
    	    console.log('Use network host : ', networkHost)
        }

		const provider = new Web3.providers.HttpProvider('http://'+networkHost+':'+networkPort)
		const web3N = new Web3(provider)
		const accounts = await web3N.eth.getAccounts()

		console.log(networkConfig.tokenContract)
		const tokenContract = await getContractInstance(provider, networkConfig.tokenContract).catch(function () {
			console.log("Failed getting tokenContract!");
		})

	   var accountAddress
	    if(options.account){
			accountAddress = accounts[options.account]
		}
		else if(options.account_address){
		    accountAddress = '0x'+ options.account_address
		}
		else{
			print.error('Account index not provided')
			return
		}

		console.log('Parameters')
		console.log('networkConfig', networkConfig)
		console.log('Account', accountAddress)
		var balance = await tokenContract.balanceOf(accountAddress)
		console.log(`Account balance of ${accountAddress} in Network ${options.network}: ${balance.toString()}`)
	}
}

module.exports = command
