/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as fs from 'fs'
import {
  fabricHelper,
  getKeyAndCertForRemoteRequestbyUserName
} from '../helpers/fabric-functions'
import {
  commandHelp,
  getNetworkConfig,
  handlePromise
} from '../helpers/helpers'
import { InteroperableHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'
import { v4 as uuidv4 } from 'uuid'

import logger from '../helpers/logger'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const command: GluegunCommand = {
  name: 'interop',
  description: 'Make an interop call to external network and invoke chaincode',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli interop --local-network=network2  --requesting-org=Org1MSP localhost:9080/network1/mychannel:interop:Read:a`,
        'fabric-cli interop <address>',
        [
          {
            name: '--local-network',
            description: 'Local network for command. <network1|network2>'
          },
          {
            name: '--remote-network',
            description:
              'Name of the remote network (Uses network name from address if not provided)'
          },
          {
            name: '--requesting-org',
            description:
              'Name of the requesting org, if not provided will use the cert'
          },
          {
            name: '--mspId',
            description: 'mspId for the local fabric network'
          },
          {
            name: '--sign',
            description: 'Sends signature to relay, usage: --sign=true'
          },
          {
            name: '--key',
            description:
              'Additional key to be sent to chaincode (used to store result if usign Write)'
          },
          {
            name: '--user',
            description: 'User for interop.'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['interop']
      )
      return
    }
    if (array.length != 1) {
      print.error('Not enough arguments supplied')
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    // TEST: fabric-cli interop --local-network=network1 localhost:9081/Nick_Network/test
    // Making Interop Call using gRPC calls.
    print.info('Making Interop Call using gRPC calls.')
    const relayEnv = getNetworkConfig(options['local-network'])
    logger.debug(`RelayEnv: ${JSON.stringify(relayEnv)}`)
    if (!relayEnv.relayEndpoint || !relayEnv.connProfilePath) {
      print.error(
        'Please use a valid --local-network. If valid network please check if your environment variables are configured properly'
      )
      return
    }
    const networkName = options['local-network']
    const channel = process.env.DEFAULT_CHANNEL
      ? process.env.DEFAULT_CHANNEL
      : 'mychannel'
    const contractName = process.env.DEFAULT_CHAINCODE
      ? process.env.DEFAULT_CHAINCODE
      : 'interop'
    const { wallet, contract } = await fabricHelper({
      channel,
      contractName,
      connProfilePath: relayEnv.connProfilePath,
      networkName,
      mspId: options.mspId,
      logger
    })
    const username = options.username || `User1@org1.${networkName}.com`
    const [keyCert, keyCertError] = await handlePromise(
      getKeyAndCertForRemoteRequestbyUserName(wallet, username)
    )
    if (keyCertError) {
      print.error(`Error getting key and cert ${keyCertError}`)
      return
    }
    const spinner = print.spin(`Starting interop flow`)
    const applicationFunction = 'Create'
    const key = options.key || uuidv4()
    try {
      const invokeObject = {
        channel,
        ccFunc: applicationFunction,
        ccArgs: [key, ''],
        contractName: 'simplestate'
      }
      const interopFlowResponse = await InteroperableHelper.interopFlow(
        //@ts-ignore this comment can be removed after using published version of interop-sdk
        contract,
        networkName,
        invokeObject,
        options['requesting-org'] || '',
        relayEnv.relayEndpoint,
        [1],
        [{
          address: array[0],
          Sign: true
        }],
        keyCert
      )
      logger.info(
        `View from remote network: ${JSON.stringify(
          interopFlowResponse.views[0].toObject()
        )}. Interop Flow result: ${interopFlowResponse.result || 'successful'}`
      )
      spinner.succeed(
        `Called Function ${applicationFunction}. With Args: ${invokeObject.ccArgs} `
      )
    } catch (e) {
      spinner.fail(`Error verifying and storing state`)
      logger.error(`Error verifying and storing state: ${e}`)
    }
    process.exit()
  }
}

// fabric-cli interop --local-network=network1 --sign=true localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H
// fabric-cli interop --local-network=network2 --remote-network=network1 localhost:9080/Fabric_Network/mychannel:interop:Read:a
module.exports = command
