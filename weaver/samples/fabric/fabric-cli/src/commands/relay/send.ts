/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import {
  commandHelp,
  handlePromise,
  getNetworkConfig,
  signMessage
} from '../../helpers/helpers'
import logger from '../../helpers/logger'
import {
  fabricHelper,
  getKeyAndCertForRemoteRequestbyUserName
} from '../../helpers/fabric-functions'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

import { RelayHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'
const command: GluegunCommand = {
  name: 'send',
  description: 'Sends a query to the local relay.',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli relay send localhost:9081/Fabric_Network/mychannel:interop:Read:TestState`,
        'fabric-cli relay send <query>',
        [
          {
            name: '--local-network',
            description:
              'Local network for command. Takes preference over endpoint. <network1|network2> (Which network the request will come from)'
          },
          {
            name: '--sign',
            description: 'Sends signature to relay, usage: --sign=true'
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
            name: '--request-path',
            description:
              'Path to JSON file to use as a request. See `network2-request.json` for an example'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          },
          {
            name: '--mspId',
            description: 'mspId for the local fabric network'
          },
          {
            name: '--e2e-confidentiality',
            description: 'Flag indicating whether or not the view contents are confidential end-to-end across networks (client-to-interop-module).'
          }
        ],
        command,
        ['relay', 'send']
      )
      return
    }

    if (array.length != 1) {
      print.error('Invalid input length.')
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    let requestJson = { certificate: '', policy: '' }
    if (options['request-path']) {
      print.info(`Using path: ${options['request-path']}`)
      requestJson = JSON.parse(
        fs.readFileSync(options['request-path']).toString()
      )
      if (
        !requestJson.certificate ||
        !requestJson['requestor-signature'] ||
        !requestJson.policy
      ) {
        print.error(
          "Request object is missing a key/value. Requires 'certificate', 'requestor-signature' and 'policy'"
        )
        return
      }
    }
    logger.debug(`REQUEST JSON: ${JSON.stringify(requestJson)}`)
    const relayEnv = getNetworkConfig(options['local-network'])
    logger.debug(`Environment: ${JSON.stringify(relayEnv)}`)

    if (!relayEnv.relayEndpoint || !relayEnv.connProfilePath) {
      print.error(
        'Please use a valid --local-network. If valid network please check if your environment variables are configured properly'
      )
      return
    }
    const { wallet } = await fabricHelper({
      channel: process.env.DEFAULT_CHANNEL
        ? process.env.DEFAULT_CHANNEL
        : 'mychannel',
      contractName: process.env.DEFAULT_CHAINCODE
        ? process.env.DEFAULT_CHAINCODE
        : 'interop',
      connProfilePath: relayEnv.connProfilePath,
      networkName: options['local-network'],
      mspId: options.mspId
    })
    const username = `user1`
    console.log(relayEnv.relayEndpoint, relayEnv.connProfilePath)
    const relay = new RelayHelper.Relay(
      relayEnv.relayEndpoint || options.relayEndpoint
    )
    const [keyCert, keyCertError] = await handlePromise(
      getKeyAndCertForRemoteRequestbyUserName(wallet, username)
    )
    if (keyCertError) {
      console.error(
        'Error fetching key and certificate from network',
        keyCertError
      )
    }
    print.info('Making Relay Call using gRPC calls.')
    relay
      .SendRequest(
        array[0],
        requestJson?.policy || 'policy',
        options['local-network'],
        requestJson?.certificate || keyCert.cert,
        options.sign
          ? requestJson?.['requestor-signature'] ||
              signMessage(array[0], keyCert.key.toBytes()).toString('base64')
          : '',
        '',
        options['requesting-org'] || '',
        options['e2e-confidentiality'] === 'true' ? true : false
      )
      .then(test => {
        console.log('Result: ', test)
      })
  }
}
//localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H
module.exports = command
