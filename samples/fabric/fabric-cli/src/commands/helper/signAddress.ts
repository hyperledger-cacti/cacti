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
  signMessage,
  getNetworkConfig
} from '../../helpers/helpers'

const command: GluegunCommand = {
  name: 'signAddress',
  alias: [],
  description: 'Signs a string value using the local-network networks key',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli helper signAddress --local-network=network1  ;addressvalue`,
        'fabric-cli helper signAddress --local-network=<network1|network2> <value-to-sign>',
        [
          {
            name: '--local-network',
            description: 'Local network for command. <network1|network2>'
          },
          {
            name: '--mspId',
            description: 'mspId for the local fabric network'
          }
        ],
        command,
        ['helper', 'getKeyAndCert']
      )
      return
    }
    // TODO Make map for networks.
    print.info(array)
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
    console.log(
      'key',
      keyCert.key
        .toBytes()
        .toString()
        .replace(/\\n/g, '\n')
    )
    const signature = signMessage(array[0], keyCert.key.toBytes())
    console.log(signature.toString('base64'))
  }
}

module.exports = command
