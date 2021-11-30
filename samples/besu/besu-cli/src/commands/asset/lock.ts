import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require ("web3")
const crypto = require('crypto')

const command: GluegunCommand = {
	name: 'lock',
  
	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset lock --network=network1 --sender_account=1 --recipient_account=2 --amount=5 --timeout=10`,
				'besu-cli asset lock --network=<network1|network2> --sender_account=<1|2> --recipient_account=<2|1> --amount=<lock-amount> --timeout=<lock-duration-seconds> --hash=<hashLock-optional-parameter>',
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
						name: '--recipient_account',
						description:
							'The index of the account of the recipient of the asset from the list obtained through web3.eth.getAccounts(). For example, we can set Alice as accounts[1] and hence value of this parameter for Alice can be 1.'
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
						name: '--hash',
						description:
							'The hash value with which the asset will be locked i.e., providing its pre-image will enable unlocking the asset. This is an optional parameter. If not provided, we will generate a fresh hash pair with a randomly generated pre-image and output the corresponding pre-image.'
					}
				],
				command,
				['asset', 'lock']
			)
			return
		}
		print.info('Lock assets (fungible assets for now)')
		const networkConfig = getNetworkConfig(options.network)
		console.log(networkConfig)
		console.log('Sender', options.sender_account)
		console.log('Receiver', options.recipient_account)
		console.log('Amount', options.amount)
		console.log('Timeout', options.timeout)


		const provider = new Web3.providers.HttpProvider('http://'+networkConfig.networkHost+':'+networkConfig.networkPort)
		const web3N = new Web3(provider)
		const interopContract = await getContractInstance(provider, networkConfig.interopContract).catch(function () {
			console.log("Failed getting interopContract!");
		})
		const tokenContract = await getContractInstance(provider, networkConfig.tokenContract).catch(function () {
			console.log("Failed getting tokenContract!");
		})
		const accounts = await web3N.eth.getAccounts()

		// Receving the input parameters
		const amount = options.amount
		const sender = accounts[options.sender_account]
		const recipient = accounts[options.recipient_account]
		const timeLock = Math.floor(Date.now() / 1000) + options.timeout
		var hash = options.hash
		var preimage

		if(!hash){
			// Generate a hash pair if not provided as an input parameter
			preimage = crypto.randomBytes(32)
			hash = crypto.createHash('sha256').update(preimage).digest()
		}
		console.log('Preimage: ', preimage)
		console.log('Hash: ', hash)

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
		console.log(`Lock contract ID: ${lockContractId}`)

		// Balances of sender and receiver after locking
		console.log(`Account balances after locking`)
		var senderBalance = await tokenContract.balanceOf(sender)
		console.log(`Account balance of the sender in Network ${options.network}: ${senderBalance.toString()}`)
		var recipientBalance = await tokenContract.balanceOf(recipient)
		console.log(`Account balance of the recipient in Network ${options.network}: ${recipientBalance.toString()}`)
	}
}

module.exports = command
