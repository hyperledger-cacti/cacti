import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")

const command: GluegunCommand = {
	name: 'is-locked',
 	description: 'Check if a contract exists, which also checks if an asset is locked',

	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset is-locked -network=network1 --lock_contract_id=lockContractID`,
				'besu-cli asset is-locked --network=<network1|network2> --lock_contract_id=<lockContractID>',
				[
					{
						name: '--network',
						description:
							'network for command. <network1|network2>'
					},
					{
						name: '--lock-contract-id',
						description:
							'The address / ID of the lock contract.'
					},
				],
				command,
				['asset', 'is-locked']
			)
			return
		}
		print.info('Check if a contract exists, which also checks if an asset is locked')
		const networkConfig = getNetworkConfig(options.network)
		if(!options.lock_contract_id){
			print.error('Lock contract ID not provided.')
			return
		}

		console.log('Parameters')
		console.log('networkConfig', networkConfig)
		console.log('Lock Contract ID', options.lock_contract_id)
		
		const provider = new Web3.providers.HttpProvider('http://'+networkConfig.networkHost+':'+networkConfig.networkPort)
		const web3N = new Web3(provider)
		const interopContract = await getContractInstance(provider, networkConfig.interopContract)	
		const accounts = await web3N.eth.getAccounts()
		var sender = accounts[networkConfig.senderAccountIndex]

		var isLocked = await interopContract.isFungibleAssetLocked(options.lock_contract_id, {
			from: sender
		}).catch(function () {
			console.log("isFungibleAssetLocked threw an error");
		})
		console.log(`Is there an asset locked in ${options.lock_contract_id} in Network ${options.network}: ${isLocked}`) //Todo: Debug. isLocked is not printing correctly.
	}
}

module.exports = command
