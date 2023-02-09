/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { RelayHelper } from '@hyperledger-labs/weaver-fabric-interop-sdk'
import { commandHelp, getNetworkConfig } from '../../helpers/helpers'
import logger from '../../helpers/logger'

const command: GluegunCommand = {
  name: 'get',
  description: 'Get state of a request from the relay',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli relay get <request_id>`,
        'fabric-cli relay get 8b6fee38-053f-4c60-8a37-b07f0b57f3b8',
        [
          {
            name: '--local-network',
            description:
              'Local network for command. Takes preference over relayEndpoint. <network1|network2>'
          },
          {
            name: '--relayEndpoint',
            description: 'Endpoint of relay to local-network'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['relay', 'get']
      )
      return
    }
    if (array.length != 1) {
      print.error('Invalid input length')
      return
    }

    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    const relayEndpoint = getNetworkConfig(options['local-network'])
      .relayEndpoint
    logger.debug(`Relay Endpoint: ${relayEndpoint} || ${options.RelayEndpoint}`)
    if (!relayEndpoint && !options.relayEndpoint) {
      print.error(
        'No endpoint provoded for relay. Please use either --relayEndpoint or a valid --local-network'
      )
      return
    }
    logger.info('Making Relay GetRequestStatus call using gRPC.')
    const relay = new RelayHelper.Relay(
      relayEndpoint || options.relayEndpoint
    )
    relay
      .GetRequest(array[0])
      .then(state => console.log('Return state: ', state))
  }
}

module.exports = command
