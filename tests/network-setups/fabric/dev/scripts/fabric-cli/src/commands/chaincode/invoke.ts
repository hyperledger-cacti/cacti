/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as fs from 'fs'
import { invoke } from '../../helpers/fabric-functions'
import logger from '../../helpers/logger'
import { commandHelp, getNetworkConfig } from '../../helpers/helpers'
const command: GluegunCommand = {
  name: 'invoke',
  alias: ['inv'],
  description: 'Invoke chaincode with data.',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        `fabric-cli chaincode invoke --local-network=network1 mychannel interop  Create '["test", "teststate"]'`,
        'fabric-cli chaincode invoke --local-network=<network1|network2> --user=<user-id> <channel-name> <contract-name> <function-name> <args>',
        [
          {
            name: '--local-network',
            description:
              'local-network network for command. <network1|network2>'
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
        ['chaincode', 'invoke']
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

    const spinner = print.spin(`Invoking chaincode`)

    const netConfig = getNetworkConfig(options['local-network'])
    const connProfilePath = netConfig.connProfilePath
    const mspId = netConfig.mspId
    if (!connProfilePath || !mspId) {
      print.error(
        `Please use a valid --local-network. No valid environment found for ${options['local-network']} `
      )
      spinner.fail(`Error invoking chaincode`)
      return
    }
    try {
      const arrayArgs = JSON.parse(array[3])
      const result = await invoke(
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
      spinner.succeed(`Response from network: ${JSON.stringify(result)} `)
    } catch (err) {
      spinner.fail(`Error invoking chaincode`)
      logger.error(`Error invoking chaincode: ${err}`)
    }
    process.exit()
  }
}

module.exports = command
