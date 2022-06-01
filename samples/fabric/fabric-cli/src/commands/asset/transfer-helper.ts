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
    const { print } = toolbox
    print.info('Command does nothing by itself')
    commandHelp(print, toolbox, 'fabric-cli asset transfer', '', [], command, [
      'asset', 'transfer'
    ])
    return
  }
}

module.exports = command
