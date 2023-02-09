/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp, validKeys } from '../helpers/helpers'
import * as fs from 'fs'
import * as path from 'path'

const command: GluegunCommand = {
  name: 'user',
  alias: ['u'],
  description: 'User utility for fabric-network',
  run: async toolbox => {
    const { print } = toolbox
    print.info('Command does nothing by itself')
    commandHelp(print, toolbox, 'fabric-cli user add', '', [], command, [
      'user'
    ])
    return
  }
}

module.exports = command
