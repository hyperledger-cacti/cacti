/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import * as path from 'path'
import { commandHelp, addAssets, getNetworkConfig } from '../../../helpers/helpers'
import { fabricHelper } from '../../../helpers/fabric-functions'

import logger from '../../../helpers/logger'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const delay = ms => new Promise(res => setTimeout(res, ms))

const command: GluegunCommand = {
  name: 'add',
  description:
    'Adds assets to asset network',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure asset add --target-network=network1 --type=bond --data-file=src/data/assets.json',
        'fabric-cli configure asset add --target-network=<network-name> --type=<bond|token> --data-file=<path-to-data-file>>',
        [
          {
            name: '--debug',
            description:
              'Shows debug logs when running. Disabled by default. To enable --debug=true'
          },
          {
            name: '--target-network',
            description:
              'Network where asset is to be recorded. <network1|network2>'
          },
          {
            name: '--type',
            description:
              'Type of network <bond|token>'
          },
          {
            name: '--data-file',
            description:
              'Path to data file which stores assets in json format'
          }
        ],
        command,
        ['configure', 'asset', 'add']
      )
      return
    }

    if (options.debug === 'true') {
      logger.level = 'debug'
      logger.debug('Debugging is enabled')
    }
    if (!options['target-network'])
    {
      print.error('--target-network needs to be specified')
      return
    }
    if (!options['type'])
    {
      print.error('--type of network needs to be specified')
      return
    }
    if (!options['data-file'])
    {
      print.error('--data-file needs to be specified')
      return
    }

    const netConfig = getNetworkConfig(options['target-network'])

    if (!netConfig.connProfilePath || !netConfig.channelName || !netConfig.chaincode) {
      print.error(
        `Please use a valid --target-network. No valid environment found for ${options['target-network']} `
      )
      return
    }

    addAssets({
      dataFilePath: options['data-file'],
      networkName: options['target-network'],
      connProfilePath: netConfig.connProfilePath,
      mspId: netConfig.mspId,
      channelName: netConfig.channelName,
      contractName: netConfig.chaincode,
      ccType: options['type'],
      logger: logger
    })
  }
}

module.exports = command
