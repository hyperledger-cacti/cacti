import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")

const command: GluegunCommand = {
	name: 'claim',
  
	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset claim -network=network1 --lock_contract_id=lockContractID --recipient_account=2 --preimage=preimage`,
				'besu-cli asset claim --network=<network1|network2> --lock_contract_id=<lockContractID> --recipient_account=<2|1> --preimage=<preimage>',
				[
					{
						name: '--network',
						description:
							'network for command. <network1|network2>'
					},
					{
						name: '--lock_contract_id',
						description:
							'The address / ID of the lock contract.'
					},
					{
						name: '--recipient_account',
						description:
							'The index of the account of the recipient of the asset from the list obtained through web3.eth.getAccounts(). For example, we can set Alice as accounts[1] and hence value of this parameter for Alice can be 1.'
					},
					{
						name: '--preimage',
						description:
							'The preimage of hash with which the asset was locked with.'
					}
				],
				command,
				['asset', 'claim']
			)
			return
		}
		print.info('Claim assets (fungible assets for now)')
		const networkConfig = getNetworkConfig(options.network)
		console.log(networkConfig)
		console.log('Receiver', options.recipient_account)
		console.log('Lock Contract ID', options.lock_contract_id)
		console.log('Preimage', options.preimage)

		const provider = new Web3.providers.HttpProvider('http://'+networkConfig.networkHost+':'+networkConfig.networkPort)
		const web3N = new Web3(provider)
		const interopContract = await getContractInstance(provider, networkConfig.interopContract).catch(function () {
			console.log("Failed getting interopContract!");
		})
		const tokenContract = await getContractInstance(provider, networkConfig.tokenContract).catch(function () {
			console.log("Failed getting tokenContract!");
		})
		const accounts = await web3N.eth.getAccounts()

		// Receiving the input parameters
		const recipient = accounts[options.recipient_account]
		const lockContractId = options.lock_contract_id

		// Balance of the recipient before claiming
		var recipientBalance = await tokenContract.balanceOf(recipient)
		console.log(`Account balance of the recipient in Network ${options.network} before claiming: ${recipientBalance.toString()}`)

		await interopContract.claimFungibleAsset(lockContractId, options.preimage, {
			from: recipient,
		}).catch(function () {
			console.log("claimFungibleAsset threw an error");
		})

		// Balance of the recipient after claiming
		var recipientBalance = await tokenContract.balanceOf(recipient)
		console.log(`Account balance of the recipient in Network ${options.network} after claiming: ${recipientBalance.toString()}`)
	}
}

module.exports = command
