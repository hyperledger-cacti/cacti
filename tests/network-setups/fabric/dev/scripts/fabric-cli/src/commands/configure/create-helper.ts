/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../../helpers/helpers'

const command: GluegunCommand = {
  name: 'create',
  alias: [],
  description: 'Various helper functions',
  run: async toolbox => {
    const {
      print,
      parameters: { options }
    } = toolbox
    if (options.help || options.h) {
      commandHelp(
        print,
        toolbox,
        'fabric-cli configure create --local-network=network1 acccess-control',
        'fabric-cli configure create <subcommand>',
        [],
        command,
        ['configure', 'create']
      )
      return
    }
    print.info('Command does nothing by itself')
  }
}

module.exports = command
