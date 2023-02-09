/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { GluegunCommand } from 'gluegun'
import { commandHelp } from '../helpers/helpers'

const command: GluegunCommand = {
  name: 'helper',
  alias: [],
  description: '(DEV) Various helper functions',
  run: async toolbox => {
    const {
      print,
      parameters: { options }
    } = toolbox

    print.info('Command does nothing by itself')
    commandHelp(
      print,
      toolbox,
      'fabric-cli helper getKeyAndCert --local-network=network1',
      'fabric-cli helper <subcommand>',
      [],
      command,
      ['helper']
    )
  }
}

module.exports = command
