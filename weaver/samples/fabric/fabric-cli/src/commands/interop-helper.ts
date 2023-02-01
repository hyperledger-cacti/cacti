/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as fs from 'fs'
import {
  fabricHelper
} from '../helpers/fabric-functions'
import {
  commandHelp,
  getNetworkConfig,
  getChaincodeConfig,
  generateViewAddress,
  handlePromise,
  interopHelper
} from '../helpers/helpers'
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
            name: '--user',
            description: 'User for interop.'
          },
          {
            name: '--relay-tls',
            description: 'Flag indicating whether or not the relay is TLS-enabled.'
          },
          {
            name: '--relay-tls-ca-files',
            description: 'Colon-separated list of root CA certificate paths used to connect to the relay over TLS.'
          },
          {
            name: '--e2e-confidentiality',
            description: 'Flag indicating whether or not the view contents are confidential end-to-end across networks (client-to-interop-module).'
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
    if (!options['user']) {
      options['user'] = `user1`     //Default user
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
    
    try {
      const appChaincodeId = process.env.DEFAULT_APPLICATION_CHAINCODE ? process.env.DEFAULT_APPLICATION_CHAINCODE : 'simplestate'
      const applicationFunction = process.env.DEFAULT_APPLICATION_FUNC ? process.env.DEFAULT_APPLICATION_FUNC : 'Create'
      const { args, replaceIndices } = getChaincodeConfig(appChaincodeId, applicationFunction)
      
      await interopHelper(
        options['local-network'],
        await generateViewAddress(           // Typically a noop, but for some functions, we may want to do some extra processing
          array[0],
          options['local-network'],
          options['remote-network'],
          logger
          ),
        appChaincodeId,
        applicationFunction,
        args,
        replaceIndices,
        options,
        print
      )
      process.exit()
    } catch (error) {
      print.error(`Error Interop Call: ${error}`)
    }
  }
}

// fabric-cli interop --local-network=network1 --sign=true localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H
// fabric-cli interop --local-network=network2 --remote-network=network1 localhost:9080/Fabric_Network/mychannel:interop:Read:a
module.exports = command
