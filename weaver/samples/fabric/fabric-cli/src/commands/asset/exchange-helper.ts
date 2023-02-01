/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

 import { GluegunCommand } from 'gluegun'
 import { commandHelp } from '../../helpers/helpers'

const command: GluegunCommand = {
  name: 'exchange',
  alias: ['-e'],
  description: 'Asset Exchange Step by Step.',
  run: async toolbox => {
    const { print } = toolbox
    print.info('Command does nothing by itself')
    commandHelp(print, toolbox, 'fabric-cli asset exchange', '', [], command, [
      'asset', 'exchange'
    ])
    return
  }
}


module.exports = command
