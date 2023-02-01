/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../helpers/helpers'

const command: GluegunCommand = {
  name: 'event',
  alias: ['e'],
  description: 'Event Subscription and receive',
  run: async toolbox => {
    const { print } = toolbox
    print.info('Command does nothing by itself')
    commandHelp(print, toolbox, 'fabric-cli event', '', [], command, [
      'event'
    ])
    return
  }
}

module.exports = command
