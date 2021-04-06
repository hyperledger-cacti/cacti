/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../helpers/helpers'

const command: GluegunCommand = {
  name: 'chaincode',
  alias: ['c'],
  description: 'Operate on a chaincode: invoke|query',
  run: async toolbox => {
    const { print } = toolbox
    print.info('Command does nothing by itself')
    commandHelp(print, toolbox, 'fabric-cli chaincode query', '', [], command, [
      'chaincode'
    ])
    return
  }
}

module.exports = command
