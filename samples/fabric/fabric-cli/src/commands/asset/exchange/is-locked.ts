/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { fabricHelper } from '../../../helpers/fabric-functions'
import logger from '../../../helpers/logger'
import { commandHelp, getNetworkConfig, handlePromise } from '../../../helpers/helpers'
import { AssetManager } from '@hyperledger-labs/weaver-fabric-interop-sdk'

const command: GluegunCommand = {
  name: 'is-locked',
  alias: ['-il'],
  description: 'Asset Is Locked Query for HTLC',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli asset exchange is-locked --target-network=network1 --locker=alice --contract-id=abc01`,
        'fabric-cli asset exchange is-locked --fungible --target-network=<network1|network2> --locker=<locker-userid> --contract-id=<contract-id> --recipient=<recipient-userid> --param=<param>',
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
            name: '--secret',
            description:
              'secret text to be used by Asset owner to hash lock.'
          },
          {
            name: '--locker',
            description:
              'Locker User Id: Must be already registered in target-network'
          },
          {
            name: '--contract-id',
            description:
              'Contract Id generated in Lock.'
          },
          {
            name: '--recipient',
            description:
              'Recipient User Id: (Required only for non-fungible asset, if not passing contractID)'
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
        ['asset', 'exchange', 'is-locked']
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
    if (!options['locker'])
    {
      print.error('Locker needs to be specified')
      return
    }
    if (options['fungible'] && !options['contract-id']) {
        print.error('Required contractId for fungible assets')
        return
    }
    if (!options['contract-id'] && (!options['param'] || options['param'].split(':').length!=2 || !options['recipient'])) {
      print.error(`Required either --contract-id or both recipient userid in --recipient, and asset type:id in --param for non-fungible assets`)
      return
    }
    
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
      userString: options['locker']
    })
    
    var funcToCall = AssetManager.isAssetLockedInHTLCqueryUsingContractId
    var asset = 'Asset'
    
    if (options['fungible']) {
        funcToCall = AssetManager.isFungibleAssetLockedInHTLC
        asset = 'Fungible Asset'
    }

    const spinner = print.spin(`Asset Exchange: Query ${asset} Is Locked:\n`)

    if (options['contract-id']) {
        try {
            spinner.info(`Querying ${asset} Is Locked with ContractId: ${contractId}`)
            const res = await funcToCall(network.contract,
                          contractId)
            if (!res) {
                throw new Error()
            }
            spinner.info(`${asset} Is Locked Response: ${res}`)
            spinner.succeed('Asset Exchange: Query Complete.')
        } catch(error) {
            print.error(`Could not query ${asset} is-locked in ${options['target-network']}`)
            spinner.fail(`Error`)
        }
    } else {
        try {
            const lockerId = await network.wallet.get(options['locker'])
            const lockerCert = Buffer.from((lockerId).credentials.certificate).toString('base64')
            const recipientId = await network.wallet.get(options['recipient'])
            const recipientCert = Buffer.from((recipientId).credentials.certificate).toString('base64')
            spinner.info(`Querying ${asset} Is Locked with params: ${params[0]}, ${params[1]} locked by ${options.locker} for ${options.recipient}`)
            const res = await AssetManager.isAssetLockedInHTLC(network.contract,
                          params[0],
                          params[1],
                          recipientCert,
                          lockerCert)
            if (!res) {
                throw new Error()
            }
            spinner.info(`${asset} Is Locked Response: ${res}`)
            spinner.succeed('Asset Exchange: Query Complete.')
        } catch(error) {
            print.error(`Could not query ${asset} is-locked in ${options['target-network']}`)
            spinner.fail(`Error`)
        }
    }
    
    await network.gateway.disconnect()

    console.log('Gateways disconnected.')

    process.exit()
  }
}


module.exports = command
