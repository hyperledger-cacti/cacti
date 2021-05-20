/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { fabricHelper } from '../../helpers/fabric-functions'
import logger from '../../helpers/logger'
import { commandHelp, getNetworkConfig, handlePromise } from '../../helpers/helpers'
import { AssetManager } from '@res-dlt-interop/fabric-interop-sdk'

var crypto = require('crypto');
const ASSETTYPE_ASSET = 0
const ASSETTYPE_FUNGIBLEASSET = 1

const command: GluegunCommand = {
  name: 'exchange-step',
  alias: ['-es'],
  description: 'Asset Exchange Step by Step.',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli asset exchange-step --step=1 --network1=network1 --network2=network2 --secret=secrettext --timeout-duration=100 bob:Type1:a04:alice:token1:100`,
        'fabric-cli asset exchange-step --step=<1-6> --network1=<network1|network2> --network2=<network1|network2> --secret=<secret> --timeout-epoch=<timeout-epoch> --timeout-duration=<timeout-duration> <params>',
        [
          {
            name: '--step',
            description:
              'Step number of asset exchange protocol. >=1 and <=6'
          },
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
        ['asset', 'exchange-step']
      )
      return
    }
    if (array.length < 1) {
      print.error('Not enough arguments supplied')
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (!options['step']) {
      print.error('Step number not provided.')
      return
    }
    if (!options['network1'] || !options['network2'])
    {
      print.error('--network1 and --network2 both needs to specified')
      return
    }

    // Hash Pre-image
    let secret = ''
    let hash_secret = ''
    if (options['secret'])
    {
      secret = options['secret']
      hash_secret = crypto.createHash('sha256').update(secret).digest('base64');
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

    const params = array[0].split(':')
    const user1 = params[0]
    const assetType = params[1]
    const assetId = params[2]
    const user2 = params[3]
    const fungibleAssetType = params[4]
    const fungibleAssetAmt = parseInt(params[5])

    // console.log(secret, timeout)
    // console.log(user1, assetType, assetId)
    // console.log(user2, fungibleAssetType, fungibleAssetAmt)

    const spinner = print.spin(`Asset Exchange:\n`)

    const net1Config = getNetworkConfig(options['network1'])
    const net2Config = getNetworkConfig(options['network2'])
    if (!net1Config.connProfilePath || !net1Config.channelName || !net1Config.chaincode) {
      print.error(
        `Please use a valid --network1. No valid environment found for ${options['network1']} `
      )
      spinner.fail(`Error`)
      return
    }
    if (!net2Config.connProfilePath || !net2Config.channelName || !net2Config.chaincode) {
      print.error(
        `Please use a valid --network2. No valid environment found for ${options['network2']} `
      )
      spinner.fail(`Error`)
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

    var res
    var contractId

    if (options['step']===true) {
        spinner.fail('Asset Exchange: Invalid Step number. Exiting.')
    }
    else if (options['step']=='1') {
      try {
        spinner.info(`Trying Asset Lock: ${assetType}, ${assetId}`)
        res = await AssetManager.createHTLC(network1U1.contract,
                        assetType,
                        assetId,
                        user2CertN1,
                        secret,
                        hash_secret,
                        timeout2,
                        null)
        if (!res.result) {
          throw new Error()
        }
        spinner.info(`Asset Locked: ${res.result}`)
      } catch(error) {
          print.error(`Could not Lock Asset in ${options['network1']}`)
          spinner.fail(`Error`)
          return
      }
      spinner.succeed('Asset Exchange: Step 1 Complete.')
    }

    else if (options['step']=='2') {
      res = await waitTillLock(network1.contract,
                  ASSETTYPE_ASSET,
                  assetType,
                  assetId,
                  user2CertN1,
                  user1CertN1,
                  spinner,
                  true,
                  'Waiting for Asset to be locked...');
      if (!res) {
        print.error(`Asset is not Locked in ${options['network1']}`)
        spinner.fail(`Error`)
        return
      }
      spinner.succeed('Asset Exchange: Step 2 Complete.')
    }

    else if (options['step']=='3') {
      try {
        spinner.info(`Trying Fungible Asset Lock: ${fungibleAssetType}, ${fungibleAssetAmt}`)
        res = await AssetManager.createFungibleHTLC(network2U2.contract,
                        fungibleAssetType,
                        fungibleAssetAmt,
                        user1CertN2,
                        secret,
                        hash_secret,
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
          return
      }
      spinner.succeed('Asset Exchange: Step 3 Complete.')
    }

    else if (options['step']=='4') {
      res = await waitTillLock(network2.contract,
                  ASSETTYPE_FUNGIBLEASSET,
                  fungibleAssetType,
                  fungibleAssetAmt,
                  user1CertN2,
                  user2CertN2,
                  spinner,
                  true,
                  'Waiting for Fungible Asset to be locked...');
      if (!res) {
        print.error(`Fungible Asset is not Locked in ${options['network2']}`)
        spinner.fail(`Error`)
        res = AssetManager.reclaimAssetInHTLC(network1.contract, assetType, assetId, user2CertN1, user1CertN1);
        return
      }
      spinner.succeed('Asset Exchange: Step 4 Complete.')
    }

    else if (options['step']=='5') {
      try {
        spinner.info(`Trying Fungible Asset Claim: ${contractId}`)
        res = await AssetManager.claimFungibleAssetInHTLC(network2U1.contract,
                        contractId,
                        secret)
        if (!res) {
          throw new Error()
        }
        const currentQuery1 = {
              channel: net2Config.channelName,
              contractName: net2Config.chaincode,
              ccFunc: 'TransferTokenAssets',
              args: []
            }
        currentQuery1.args = [...currentQuery1.args, fungibleAssetType, fungibleAssetAmt, user2CertN2, user1CertN2]
        try {
            const read = await network2U1.contract.submitTransaction(currentQuery1.ccFunc, ...currentQuery1.args)
            const state = Buffer.from(read).toString()
            if (state) {
              logger.debug(`Response From Network: ${state}`)
            } else {
              logger.debug('No Response from network')
            }

            // Disconnect from the gateway.
            await network2U1.gateway.disconnect()
          } catch (error) {
            console.error(`Failed to submit transaction: ${error}`)
            throw new Error(error)
        }
        spinner.info(`Fungible Asset Claimed: ${res}`)
      } catch(error) {
          print.error(`Could not claim fungible asset in ${options['network2']}`)
          res = await AssetManager.reclaimFungibleAssetInHTLC(network2U2.contract, contractId);
          res = await AssetManager.reclaimAssetInHTLC(network1U1.contract, assetType, assetId, user2CertN1);
          spinner.fail(`Error`)
          return
      }
      spinner.succeed('Asset Exchange: Step 5 Complete.')
    }

    else if (options['step']=='6') {
      try {
        spinner.info(`Trying Asset Claim: ${assetType} ${assetId}`)
        res = await AssetManager.claimAssetInHTLC(network1U2.contract,
                        assetType,
                        assetId,
                        user1CertN1,
                        secret)
        if (!res) {
          throw new Error()
        }
        const currentQuery2 = {
              channel: net1Config.channelName,
              contractName: net1Config.chaincode,
              ccFunc: 'UpdateOwner',
              args: []
            }
        currentQuery2.args = [...currentQuery2.args, assetId, user2CertN1]
        try {
            const read = await network1U2.contract.submitTransaction(currentQuery2.ccFunc, ...currentQuery2.args)
            const state = Buffer.from(read).toString()
            if (state) {
              logger.debug(`Response From Network: ${state}`)
            } else {
              logger.debug('No Response from network')
            }

            // Disconnect from the gateway.
            await network1U2.gateway.disconnect()
          } catch (error) {
            console.error(`Failed to submit transaction: ${error}`)
            throw new Error(error)
        }
        spinner.info(`Asset Claimed: ${res}`)
      } catch(error) {
          print.error(`Could not claim asset in ${options['network1']}`)
          res = await AssetManager.reclaimFungibleAssetInHTLC(network2U2.contract, contractId);
          res = await AssetManager.reclaimAssetInHTLC(network1U1.contract, assetType, assetId, user2CertN1);
          spinner.fail(`Error`)
          return
      }
      spinner.succeed('Asset Exchange: All Steps Complete.')
    }
    else {
      spinner.fail('Asset Exchange: Invalid Step number. Exiting.')
    }

  }
}

const waitTillLock = async (contract, assetType, param1, param2, recipient, locker, spinner, requiredResponse, waitMessage) => {
  var flag = false
  var tries = 0
  const MAX_TRIES = 10
  var res
  while (!flag && tries <= MAX_TRIES) {
    if (assetType == ASSETTYPE_ASSET) {
      res = await AssetManager.isAssetLockedInHTLC(contract, param1, param2, recipient, locker)
    }
    else if (assetType == ASSETTYPE_FUNGIBLEASSET) {
      res = await AssetManager.isFungibleAssetLockedInHTLC(contract, param1, param2, recipient, locker)
    }
    spinner.info(Promise.resolve(res))
    flag = res == requiredResponse
    tries += 1
    if (!flag) {
      setTimeout(function timer() {
        spinner.info(`${waitMessage}`);
      }, 5000);
    }
  }

  return flag
}

module.exports = command
