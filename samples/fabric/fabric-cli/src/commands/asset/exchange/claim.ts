/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { fabricHelper } from '../../../helpers/fabric-functions'
import logger from '../../../helpers/logger'
import { commandHelp, getNetworkConfig, handlePromise } from '../../../helpers/helpers'
import { AssetManager, HashFunctions } from '@hyperledger-labs/weaver-fabric-interop-sdk'

const command: GluegunCommand = {
  name: 'claim',
  alias: ['-c'],
  description: 'Asset Claim for HTLC',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli asset exchange claim --target-network=network1 --secret=secrettext --recipient=alice --contract-id=abc01`,
        'fabric-cli asset exchange claim --fungible --target-network=<network1|network2> --hash_fn=<hash-function> --secret=<secret> --recipient=<recipient-userid> --contract-id=<contract-id> --locker=<locker-userid> --param=<param>',
        [
          {
            name: '--fungible',
            description:
              'Flag to indicate fungible asset or non-fungible.'
          },
          {
            name: '--target-network',
            description:
              'Target network for command. <network1|network2>'
          },
          {
            name: '--hash_fn',
            description:
              'hash function to be used for HTLC. Supported: SHA256, SHA512. (Optional: Default: SHA256)'
          },
          {
            name: '--secret',
            description:
              'secret text to be used by Asset owner to hash lock'
          },
          {
            name: '--recipient',
            description:
              'Recipient User Id: Must be already registered in target-network'
          },
          {
            name: '--contract-id',
            description:
              'Contract Id generated in Lock.'
          },
          {
            name: '--locker',
            description:
              'Locker User Id: (Required only for non-fungible asset, if not passing contractID)'
          },
          {
            name: '--param',
            description:
              'Param: AssetType:AssetId used during lock (Required only for non-fungible asset, if not passing contractID)'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['asset', 'exchange', 'claim']
      )
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (!options['target-network'])
    {
      print.error('--target-network needs to specified')
      return
    }
    if (!options['recipient'])
    {
      print.error('Recipient needs to be specified')
      return
    }
    if (options['fungible'] && !options['contract-id']) {
        print.error('Required contractId for fungible assets')
        return
    }
    if (!options['contract-id'] && (!options['param'] || options['param'].split(':').length!=2 || !options['locker'])) {
      print.error(`Required either --contract-id or both locker userid in --locker, and asset type:id in --param for non-fungible assets`)
      return
    }
    if (!options['secret']) {
      print.error(`Required hash preimage in --secret`)
      return
    }
    // Hash
    let hash: HashFunctions.Hash
    if(options['hash_fn'] == 'SHA512') {
        hash = new HashFunctions.SHA512()
    } else {
        hash = new HashFunctions.SHA256()
    }
    hash.setPreimage(options['secret'])
    
    let contractId: string = null, params
    if (options['contract-id']) {
        contractId = options['contract-id']
    }
    else {
      params = options['param'].split(':')
    }

    const netConfig = getNetworkConfig(options['target-network'])
    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
      print.error(
        `Please use a valid --target-network. No valid environment found for ${options['target-network']} `
      )
      return
    }

    const network = await fabricHelper({
      channel: netConfig.channelName,
      contractName: netConfig.chaincode,
      connProfilePath: netConfig.connProfilePath,
      networkName: options['target-network'],
      mspId: netConfig.mspId,
      userString: options['recipient']
    })
    
    var funcToCall = AssetManager.claimAssetInHTLCusingContractId
    var asset = 'Asset'
    
    if (options['fungible']) {
        funcToCall = AssetManager.claimFungibleAssetInHTLC
        asset = 'Fungible Asset'
    }

    const spinner = print.spin(`Asset Exchange: Claim ${asset}:\n`)

    if (options['contract-id']) {
        try {
            spinner.info(`Trying ${asset} Claim with Contract ID: ${contractId}`)
            const res = await funcToCall(network.contract,
                          contractId,
                          hash)
            if (!res) {
                throw new Error()
            }
            spinner.info(`${asset} Claimed: ${res}`)
            spinner.succeed('Asset Exchange: Claim Complete.')
        } catch(error) {
            print.error(`Could not claim ${asset} in ${options['target-network']}`)
            spinner.fail(`Error`)
        }
    } else {
        try {
            const lockerId = await network.wallet.get(options['locker'])
            const lockerCert = Buffer.from((lockerId).credentials.certificate).toString('base64')
            spinner.info(`Trying ${asset} Claim with params: ${params[0]}, ${params[1]} locked by ${options.locker} for ${options.recipient}`)
            const res = await AssetManager.claimAssetInHTLC(network.contract,
                          params[0],
                          params[1],
                          lockerCert,
                          hash)
            if (!res) {
                throw new Error()
            }
            spinner.info(`${asset} Claimed: ${res}`)
            spinner.succeed('Asset Exchange: Claim Complete.')
        } catch(error) {
            print.error(`Could not claim ${asset} in ${options['target-network']}`)
            spinner.fail(`Error`)
        }
    }
    
    await network.gateway.disconnect()

    console.log('Gateways disconnected.')

    process.exit()
  }
}


module.exports = command
