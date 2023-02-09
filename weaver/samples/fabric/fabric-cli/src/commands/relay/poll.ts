/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as fs from 'fs'
import {
  commandHelp,
  getNetworkConfig,
  signMessage,
  handlePromise
} from '../../helpers/helpers'
import {
  fabricHelper,
  getKeyAndCertForRemoteRequestbyUserName
} from '../../helpers/fabric-functions'
import { RelayHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const command: GluegunCommand = {
  name: 'poll',
  description: 'Polls relay for state of a request',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli Relay poll`,
        '',
        [
          {
            name: '--local-network',
            description:
              'Local network for command. Takes preference over endpoint. <network1|network2>'
          },
          {
            name: '--requesting-org',
            description:
              'Name of the requesting org, if not provided will use the cert'
          },
          {
            name: '--relayEndpoint',
            description: 'Endpoint of relay for local network'
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
        ['relay', 'poll']
      )
      return
    }
    if (array.length != 1) {
      print.error('Invalid input length.')
      return
    }
    const relayEndpoint = getNetworkConfig(options['local-network'])
      .relayEndpoint
    if (!relayEndpoint && !options.relayEndpoint) {
      print.error(
        'No endpoint provoded for relay. Please use either --relayEndpoint or a valid --local-network'
      )
      return
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
    const relayEnv = getNetworkConfig(options['local-network'])
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
      .ProcessRequest(
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
      .then(result => {
        console.log('Result: ', result.toObject())
      })
  }
}

module.exports = command
