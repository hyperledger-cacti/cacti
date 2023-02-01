import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
import * as assetManager from '@hyperledger-labs/weaver-besu-interop-sdk/src/AssetManager'
import { SHA256 } from "@hyperledger-labs/weaver-besu-interop-sdk/src/HashFunctions";

const Web3 = require('web3')

async function getBalances(tokenContract, address, token_id = 0) {
  try {
    var balance = await tokenContract.balanceOf(address, token_id)
  } catch {
    var balance = null
  }
  if (!balance) return await tokenContract.balanceOf(address)
  else return balance
}

const command: GluegunCommand = {
  name: 'claim',
  description: 'Claim assets (fungible assets for now)',

  run: async toolbox => {
    const {
      print,
      parameters: { options }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `besu-cli asset claim --network=network1 --lock_contract_id=lockContractID --recipient_account=2 --preimage=preimage`,
        'besu-cli asset claim --network=<network1|network2> --lock_contract_id=<lockContractID> --recipient_account=<2|1> --preimage=<preimage> --recipient_account_address=<recipient-account-address> --network_port=<port> --network_host=<host>',
        [
          {
            name: '--network',
            description: 'network for command. <network1|network2>'
          },
          {
            name: '--lock_contract_id',
            description: 'The address / ID of the lock contract.'
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
          },
          {
            name: '--recipient_account_address',
            description:
              'The address of the recipient account. We can set this parameter if we want to use account address instead of account index '
          },
          {
            name: '--token_id',
            description:
              'token ID for issuing tokens. Only applicable for ERC721 and ERC1155. Default: 0'
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
        ['asset', 'claim']
      )
      return
    }
    print.info('Claim assets')

    // Retrieving networkConfig
    if (!options.network) {
      print.error('Network ID not provided.')
      return
    }
    if (!options.token_id) {
      options.token_id=0
    }
    const networkConfig = getNetworkConfig(options.network)

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

    const provider = new Web3.providers.HttpProvider(
      'http://' + networkHost + ':' + networkPort
    )

    const web3N = new Web3(provider)
    const interopContract = await getContractInstance(
      provider,
      networkConfig.interopContract
    ).catch(function () {
      console.log('Failed getting interopContract!')
    })
    const tokenContract = await getContractInstance(
      provider,
      networkConfig.tokenContract
    ).catch(function () {
      console.log('Failed getting tokenContract!')
    })
    const accounts = await web3N.eth.getAccounts()

    // Receiving the input parameters
    var recipient
    if (options.recipient_account) {
      recipient = accounts[options.recipient_account]
    } else if (options.recipient_account_address) {
      recipient = '0x' + options.recipient_account_address
    } else {
      print.info(
        'Recipient account index not provided. Taking from networkConfig..'
      )
      recipient = accounts[networkConfig.recipientAccountIndex]
    }
    if (!options.lock_contract_id) {
      print.error('Lock contract ID not provided.')
      return
    }

    const lockContractId = '0x' + options.lock_contract_id
    if (!options.preimage) {
      print.error('Preimage not provided.')
      return
    }

    console.log('Parameters')
    console.log('networkConfig', networkConfig)
    console.log('Receiver', recipient)
    console.log('Lock Contract ID', lockContractId)
    console.log('Preimage', options.preimage)

    const preimage_bytes = web3N.utils.utf8ToHex(options.preimage)
    console.log('Preimage bytes:', preimage_bytes)

    // Balance of the recipient before claiming
    var recipientBalance = await getBalances(tokenContract, recipient, options.token_id)
    console.log(
      `Account balance of the recipient in Network ${options.network
      } before claiming: ${recipientBalance.toString()}`
    )

    const hash = new SHA256()
    hash.setPreimage(options.preimage)
    await assetManager
      .claimAssetInHTLC(
        interopContract,
        lockContractId,
        recipient,
        hash,
      )
      .catch(error => {
        console.log('claimAsset threw an error:', error)
      })

    // Balance of the recipient after claiming
    var recipientBalance = await getBalances(tokenContract, recipient, options.token_id)
    console.log(
      `Account balance of the recipient in Network ${options.network
      } after claiming: ${recipientBalance.toString()}`
    )
    process.exit()
  }
}

module.exports = command
