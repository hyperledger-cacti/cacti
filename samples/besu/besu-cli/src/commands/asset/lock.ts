import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")
const crypto = require('crypto')

const command: GluegunCommand = {
	name: 'lock',
 	description: 'Lock assets (fungible assets for now)',

	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset lock --network=network1 --sender_account=1 --recipient_account=2 --amount=5 --timeout=1000`,
				'besu-cli asset lock --network=<network1|network2> --sender_account=<1|2> --recipient_account=<2|1> --amount=<lock-amount> --timeout=<lock-duration-seconds> --hash_base64=<hashLock-optional-parameter> --recipient_account_address=<recipient-account-address> --sender_account_address=<sender-account-address>  --network_port=<port> --network_host=<host> ',
				[
					{
						name: '--network',
						description:
							'network for command. <network1|network2>'
					},
					{
						name: '--sender_account',
						description:
							'The index of the account of the sender/owner of the asset from the list obtained through web3.eth.getAccounts(). For example, we can set Alice as accounts[1] and hence value of this parameter for Alice can be 1.'
					},
					{
						name: '--sender_account_address',
						description:
							'The address of the sender account. We can set this parameter if we want to use account address instead of account index '
					},
					{
						name: '--recipient_account',
						description:
							'The index of the account of the recipient of the asset from the list obtained through web3.eth.getAccounts(). For example, we can set Alice as accounts[1] and hence value of this parameter for Alice can be 1.'
					},
					{
						name: '--recipient_account_address',
						description:
							'The address of the recipient account. We can set this parameter if we want to use account address instead of account index '
					},
					{
						name: '--amount',
						description:
							'The amount of fungible assets to be locked from the sender account specified on the network'
					},
					{
						name: '--timeout',
						description:
							'Time in seconds for which the asset will be locked. The asset will be locked till Date.now() + the timeout provided'
					},
					{
						name: '--hash_base64',
						description:
							'The hash value with which the asset will be locked i.e., providing its pre-image will enable unlocking the asset. This is an optional parameter. If not provided, we will generate a fresh hash pair with a randomly generated pre-image and output the corresponding pre-image.'
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
				['asset', 'lock']
			)
			return
		}
		print.info('Lock assets (fungible assets for now)')

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

		// Receving the input parameters
		if(!options.amount){
			print.error('Amount not provided.')
			return
		}
		const amount = options.amount
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
		var recipient
		if(options.recipient_account){
			recipient = accounts[options.recipient_account]
		}
		else if(options.recipient_account_address){
		     recipient = '0x'+ options.recipient_account_address
		}
		else{
			print.info('Recipient account index not provided. Taking from networkConfig..')
			recipient = accounts[networkConfig.recipientAccountIndex]
		}
		if(!options.timeout){
			print.error('Timeout not provided.')
			return
		}
		const timeLock = Math.floor(Date.now() / 1000) + options.timeout
		// The hash input has to be dealt with care. The smart contracts take in bytes as input. But the cli takes in strings as input. So to handle that, we take in the hash in its base64 version as input and then obtain the byte array from this. If a hash is not provided, we generate a base 64 encoding and then generate its corresponding byte array from it. This byte array will be input to generate the hash. 
		var hash
		var preimage
		var hash_base64
		var preimage_bytes
		if(options.hash_base64){
			hash_base64 = options.hash_base64
		}
		else{
			// Generate a hash pair if not provided as an input parameter
			preimage = crypto.randomBytes(22).toString('base64')
			hash_base64 = crypto.createHash('sha256').update(preimage).digest('base64')
			preimage_bytes = Buffer.from(preimage)
			console.log('Length of preimage byte array', preimage_bytes.length)
		}
		hash = Buffer.from(hash_base64, 'base64')
		
		console.log('Parameters:')
		console.log('networkConfig', networkConfig)
		console.log('Sender', sender)
		console.log('Receiver', recipient)
		console.log('Amount', options.amount)
		console.log('Timeout', timeLock)
		console.log('Hash (base64): ', hash_base64)
		console.log('Preimage: ', preimage)

		// Balances of sender and receiver before locking
		console.log(`Account balances before locking`)
		var senderBalance = await tokenContract.balanceOf(sender)
		console.log(`Account balance of the sender in Network ${options.network}: ${senderBalance.toString()}`)
		var recipientBalance = await tokenContract.balanceOf(recipient)
		console.log(`Account balance of the recipient in Network ${options.network}: ${recipientBalance.toString()}`)

		// Locking the asset (works only for ERC20 at this point)
		await tokenContract.approve(interopContract.address, amount, {from: sender}).catch(function () {
			console.log("Token approval failed!!!");
		})
		const lockTx = await interopContract.lockFungibleAsset(
			recipient,
			tokenContract.address,
			amount,
			hash,
			timeLock,
			{
				from: sender
			}
		).catch(function () {
			console.log("lockFungibleAsset threw an error");
		})
		const lockContractId = lockTx.logs[0].args.lockContractId
		console.log(`Lock contract ID: ${lockContractId.toString().substring(2)}`)

		// Balances of sender and receiver after locking
		console.log(`Account balances after locking`)
		var senderBalance = await tokenContract.balanceOf(sender)
		console.log(`Account balance of the sender in Network ${options.network}: ${senderBalance.toString()}`)
		var recipientBalance = await tokenContract.balanceOf(recipient)
		console.log(`Account balance of the recipient in Network ${options.network}: ${recipientBalance.toString()}`)
	}
}

module.exports = command
