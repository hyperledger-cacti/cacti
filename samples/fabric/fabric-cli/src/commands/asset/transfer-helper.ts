/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../../helpers/helpers'

const command: GluegunCommand = {
  name: 'transfer',
  alias: ['-t'],
  description: 'Asset Transfer',
  run: async toolbox => {
    const { print,
      parameters: { options }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli asset transfer -h',
        'fabric-cli asset transfer <subcommand> [OPTIONS]',
        [],
        command,
        ['asset', 'transfer']
      )
      return
    }
    print.info('Command does nothing by itself')
  }
}

module.exports = command
