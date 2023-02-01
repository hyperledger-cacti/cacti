/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import {
  fabricHelper,
  getKeyAndCertForRemoteRequestbyUserName
} from '../../helpers/fabric-functions'
import {
  commandHelp,
  handlePromise,
  getNetworkConfig
} from '../../helpers/helpers'

const command: GluegunCommand = {
  name: 'getKeyAndCert',
  alias: [],
  description: 'Get the key and certificate used by a specific user',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli chaincode invoke --local-network=network1  mychannel interop  Create '["test", "teststate"]'`,
        'fabric-cli chaincode invoke --local-network=<network1|network2> <channel-name> <contract-name> <function-name> <args>',
        [
          {
            name: '--local-network',
            description: 'Local network for command. <network1|network2>'
          },
          {
            name: '--channel',
            description: 'Target channel for command.'
          },
          {
            name: '--contract',
            description: 'Target contract for command.'
          },
          {
            name: '--mspId',
            description: 'mspId for the local fabric network'
          },
          {
            name: '--username',
            description: 'Target username for command.'
          }
        ],
        command,
        ['helper', 'getKeyAndCert']
      )
      return
    }
    const channel = options.channel || 'mychannel'
    const contractName = options.contract || 'interop'
    const connProfilePath = getNetworkConfig(options['local-network'])
      .connProfilePath
    if (!connProfilePath) {
      print.error(
        `Please use a valid --local-network. No valid environment found for ${options['local-network']} `
      )
      return
    }
    const username =
      options.username || `user1`
    const helperObject = await fabricHelper({
      channel,
      contractName,
      connProfilePath,
      mspId: options.mspId,
      networkName: options['local-network']
    })
    const wallet = helperObject.wallet

    const [keyCert, keyCertError] = await handlePromise(
      getKeyAndCertForRemoteRequestbyUserName(wallet, username)
    )
    if (keyCertError) {
      print.error(`Error getting key and cert ${keyCertError}`)
      return
    }
    console.log(keyCert.cert)
    console.log(
      'key',
      keyCert.key
        .toBytes()
        .toString()
        .replace(/\\n/g, '\n')
    )
  }
}

module.exports = command
