import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance, getBalances } from '../../helper/besu-functions'
const Web3 = require ("web3")
const crypto = require('crypto')

const command: GluegunCommand = {
	name: 'exchange',
	description: 'Cross-network exchange of assets (fungible assets for now)',

	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset exchange --network1=network1 --network2=network2 --amount=5 --timeout=20`,
				'besu-cli asset exchange --local-network=<network1|network2> --user=<user-id> <channel-name> <contract-name> <function-name> <args>',
				[
					{
						name: '--network1',
						description:
							'network 1 for command. In our case, <network1|network2>'
					},
					{
						name: '--network2',
						description:
							'network 2 for command. In our case, <network1|network2>'
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
				['asset', 'exchange']
			)
			return
		}
		print.info('Cross-network exchange of assets (fungible assets for now)')

		// Checking the receipt of inputs
		if(!options.network1){
			print.error('Network1 ID not provided.')
			return
		}
		if(!options.network2){
			print.error('Network2 ID not provided.')
			return
		}
		if(!options.amount){
			print.error('Amount not provided.')
			return
		}
		if(!options.timeout){
			print.error('Timeout not provided.')
			return
		}

		// Retrieving networkConfigs
		const network1Config = getNetworkConfig(options.network1)
		console.log(network1Config)
		const network2Config = getNetworkConfig(options.network2)
		console.log(network2Config)
		console.log('Token contract 1', network1Config.tokenContract)

		console.log('Interop contract 1', network1Config.interopContract)
		console.log('Sender 1', network1Config.senderAccountIndex)
		console.log('Receiver 1', network1Config.recipientAccountIndex)
		console.log('Token contract 2', network2Config.tokenContract)
		console.log('Interop contract 2', network2Config.interopContract)
		console.log('Sender 2', network2Config.senderAccountIndex)
		console.log('Receiver 2', network2Config.recipientAccountIndex)
		console.log('Amount', options.amount)
		console.log('Timeout', options.timeout)

		const provider1 = new Web3.providers.HttpProvider('http://'+network1Config.networkHost+':'+network1Config.networkPort)
		var web3N = new Web3(provider1)
		const interopContract1 = await getContractInstance(provider1, network1Config.interopContract).catch(function () {
			console.log("Failed getting interopContract1!");
			return
		})
		const tokenContract1 = await getContractInstance(provider1, network1Config.tokenContract).catch(function () {
			console.log("Failed getting tokenContract1!");
			return
		})
		const accounts1 = await web3N.eth.getAccounts()

		const provider2 = new Web3.providers.HttpProvider('http://'+network2Config.networkHost+':'+network2Config.networkPort)
		var web3N = new Web3(provider2)
		const interopContract2 = await getContractInstance(provider2, network2Config.interopContract).catch(function () {
			console.log("Failed getting interopContract2!");
			return
		})
		const tokenContract2 = await getContractInstance(provider2, network2Config.tokenContract).catch(function () {
			console.log("Failed getting tokenContract2!");
			return
		})
		const accounts2 = await web3N.eth.getAccounts()

		// Receving the input parameters
		const amount = options.amount
		const sender1 = accounts1[network1Config.senderAccountIndex]
		const recipient1 = accounts1[network1Config.recipientAccountIndex]
		const sender2 = accounts2[network2Config.senderAccountIndex]
		const recipient2 = accounts2[network2Config.recipientAccountIndex]
		const timeLock = Math.floor(Date.now() / 1000) + options.timeout
		var hash = options.hash
		var preimage

		// Generate a hash pair if not provided as an input parameter
		if(!hash) {
			preimage = crypto.randomBytes(32)
			hash = crypto.createHash('sha256').update(preimage).digest()
			console.log('Preimage: ', preimage)
			console.log('Hash: ', hash)
		}

		// ------------ Locking in Network 1 -------------
		// Balances of sender and receiver before locking in Network 1
		console.log(`Account balances before locking in Network 1`)
		await getBalances(tokenContract1, sender1, recipient1)

		// Locking the asset (works only for ERC20 at this point)
		await tokenContract1.approve(interopContract1.address, amount, {from: sender1}).catch(function () {
			console.log("Token1 approval failed!!!");
			return
		})

		const lockTx1 = await interopContract1.lockAsset(
			recipient1,
			tokenContract1.address,
			amount,
			hash,
			timeLock,
			{
				from: sender1
			}
		).catch(function () {
			console.log("lockAsset threw an error in Network 1");
			return
		})
		const lockContractId1 = lockTx1.logs[0].args.lockContractId
		console.log('Lock contract1 ID: ', lockContractId1)

		// Balances of sender and receiver after locking in Network 1
		console.log(`Account balances after locking in Network 1`)
		await getBalances(tokenContract1, sender1, recipient1)

		// ------------ Locking in Network 2 -------------
		// Balances of sender and receiver before locking in Network 2
		console.log(`Account balances before locking in Network 2`)
		await getBalances(tokenContract2, sender2, recipient2)

		// Locking the asset (works only for ERC20 at this point)
		await tokenContract2.approve(interopContract2.address, amount, {from: sender2}).catch(async function () {
			console.log("Token2 approval failed!!!");
			await interopContract1.unlockAsset(lockContractId1, {
				from: sender1
			}).catch(function () {
				console.log("unlockAsset threw an error in Network 1");
			})
			return
		})

		const lockTx2 = await interopContract2.lockAsset(
			recipient2,
			tokenContract2.address,
			amount,
			hash,
			timeLock,
			{
				from: sender2
			}
		).catch(async function () {
			console.log("lockAsset threw an error in Network 2");
			await interopContract1.unlockAsset(lockContractId1, {
				from: sender1
			}).catch(function () {
				console.log("unlockAsset threw an error in Network 1");
			})
			return
		})
		const lockContractId2 = lockTx2.logs[0].args.lockContractId
		console.log(`Lock contract2 ID: ${lockContractId2}`)

		// Balances of sender and receiver after locking in Network 2
		console.log(`Account balances after locking in Network 2`)
		await getBalances(tokenContract2, sender2, recipient2)

		// ------------ Withdrawal in Network 1 -------------
		await interopContract1.claimAsset(lockContractId1, preimage, {from: recipient1}).catch(async function () {
			console.log("claimAsset threw an error in Network 1");
			await interopContract1.unlockAsset(lockContractId1, {
				from: sender1
			}).catch(function () {
				console.log("unlockAsset threw an error in Network 1");
			})
			await interopContract2.unlockAsset(lockContractId2, {
				from: sender2
			}).catch(function () {
				console.log("unlockAsset threw an error in Network 2");
			})
			return
		})
		console.log(`Account balances after withdrawal in Network 1`)
		await getBalances(tokenContract1, sender1, recipient1)

		// ------------ Withdrawal in Network 2 -------------
		await interopContract2.claimAsset(lockContractId2, preimage, {from: recipient2}).catch(function () {
			console.log("claimAsset threw an error in Network 2");
			return
		})
		console.log(`Account balances after withdrawal in Network 2`)
		await getBalances(tokenContract2, sender2, recipient2)
		// TODO: check whether the claim is successful
	}
}

module.exports = command
