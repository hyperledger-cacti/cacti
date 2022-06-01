/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { fabricHelper, invoke } from '../../helpers/fabric-functions'
import logger from '../../helpers/logger'
import { commandHelp, getNetworkConfig, handlePromise } from '../../helpers/helpers'
import { AssetManager, HashFunctions } from '@hyperledger-labs/weaver-fabric-interop-sdk'

var crypto = require('crypto');

const command: GluegunCommand = {
  name: 'exchange-all',
  alias: ['-eall'],
  description: 'Asset Exchange All steps.',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli asset exchange --network1=network1 --network2=network2 --secret=secrettext --timeout-duration=100 bob:Type1:a04:alice:token1:100`,
        'fabric-cli asset exchange --network1=<network1|network2> --network2=<network1|network2> --secret=<secret> --timeout-epoch=<timeout-epoch> --timeout-duration=<timeout-duration> <params>',
        [
          {
            name: '--network1',
            description:
              'Asset network for command. <network1|network2>'
          },
          {
            name: '--network2',
            description:
              'Fungible Asset network for command. <network1|network2>'
          },
          {
            name: '--secret',
            description:
              'secret text to be used Asset owner to hash lock'
          },
          {
            name: '--timeout-epoch',
            description:
              'Timeout in epoch in seconds. Use only one of the timeout options.'
          },
          {
            name: '--timeout-duration',
            description:
              'Timeout duration in seconds. Use only one of the timeout options.'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['asset', 'exchange-all']
      )
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (array.length < 1) {
      print.error('Not enough arguments supplied')
      return
    }
    if (!options['network1'] || !options['network2'])
    {
      print.error('--network1 and --network2 both needs to specified')
      return
    }

    // Hash
    let hash = new HashFunctions.SHA256()
    
    if (options['secret'])
    {
        hash.setPreimage(options['secret'])
    }

    // Timeout
    var timeout=0, timeout2=0;
    const currTime = Math.floor(Date.now()/1000);
    if (options['timeout-epoch']) {
      let duration = options['timeout-epoch'] - currTime
      timeout = options['timeout-epoch']
      timeout2 = options['timeout-epoch'] + duration
    }
    else if (options['timeout-duration']) {
      timeout=currTime + options['timeout-duration']
      timeout2=currTime + 2 * options['timeout-duration']
    }

    // Read params
    const params = array[0].split(':')
    const user1 = params[0]
    const assetType = params[1]
    const assetId = params[2]
    const user2 = params[3]
    const fungibleAssetType = params[4]
    const fungibleAssetAmt = parseInt(params[5])

    // For debugging purpose
    // console.log(secret, hash_secret, timeout)
    // console.log(user1, assetType, assetId)
    // console.log(user2, fungibleAssetType, fungibleAssetAmt)

    const net1Config = getNetworkConfig(options['network1'])
    const net2Config = getNetworkConfig(options['network2'])
    if (!net1Config.connProfilePath || !net1Config.channelName || !net1Config.chaincode) {
      print.error(
        `Please use a valid --network1. No valid environment found for ${options['network1']} `
      )
      return
    }
    if (!net2Config.connProfilePath || !net2Config.channelName || !net2Config.chaincode) {
      print.error(
        `Please use a valid --network2. No valid environment found for ${options['network2']} `
      )
      return
    }

    const network1U1 = await fabricHelper({
      channel: net1Config.channelName,
      contractName: net1Config.chaincode,
      connProfilePath: net1Config.connProfilePath,
      networkName: options['network1'],
      mspId: net1Config.mspId,
      userString: user1
    })

    const network1U2 = await fabricHelper({
      channel: net1Config.channelName,
      contractName: net1Config.chaincode,
      connProfilePath: net1Config.connProfilePath,
      networkName: options['network1'],
      mspId: net1Config.mspId,
      userString: user2
    })

    const network2U1 = await fabricHelper({
      channel: net2Config.channelName,
      contractName: net2Config.chaincode,
      connProfilePath: net2Config.connProfilePath,
      networkName: options['network2'],
      mspId: net2Config.mspId,
      userString: user1
    })

    const network2U2 = await fabricHelper({
      channel: net2Config.channelName,
      contractName: net2Config.chaincode,
      connProfilePath: net2Config.connProfilePath,
      networkName: options['network2'],
      mspId: net2Config.mspId,
      userString: user2
    })


    const user1IdN1 = await network1U1.wallet.get(user1)
    const user1CertN1 = Buffer.from((user1IdN1).credentials.certificate).toString('base64')
    const user1IdN2 = await network2U1.wallet.get(user1)
    const user1CertN2 = Buffer.from((user1IdN2).credentials.certificate).toString('base64')

    const user2IdN1 = await network1U2.wallet.get(user2)
    const user2CertN1 = Buffer.from((user2IdN1).credentials.certificate).toString('base64')
    const user2IdN2 = await network2U2.wallet.get(user2)
    const user2CertN2 = Buffer.from((user2IdN2).credentials.certificate).toString('base64')

    // console.log(user1CertN2)
    // console.log(user2CertN1)

    const spinner = print.spin(`Asset Exchange:\n`)

    var res
    var contractId

    try {
      spinner.info(`Trying Asset Lock: ${assetType}, ${assetId}`)
      res = await AssetManager.createHTLC(network1U1.contract,
                      assetType,
                      assetId,
                      user2CertN1,
                      hash,
                      timeout2,
                      null)
      if (!res.result) {
        throw new Error()
      }
      spinner.info(`Asset Locked: ${res.result}`)
    } catch(error) {
        print.error(`Could not Lock Asset in ${options['network1']}`)
        spinner.fail(`Error`)
        process.exit()
    }

    try {
      spinner.info(`Trying Fungible Asset Lock: ${fungibleAssetType}, ${fungibleAssetAmt}`)
      res = await AssetManager.createFungibleHTLC(network2U2.contract,
                      fungibleAssetType,
                      fungibleAssetAmt,
                      user1CertN2,
                      hash,
                      timeout,
                      null)
      if (!res.result) {
        throw new Error()
      }
      contractId = res.result
      spinner.info(`Fungible Asset Locked: ${res.result}`)
    } catch(error) {
        print.error(`Could not Lock Fungible Asset in ${options['network2']}`)
        res = await AssetManager.reclaimAssetInHTLC(network1U1.contract, assetType, assetId, user2CertN1);
        spinner.fail(`Error`)
        process.exit()
    }

    try {
      spinner.info(`Trying Fungible Asset Claim: ${contractId}`)
      res = await AssetManager.claimFungibleAssetInHTLC(network2U1.contract,
                      contractId,
                      hash)
      if (!res) {
        throw new Error()
      }
      spinner.info(`Fungible Asset Claimed: ${res}`)
    } catch(error) {
        print.error(`Could not claim fungible asset in ${options['network2']}`)
        res = await AssetManager.reclaimFungibleAssetInHTLC(network2U2.contract, contractId);
        res = await AssetManager.reclaimAssetInHTLC(network1U1.contract, assetType, assetId, user2CertN1);
        spinner.fail(`Error`)
        process.exit()
    }


    try {
      spinner.info(`Trying Asset Claim: ${assetType} ${assetId}`)
      res = await AssetManager.claimAssetInHTLC(network1U2.contract,
                      assetType,
                      assetId,
                      user1CertN1,
                      hash)
      if (!res) {
        throw new Error()
      }
      spinner.info(`Asset Claimed: ${res}`)
    } catch(error) {
        print.error(`Could not claim asset in ${options['network1']}`)
        res = await AssetManager.reclaimFungibleAssetInHTLC(network2U2.contract, contractId);
        res = await AssetManager.reclaimAssetInHTLC(network1U1.contract, assetType, assetId, user2CertN1);
        spinner.fail(`Error`)
        process.exit()
    }
    spinner.succeed('Asset Exchange Complete.')

    await network1U1.gateway.disconnect()
    await network1U2.gateway.disconnect()
    await network2U1.gateway.disconnect()
    await network2U2.gateway.disconnect()

    console.log('Gateways disconnected.')
    process.exit()
  }
}


module.exports = command
