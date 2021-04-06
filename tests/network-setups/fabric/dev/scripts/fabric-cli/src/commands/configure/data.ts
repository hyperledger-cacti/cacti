/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, addData, getNetworkConfig } from '../../helpers/helpers'

const command: GluegunCommand = {
  name: 'data',
  description: 'Populates network with data.',
  run: async toolbox => {
    const {
      print,
      parameters: { options, array }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure  --local-network=network1 data',
        'fabric-cli configure  --local-network=<network1|network2> data <filename-in-data-folder> (default: stars.json)',
        [
          {
            name: '--local-network',
            description:
              'local-network network for command. <network1|network2>'
          }
        ],
        command,
        ['configure']
      )
      return
    }
    const connProfilePath = getNetworkConfig(options['local-network'])
      .connProfilePath
    if (!connProfilePath) {
      print.error(
        `Please use a valid --local-network. No valid environment found for ${options['local-network']} `
      )
      return
    }
    print.info(`Populating ${options['local-network']} chaincode with data`)

    addData({
      filename: array[0] ? array[0] : 'stars.json',
      connProfilePath,
      networkName: options['local-network']
    })
    process.exit()
  }
}

module.exports = command
