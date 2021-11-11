import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")

const command: GluegunCommand = {
	name: 'is-locked',
  
	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset is-locked -network=network1 --interop_contract='path/to/interopcontract.json' --lock_contract_id=lockContractID`,
				'besu-cli asset is-locked --network=<network1|network2> --interop_contract=<path-to-interopContract.json> --lock_contract_id=<lockContractID>',
				[
					{
						name: '--network',
						description:
							'network for command. <network1|network2>'
					},
					{
						name: '--interop_contract',
						description:
							'Path to the json file corresponding to the interop contract compiled with Truffle.'
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
		console.log(networkConfig)

		const provider = new Web3.providers.HttpProvider('http://'+networkConfig.networkHost+':'+networkConfig.networkPort)
		const interopContract = await getContractInstance(provider, options.interop_contract)

		var isLocked = interopContract.isFungibleAssetLocked(options.lock_contract_id)
		console.log(`Is there an asset locked in ${options.lock_conntract_id} in Network ${options.network}: ${isLocked}`)
	}
}

module.exports = command
