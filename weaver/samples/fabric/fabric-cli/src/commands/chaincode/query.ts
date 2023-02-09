/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as fs from 'fs'
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
        `fabric-cli chaincode query --local-network=network1 mychannel interop Read '["56612afd-6730-4206-b25e-6d5d592789d3"]'`,
        'fabric-cli chaincode --local-network=<network1|network2> --user=<user-id> query <channel-name> <contract-name> <function-name> <args array>',
        [
          {
            name: '--local-network',
            description: 'Local network for command. <network1|network2>'
          },
          {
            name: '--user',
            description:
              'user for chaincode invoke. (Optional: Default user is used)'
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
    let userid = ''
    if (options['user']) {
      userid = options['user']
    }

    const netConfig = getNetworkConfig(options['local-network'])
    const connProfilePath = netConfig.connProfilePath
    const mspId = netConfig.mspId
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
        mspId,
        logger,
        userid,
        true
      )
      try {             // If the result is a JSON
        const resultJSON = JSON.stringify(JSON.parse(result), null, 4)
        logger.info(`Result from network query: ${resultJSON}`)
      } catch(err) {    // If the result is not a JSON
        logger.info(`Result from network query: ${result}`)
      }
    } catch (err) {
      logger.error(`Error during fabric query: ${JSON.stringify(err)}`)
    }
    process.exit()
  }
}

module.exports = command
