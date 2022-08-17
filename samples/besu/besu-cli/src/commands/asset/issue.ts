import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
const Web3 = require("web3")

const command: GluegunCommand = {
	name: 'issue',
	description: 'Issuance of tokens',
	run: async toolbox => {
		const {
			print,
			parameters: { options }
		} = toolbox
		if (options.help || options.h) {
			commandHelp(
				print,
				toolbox,
				`besu-cli asset issue --network=network1 --account=1 --amount=10`,
				'besu-cli asset issue --network=<network1|network2> --account=<account-index> --account_address=<account-address> --contract_owner_address=<contract-owner-address>  --amount=<issue-amount> --network_port=<port> --network_host=<host> ',
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
					}, {
						name: '--contract_owner_address',
						description:
							'The address of the contract owner. The default value is accounts[0]  '
					},
					{
						name: '--amount',
						description:
							'The amount to be added to the account specified on the network'
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
					},
					{
						name: '--asset_type',
						description:
							'Asset type for issuing tokens. Default value is ERC20, other options are ERC721, ERC1155'
					},
					{
						name: '--token_id',
						description:
							'token ID for issuing tokens. Only applicable for ERC721, ERC1155'
					},
					{
						name: '--token_data',
						description:
							'token data for issuing tokens. Only applicable for ERC1155'
					}

				],
				command,
				['asset', 'issue']
			)
			return
		}
		print.info('Issuance of tokens')
		if (!options.network) {
			print.error('Network ID not provided.')
			return
		}
		const networkConfig = getNetworkConfig(options.network)
		console.log('networkConfig', networkConfig)

		var networkPort = networkConfig.networkPort
		if (options.network_port) {
			networkPort = options.network_port
			console.log('Use network port : ', networkPort)
		}
		var networkHost = networkConfig.networkHost
		if (options.network_host) {
			networkHost = options.network_host
			console.log('Use network host : ', networkHost)
		}


		const provider = new Web3.providers.HttpProvider('http://' + networkHost + ':' + networkPort)
		const web3N = new Web3(provider)
		const tokenContract = await getContractInstance(provider, networkConfig.tokenContract).catch(function () {
			console.log("Failed getting tokenContract!");
		})
		const accounts = await web3N.eth.getAccounts()


		var contractOwner = accounts[0]
		if (options.contract_owner_address) {
			contractOwner = '0x' + options.contract_owner_address
		}

		var account
		if (options.account) {
			account = accounts[options.account]
		}
		else if (options.account_address) {
			account = '0x' + options.account_address
		} else {
			account = accounts[networkConfig.senderAccountIndex]
		}

		if (!options.amount) {
			print.error('Amount not provided')
			return
		}

		if(!options.asset_type) {
			options.asset_type = "ERC20"
		}

		if(!options.token_id) {
			options.token_id = 0
		}
		
		if(!options.token_data) {
			options.token_data = 0
		}

		console.log(`Contract owner address is ${contractOwner} `)
		console.log(`Receiver address is ${account} `)
		console.log(`Token contract is ${tokenContract.address} `)
		// Transfer from the contract owner to the account specified
		if (options.asset_type == 'ERC20') {
			await tokenContract.transfer(account, options.amount, { from: contractOwner }).catch(function () {
				console.log("tokenContract transfer threw an error; Probably the token supply is used up!");
			})
		} else if (options.asset_type == 'ERC721') {
			await tokenContract.mint(account, { from: contractOwner }).catch(function () {
				console.log("tokenContract transfer threw an error; Probably the token supply is used up!");
			})
		} else if (options.asset_type == 'ERC1155'){
			await tokenContract.mint(account, options.token_id, options.amount, Web3.utils.utf8ToHex(options.token_data), { from: contractOwner }).catch(function () {
				console.log("tokenContract transfer threw an error; Probably the token supply is used up!");
			})
		}
		if(options.asset_type == 'ERC1155'){
			var balance = await tokenContract.balanceOf(account, options.token_id)}
		else
			var balance = await tokenContract.balanceOf(account);
		console.log(`Account balance of ${account} in Network ${options.network}: ${balance.toString()}`)
	}
}

module.exports = command
