/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../../helpers/helpers'

const command: GluegunCommand = {
  name: 'asset',
  alias: [],
  description: 'Configure for asset networks',
  run: async toolbox => {
    const {
      print,
      parameters: { options }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure asset add --target-network=network1 --type=bond',
        'fabric-cli configure asset <subcommand>',
        [],
        command,
        ['configure', 'asset']
      )
      return
    }
    print.info('Command does nothing by itself')
  }
}

module.exports = command
