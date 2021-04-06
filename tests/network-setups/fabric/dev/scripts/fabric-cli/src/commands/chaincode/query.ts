/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { query } from '../../helpers/fabric-functions'
import { commandHelp, getNetworkConfig } from '../../helpers/helpers'
import logger from '../../helpers/logger'
const command: GluegunCommand = {
  name: 'query',
  alias: ['q'],
  description: 'query chaincode with data.',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli chaincode  invoke --local-network=network1 mychannel interop Read '["56612afd-6730-4206-b25e-6d5d592789d3"]'`,
        'fabric-cli chaincode --local-network=<network1|network2> query <channel-name> <contract-name> <function-name> <args array>',
        [
          {
            name: '--local-network',
            description: 'Local network for command. <network1|network2>'
          },
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          }
        ],
        command,
        ['chaincode', 'query']
      )
      return
    }
    if (array.length < 4) {
      print.error('Not enough arguments supplied')
      return
    }
    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    const connProfilePath = getNetworkConfig(options['local-network'])
      .connProfilePath
    if (!connProfilePath) {
      print.error(
        `Please use a valid --local-network. No valid environment found for ${options['local-networks']} `
      )
      return
    }
    try {
      const arrayArgs = JSON.parse(array[3])
      const result = await query(
        {
          contractName: array[1],
          channel: array[0],
          ccFunc: array[2],
          args: arrayArgs
        },
        connProfilePath,
        options['local-network'],
        global.__DEFAULT_MSPID__,
        logger
      )
      logger.info(`Result from network query: ${result}`)
    } catch (err) {
      logger.error(`Error during fabric query: ${JSON.stringify(err)}`)
    }
  }
}

module.exports = command
