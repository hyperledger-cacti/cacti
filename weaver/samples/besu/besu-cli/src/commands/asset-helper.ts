/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../helper/helper'

const command: GluegunCommand = {
  name: 'asset',
  alias: ['a'],
  description: 'Asset Management',
  run: async toolbox => {
    const { print } = toolbox
    print.info('Command does nothing by itself')
    commandHelp(print, toolbox, 'besu-cli asset', '', [], command, [
      'asset'
    ])
    return
  }
}

module.exports = command
