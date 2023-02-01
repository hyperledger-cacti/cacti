import { GluegunCommand } from 'gluegun'
import { getNetworkConfig, commandHelp } from '../../helper/helper'
import { getContractInstance } from '../../helper/besu-functions'
import * as assetManager from '@hyperledger-labs/weaver-besu-interop-sdk/src/AssetManager'
const Web3 = require('web3')

const command: GluegunCommand = {
  name: 'is-locked',
  description:
    'Check if a contract exists, which also checks if an asset is locked',

  run: async toolbox => {
    const {
      print,
      parameters: { options }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `besu-cli asset is-locked --network=network1 --lock_contract_id=lockContractID`,
        'besu-cli asset is-locked --network=<network1|network2> --lock_contract_id=<lockContractID>  --network_port=<port> --network_host=<host>',
        [
          {
            name: '--network',
            description: 'network for command. <network1|network2>'
          },
          {
            name: '--lock-contract-id',
            description: 'The address / ID of the lock contract.'
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
        ['asset', 'is-locked']
      )
      return
    }
    print.info(
      'Check if a contract exists, which also checks if an asset is locked'
    )
    const networkConfig = getNetworkConfig(options.network)
    if (!options.lock_contract_id) {
      print.error('Lock contract ID not provided.')
      return
    }
    const lockContractId = '0x' + options.lock_contract_id

    console.log('Parameters')
    console.log('networkConfig', networkConfig)
    console.log('Lock Contract ID', lockContractId)

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
    // const web3N = new Web3(provider)
    const interopContract = await getContractInstance(
      provider,
      networkConfig.interopContract
    )
    // const accounts = await web3N.eth.getAccounts()
    // var sender = accounts[networkConfig.senderAccountIndex]

    var isLocked = await assetManager
      .isAssetLockedInHTLC(interopContract, lockContractId)
      .catch(function() {
        console.log('isAssetLocked threw an error')
      })
    console.log(
      `Is there an asset locked in ${lockContractId} in Network ${options.network}: ${isLocked}`
    ) //Todo: Debug. isLocked is not printing correctly.
    process.exit()
  }
}

module.exports = command
