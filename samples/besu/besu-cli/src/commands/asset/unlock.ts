import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")

const command: GluegunCommand = {
	name: 'unlock',
	description: 'Unlock and reclaim assets after timeout (fungible assets for now)',

	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset unlock --network=network1 --lock_contract_id=lockContractID --sender_account=1`,
				'besu-cli asset unlock --network=<network1|network2> --lock_contract_id=<lockContractID> --sender_account=<1|2>',
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
						name: '--sender_account',
						description:
							'The index of the account of the sender of the asset from the list obtained through web3.eth.getAccounts(). For example, we can set Alice as accounts[1] and hence value of this parameter for Alice can be 1.'
					}
				],
				command,
				['asset', 'unlock']
			)
			return
		}
		print.info('Unlock and reclaim assets after timeout (fungible assets for now)')

		// Retrieving networkConfig
		if(!options.network){
			print.error('Network ID not provided.')
			return
		}
		const networkConfig = getNetworkConfig(options.network)
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
		var sender
		if(options.sender_account){
			sender = accounts[options.sender_account]
		}
		else{
			print.info('Sender account index not provided. Taking from networkConfig..')
			sender = accounts[networkConfig.senderAccountIndex]
		}
		if(!options.lock_contract_id){
			print.error('Lock contract ID not provided.')
			return
		}
		const lockContractId = '0x' + options.lock_contract_id

		console.log('Paramters')
		console.log('networkConfig', networkConfig)
		console.log('Sender', sender)
		console.log('Lock Contract ID', lockContractId)

		// Balance of the recipient before claiming
		var senderBalance = await tokenContract.balanceOf(sender)
		console.log(`Account balance of the sender in Network ${options.network} before unlocking: ${senderBalance.toString()}`)

		await interopContract.unlockFungibleAsset(lockContractId, {
			from: sender
		}).catch(function () {
			console.log("unlockFungibleAsset threw an error");
		})

		// Balance of the recipient after claiming
		var senderBalance = await tokenContract.balanceOf(sender)
		console.log(`Account balance of the sender in Network ${options.network} after unlocking: ${senderBalance.toString()}`)
	}
}

module.exports = command
