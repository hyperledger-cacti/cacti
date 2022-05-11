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
				'besu-cli asset unlock --network=<network1|network2> --lock_contract_id=<lockContractID> --sender_account=<1|2> --sender_account_address=<sender-account-address>  --network_port=<port> --network_host=<host> ',
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
					},
					{
						name: '--sender_account_address',
						description:
							'The address of the sender account. We can set this parameter if we want to use account address instead of account index '
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
		else if(options.sender_account_address){
		    sender = '0x'+ options.sender_account_address
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

		console.log('Parameters')
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
